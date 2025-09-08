import React, { createContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { User, PlayerProfile, Team, Tournament, CardType, Notification, AppContextType } from '../types';

export const AppContext = createContext<AppContextType | undefined>(undefined);

// Define the base URL for your backend API.
const API_URL = `http://${window.location.hostname}:5001/api`;

const generateId = () => Math.random().toString(36).substring(2, 11);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // --- State Management ---
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('asl_token'));
  const [teams, setTeams] = useState<Team[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  // Notifications are now ephemeral and will reset on page load.
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // --- API Fetch Helper ---
  // This centralized function handles adding the auth token and parsing responses.
  const apiFetch = useCallback(async (endpoint: string, options: RequestInit = {}) => {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
    const data = await response.json();

    if (!response.ok) {
      // Use the message from the backend error response, or a default.
      throw new Error(data.message || `API Error: ${response.statusText}`);
    }
    return data;
  }, [token]);
  
  // --- Notifications (Frontend Only) ---
  const createNotification = useCallback((userId: string, message: string, link: string) => {
      const newNotif: Notification = {
          _id: generateId(), userId, message, link, isRead: false, createdAt: new Date().toISOString()
      };
      setNotifications(prev => [newNotif, ...prev]);
  }, []);

  // --- Data Fetching ---
  // Fetches all necessary application data after a user is authenticated.
  const fetchAppData = useCallback(async () => {
    try {
      // Fetch teams and tournaments the user is part of.
      // NOTE: For a larger app, these would be dedicated endpoints like /api/my-teams
      // For now, we fetch all and filter on the frontend for simplicity.
      const allTeams = await apiFetch('/teams');
      const allTournaments = await apiFetch('/tournaments');
      setTeams(allTeams);
      setTournaments(allTournaments);
    } catch (error) {
      console.error("Failed to fetch app data:", error);
      // It's possible the token is valid but something else failed. Handle gracefully.
    }
  }, [apiFetch]);


  // --- App Initialization (Bootstrap) ---
  useEffect(() => {
    const bootstrap = async () => {
      if (token) {
        try {
          // Verify token by fetching the user's profile
          const userProfile = await apiFetch('/users/profile');
          setCurrentUser(userProfile);
          await fetchAppData();
        } catch (error) {
          console.error("Session invalid or expired", error);
          // If the token is invalid, log the user out.
          handleLogout();
        }
      }
      setIsLoading(false);
    };
    bootstrap();
  }, [token, apiFetch, fetchAppData]);

  // --- Auth Functions ---
  const handleLogout = () => {
    setCurrentUser(null);
    setToken(null);
    setTeams([]);
    setTournaments([]);
    localStorage.removeItem('asl_token');
  };

  const login = async (email: string, dob: string) => {
    const { token: userToken, user } = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, dob }),
    });
    localStorage.setItem('asl_token', userToken);
    setToken(userToken);
    setCurrentUser(user); // The user object is returned from the login endpoint
  };

  const register = async (name: string, email: string, dob: string) => {
    const { token: userToken, user } = await apiFetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, dob }),
    });
    localStorage.setItem('asl_token', userToken);
    setToken(userToken);
    setCurrentUser(user);
  };
  
  // --- Profile and User Functions ---
  const isProfileComplete = (): boolean => {
    if (!currentUser) return false;
    return !!(currentUser.profile.age && currentUser.profile.position && currentUser.profile.imageUrl);
  };

  const updateProfile = async (profile: Partial<PlayerProfile>) => {
    const updatedUser = await apiFetch('/users/profile', {
      method: 'PUT',
      body: JSON.stringify(profile),
    });
    setCurrentUser(prev => prev ? { ...prev, profile: updatedUser.profile } : null);
  };
  
  const getUserById = async (id: string): Promise<User | undefined> => apiFetch(`/users/${id}`);

  // --- Team Functions ---
  const createTeam = async (name: string, logo: string | null): Promise<Team> => {
    const newTeam = await apiFetch('/teams', {
      method: 'POST',
      body: JSON.stringify({ name, logoUrl: logo }),
    });
    setTeams(prev => [...prev, newTeam]);
    return newTeam;
  };
  
  const updateTeam = async (teamId: string, details: { name?: string, logoUrl?: string | null }) => {
    const updatedTeam = await apiFetch(`/teams/${teamId}`, {
        method: 'PUT',
        body: JSON.stringify(details),
    });
    setTeams(prev => prev.map(t => t._id === teamId ? updatedTeam : t));
  };

  const joinTeam = async (code: string): Promise<Team> => {
    const joinedTeam = await apiFetch('/teams/join', {
        method: 'POST',
        body: JSON.stringify({ code }),
    });
    // Add to teams list if not already present
    setTeams(prev => {
        if (prev.some(t => t._id === joinedTeam._id)) {
            return prev.map(t => t._id === joinedTeam._id ? joinedTeam : t);
        }
        return [...prev, joinedTeam];
    });
     if (currentUser) {
        createNotification(
            currentUser._id,
            `You have successfully joined the team: ${joinedTeam.name}.`,
            `/team/${joinedTeam._id}`
        );
    }
    return joinedTeam;
  };
  
  const getTeamById = async (id: string): Promise<Team | undefined> => apiFetch(`/teams/${id}`);
  
  // --- Tournament Functions ---
  const createTournament = async (name: string, logo: string | null): Promise<Tournament> => {
    const newTournament = await apiFetch('/tournaments', {
        method: 'POST',
        body: JSON.stringify({ name, logoUrl: logo }),
    });
    setTournaments(prev => [...prev, newTournament]);
    return newTournament;
  };

  const updateTournament = async (tournamentId: string, details: { name?: string, logoUrl?: string | null }) => {
    const updatedTournament = await apiFetch(`/tournaments/${tournamentId}`, {
        method: 'PUT',
        body: JSON.stringify(details),
    });
    setTournaments(prev => prev.map(t => t._id === tournamentId ? updatedTournament : t));
  };
  
  const getTournamentById = async (id: string): Promise<Tournament | undefined> => apiFetch(`/tournaments/${id}`);
  
  const joinTournament = async (inviteCode: string, teamId: string) => {
      const result = await apiFetch('/tournaments/join', {
          method: 'POST',
          body: JSON.stringify({ inviteCode, teamId }),
      });
      if(result.success && result.tournamentId) {
          const joinedTournament = await getTournamentById(result.tournamentId);
          const teamForNotif = await getTeamById(teamId);

          if (joinedTournament) {
              setTournaments(prev => {
                  if (prev.some(t => t._id === joinedTournament._id)) {
                      return prev.map(t => t._id === joinedTournament._id ? joinedTournament : t);
                  }
                  return [...prev, joinedTournament];
              });

              if (teamForNotif) {
                   teamForNotif.members.forEach(member => {
                      if(member) {
                         createNotification(
                              member._id,
                              `Your team, ${teamForNotif.name}, has joined the tournament: ${joinedTournament.name}.`,
                              `/tournament/${joinedTournament._id}`
                          );
                      }
                  });
              }
          } else {
               await fetchAppData(); // Fallback if getting by ID fails
          }
      }
      return result;
  };

  // --- Admin & Management Functions ---
  const addMemberToTeam = async (teamId: string, memberId: string) => {
      const result = await apiFetch(`/teams/${teamId}/members`, {
          method: 'POST',
          body: JSON.stringify({ memberId })
      });
      if (result.success && result.team) {
          setTeams(prev => prev.map(t => t._id === teamId ? result.team : t));
          createNotification(
              memberId,
              `You have been added to the team: ${result.team.name}.`,
              `/team/${teamId}`
          );
      }
      return result;
  };
  
  const removeMemberFromTeam = async (teamId: string, memberId: string) => {
      const result = await apiFetch(`/teams/${teamId}/members/${memberId}`, { method: 'DELETE' });
      if (result.success && result.team) {
          setTeams(prev => prev.map(t => t._id === teamId ? result.team : t));
      }
      return result;
  };
  
  const toggleTeamAdmin = async (teamId: string, memberId: string) => {
      const result = await apiFetch(`/teams/${teamId}/admins/${memberId}`, { method: 'PUT' });
      if (result.success && result.team) {
          setTeams(prev => prev.map(t => t._id === teamId ? result.team : t));
          const isNowAdmin = result.team.adminIds.some((admin: User) => admin._id === memberId);
          if (isNowAdmin) {
               createNotification(
                  memberId,
                  `You have been made an admin of the team: ${result.team.name}.`,
                  `/team/${teamId}`
              );
          } else {
               createNotification(
                  memberId,
                  `Your admin rights have been revoked for the team: ${result.team.name}.`,
                  `/team/${teamId}`
              );
          }
      }
      return result;
  };
  
  const setTeamRole = async (teamId: string, memberId: string, role: 'captain' | 'viceCaptain') => {
      const result = await apiFetch(`/teams/${teamId}/roles`, {
          method: 'PUT',
          body: JSON.stringify({ memberId, role }),
      });
      if (result.success && result.team) {
          setTeams(prev => prev.map(t => t._id === teamId ? result.team : t));
          const roleName = role === 'captain' ? 'Captain' : 'Vice-Captain';
          const roleIsSet = (role === 'captain' && result.team.captainId?._id === memberId) || (role === 'viceCaptain' && result.team.viceCaptainId?._id === memberId);

          if (roleIsSet) {
               createNotification(
                  memberId,
                  `You have been appointed as ${roleName} of ${result.team.name}.`,
                  `/team/${teamId}`
              );
          } else {
               createNotification(
                  memberId,
                  `You are no longer the ${roleName} of ${result.team.name}.`,
                  `/team/${teamId}`
              );
          }
      }
      return result;
  };

  const addTeamToTournament = async (tournamentId: string, teamCodeOrId: string) => {
      const oldTournament = tournaments.find(t => t._id === tournamentId);
      const oldTeamIds = new Set(oldTournament?.teams.map(t => t._id));

      const result = await apiFetch(`/tournaments/${tournamentId}/teams`, {
          method: 'POST',
          body: JSON.stringify({ teamCodeOrId }),
      });

      if(result.success) {
          const updatedTournament = await getTournamentById(tournamentId);
          if (updatedTournament) {
              setTournaments(prev => prev.map(t => t._id === tournamentId ? updatedTournament : t));
              const newTeam = updatedTournament.teams.find(t => !oldTeamIds.has(t._id));

              if (newTeam) {
                   newTeam.members.forEach(member => {
                      if (member) {
                          createNotification(
                              member._id,
                              `Your team, ${newTeam.name}, has been added to the tournament: ${updatedTournament.name}.`,
                              `/tournament/${updatedTournament._id}`
                          );
                      }
                  });
              }
          }
      }
      return result;
  };
  
  const scheduleMatches = async (tournamentId: string) => {
      await apiFetch(`/tournaments/${tournamentId}/schedule`, { method: 'POST' });
      const updatedTournament = await getTournamentById(tournamentId);
      if (updatedTournament) {
          setTournaments(prev => prev.map(t => t._id === tournamentId ? updatedTournament : t));
          updatedTournament.teams.forEach(team => {
              team.members.forEach(member => {
                  if (member) {
                      createNotification(
                          member._id,
                          `Fixtures have been released for the tournament: ${updatedTournament.name}. Check your upcoming matches!`,
                          `/tournament/${updatedTournament._id}`
                      );
                  }
              });
          });
      }
  };
  
  const addMatchManually = async (tournamentId: string, matchData: { teamAId: string, teamBId: string, round: string }) => {
      await apiFetch(`/tournaments/${tournamentId}/matches`, {
          method: 'POST',
          body: JSON.stringify(matchData),
      });
      const updatedTournament = await getTournamentById(tournamentId);
      if (updatedTournament) {
          setTournaments(prev => prev.map(t => t._id === tournamentId ? updatedTournament : t));
      }
  };
  
  const updateMatchDetails = async (tournamentId: string, matchId: string, details: any) => {
      const finalDetails = {
          ...details,
          teamAId: details.teamAId?._id, // Send only the ID
          teamBId: details.teamBId?._id
      };
      await apiFetch(`/tournaments/${tournamentId}/matches/${matchId}`, {
          method: 'PUT',
          body: JSON.stringify(finalDetails),
      });
      const updatedTournament = await getTournamentById(tournamentId);
      if (updatedTournament) {
          setTournaments(prev => prev.map(t => t._id === tournamentId ? updatedTournament : t));
          
          const updatedMatch = updatedTournament.matches.find(m => m._id === matchId);
          if (updatedMatch) {
              const teamA = updatedTournament.teams.find(t => t._id === updatedMatch.teamAId._id);
              const teamB = updatedTournament.teams.find(t => t._id === updatedMatch.teamBId._id);

              if (teamA && teamB) {
                   const message = `Match details updated for ${teamA.name} vs ${teamB.name} on ${updatedMatch.date || 'TBD'} at ${updatedMatch.time || 'TBD'}.`;
                  teamA.members.forEach(member => {
                      if (member) createNotification(member._id, message, `/tournament/${tournamentId}`);
                  });
                  teamB.members.forEach(member => {
                      if (member) createNotification(member._id, message, `/tournament/${tournamentId}`);
                  });
              }
          }
      }
  };
  
  const startMatch = async (tournamentId: string, matchId: string) => {
      await apiFetch(`/tournaments/${tournamentId}/matches/${matchId}/start`, { method: 'PUT' });
      const updatedTournament = await getTournamentById(tournamentId);
      if (updatedTournament) {
          setTournaments(prev => prev.map(t => t._id === tournamentId ? updatedTournament : t));
      }
  };

  const endMatch = async (tournamentId: string, matchId: string, penaltyScores?: { penaltyScoreA: number, penaltyScoreB: number }) => {
      await apiFetch(`/tournaments/${tournamentId}/matches/${matchId}/end`, {
          method: 'PUT',
          body: JSON.stringify({ penaltyScores }),
      });
      const updatedTournament = await getTournamentById(tournamentId);
      if (updatedTournament) {
           setTournaments(prev => prev.map(t => t._id === tournamentId ? updatedTournament : t));
           const finishedMatch = updatedTournament.matches.find(m => m._id === matchId);
           if (finishedMatch) {
              const teamA = updatedTournament.teams.find(t => t._id === finishedMatch.teamAId._id);
              const teamB = updatedTournament.teams.find(t => t._id === finishedMatch.teamBId._id);

              if (teamA && teamB) {
                  let resultMessage;
                  if(finishedMatch.winnerId === teamA._id) {
                      resultMessage = `${teamA.name} won against ${teamB.name} (${finishedMatch.scoreA}-${finishedMatch.scoreB}).`;
                  } else if (finishedMatch.winnerId === teamB._id) {
                      resultMessage = `${teamB.name} won against ${teamA.name} (${finishedMatch.scoreB}-${finishedMatch.scoreA}).`;
                  } else {
                      resultMessage = `The match between ${teamA.name} and ${teamB.name} ended in a draw (${finishedMatch.scoreA}-${finishedMatch.scoreB}).`;
                  }
                  const message = `Match Finished: ${resultMessage}`;

                  teamA.members.forEach(member => {
                      if (member) createNotification(member._id, message, `/tournament/${tournamentId}`);
                  });
                  teamB.members.forEach(member => {
                      if (member) createNotification(member._id, message, `/tournament/${tournamentId}`);
                  });
              }
           }
      }
  };

  const recordGoal = async (tournamentId: string, matchId: string, scorerId: string, benefitingTeamId: string, assistId?: string, isOwnGoal?: boolean) => {
      await apiFetch(`/tournaments/${tournamentId}/matches/${matchId}/goals`, {
          method: 'POST',
          body: JSON.stringify({ scorerId, assistId, isOwnGoal, benefitingTeamId }),
      });
      const updatedTournament = await getTournamentById(tournamentId);
      if (updatedTournament) {
          setTournaments(prev => prev.map(t => t._id === tournamentId ? updatedTournament : t));
      }
  };

  const recordCard = async (tournamentId: string, matchId: string, playerId: string, cardType: CardType, teamId: string) => {
      await apiFetch(`/tournaments/${tournamentId}/matches/${matchId}/cards`, {
          method: 'POST',
          body: JSON.stringify({ playerId, cardType, teamId }),
      });
       const updatedTournament = await getTournamentById(tournamentId);
      if (updatedTournament) {
          setTournaments(prev => prev.map(t => t._id === tournamentId ? updatedTournament : t));
      }
  };
  
  const setPlayerOfTheMatch = async (tournamentId: string, matchId: string, playerId: string) => {
      await apiFetch(`/tournaments/${tournamentId}/matches/${matchId}/potm`, {
          method: 'PUT',
          body: JSON.stringify({ playerId }),
      });
      const updatedTournament = await getTournamentById(tournamentId);
      if (updatedTournament) {
          setTournaments(prev => prev.map(t => t._id === tournamentId ? updatedTournament : t));
          const match = updatedTournament.matches.find(m => m._id === matchId);
          if (match && match.playerOfTheMatchId?._id === playerId) {
              const teamA = updatedTournament.teams.find(t => t._id === match.teamAId._id);
              const teamB = updatedTournament.teams.find(t => t._id === match.teamBId._id);
              if (teamA && teamB) {
                  createNotification(
                      playerId,
                      `Congratulations! You've been named Player of the Match for ${teamA.name} vs ${teamB.name}.`,
                      `/tournament/${tournamentId}`
                  );
              }
          }
      }
  };
  
  const markNotificationAsRead = (notificationId: string) => {
      setNotifications(prev => prev.map(n => n._id === notificationId ? {...n, isRead: true} : n));
  };
  
  const markAllNotificationsAsRead = () => {
      if(!currentUser) return;
      setNotifications(prev => prev.map(n => n.userId === currentUser._id ? {...n, isRead: true} : n));
  };


  return (
    <AppContext.Provider value={{ 
        currentUser, teams, tournaments, notifications, isLoading, 
        login, register, logout: handleLogout, isProfileComplete, updateProfile, 
        createTeam, updateTeam, joinTeam, getTeamById, 
        addMemberToTeam, removeMemberFromTeam, toggleTeamAdmin, setTeamRole, 
        getUserById, createTournament, updateTournament, getTournamentById, joinTournament, 
        addTeamToTournament, scheduleMatches, updateMatchDetails, addMatchManually, startMatch, 
        endMatch, recordGoal, recordCard, setPlayerOfTheMatch, 
        createNotification, markNotificationAsRead, markAllNotificationsAsRead 
    }}>
      {children}
    </AppContext.Provider>
  );
};