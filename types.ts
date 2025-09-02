
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
  // passwordHash is backend-only
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
  members: User[]; // Will be populated by the API
  inviteCode: string;
}

export interface Goal {
  _id?: string; // MongoDB subdocuments have IDs
  scorerId: string;
  assistId?: string;
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
  playerId: string;
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
  teamAId: string | Team; // Can be populated
  teamBId: string | Team; // Can be populated
  date?: string;
  time?: string;
  scoreA: number;
  scoreB: number;
  status: MatchStatus;
  goals: Goal[];
  cards: Card[];
  round: string; // e.g., "Group Stage", "Quarter-final"
  winnerId?: string | null; // null for a draw
  playerOfTheMatchId?: string;
}

export interface Tournament {
  _id: string; 
  name: string;
  logoUrl: string | null;
  adminId: string;
  teams: Team[]; // Will be populated
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
