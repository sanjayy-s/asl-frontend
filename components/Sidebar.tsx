import React, { useState, useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import { useAppContext } from '../hooks/useAppContext';
import { TrophyIcon } from './common/Icons';
import { Team, Tournament, User } from '../types';

const ChevronDownIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 transition-transform duration-200 ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
);

const Sidebar: React.FC = () => {
    const { currentUser, teams, tournaments } = useAppContext();
    const [isMatchesOpen, setIsMatchesOpen] = useState(true);

    const myTeams = useMemo(() => {
        if (!currentUser || !teams) return [];
        return teams.filter(team =>
            team.adminIds.includes(currentUser._id) ||
            (team.members || []).some(member => (typeof member === 'string' ? member : member._id) === currentUser._id)
        );
    }, [currentUser, teams]);

    const myTournaments = useMemo(() => {
        if (!currentUser || !tournaments || !myTeams) return [];
        
        const myTeamIds = new Set(myTeams.map(t => t._id));

        const relevantTournaments = tournaments.filter(tourn => {
            const teamsInTournament = (tourn.teams || []).map(t => typeof t === 'string' ? t : t._id);
            return (
                // User is the admin
                tourn.adminId === currentUser._id || 
                // Or one of the user's teams is in the tournament
                teamsInTournament.some(teamId => myTeamIds.has(teamId))
            );
        });

        // Remove duplicates in case user is admin and also a participant
        return [...new Map(relevantTournaments.map(item => [item._id, item])).values()];
    }, [currentUser, tournaments, myTeams]);
    
    if (!currentUser) return null;

    const navLinkClasses = ({ isActive }: { isActive: boolean }) =>
        `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
        isActive
            ? 'bg-green-600/80 text-white'
            : 'text-gray-300 hover:bg-gray-700 hover:text-white'
        }`;
    
    const subNavLinkClasses = ({ isActive }: { isActive: boolean }) =>
        `flex items-center gap-3 pl-9 pr-3 py-2 rounded-md text-sm font-medium transition-colors ${
        isActive
            ? 'bg-gray-700 text-white'
            : 'text-gray-400 hover:bg-gray-600 hover:text-white'
        }`;

    return (
        <aside className="w-64 bg-gray-800 p-4 flex-shrink-0 border-r border-gray-700 overflow-y-auto">
            <nav className="space-y-6">
                <div>
                    <h3 className="px-3 text-xs uppercase text-gray-400 font-bold mb-2 tracking-wider">My Teams</h3>
                    <ul className="space-y-1">
                        {myTeams.map(team => (
                            <li key={team._id}>
                                <NavLink to={`/team/${team._id}`} className={navLinkClasses}>
                                    <img src={team.logoUrl || `https://picsum.photos/seed/${team._id}/30`} className="h-6 w-6 rounded-full object-cover" alt={team.name} />
                                    <span className="truncate">{team.name}</span>
                                </NavLink>
                            </li>
                        ))}
                         {myTeams.length === 0 && <p className="px-3 text-sm text-gray-500">No teams yet.</p>}
                    </ul>
                </div>

                <div>
                    <button 
                        onClick={() => setIsMatchesOpen(!isMatchesOpen)}
                        className="w-full flex items-center justify-between px-3 py-2 text-xs uppercase text-gray-400 font-bold tracking-wider hover:bg-gray-700/50 rounded-md"
                    >
                        <span>My Matches</span>
                        <ChevronDownIcon className={isMatchesOpen ? 'rotate-180' : ''} />
                    </button>
                    {isMatchesOpen && (
                         <ul className="space-y-1 mt-2">
                            <li>
                                <NavLink to="/matches?view=upcoming" className={subNavLinkClasses}>
                                    Upcoming
                                </NavLink>
                            </li>
                             <li>
                                <NavLink to="/matches?view=live" className={subNavLinkClasses}>
                                    Live
                                </NavLink>
                            </li>
                             <li>
                                <NavLink to="/matches?view=past" className={subNavLinkClasses}>
                                    Past
                                </NavLink>
                            </li>
                        </ul>
                    )}
                </div>

                <div>
                    <h3 className="px-3 text-xs uppercase text-gray-400 font-bold mb-2 tracking-wider">My Tournaments</h3>
                     <ul className="space-y-1">
                        {myTournaments.map(tournament => (
                            <li key={tournament._id}>
                                <NavLink to={`/tournament/${tournament._id}`} className={navLinkClasses}>
                                     <TrophyIcon className="h-5 w-5" />
                                    <span className="truncate">{tournament.name}</span>
                                </NavLink>
                            </li>
                        ))}
                         {myTournaments.length === 0 && <p className="px-3 text-sm text-gray-500">No tournaments yet.</p>}
                    </ul>
                </div>
            </nav>
        </aside>
    );
}

export default Sidebar;