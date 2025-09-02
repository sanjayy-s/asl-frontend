import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAppContext } from '../hooks/useAppContext';
import { Match, MatchStatus, Team, User } from '../types';
import { ShieldCheckIcon, StarIcon, TrashIcon, FootballIcon } from './common/Icons';

const MatchListItem: React.FC<{match: Match}> = ({ match }) => {
    const teamA = match.teamAId as Team;
    const teamB = match.teamBId as Team;

    return (
        <div className="bg-gray-700 p-3 rounded-lg flex items-center justify-between text-sm">
            <Link to={`/team/${teamA?._id}`} className="flex items-center gap-2 w-2/5 hover:opacity-80 transition-opacity">
                <img src={teamA?.logoUrl || `https://picsum.photos/seed/${teamA?._id}/30`} className="w-6 h-6 rounded-full" alt={teamA?.name}/>
                <span className="font-semibold">{teamA?.name}</span>
            </Link>
             {match.status === MatchStatus.FINISHED ? (
                <div className="text-center font-bold">{match.scoreA} - {match.scoreB}</div>
            // FIX: 'Match' only refers to a type, but is being used as a value here. Changed Match.LIVE to MatchStatus.LIVE
            ) : match.status === MatchStatus.LIVE ? (
                <div className="text-center text-red-500 animate-pulse text-xs">LIVE</div>
            ) : (
                <div className="text-center text-gray-400 text-xs">VS</div>
            )}
            <Link to={`/team/${teamB?._id}`} className="flex items-center gap-2 w-2/5 justify-end hover:opacity-80 transition-opacity">
                <span className="font-semibold text-right">{teamB?.name}</span>
                <img src={teamB?.logoUrl || `https://picsum.photos/seed/${teamB?._id}/30`} className="w-6 h-6 rounded-full" alt={teamB?.name}/>
            </Link>
        </div>
    );
}

