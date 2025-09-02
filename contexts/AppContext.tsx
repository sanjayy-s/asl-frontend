import React, { createContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { User, PlayerProfile, Team, Tournament, Match, CardType, Notification, MatchStatus } from '../types';

// In a real build process, this would be in a .env file
const API_URL = 'http://localhost:5001/api';

interface AppContextType {
  currentUser: User | null;
  teams: Team[];
  tournaments: Tournament[];
  notifications: Notification[];
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  isProfileComplete: () => boolean;
  updateProfile: (profile: Partial<PlayerProfile>) => Promise<void>;
  createTeam: (name: string, logo: string | null) => Promise<Team>;
  joinTeam: (code: string) => Promise<Team>;
  addMemberToTeam: (teamId: string, memberId: string) => Promise<{ success: boolean; message: string }>;
  removeMemberFromTeam: (teamId: string, memberId: string) => Promise<{ success: boolean; message: string }>;
  toggleTeamAdmin: (teamId: string, memberId: string) => Promise<{ success: boolean; message: string }>;
  setTeamRole: (teamId: string, memberId: string, role: 'captain' | 'viceCaptain') => Promise<void>;
  getTeamById: (id: string) => Promise<Team | undefined>;
  getUserById: (id: string) => Promise<User | undefined>;
  createTournament: (name: string, logo: string | null) => Promise<Tournament>;
  getTournamentById: (id: string) => Promise<Tournament | undefined>;
  joinTournament: (inviteCode: string, teamId: string) => Promise<{ success: boolean; message: string; tournamentId?: string }>;
  addTeamToTournament: (tournamentId: string, teamCodeOrId: string) => Promise<{ success: boolean; message: string }>;
  scheduleMatches: (tournamentId: string) => Promise<void>;
  updateMatchDetails: (tournamentId: string, matchId: string, details: Partial<Pick<Match, 'teamAId' | 'teamBId' | 'date' | 'time'>>) => Promise<void>;
  addMatchManually: (tournamentId: string, matchData: { teamAId: string, teamBId: string, round: string }) => Promise<void>;
  startMatch: (tournamentId: string, matchId: string) => Promise<void>;
  endMatch: (tournamentId: string, matchId: string) => Promise<void>;
  recordGoal: (tournamentId: string, matchId: string, scorerId: string, assistId?: string, isOwnGoal?: boolean) => Promise<void>;
  recordCard: (tournamentId: string, matchId: string, playerId: string, cardType: CardType) => Promise<void>;
  setPlayerOfTheMatch: (tournamentId: string, matchId: string, playerId: string) => Promise<void>;
  markNotificationAsRead: (notificationId: string) => void;
  markAllNotificationsAsRead: () => void;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);

const apiRequest = async (path: string, method: string = 'GET', body: any = null, token: string | null = null) => {
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const options: RequestInit = {
        method,
        headers,
    };

    if (body) {
        options.body = JSON.stringify(body);
    }
    
    const response = await fetch(`${API_URL}${path}`, options);
    
    if (response.status === 204) { // No Content
        return null;
    }

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || 'An unknown error occurred');
    }

    return data;
};


