
import React, { createContext, useState, useEffect, useCallback, ReactNode, useMemo } from 'react';
import { User, PlayerProfile, Team, Tournament, Match, CardType, Notification, MatchStatus, Goal, Card, AppContextType } from '../types';
import { DEFAULT_USERS, DEFAULT_TEAMS, DEFAULT_TOURNAMENTS, DEFAULT_NOTIFICATIONS } from '../mockData';

export const AppContext = createContext<AppContextType | undefined>(undefined);

const useLocalStorage = <T,>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] => {
    const [storedValue, setStoredValue] = useState<T>(() => {
        try {
            const item = window.localStorage.getItem(key);
            return item ? JSON.parse(item) : initialValue;
        } catch (error) {
            console.error(error);
            return initialValue;
        }
    });

    const setValue: React.Dispatch<React.SetStateAction<T>> = (value) => {
        try {
            const valueToStore = value instanceof Function ? value(storedValue) : value;
            setStoredValue(valueToStore);
            window.localStorage.setItem(key, JSON.stringify(valueToStore));
        } catch (error) {
            console.error(error);
        }
    };

    return [storedValue, setValue];
};

const generateId = () => Math.random().toString(36).substring(2, 11);
const generateInviteCode = (length = 8) => Math.random().toString(36).substring(2, 2 + length).toUpperCase();