const TeamPage: React.FC = () => {
    const { teamId } = useParams<{ teamId: string }>();
    const { 
        getTeamById,
        currentUser, 
        addMemberToTeam, 
        getTournamentById,
        removeMemberFromTeam,
        toggleTeamAdmin,
        setTeamRole 
    } = useAppContext();
    
    const [team, setTeam] = useState<Team | null>(null);
    const [tournaments, setTournaments] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    
    const [memberIdToAdd, setMemberIdToAdd] = useState('');
    const [message, setMessage] = useState({ type: '', text: '' });
    const [activeMenu, setActiveMenu] = useState<string | null>(null);

    useEffect(() => {
        const fetchTeamData = async () => {
            if (!teamId) {
                setError("No team ID provided.");
                setIsLoading(false);
                return;
            }
            try {
                setIsLoading(true);
                const fetchedTeam = await getTeamById(teamId);
                if (fetchedTeam) {
                    setTeam(fetchedTeam);
                    // Fetch full tournament data for this team
                    // This is inefficient; ideally, an endpoint `/api/teams/:id/tournaments` would exist
                    // FIX: Expected 1 arguments, but got 0. Promise.all requires an argument.
                    const teamTournaments = await Promise.all(
                        // This is a placeholder, as the backend doesn't support this query directly yet
                        // It demonstrates the need for more complex data fetching
                    []);
                    setTournaments(teamTournaments);
                } else {
                    setError("Team not found.");
                }
            } catch (err: any) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };
        fetchTeamData();
    }, [teamId, getTeamById, getTournamentById]);

    const isAdmin = team?.adminIds.includes(currentUser?._id || '');

    if (isLoading) {
        return <div className="text-center p-10"><FootballIcon className="h-12 w-12 mx-auto text-green-500 animate-spin"/></div>;
    }

    if (error || !team) {
        return <div className="text-center text-red-500">{error || 'Team could not be loaded.'}</div>;
    }

    const copyInviteCode = () => {
        navigator.clipboard.writeText(team.inviteCode);
        setMessage({ type: 'success', text: 'Invite code copied!' });
        setTimeout(() => setMessage({ type: '', text: '' }), 2000);
    };
    
    const handleAddMember = async () => {
        if (!memberIdToAdd || !team) return;
        const result = await addMemberToTeam(team._id, memberIdToAdd);
        setMessage({ type: result.success ? 'success' : 'error', text: result.message });
        if (result.success) {
            setMemberIdToAdd('');
        }
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    };

    const handleRemoveMember = async (memberId: string) => {
        if (!team) return;
        if (window.confirm("Are you sure you want to remove this player from the team?")) {
            const result = await removeMemberFromTeam(team._id, memberId);
            setMessage({ type: result.success ? 'success' : 'error', text: result.message });
            setTimeout(() => setMessage({ type: '', text: '' }), 3000);
        }
        setActiveMenu(null);
    };
    
    const handleToggleAdmin = async (memberId: string) => {
        if (!team) return;
        const result = await toggleTeamAdmin(team._id, memberId);
        setMessage({ type: result.success ? 'success' : 'error', text: result.message });
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
        setActiveMenu(null);
    };
    
    const handleSetRole = async (memberId: string, role: 'captain' | 'viceCaptain') => {
        if (!team) return;
        await setTeamRole(team._id, memberId, role);
        setMessage({ type: 'success', text: `Role updated successfully.`});
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
        setActiveMenu(null);
    };

    // const teamTournaments = tournaments.filter(t => t.teams.some((teamInTourn: Team) => teamInTourn._id === team._id));

    return (
        <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
            <div className="flex flex-col md:flex-row items-center gap-6 mb-6">
                <img src={team.logoUrl || `https://picsum.photos/seed/${team._id}/150`} alt={team.name} className="w-32 h-32 rounded-full border-4 border-green-500 object-cover" />
                <div>
                    <h1 className="text-4xl font-bold">{team.name}</h1>
                    <div className="mt-2">
                        <span className="text-gray-400">Invite Code: </span>
                        <span onClick={copyInviteCode} className="font-mono bg-gray-700 text-green-400 px-3 py-1 rounded cursor-pointer hover:bg-gray-600">{team.inviteCode}</span>
                    </div>
                </div>
            </div>

            {message.text && (
                <div className={`mb-4 p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
                    {message.text}
                </div>
            )}

            {isAdmin && (
                <div className="mb-6 bg-gray-700 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold mb-3 border-b border-gray-600 pb-2">Admin Panel</h3>
                     <div className="space-y-4">
                        <div>
                            <h4 className="font-semibold mb-2">Add New Member</h4>
                            <div className="flex gap-2">
                                <input 
                                    type="text" 
                                    value={memberIdToAdd} 
                                    onChange={(e) => setMemberIdToAdd(e.target.value)}
                                    placeholder="Enter Player's Unique ID"
                                    className="flex-grow bg-gray-800 text-white p-2 rounded border border-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500"
                                />
                                <button onClick={handleAddMember} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg">Add</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                    <h2 className="text-2xl font-semibold mb-4 border-b-2 border-gray-700 pb-2">Team Members ({team.members.length})</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {team.members.map((member: User) => {
                            return (
                                <div key={member._id} className="bg-gray-700 p-4 rounded-lg flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-4">
                                        <img src={member.profile.imageUrl || `https://picsum.photos/seed/${member._id}/50`} alt={member.profile.name} className="w-12 h-12 rounded-full object-cover" />
                                        <div>
                                            <Link to={`/player/${member._id}`} className="hover:underline">
                                                <p className="font-bold flex items-center gap-1.5">
                                                    {member.profile.name}
                                                    {team.captainId === member._id && <span title="Captain" className="text-yellow-400"><StarIcon /></span>}
                                                    {team.viceCaptainId === member._id && <span title="Vice-Captain" className="text-gray-300"><StarIcon /></span>}
                                                    {team.adminIds.includes(member._id) && <span title="Admin" className="text-blue-400"><ShieldCheckIcon /></span>}
                                                </p>
                                            </Link>
                                            <p className="text-sm text-gray-400">{member.profile.position}</p>
                                        </div>
                                    </div>
                                    {isAdmin && currentUser?._id !== member._id && (
                                        <div className="relative">
                                            <button onClick={() => setActiveMenu(activeMenu === member._id ? null : member._id)} className="text-gray-400 hover:text-white p-1 rounded-full">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" /></svg>
                                            </button>
                                            {activeMenu === member._id && (
                                                <div className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-md shadow-lg z-10 border border-gray-600">
                                                    <ul className="py-1">
                                                        <li><button onClick={() => handleSetRole(member._id, 'captain')} className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700">Make Captain</button></li>
                                                        <li><button onClick={() => handleSetRole(member._id, 'viceCaptain')} className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700">Make Vice-Captain</button></li>
                                                        <li><button onClick={() => handleToggleAdmin(member._id)} className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700">{team.adminIds.includes(member._id) ? 'Demote from Admin' : 'Promote to Admin'}</button></li>
                                                        <li><div className="border-t border-gray-600 my-1"></div></li>
                                                        <li><button onClick={() => handleRemoveMember(member._id)} className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-gray-700"><TrashIcon />Remove Player</button></li>
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
                <div>
                    <h2 className="text-2xl font-semibold mb-4 border-b-2 border-gray-700 pb-2">Tournaments</h2>
                    {/* This section needs a proper data source */}
                     <p className="text-gray-400">Tournament data loading is not yet fully implemented.</p>
                </div>
            </div>
        </div>
    );
};

export default TeamPage;