export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('asl_token'));
  const [teams, setTeams] = useState<Team[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userCache, setUserCache] = useState<Record<string, User>>({});

  const fetchDataForUser = useCallback(async (tkn: string) => {
    // In a larger app, you'd have endpoints like `/api/me/teams` and `/api/me/tournaments`.
    // Since we don't, our strategy is to have components fetch data as needed, and the context
    // will cache it. The sidebar and other components will react to this cache.
  }, []);

  useEffect(() => {
    const bootstrap = async () => {
        if (token) {
            try {
                const user = await apiRequest('/auth/me', 'GET', null, token);
                setCurrentUser(user);
                await fetchDataForUser(token);
            } catch (error) {
                console.error("Session invalid or expired", error);
                handleLogout(); // Use a dedicated logout function
            }
        }
        setIsLoading(false);
    };
    bootstrap();
  }, [token, fetchDataForUser]);
  
  const handleLogout = () => {
    setCurrentUser(null);
    setToken(null);
    setTeams([]);
    setTournaments([]);
    setUserCache({});
    localStorage.removeItem('asl_token');
  };

  const login = async (email: string, password: string) => {
    const data = await apiRequest('/auth/login', 'POST', { email, password });
    if (data.token) {
        localStorage.setItem('asl_token', data.token);
        setToken(data.token);
        setCurrentUser(data);
        await fetchDataForUser(data.token);
    }
  };
  
  const register = async (name: string, email: string, password: string) => {
    const data = await apiRequest('/auth/register', 'POST', { name, email, password });
    if (data.token) {
        localStorage.setItem('asl_token', data.token);
        setToken(data.token);
        setCurrentUser(data);
    }
  };

  const logout = () => {
    handleLogout();
  };

  const isProfileComplete = (): boolean => {
    if (!currentUser) return false;
    return !!(currentUser.profile.age && currentUser.profile.position && currentUser.profile.imageUrl);
  };
  
  const updateProfile = async (profile: Partial<PlayerProfile>) => {
    const updatedUser = await apiRequest('/users/profile', 'PUT', profile, token);
    setCurrentUser(prev => prev ? { ...prev, profile: updatedUser.profile } : null);
  };

  const createTeam = async (name: string, logo: string | null): Promise<Team> => {
    const newTeam = await apiRequest('/teams', 'POST', { name, logoUrl: logo }, token);
    setTeams(prev => [...prev, newTeam]);
    return newTeam;
  };
  
  const joinTeam = async (code: string): Promise<Team> => {
      const joinedTeam = await apiRequest('/teams/join', 'POST', { inviteCode: code }, token);
      setTeams(prev => {
          if (prev.some(t => t._id === joinedTeam._id)) return prev;
          return [...prev, joinedTeam];
      });
      return joinedTeam;
  }

  const getUserById = async (id: string): Promise<User | undefined> => {
      if (userCache[id]) return userCache[id];
      try {
          const user = await apiRequest(`/users/${id}`, 'GET', null, token);
          if (user) {
              setUserCache(prev => ({...prev, [id]: user}));
          }
          return user;
      } catch (error) {
          console.error("Failed to fetch user", error);
          return undefined;
      }
  };
  
  const getTeamById = async (id: string): Promise<Team | undefined> => {
      // Check cache first
      let team = teams.find(t => t._id === id);
      // If cached version doesn't have populated members, it might be stale.
      const isStale = team && team.members.length > 0 && typeof team.members[0] === 'string';

      if(team && !isStale) return team;
      
      try {
          team = await apiRequest(`/teams/${id}`, 'GET', null, token);
          if (team) {
              setTeams(prev => {
                  const existing = prev.find(t => t._id === id);
                  if (existing) return prev.map(t => t._id === id ? team! : t);
                  return [...prev, team!];
              });
          }
          return team;
      } catch(e) {
          console.error(`Failed to fetch team ${id}`, e);
          return undefined;
      }
  }
  
  const updateTournamentInState = (updatedTournament: Tournament) => {
    setTournaments(prev => prev.map(t => t._id === updatedTournament._id ? updatedTournament : t));
  };

  const getTournamentById = async (id: string): Promise<Tournament | undefined> => {
    let tournament = tournaments.find(t => t._id === id);
    if(tournament) return tournament;
    
    try {
        tournament = await apiRequest(`/tournaments/${id}`, 'GET', null, token);
        if (tournament) {
            setTournaments(prev => {
                const existing = prev.find(t => t._id === id);
                if (existing) return prev.map(t => t._id === id ? tournament! : t);
                return [...prev, tournament!];
            });
        }
        return tournament;
    } catch(e) {
        console.error(`Failed to fetch tournament ${id}`, e);
        return undefined;
    }
  }
  
  const createTournament = async (name: string, logo: string | null): Promise<Tournament> => {
      const newTournament = await apiRequest('/tournaments', 'POST', { name, logoUrl: logo }, token);
      setTournaments(prev => [...prev, newTournament]);
      return newTournament;
  };

  const joinTournament = async (inviteCode: string, teamId: string): Promise<{ success: boolean; message: string; tournamentId?: string }> => {
      const result = await apiRequest('/tournaments/join', 'POST', { inviteCode, teamId }, token);
      if (result.success && result.tournamentId) {
          await getTournamentById(result.tournamentId); // Fetch and cache the new tournament
      }
      return result;
  };

  const scheduleMatches = async (tournamentId: string) => {
      const updatedTournament = await apiRequest(`/tournaments/${tournamentId}/schedule`, 'POST', {}, token);
      updateTournamentInState(updatedTournament);
  };
  
  const updateAppContextStateWithMatch = (tournamentId: string, updatedMatch: Match) => {
    setTournaments(prevTournaments => prevTournaments.map(tourn => {
        if (tourn._id === tournamentId) {
            const newMatches = tourn.matches.map(m => m._id === updatedMatch._id ? updatedMatch : m);
            return { ...tourn, matches: newMatches };
        }
        return tourn;
    }));
  };

  const addMemberToTeam = async (teamId: string, memberId: string): Promise<{ success: boolean; message: string }> => {
      const result = await apiRequest(`/teams/${teamId}/members`, 'POST', { memberId }, token);
      if (result.success) await getTeamById(teamId); // refetch
      return result;
  };
  const removeMemberFromTeam = async (teamId: string, memberId: string): Promise<{ success: boolean; message: string }> => {
      const result = await apiRequest(`/teams/${teamId}/members/${memberId}`, 'DELETE', null, token);
      if (result.success) await getTeamById(teamId);
      return result;
  };
  const toggleTeamAdmin = async (teamId: string, memberId: string): Promise<{ success: boolean; message: string }> => {
      const result = await apiRequest(`/teams/${teamId}/admins`, 'PUT', { memberId }, token);
      if (result.success) await getTeamById(teamId);
      return result;
  };
  const setTeamRole = async (teamId: string, memberId: string, role: 'captain' | 'viceCaptain') => {
      await apiRequest(`/teams/${teamId}/roles`, 'PUT', { memberId, role }, token);
      await getTeamById(teamId);
  };
  const addTeamToTournament = async (tournamentId: string, teamCodeOrId: string): Promise<{ success: boolean; message: string }> => {
      const result = await apiRequest(`/tournaments/${tournamentId}/teams`, 'POST', { teamCodeOrId }, token);
      if (result.success) await getTournamentById(tournamentId);
      return result;
  };
  const updateMatchDetails = async (tournamentId: string, matchId: string, details: Partial<Pick<Match, 'teamAId' | 'teamBId' | 'date' | 'time'>>) => {
      const updatedMatch = await apiRequest(`/tournaments/${tournamentId}/matches/${matchId}`, 'PUT', details, token);
      updateAppContextStateWithMatch(tournamentId, updatedMatch);
  };
  const addMatchManually = async (tournamentId: string, matchData: { teamAId: string, teamBId: string, round: string }) => {
      const updatedTournament = await apiRequest(`/tournaments/${tournamentId}/matches`, 'POST', matchData, token);
      updateTournamentInState(updatedTournament);
  };
  const startMatch = async (tournamentId: string, matchId: string) => {
    const updatedMatch = await apiRequest(`/tournaments/${tournamentId}/matches/${matchId}/status`, 'PATCH', { status: MatchStatus.LIVE }, token);
    updateAppContextStateWithMatch(tournamentId, updatedMatch);
  };
  const endMatch = async (tournamentId: string, matchId: string) => {
    const updatedMatch = await apiRequest(`/tournaments/${tournamentId}/matches/${matchId}/status`, 'PATCH', { status: MatchStatus.FINISHED }, token);
    updateAppContextStateWithMatch(tournamentId, updatedMatch);
  };
  const recordGoal = async (tournamentId: string, matchId: string, scorerId: string, assistId?: string, isOwnGoal?: boolean) => {
    const updatedMatch = await apiRequest(`/tournaments/${tournamentId}/matches/${matchId}/goal`, 'POST', { scorerId, assistId, isOwnGoal }, token);
    updateAppContextStateWithMatch(tournamentId, updatedMatch);
  };
  const recordCard = async (tournamentId: string, matchId: string, playerId: string, cardType: CardType) => {
    const updatedMatch = await apiRequest(`/tournaments/${tournamentId}/matches/${matchId}/card`, 'POST', { playerId, cardType }, token);
    updateAppContextStateWithMatch(tournamentId, updatedMatch);
  };
  const setPlayerOfTheMatch = async (tournamentId: string, matchId: string, playerId: string) => {
    const updatedMatch = await apiRequest(`/tournaments/${tournamentId}/matches/${matchId}/potm`, 'PATCH', { playerId }, token);
    updateAppContextStateWithMatch(tournamentId, updatedMatch);
  };
  const markNotificationAsRead = (notificationId: string) => {};
  const markAllNotificationsAsRead = () => {};

  return (
    <AppContext.Provider value={{ currentUser, teams, tournaments, notifications, isLoading, login, register, logout, isProfileComplete, updateProfile, createTeam, joinTeam, addMemberToTeam, removeMemberFromTeam, toggleTeamAdmin, setTeamRole, getTeamById, getUserById, createTournament, getTournamentById, joinTournament, addTeamToTournament, scheduleMatches, updateMatchDetails, addMatchManually, startMatch, endMatch, recordGoal, recordCard, setPlayerOfTheMatch, markNotificationAsRead, markAllNotificationsAsRead }}>
      {children}
    </AppContext.Provider>
  );
};