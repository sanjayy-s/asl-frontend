

export enum PlayerPosition {
  FORWARD = 'Forward',
  MIDFIELDER = 'Midfielder',
  DEFENDER = 'Defender',
  GOALKEEPER = 'Goalkeeper',
}

export interface PlayerProfile {
  name: string;
  age: number | null;
  position: PlayerPosition | null;
  imageUrl: string | null;
  year?: string;
  mobile?: string;
}

export interface User {
  _id: string; 
  email: string;
  dob: string; // YYYY-MM-DD
  profile: PlayerProfile;
  token?: string; // Token can be attached on login/register
}

export interface Team {
  _id: string; 
  name: string;
  logoUrl: string | null;
  adminIds: string[]; 
  captainId?: string;
  viceCaptainId?: string;
  members: User[];
  inviteCode: string;
}

export interface Goal {
  _id?: string;
  scorerId: User;
  assistId?: User;
  minute: number;
  isOwnGoal: boolean;
  teamId: string; // The ID of the team that benefits from the goal
}

export enum CardType {
  YELLOW = 'Yellow',
  RED = 'Red',
}

export interface Card {
  _id?: string;
  playerId: User;
  minute: number;
  type: CardType;
  teamId: string;
}

export enum MatchStatus {
    SCHEDULED = 'Scheduled',
    LIVE = 'Live',
    FINISHED = 'Finished'
}

export interface Match {
  _id: string; 
  matchNumber: number;
  teamAId: Team;
  teamBId: Team;
  date?: string;
  time?: string;
  scoreA: number;
  scoreB: number;
  penaltyScoreA?: number;
  penaltyScoreB?: number;
  status: MatchStatus;
  goals: Goal[];
  cards: Card[];
  round: string; // e.g., "Group Stage", "Quarter-final"
  winnerId?: string | null; // null for a draw
  playerOfTheMatchId?: User;
}

export interface Tournament {
  _id: string; 
  name: string;
  logoUrl: string | null;
  adminId: string;
  teams: Team[];
  matches: Match[];
  isSchedulingDone?: boolean;
  inviteCode: string;
}

export interface Notification {
  _id: string; 
  userId: string;
  message: string;
  link: string;
  isRead: boolean;
  createdAt: string;
}

// This is the interface for what AppContext provides.
// It's used by the `useAppContext` hook.
export interface AppContextType {
  currentUser: User | null;
  teams: Team[];
  tournaments: Tournament[];
  notifications: Notification[];
  isLoading: boolean;
  login: (email: string, dob: string) => Promise<void>;
  register: (name: string, email: string, dob: string) => Promise<void>;
  logout: () => void;
  isProfileComplete: () => boolean;
  updateProfile: (profile: Partial<PlayerProfile>) => Promise<void>;
  createTeam: (name: string, logo: string | null) => Promise<Team>;
  updateTeam: (teamId: string, details: { name?: string, logoUrl?: string | null }) => Promise<void>;
  joinTeam: (code: string) => Promise<Team>;
  addMemberToTeam: (teamId: string, memberId: string) => Promise<{ success: boolean; message: string }>;
  removeMemberFromTeam: (teamId: string, memberId: string) => Promise<{ success: boolean; message: string }>;
  toggleTeamAdmin: (teamId: string, memberId: string) => Promise<{ success: boolean; message: string }>;
  setTeamRole: (teamId: string, memberId: string, role: 'captain' | 'viceCaptain') => Promise<void>;
  getTeamById: (id: string) => Promise<Team | undefined>;
  getUserById: (id: string) => Promise<User | undefined>;
  createTournament: (name: string, logo: string | null) => Promise<Tournament>;
  updateTournament: (tournamentId: string, details: { name?: string, logoUrl?: string | null }) => Promise<void>;
  getTournamentById: (id: string) => Promise<Tournament | undefined>;
  joinTournament: (inviteCode: string, teamId: string) => Promise<{ success: boolean; message: string; tournamentId?: string }>;
  addTeamToTournament: (tournamentId: string, teamCodeOrId: string) => Promise<{ success: boolean; message: string }>;
  scheduleMatches: (tournamentId: string) => Promise<void>;
  updateMatchDetails: (tournamentId: string, matchId: string, details: Partial<Pick<Match, 'teamAId' | 'teamBId' | 'date' | 'time'>>) => Promise<void>;
  addMatchManually: (tournamentId: string, matchData: { teamAId: string, teamBId: string, round: string }) => Promise<void>;
  startMatch: (tournamentId: string, matchId: string) => Promise<void>;
  endMatch: (tournamentId: string, matchId: string, penaltyScores?: { penaltyScoreA: number, penaltyScoreB: number }) => Promise<void>;
  recordGoal: (tournamentId: string, matchId: string, scorerId: string, assistId?: string, isOwnGoal?: boolean) => Promise<void>;
  recordCard: (tournamentId: string, matchId: string, playerId: string, cardType: CardType) => Promise<void>;
  setPlayerOfTheMatch: (tournamentId: string, matchId: string, playerId: string) => Promise<void>;
  markNotificationAsRead: (notificationId: string) => void;
  markAllNotificationsAsRead: () => void;
}