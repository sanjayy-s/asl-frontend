
import { PlayerPosition, User, MatchStatus } from './types';

// --- USERS ---
export const DEFAULT_USERS: User[] = [
  {
    _id: 'user_1',
    email: 'leo.messi@example.com',
    dob: '1987-06-24',
    profile: {
      name: 'Leo Messi',
      age: 36,
      position: PlayerPosition.FORWARD,
      imageUrl: 'https://i.pravatar.cc/150?u=user_1',
      year: '4th',
      mobile: '111-111-1111'
    }
  },
  {
    _id: 'user_2',
    email: 'cristiano.ronaldo@example.com',
    dob: '1985-02-05',
    profile: {
      name: 'Cristiano Ronaldo',
      age: 39,
      position: PlayerPosition.FORWARD,
      imageUrl: 'https://i.pravatar.cc/150?u=user_2',
      year: '4th',
      mobile: '222-222-2222'
    }
  },
  {
      _id: 'user_3',
      email: 'kevin.debruyne@example.com',
      dob: '1991-06-28',
      profile: {
          name: 'Kevin De Bruyne',
          age: 32,
          position: PlayerPosition.MIDFIELDER,
          imageUrl: 'https://i.pravatar.cc/150?u=user_3',
          year: '3rd'
      }
  },
  {
      _id: 'user_4',
      email: 'virgil.vandijk@example.com',
      dob: '1991-07-08',
      profile: {
          name: 'Virgil van Dijk',
          age: 32,
          position: PlayerPosition.DEFENDER,
          imageUrl: 'https://i.pravatar.cc/150?u=user_4',
          year: '2nd'
      }
  },
];

// --- TEAMS ---
// Using any here because they are not populated yet
export const DEFAULT_TEAMS: any[] = [
  {
    _id: 'team_1',
    name: 'FC Barcelona',
    logoUrl: 'https://i.pravatar.cc/150?u=team_1',
    adminIds: ['user_1'],
    captainId: 'user_1',
    viceCaptainId: 'user_3',
    members: ['user_1', 'user_3'],
    inviteCode: 'FCB2024'
  },
  {
    _id: 'team_2',
    name: 'Real Madrid',
    logoUrl: 'https://i.pravatar.cc/150?u=team_2',
    adminIds: ['user_2'],
    captainId: 'user_2',
    viceCaptainId: 'user_4',
    members: ['user_2', 'user_4'],
    inviteCode: 'RMA2024'
  }
];

// --- TOURNAMENTS ---
export const DEFAULT_TOURNAMENTS: any[] = [
    {
        _id: 'tourn_1',
        name: 'Champions League',
        logoUrl: 'https://i.pravatar.cc/150?u=tourn_1',
        adminId: 'user_1',
        teams: ['team_1', 'team_2'],
        isSchedulingDone: true,
        inviteCode: 'UCLSEASON1',
        matches: [
            {
                _id: 'match_1',
                matchNumber: 1,
                teamAId: 'team_1',
                teamBId: 'team_2',
                date: '2024-08-01',
                time: '20:00',
                scoreA: 2,
                scoreB: 1,
                status: MatchStatus.FINISHED,
                goals: [
                    { _id: 'goal_1', scorerId: 'user_1', assistId: 'user_3', minute: 25, isOwnGoal: false, teamId: 'team_1'},
                    { _id: 'goal_2', scorerId: 'user_2', minute: 40, isOwnGoal: false, teamId: 'team_2'},
                    { _id: 'goal_3', scorerId: 'user_1', minute: 88, isOwnGoal: false, teamId: 'team_1'},
                ],
                cards: [
                    { _id: 'card_1', playerId: 'user_4', minute: 60, type: 'Yellow', teamId: 'team_2'}
                ],
                round: 'Final',
                winnerId: 'team_1',
                playerOfTheMatchId: 'user_1'
            }
        ]
    }
];

export const DEFAULT_NOTIFICATIONS: any[] = [];