export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [allUsers, setAllUsers] = useLocalStorage<User[]>('asl_users', DEFAULT_USERS);
  const [allTeams, setAllTeams] = useLocalStorage<any[]>('asl_teams', DEFAULT_TEAMS);
  const [allTournaments, setAllTournaments] = useLocalStorage<any[]>('asl_tournaments', DEFAULT_TOURNAMENTS);
  const [notifications, setNotifications] = useLocalStorage<Notification[]>('asl_notifications', DEFAULT_NOTIFICATIONS);
  const [imageData, setImageData] = useLocalStorage<{ [key: string]: string }>('asl_imagedata', {});
  
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('asl_token'));
  const [isLoading, setIsLoading] = useState(true);

  // --- Image Data Resolver ---
  const resolveImageUrl = useCallback((urlOrKey: string | null): string | null => {
      if (urlOrKey && urlOrKey.startsWith('localimg_')) {
          return imageData[urlOrKey] || null;
      }
      return urlOrKey;
  }, [imageData]);
  
  // --- Data Population Helpers ---
  const findAndPopulateUser = useCallback((userId: string | undefined | null): User | undefined => {
      if (!userId) return undefined;
      const user = allUsers.find(u => u._id === userId);
      if (!user) return undefined;
      return {
          ...user,
          profile: {
              ...user.profile,
              imageUrl: resolveImageUrl(user.profile.imageUrl),
          }
      };
  }, [allUsers, resolveImageUrl]);

  const populateTeam = useCallback((team: any): Team | null => {
    if (!team) return null;
    return {
        ...team,
        logoUrl: resolveImageUrl(team.logoUrl),
        members: (team.members || []).map((id: string) => findAndPopulateUser(id)).filter(Boolean) as User[]
    };
  }, [findAndPopulateUser, resolveImageUrl]);

  const populateMatch = useCallback((match: any): Match | null => {
    if (!match) return null;

    const teamA = populateTeam(allTeams.find(t => t._id === match.teamAId));
    const teamB = populateTeam(allTeams.find(t => t._id === match.teamBId));
    
    if (!teamA || !teamB) return null;

    const populatedGoals: Goal[] = (match.goals || []).map((g: any) => {
        const scorer = findAndPopulateUser(g.scorerId);
        if (!scorer) return null;
        const assister = findAndPopulateUser(g.assistId);
        return { ...g, scorerId: scorer, assistId: assister || undefined };
    }).filter(Boolean) as Goal[];

    const populatedCards: Card[] = (match.cards || []).map((c: any) => {
        const player = findAndPopulateUser(c.playerId);
        if (!player) return null;
        return { ...c, playerId: player };
    }).filter(Boolean) as Card[];

    return {
        ...match,
        teamAId: teamA,
        teamBId: teamB,
        playerOfTheMatchId: findAndPopulateUser(match.playerOfTheMatchId) || undefined,
        goals: populatedGoals,
        cards: populatedCards
    };
  }, [allTeams, populateTeam, findAndPopulateUser]);

  const populateTournament = useCallback((tournament: any): Tournament | null => {
    if (!tournament) return null;
    return {
        ...tournament,
        logoUrl: resolveImageUrl(tournament.logoUrl),
        teams: (tournament.teams || []).map((id: string) => populateTeam(allTeams.find(t => t._id === id))).filter(Boolean) as Team[],
        matches: (tournament.matches || []).map(populateMatch).filter(Boolean) as Match[]
    };
  }, [allTeams, populateTeam, populateMatch, resolveImageUrl]);
  
  const populatedTeams = useMemo(() => allTeams.map(populateTeam).filter(Boolean) as Team[], [allTeams, populateTeam]);
  const populatedTournaments = useMemo(() => allTournaments.map(populateTournament).filter(Boolean) as Tournament[], [allTournaments, populateTournament]);

  useEffect(() => {
    const bootstrap = () => {
        if (token) {
            try {
                const user = allUsers.find(u => u._id === token);
                if (user) {
                    setCurrentUser(findAndPopulateUser(user._id) || null);
                } else {
                     handleLogout();
                }
            } catch (error) {
                console.error("Session invalid or expired", error);
                handleLogout();
            }
        }
        setIsLoading(false);
    };
    bootstrap();
  }, [token, allUsers, findAndPopulateUser]);
  
  const handleLogout = () => {
    setCurrentUser(null);
    setToken(null);
    localStorage.removeItem('asl_token');
  };
  
  const createNotification = (userId: string, message: string, link: string) => {
      const newNotif: Notification = {
          _id: generateId(),
          userId,
          message,
          link,
          isRead: false,
          createdAt: new Date().toISOString()
      };
      setNotifications(prev => [newNotif, ...prev]);
  };

  const login = async (email: string, dob: string) => {
    const user = allUsers.find(u => u.email.toLowerCase() === email.toLowerCase() && u.dob === dob);
    if (user) {
        const userToken = user._id; // Use user ID as token
        localStorage.setItem('asl_token', userToken);
        setToken(userToken);
        setCurrentUser(findAndPopulateUser(user._id) || null);
    } else {
        throw new Error("Invalid credentials. Please check your email and date of birth.");
    }
  };
  
  const register = async (name: string, email: string, dob: string) => {
    if (allUsers.some(u => u.email.toLowerCase() === email.toLowerCase())) {
        throw new Error("User with this email already exists");
    }
    const newUser: User = {
        _id: generateId(),
        email,
        dob,
        profile: { name, age: null, position: null, imageUrl: null }
    };
    
    // Add the new user to the state. This will also update localStorage.
    setAllUsers(prev => [...prev, newUser]);
    
    // Directly perform the login actions with the newly created user object,
    // avoiding the stale state issue of calling the main login() function.
    const userToken = newUser._id;
    localStorage.setItem('asl_token', userToken);
    setToken(userToken);
    setCurrentUser(newUser); // The new user object is complete and doesn't need "population".
  };
  
  const logout = () => { handleLogout(); };

  const isProfileComplete = (): boolean => {
    if (!currentUser) return false;
    return !!(currentUser.profile.age && currentUser.profile.position && currentUser.profile.imageUrl);
  };
  
  const updateProfile = async (profile: Partial<PlayerProfile>) => {
    if (!currentUser) throw new Error("Not logged in");
    
    const profileUpdate = { ...profile };

    if (profileUpdate.imageUrl && profileUpdate.imageUrl.startsWith('data:image')) {
        const oldImageKey = currentUser.profile.imageUrl;
        const imageKey = `localimg_${generateId()}`;

        setImageData(prev => {
            const newData = {...prev};
            // Remove old image if it was a local one
            if (oldImageKey && oldImageKey.startsWith('localimg_')) {
                delete newData[oldImageKey];
            }
            newData[imageKey] = profileUpdate.imageUrl as string;
            return newData;
        });
        profileUpdate.imageUrl = imageKey;
    }

    let finalUpdatedUser: User | undefined;
    setAllUsers(prev => prev.map(u => {
        if (u._id === currentUser._id) {
            finalUpdatedUser = { ...u, profile: { ...u.profile, ...profileUpdate } };
            return finalUpdatedUser;
        }
        return u;
    }));
    
    if (finalUpdatedUser) {
        setCurrentUser(findAndPopulateUser(finalUpdatedUser._id) || null);
    }
  };

  const createTeam = async (name: string, logo: string | null): Promise<Team> => {
    if (!currentUser) throw new Error("Not logged in");

    let logoRef = logo;
    if (logo && logo.startsWith('data:image')) {
        const imageKey = `localimg_${generateId()}`;
        setImageData(prev => ({...prev, [imageKey]: logo }));
        logoRef = imageKey;
    }

    const newTeamRaw = {
        _id: generateId(),
        name,
        logoUrl: logoRef,
        adminIds: [currentUser._id],
        members: [currentUser._id],
        inviteCode: generateInviteCode()
    };
    setAllTeams(prev => [...prev, newTeamRaw]);
    return populateTeam(newTeamRaw) as Team;
  };

  const updateTeam = async (teamId: string, details: { name?: string, logoUrl?: string | null }) => {
    const detailsUpdate = { ...details };

    if (detailsUpdate.logoUrl && detailsUpdate.logoUrl.startsWith('data:image')) {
        const team = allTeams.find(t => t._id === teamId);
        const oldImageKey = team?.logoUrl;
        const imageKey = `localimg_${generateId()}`;

        setImageData(prev => {
            const newData = {...prev};
            // Remove old image if it was a local one
            if (oldImageKey && oldImageKey.startsWith('localimg_')) {
                delete newData[oldImageKey];
            }
            newData[imageKey] = detailsUpdate.logoUrl as string;
            return newData;
        });
        detailsUpdate.logoUrl = imageKey;
    }

    setAllTeams(prev => prev.map(t => {
        if (t._id === teamId) {
            return { ...t, ...detailsUpdate };
        }
        return t;
    }));
  };
  
  const joinTeam = async (code: string): Promise<Team> => {
      if (!currentUser) throw new Error("Not logged in");
      const team = allTeams.find(t => t.inviteCode.toUpperCase() === code.toUpperCase());
      if (!team) throw new Error("Team not found with this invite code");
      if (team.members.includes(currentUser._id)) throw new Error("You are already in this team");
      
      const updatedTeam = { ...team, members: [...team.members, currentUser._id]};
      setAllTeams(prev => prev.map(t => t._id === team._id ? updatedTeam : t));
      
      team.adminIds.forEach((adminId: string) => {
          createNotification(adminId, `${currentUser.profile.name} joined your team: ${team.name}`, `/team/${team._id}`);
      });
      
      return populateTeam(updatedTeam) as Team;
  }

  const getUserById = async (id: string): Promise<User | undefined> => findAndPopulateUser(id);

  const getTeamById = async (id: string): Promise<Team | undefined> => {
    const team = allTeams.find(t => t._id === id);
    return populateTeam(team) || undefined;
  }

  const getTournamentById = async (id: string): Promise<Tournament | undefined> => {
    const tournament = allTournaments.find(t => t._id === id);
    return populateTournament(tournament) || undefined;
  }
  
  const createTournament = async (name: string, logo: string | null): Promise<Tournament> => {
      if (!currentUser) throw new Error("Not logged in");
      
      let logoRef = logo;
      if (logo && logo.startsWith('data:image')) {
          const imageKey = `localimg_${generateId()}`;
          setImageData(prev => ({...prev, [imageKey]: logo }));
          logoRef = imageKey;
      }
      
      const newTournamentRaw = {
          _id: generateId(),
          name,
          logoUrl: logoRef,
          adminId: currentUser._id,
          teams: [],
          matches: [],
          isSchedulingDone: false,
          inviteCode: generateInviteCode(10)
      };
      setAllTournaments(prev => [...prev, newTournamentRaw]);
      return populateTournament(newTournamentRaw) as Tournament;
  };

  const updateTournament = async (tournamentId: string, details: { name?: string, logoUrl?: string | null }) => {
     const detailsUpdate = { ...details };

    if (detailsUpdate.logoUrl && detailsUpdate.logoUrl.startsWith('data:image')) {
        const tournament = allTournaments.find(t => t._id === tournamentId);
        const oldImageKey = tournament?.logoUrl;
        const imageKey = `localimg_${generateId()}`;

        setImageData(prev => {
            const newData = {...prev};
            // Remove old image if it was a local one
            if (oldImageKey && oldImageKey.startsWith('localimg_')) {
                delete newData[oldImageKey];
            }
            newData[imageKey] = detailsUpdate.logoUrl as string;
            return newData;
        });
        detailsUpdate.logoUrl = imageKey;
    }
    
    setAllTournaments(prev => prev.map(t => {
        if (t._id === tournamentId) {
            return { ...t, ...detailsUpdate };
        }
        return t;
    }));
  };

  const joinTournament = async (inviteCode: string, teamId: string): Promise<{ success: boolean; message: string; tournamentId?: string }> => {
      const tournament = allTournaments.find(t => t.inviteCode.toUpperCase() === inviteCode.toUpperCase());
      if (!tournament) return { success: false, message: 'Tournament not found with this invite code.' };

      if (tournament.teams.includes(teamId)) return { success: false, message: 'This team is already in the tournament.' };
      
      const updatedTournament = { ...tournament, teams: [...tournament.teams, teamId] };
      setAllTournaments(prev => prev.map(t => t._id === tournament._id ? updatedTournament : t));

      createNotification(tournament.adminId, `Team ${(allTeams.find(t => t._id === teamId))?.name} joined your tournament: ${tournament.name}`, `/tournament/${tournament._id}`);

      return { success: true, message: 'Successfully joined tournament!', tournamentId: tournament._id };
  };
  
  const scheduleMatches = async (tournamentId: string) => {
      const tournament = allTournaments.find(t => t._id === tournamentId);
      if(!tournament) return;
      
      const newMatches: any[] = [];
      let matchNumber = 1;
      for (let i = 0; i < tournament.teams.length; i++) {
        for (let j = i + 1; j < tournament.teams.length; j++) {
            newMatches.push({
                _id: generateId(),
                matchNumber: matchNumber++,
                teamAId: tournament.teams[i],
                teamBId: tournament.teams[j],
                round: 'League Stage',
                status: MatchStatus.SCHEDULED,
                scoreA: 0,
                scoreB: 0,
                goals: [],
                cards: []
            });
        }
      }
      const updatedTournament = { ...tournament, matches: newMatches, isSchedulingDone: true };
      setAllTournaments(prev => prev.map(t => t._id === tournamentId ? updatedTournament : t));
  };
  
  const addMemberToTeam = async (teamId: string, memberId: string): Promise<{ success: boolean; message: string }> => {
      const team = allTeams.find(t => t._id === teamId);
      const user = allUsers.find(u => u._id === memberId);
      if (!team) return { success: false, message: "Team not found" };
      if (!user) return { success: false, message: "User not found with that ID" };
      if (team.members.includes(memberId)) return { success: false, message: "User is already in team" };
      
      const updatedTeam = {...team, members: [...team.members, memberId]};
      setAllTeams(prev => prev.map(t => t._id === teamId ? updatedTeam : t));
      return { success: true, message: "Member added successfully" };
  };
  const removeMemberFromTeam = async (teamId: string, memberId: string): Promise<{ success: boolean; message: string }> => {
      let team = allTeams.find(t => t._id === teamId);
      if (!team) return { success: false, message: "Team not found" };
      
      team = {
          ...team,
          members: team.members.filter((id: string) => id !== memberId),
          adminIds: team.adminIds.filter((id: string) => id !== memberId),
          captainId: team.captainId === memberId ? undefined : team.captainId,
          viceCaptainId: team.viceCaptainId === memberId ? undefined : team.viceCaptainId,
      };
      setAllTeams(prev => prev.map(t => t._id === teamId ? team : t));
      return { success: true, message: "Member removed" };
  };
  const toggleTeamAdmin = async (teamId: string, memberId: string): Promise<{ success: boolean; message: string }> => {
      const team = allTeams.find(t => t._id === teamId);
      if (!team) return { success: false, message: "Team not found" };

      const isAdmin = team.adminIds.includes(memberId);
      const updatedTeam = {
          ...team,
          adminIds: isAdmin ? team.adminIds.filter((id: string) => id !== memberId) : [...team.adminIds, memberId]
      };
      setAllTeams(prev => prev.map(t => t._id === teamId ? updatedTeam : t));
      return { success: true, message: "Admin status updated" };
  };
  const setTeamRole = async (teamId: string, memberId: string, role: 'captain' | 'viceCaptain') => {
      const team = allTeams.find(t => t._id === teamId);
      if (!team) return;
      const updatedTeam = { ...team, [`${role}Id`]: memberId };
      setAllTeams(prev => prev.map(t => t._id === teamId ? updatedTeam : t));
  };
  const addTeamToTournament = async (tournamentId: string, teamCodeOrId: string): Promise<{ success: boolean; message: string }> => {
      const tournament = allTournaments.find(t => t._id === tournamentId);
      const team = allTeams.find(t => t._id === teamCodeOrId || t.inviteCode === teamCodeOrId);
      if(!tournament || !team) return { success: false, message: "Tournament or Team not found" };
      
      if(tournament.teams.includes(team._id)) return { success: false, message: "Team already in tournament"};

      const updatedTournament = {...tournament, teams: [...tournament.teams, team._id]};
      setAllTournaments(prev => prev.map(t => t._id === tournamentId ? updatedTournament : t));
      return { success: true, message: "Team added"};
  };
  const updateMatchDetails = async (tournamentId: string, matchId: string, details: Partial<Pick<Match, 'teamAId' | 'teamBId' | 'date' | 'time'>>) => {
      const tournament = allTournaments.find(t => t._id === tournamentId);
      if (!tournament) return;
      const updatedMatches = tournament.matches.map((m: any) => {
          if (m._id === matchId) {
              return {
                  ...m,
                  teamAId: details.teamAId?._id || m.teamAId,
                  teamBId: details.teamBId?._id || m.teamBId,
                  date: details.date ?? m.date,
                  time: details.time ?? m.time,
              };
          }
          return m;
      });
      setAllTournaments(prev => prev.map(t => t._id === tournamentId ? {...tournament, matches: updatedMatches} : t));
  };
  const addMatchManually = async (tournamentId: string, matchData: { teamAId: string, teamBId: string, round: string }) => {
      const tournament = allTournaments.find(t => t._id === tournamentId);
      if (!tournament) return;
      const newMatch = {
          _id: generateId(),
          matchNumber: (tournament.matches.length || 0) + 1,
          ...matchData,
          status: MatchStatus.SCHEDULED, scoreA: 0, scoreB: 0, goals: [], cards: []
      };
      setAllTournaments(prev => prev.map(t => t._id === tournamentId ? {...tournament, matches: [...tournament.matches, newMatch]} : t));
  };
  const updateMatchInTournament = (tournamentId: string, matchId: string, updatedMatch: any) => {
    setAllTournaments(prev => prev.map(t => {
        if (t._id === tournamentId) {
            return { ...t, matches: t.matches.map((m: any) => m._id === matchId ? updatedMatch : m) };
        }
        return t;
    }));
  };
  const startMatch = async (tournamentId: string, matchId: string) => {
    const tourney = allTournaments.find(t => t._id === tournamentId);
    const match = tourney?.matches.find((m:any) => m._id === matchId);
    if(match) updateMatchInTournament(tournamentId, matchId, { ...match, status: MatchStatus.LIVE });
  };
  const endMatch = async (tournamentId: string, matchId: string, penaltyScores?: { penaltyScoreA: number, penaltyScoreB: number }) => {
    const tourney = allTournaments.find(t => t._id === tournamentId);
    const match = tourney?.matches.find((m:any) => m._id === matchId);
    if (!match) return;

    let winnerId: string | null = null;
    if (match.scoreA > match.scoreB) winnerId = match.teamAId;
    else if (match.scoreB > match.scoreA) winnerId = match.teamBId;
    else if (penaltyScores && penaltyScores.penaltyScoreA !== penaltyScores.penaltyScoreB) {
        winnerId = penaltyScores.penaltyScoreA > penaltyScores.penaltyScoreB ? match.teamAId : match.teamBId;
    }
    
    updateMatchInTournament(tournamentId, matchId, { ...match, status: MatchStatus.FINISHED, winnerId, ...penaltyScores });
  };
  const recordGoal = async (tournamentId: string, matchId: string, scorerId: string, assistId?: string, isOwnGoal?: boolean) => {
    const tourney = allTournaments.find(t => t._id === tournamentId);
    let match = tourney?.matches.find((m:any) => m._id === matchId);
    if (!match) return;

    const scorerTeamId = allTeams.find(t => t.members.includes(scorerId))?._id;
    const benefitingTeamId = isOwnGoal ? (scorerTeamId === match.teamAId ? match.teamBId : match.teamAId) : scorerTeamId;
    
    const newGoal = { _id: generateId(), scorerId, assistId, isOwnGoal, teamId: benefitingTeamId, minute: 0 };
    match = {
        ...match,
        scoreA: benefitingTeamId === match.teamAId ? match.scoreA + 1 : match.scoreA,
        scoreB: benefitingTeamId === match.teamBId ? match.scoreB + 1 : match.scoreB,
        goals: [...match.goals, newGoal]
    };
    updateMatchInTournament(tournamentId, matchId, match);
  };
  const recordCard = async (tournamentId: string, matchId: string, playerId: string, cardType: CardType) => {
    const tourney = allTournaments.find(t => t._id === tournamentId);
    let match = tourney?.matches.find((m:any) => m._id === matchId);
    if (!match) return;
    const playerTeamId = allTeams.find(t => t.members.includes(playerId))?._id;
    const newCard = { _id: generateId(), playerId, cardType, teamId: playerTeamId, minute: 0 };
    updateMatchInTournament(tournamentId, matchId, { ...match, cards: [...match.cards, newCard] });
  };
  const setPlayerOfTheMatch = async (tournamentId: string, matchId: string, playerId: string) => {
    const tourney = allTournaments.find(t => t._id === tournamentId);
    const match = tourney?.matches.find((m:any) => m._id === matchId);
    if (match) updateMatchInTournament(tournamentId, matchId, { ...match, playerOfTheMatchId: playerId });
  };
  const markNotificationAsRead = (notificationId: string) => {
      setNotifications(prev => prev.map(n => n._id === notificationId ? {...n, isRead: true} : n));
  };
  const markAllNotificationsAsRead = () => {
      if(!currentUser) return;
      setNotifications(prev => prev.map(n => n.userId === currentUser._id ? {...n, isRead: true} : n));
  };

  return (
    <AppContext.Provider value={{ currentUser, teams: populatedTeams, tournaments: populatedTournaments, notifications, isLoading, login, register, logout, isProfileComplete, updateProfile, createTeam, updateTeam, joinTeam, addMemberToTeam, removeMemberFromTeam, toggleTeamAdmin, setTeamRole, getTeamById, getUserById, createTournament, updateTournament, getTournamentById, joinTournament, addTeamToTournament, scheduleMatches, updateMatchDetails, addMatchManually, startMatch, endMatch, recordGoal, recordCard, setPlayerOfTheMatch, markNotificationAsRead, markAllNotificationsAsRead }}>
      {children}
    </AppContext.Provider>
  );
};