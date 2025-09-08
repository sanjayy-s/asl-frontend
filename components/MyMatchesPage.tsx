
import React, { useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAppContext } from '../hooks/useAppContext';
import { Match, MatchStatus, Team, Tournament, User } from '../types';

const MatchCard: React.FC<{ match: Match }> = ({ match }) => {
    const { tournaments } = useAppContext();
    const teamA = match.teamAId;
    const teamB = match.teamBId;

    const tournament = tournaments.find(t => t.matches.some(m => m._id === match._id));

    if (!teamA || !teamB || !tournament) return null;

    const getTeamClasses = (teamId: string): string => {
        if (match.status !== MatchStatus.FINISHED) return 'font-semibold';
        if (match.winnerId === teamId) return 'font-bold text-green-400';
        if (match.winnerId === null) return 'font-semibold';
        return 'font-semibold text-gray-400';
    };

    return (
        <Link to={`/tournament/${tournament._id}`} className="block bg-gray-700 p-4 rounded-lg hover:bg-gray-600 transition-colors">
            <div className="flex items-center justify-between">
                <div className="text-xs text-gray-400">
                    <p>{tournament.name}</p>
                    <p>Match #{match.matchNumber} &bull; {match.round}</p>
                </div>
                {match.status === MatchStatus.LIVE && (
                     <span className="text-xs font-bold text-red-500 bg-red-500/20 px-2 py-1 rounded-full animate-pulse">LIVE</span>
                )}
            </div>
            <div className="flex items-center justify-between mt-3">
                 <div className="flex items-center gap-3 w-2/5">
                    <img src={teamA.logoUrl || `https://picsum.photos/seed/${teamA._id}/32`} className="w-8 h-8 rounded-full object-cover" alt={teamA.name}/>
                    <span className={getTeamClasses(teamA._id)}>{teamA.name}</span>
                </div>
                {match.status === MatchStatus.FINISHED ? (
                     <div className="text-center">
                        <div className="font-bold text-xl">{match.scoreA} - {match.scoreB}</div>
                        <div className="text-xs text-gray-400">{match.winnerId === null ? 'Draw' : 'Final'}</div>
                    </div>
                ) : match.status === MatchStatus.LIVE ? (
                    <div className="text-center font-bold text-xl">{match.scoreA} - {match.scoreB}</div>
                ) : (
                    <div className="text-center text-gray-400 text-sm">
                        <div>{match.date || 'TBD'}</div>
                        <div>{match.time || ' '}</div>
                    </div>
                )}
                <div className="flex items-center gap-3 w-2/5 justify-end">
                    <span className={`${getTeamClasses(teamB._id)} text-right`}>{teamB.name}</span>
                    <img src={teamB.logoUrl || `https://picsum.photos/seed/${teamB._id}/32`} className="w-8 h-8 rounded-full object-cover" alt={teamB.name}/>
                </div>
            </div>
        </Link>
    );
}

type MatchView = 'upcoming' | 'live' | 'past';

const MyMatchesPage: React.FC = () => {
    const { currentUser, tournaments } = useAppContext();
    const [searchParams, setSearchParams] = useSearchParams();

    const activeView = (searchParams.get('view') as MatchView) || 'upcoming';

    const myMatches = useMemo(() => {
        if (!currentUser) return [];
        
        const processedMatches: Match[] = [];

        // Iterate through each tournament to maintain context for finding full team data
        tournaments.forEach(tournament => {
            if (!tournament.teams || tournament.teams.length === 0) return;

            // Iterate through matches within that tournament
            tournament.matches.forEach(match => {
                const teamAId = match.teamAId?._id;
                const teamBId = match.teamBId?._id;

                // Find the complete team objects from the tournament's top-level `teams` array,
                // which is guaranteed to be populated with members.
                const fullTeamA = tournament.teams.find(t => t._id === teamAId);
                const fullTeamB = tournament.teams.find(t => t._id === teamBId);

                // Defensive check: if we can't find the full teams, or they have no members, skip.
                if (!fullTeamA || !fullTeamB || !fullTeamA.members || !fullTeamB.members) {
                    return;
                }

                // Check if the current user is a member of either team
                const isUserInMatch = 
                    fullTeamA.members.some(m => m?._id === currentUser._id) ||
                    fullTeamB.members.some(m => m?._id === currentUser._id);

                if (isUserInMatch) {
                    // Create a new match object for the UI, ensuring it has the fully populated team data.
                    // This is what will be passed to MatchCard.
                    processedMatches.push({
                        ...match,
                        teamAId: fullTeamA,
                        teamBId: fullTeamB
                    });
                }
            });
        });
        
        return processedMatches;
    }, [currentUser, tournaments]);
    
    const upcomingMatches = myMatches.filter(m => m.status === MatchStatus.SCHEDULED).sort((a,b) => (a.date || '').localeCompare(b.date || '') || (a.time || '').localeCompare(b.time || ''));
    const liveMatches = myMatches.filter(m => m.status === MatchStatus.LIVE);
    const pastMatches = myMatches.filter(m => m.status === MatchStatus.FINISHED).sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.time || '').localeCompare(a.time || ''));

    const matchesToDisplay = {
        upcoming: upcomingMatches,
        live: liveMatches,
        past: pastMatches
    }[activeView];

    const handleTabClick = (view: MatchView) => {
        setSearchParams({ view });
    };

    return (
        <div className="bg-gray-800 p-4 sm:p-6 rounded-lg shadow-lg">
            <h1 className="text-3xl font-bold mb-6">My Matches</h1>
            
            <div className="border-b border-gray-700 mb-6">
                <nav className="flex space-x-4">
                    <button
                        onClick={() => handleTabClick('upcoming')}
                        className={`capitalize py-2 px-4 font-semibold rounded-t-lg ${activeView === 'upcoming' ? 'bg-gray-700 text-green-400' : 'text-gray-400 hover:bg-gray-700/50'}`}
                    >
                        Upcoming ({upcomingMatches.length})
                    </button>
                    <button
                        onClick={() => handleTabClick('live')}
                        className={`capitalize py-2 px-4 font-semibold rounded-t-lg ${activeView === 'live' ? 'bg-gray-700 text-green-400' : 'text-gray-400 hover:bg-gray-700/50'}`}
                    >
                        Live ({liveMatches.length})
                    </button>
                    <button
                        onClick={() => handleTabClick('past')}
                        className={`capitalize py-2 px-4 font-semibold rounded-t-lg ${activeView === 'past' ? 'bg-gray-700 text-green-400' : 'text-gray-400 hover:bg-gray-700/50'}`}
                    >
                        Past ({pastMatches.length})
                    </button>
                </nav>
            </div>
            
            <div className="space-y-4">
                {matchesToDisplay.length > 0 ? (
                    matchesToDisplay.map(match => (
                        <MatchCard key={match._id} match={match} />
                    ))
                ) : (
                    <div className="text-center py-10 text-gray-400">
                        <p className="text-lg">No {activeView} matches found.</p>
                        <p>Check back later or join a team/tournament!</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MyMatchesPage;
