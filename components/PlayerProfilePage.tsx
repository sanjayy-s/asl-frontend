
import React, { useMemo, useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAppContext } from '../hooks/useAppContext';
import { MatchStatus, User, Team } from '../types';
import { FootballIcon } from './common/Icons';

const PlayerProfilePage: React.FC = () => {
  const { playerId } = useParams<{ playerId: string }>();
  const { getUserById, teams, tournaments } = useAppContext();

  const [player, setPlayer] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
      const fetchPlayer = async () => {
          if (!playerId) {
              setError("Player ID not found in URL.");
              setIsLoading(false);
              return;
          }
          try {
              setIsLoading(true);
              const fetchedPlayer = await getUserById(playerId);
              if (fetchedPlayer) {
                  setPlayer(fetchedPlayer);
              } else {
                  setError("Player not found.");
              }
          } catch(err: any) {
              setError(err.message);
          } finally {
              setIsLoading(false);
          }
      };
      fetchPlayer();
  }, [playerId, getUserById]);
  
  const stats = useMemo(() => {
    if (!player) return { matchesPlayed: 0, goals: 0, assists: 0, potm: 0 };
    
    let matchesPlayed = 0;
    let goals = 0;
    let assists = 0;
    let potm = 0;

    tournaments.forEach(tournament => {
      tournament.matches.forEach(match => {
        const teamA = match.teamAId;
        const teamB = match.teamBId;
        const isPlayerInMatch = teamA.members.some(m => m._id === player._id) || teamB.members.some(m => m._id === player._id);
        
        if (isPlayerInMatch && match.status === MatchStatus.FINISHED) {
          matchesPlayed++;
        }
        
        match.goals.forEach(goal => {
          if (goal.scorerId._id === player._id && !goal.isOwnGoal) {
            goals++;
          }
          if (goal.assistId?._id === player._id) {
            assists++;
          }
        });

        if (match.playerOfTheMatchId?._id === player._id) {
          potm++;
        }
      });
    });

    return { matchesPlayed, goals, assists, potm };
  }, [player, tournaments]);

  if (isLoading) {
    return <div className="text-center p-10"><FootballIcon className="h-12 w-12 mx-auto text-green-500 animate-spin"/></div>;
  }
  
  if (error || !player) {
    return <div className="text-center text-red-500 mt-10">{error || 'Player could not be loaded.'}</div>;
  }
  
  const playerTeams = teams.filter(team => team.members.some(m => m._id === player._id));

  return (
    <div className="bg-gray-800 p-6 rounded-lg shadow-lg max-w-4xl mx-auto">
      <div className="flex flex-col md:flex-row items-center gap-6 mb-8">
        <img 
          src={player.profile.imageUrl || `https://picsum.photos/seed/${player._id}/150`} 
          alt="Profile" 
          className="w-40 h-40 rounded-full border-4 border-green-500 object-cover"
        />
        <div className="flex-grow space-y-2 text-center md:text-left">
          <h1 className="text-4xl font-bold">{player.profile.name}</h1>
          <p className="text-lg text-gray-300">{player.email}</p>
        </div>
      </div>
      
      <div className="mt-8 border-t border-gray-700 pt-6">
        <h2 className="text-2xl font-semibold mb-4">Career Statistics</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-center">
            <div className="bg-gray-700 p-4 rounded-lg">
                <p className="text-3xl font-bold text-green-400">{stats.matchesPlayed}</p>
                <p className="text-gray-400">Matches Played</p>
            </div>
             <div className="bg-gray-700 p-4 rounded-lg">
                <p className="text-3xl font-bold text-green-400">{stats.goals}</p>
                <p className="text-gray-400">Goals</p>
            </div>
             <div className="bg-gray-700 p-4 rounded-lg">
                <p className="text-3xl font-bold text-green-400">{stats.assists}</p>
                <p className="text-gray-400">Assists</p>
            </div>
             <div className="bg-gray-700 p-4 rounded-lg">
                <p className="text-3xl font-bold text-green-400">{stats.potm}</p>
                <p className="text-gray-400">Player of the Match</p>
            </div>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-gray-700 pt-6">
         <div>
            <label className="text-sm text-gray-400">Age</label>
            <p className="text-lg">{player.profile.age || 'Not set'}</p>
        </div>
        <div>
            <label className="text-sm text-gray-400">Position</label>
            <p className="text-lg">{player.profile.position || 'Not set'}</p>
        </div>
        <div>
            <label className="text-sm text-gray-400">Year</label>
            <p className="text-lg">{player.profile.year || 'Not set'}</p>
        </div>
        <div>
            <label className="text-sm text-gray-400">Mobile Number</label>
            <p className="text-lg">{player.profile.mobile || 'Not set'}</p>
        </div>
        <div className="md:col-span-2">
            <label className="text-sm text-gray-400">Unique Player ID</label>
            <p className="font-mono bg-gray-900 text-green-400 px-3 py-2 rounded mt-1 inline-block">{player._id}</p>
        </div>
      </div>
      
      <div className="mt-8 border-t border-gray-700 pt-6">
        <h2 className="text-2xl font-semibold mb-4">Teams</h2>
        <div className="space-y-3">
          {playerTeams.length > 0 ? (
            playerTeams.map(team => (
              <Link to={`/team/${team._id}`} key={team._id} className="flex items-center gap-4 bg-gray-700 p-3 rounded-lg hover:bg-gray-600 transition-colors">
                <img src={team.logoUrl || `https://picsum.photos/seed/${team._id}/40`} alt={team.name} className="w-10 h-10 rounded-full object-cover" />
                <span className="font-bold text-lg">{team.name}</span>
              </Link>
            ))
          ) : (
            <p className="text-gray-400">This player is not currently in any team.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlayerProfilePage;
