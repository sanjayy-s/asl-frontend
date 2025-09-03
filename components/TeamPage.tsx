
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAppContext } from '../hooks/useAppContext';
import { Match, MatchStatus, Team, User, Tournament } from '../types';
import { ShieldCheckIcon, StarIcon, TrashIcon, FootballIcon, EditIcon } from './common/Icons';

const fileToDataUri = (file: File, maxSize = 256): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (readerEvent) => {
            if (!readerEvent.target?.result) {
                return reject(new Error("Failed to read file."));
            }
            const image = new Image();
            image.onload = () => {
                const canvas = document.createElement('canvas');
                let { width, height } = image;

                if (width > height) {
                    if (width > maxSize) {
                        height = Math.round((height * maxSize) / width);
                        width = maxSize;
                    }
                } else {
                    if (height > maxSize) {
                        width = Math.round((width * maxSize) / height);
                        height = maxSize;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    return reject(new Error('Could not get canvas context'));
                }
                ctx.drawImage(image, 0, 0, width, height);
                // Use JPEG for compression, 85% quality is a good balance
                const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
                resolve(dataUrl);
            };
            image.onerror = reject;
            image.src = readerEvent.target.result as string;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

const getOrdinal = (n: number | string) => {
    if (typeof n !== 'number') return '';
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return s[(v - 20) % 10] || s[v] || s[0];
};

const calculatePointsTable = (matches: Match[], teams: Team[]) => {
    const stats: { [key: string]: { p: number, w: number, d: number, l: number, pts: number, gf: number, ga: number } } = {};
    teams.forEach(t => { stats[t._id] = { p: 0, w: 0, d: 0, l: 0, pts: 0, gf: 0, ga: 0 }; });

    matches.filter(m => m.status === MatchStatus.FINISHED).forEach(m => {
        if (!m.teamAId?._id || !m.teamBId?._id) return; // a little safeguard
        const teamAId = m.teamAId._id;
        const teamBId = m.teamBId._id;
        
        if(stats[teamAId]) {
            stats[teamAId].p++;
            stats[teamAId].gf += m.scoreA;
            stats[teamAId].ga += m.scoreB;
        }
        if(stats[teamBId]) {
            stats[teamBId].p++;
            stats[teamBId].gf += m.scoreB;
            stats[teamBId].ga += m.scoreA;
        }

        if (m.winnerId === teamAId) {
            if(stats[teamAId]) { stats[teamAId].w++; stats[teamAId].pts += 3; }
            if(stats[teamBId]) { stats[teamBId].l++; }
        } else if (m.winnerId === teamBId) {
            if(stats[teamBId]) { stats[teamBId].w++; stats[teamBId].pts += 3; }
            if(stats[teamAId]) { stats[teamAId].l++; }
        } else { 
            if(stats[teamAId]) { stats[teamAId].d++; stats[teamAId].pts++; }
            if(stats[teamBId]) { stats[teamBId].d++; stats[teamBId].pts++; }
        }
    });

    return teams.map(t => {
        const teamStats = stats[t._id] || { p: 0, w: 0, d: 0, l: 0, pts: 0, gf: 0, ga: 0 };
        const gd = teamStats.gf - teamStats.ga;
        return { ...t, ...teamStats, gd };
    }).sort((a, b) => {
        if (b.pts !== a.pts) return b.pts - a.pts;
        return b.gd - a.gd;
    });
};

const TeamPage: React.FC = () => {
    const { teamId } = useParams<{ teamId: string }>();
    const { 
        getTeamById,
        currentUser, 
        addMemberToTeam, 
        tournaments: allTournaments,
        teams,
        removeMemberFromTeam,
        toggleTeamAdmin,
        setTeamRole,
        updateTeam
    } = useAppContext();
    
    const [team, setTeam] = useState<Team | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    
    const [memberIdToAdd, setMemberIdToAdd] = useState('');
    const [message, setMessage] = useState({ type: '', text: '' });
    const [activeMenu, setActiveMenu] = useState<string | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

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
    }, [teamId, getTeamById, allTournaments, teams]);

    const isAdmin = team?.adminIds.includes(currentUser?._id || '');
    
    const teamTournaments = useMemo(() => {
        if (!team) return [];
        return allTournaments.filter(t => t.teams.some((teamInTourn: Team) => teamInTourn._id === team._id))
    }, [team, allTournaments]);

    const stats = useMemo(() => {
        if (!team || !allTournaments) {
            return {
                matchesPlayed: 0, wins: 0, losses: 0, draws: 0,
                topScorer: null as { player: User, goals: number } | null,
                topAssister: null as { player: User, assists: number } | null,
                tournamentPositions: [] as { tournamentName: string, position: number | string }[],
            };
        }

        const goalCounts: { [key: string]: number } = {};
        const assistCounts: { [key: string]: number } = {};
        team.members.forEach(m => {
            goalCounts[m._id] = 0;
            assistCounts[m._id] = 0;
        });

        let wins = 0, losses = 0, draws = 0, matchesPlayed = 0;

        const teamMatches = allTournaments.flatMap(t => t.matches).filter(m => m.teamAId._id === team._id || m.teamBId._id === team._id);

        teamMatches.filter(m => m.status === MatchStatus.FINISHED).forEach(match => {
            matchesPlayed++;
            if (match.winnerId === team._id) wins++;
            else if (match.winnerId === null) draws++;
            else losses++;

            match.goals.forEach(goal => {
                if (team.members.some(m => m._id === goal.scorerId._id) && !goal.isOwnGoal) {
                    goalCounts[goal.scorerId._id]++;
                }
                if (goal.assistId && team.members.some(m => m._id === goal.assistId._id)) {
                    assistCounts[goal.assistId._id]++;
                }
            });
        });

        const topScorerId = Object.keys(goalCounts).length ? Object.keys(goalCounts).reduce((a, b) => goalCounts[a] > goalCounts[b] ? a : b) : null;
        const topAssisterId = Object.keys(assistCounts).length ? Object.keys(assistCounts).reduce((a, b) => assistCounts[a] > assistCounts[b] ? a : b) : null;

        const topScorer = topScorerId ? { player: team.members.find(m => m._id === topScorerId)!, goals: goalCounts[topScorerId] } : null;
        const topAssister = topAssisterId ? { player: team.members.find(m => m._id === topAssisterId)!, assists: assistCounts[topAssisterId] } : null;

        const tournamentPositions = teamTournaments.map(tourn => {
            const knockoutRounds = ['Final', 'Semi-Final', 'Quarter-Final', 'Eliminator'];
            const tableData = calculatePointsTable(tourn.matches.filter(m => !knockoutRounds.includes(m.round)), tourn.teams);
            const teamRank = tableData.findIndex(t => t._id === team._id) + 1;
            return { tournamentName: tourn.name, position: teamRank > 0 ? teamRank : 'N/A' };
        });

        return { matchesPlayed, wins, losses, draws, topScorer: (topScorer && topScorer.goals > 0) ? topScorer : null, topAssister: (topAssister && topAssister.assists > 0) ? topAssister : null, tournamentPositions, };
    }, [team, allTournaments, teamTournaments]);


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

    return (
        <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
            <div className="flex flex-col md:flex-row items-center gap-6 mb-6">
                {team.logoUrl ? (
                    <img src={team.logoUrl} alt={team.name} className="w-32 h-32 rounded-full border-4 border-green-500 object-cover" />
                ) : (
                    <div className="w-32 h-32 rounded-full border-4 border-green-500 bg-gray-700 flex items-center justify-center">
                        <span className="text-5xl font-bold text-gray-500">{team.name.charAt(0)}</span>
                    </div>
                )}
                <div className="flex-grow">
                    <div className="flex items-center gap-4">
                        <h1 className="text-4xl font-bold">{team.name}</h1>
                        {isAdmin && (
                            <button onClick={() => setIsEditModalOpen(true)} className="text-gray-400 hover:text-white" title="Edit Team Details">
                                <EditIcon />
                            </button>
                        )}
                    </div>
                    <div className="mt-2">
                        <span className="text-gray-400">Invite Code: </span>
                        <span onClick={copyInviteCode} className="font-mono bg-gray-700 text-green-400 px-3 py-1 rounded cursor-pointer hover:bg-gray-600">{team.inviteCode}</span>
                    </div>
                </div>
            </div>
            
            <div className="my-8 border-t border-gray-700 pt-6">
                <h2 className="text-2xl font-semibold mb-4">Team Statistics</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div className="bg-gray-700 p-4 rounded-lg"><p className="text-3xl font-bold text-green-400">{stats.matchesPlayed}</p><p className="text-gray-400">Played</p></div>
                    <div className="bg-gray-700 p-4 rounded-lg"><p className="text-3xl font-bold text-green-400">{stats.wins}</p><p className="text-gray-400">Won</p></div>
                    <div className="bg-gray-700 p-4 rounded-lg"><p className="text-3xl font-bold text-gray-400">{stats.draws}</p><p className="text-gray-400">Drawn</p></div>
                    <div className="bg-gray-700 p-4 rounded-lg"><p className="text-3xl font-bold text-red-400">{stats.losses}</p><p className="text-gray-400">Lost</p></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <div className="bg-gray-700 p-4 rounded-lg"><h3 className="font-bold text-lg mb-2">Top Scorer</h3>{stats.topScorer ? (<Link to={`/player/${stats.topScorer.player._id}`} className="flex items-center gap-3 hover:bg-gray-600 p-2 rounded-md -m-2 transition-colors"><img src={stats.topScorer.player.profile.imageUrl!} alt={stats.topScorer.player.profile.name} className="w-10 h-10 rounded-full object-cover" /><p className="font-bold">{stats.topScorer.player.profile.name}</p><p className="ml-auto font-extrabold text-xl text-green-400">{stats.topScorer.goals}</p></Link>) : (<p className="text-gray-400">No goals scored yet.</p>)}</div>
                    <div className="bg-gray-700 p-4 rounded-lg"><h3 className="font-bold text-lg mb-2">Top Assister</h3>{stats.topAssister ? (<Link to={`/player/${stats.topAssister.player._id}`} className="flex items-center gap-3 hover:bg-gray-600 p-2 rounded-md -m-2 transition-colors"><img src={stats.topAssister.player.profile.imageUrl!} alt={stats.topAssister.player.profile.name} className="w-10 h-10 rounded-full object-cover" /><p className="font-bold">{stats.topAssister.player.profile.name}</p><p className="ml-auto font-extrabold text-xl text-green-400">{stats.topAssister.assists}</p></Link>) : (<p className="text-gray-400">No assists recorded yet.</p>)}</div>
                    <div className="bg-gray-700 p-4 rounded-lg"><h3 className="font-bold text-lg mb-2">Standings</h3>{stats.tournamentPositions.length > 0 ? (<ul className="space-y-2">{stats.tournamentPositions.map(pos => (<li key={pos.tournamentName} className="flex justify-between items-center text-sm"><span className="text-gray-300 truncate pr-2">{pos.tournamentName}</span><span className="font-bold text-lg text-green-400">{pos.position}{getOrdinal(pos.position)}</span></li>))}</ul>) : (<p className="text-gray-400 text-sm">Not in any tournaments with a points table.</p>)}</div>
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
                                        {member.profile.imageUrl ? (
                                            <img src={member.profile.imageUrl} alt={member.profile.name} className="w-12 h-12 rounded-full object-cover" />
                                        ) : (
                                            <div className="w-12 h-12 rounded-full bg-gray-600 flex items-center justify-center">
                                                <span className="text-xl font-bold text-gray-400">{member.profile.name.charAt(0)}</span>
                                            </div>
                                        )}
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
                     {teamTournaments.length > 0 ? (
                        <div className="space-y-2">
                        {teamTournaments.map(tourn => (
                            <Link key={tourn._id} to={`/tournament/${tourn._id}`} className="block bg-gray-700 p-3 rounded-lg hover:bg-gray-600">
                                {tourn.name}
                            </Link>
                        ))}
                        </div>
                    ) : (
                        <p className="text-gray-400">This team is not in any tournaments yet.</p>
                    )}
                </div>
            </div>
             {isEditModalOpen && (
                <EditTeamModal team={team} onClose={() => setIsEditModalOpen(false)} onSave={updateTeam} />
            )}
        </div>
    );
};

const EditTeamModal: React.FC<{ team: Team; onClose: () => void; onSave: (teamId: string, details: { name: string, logoUrl: string | null }) => Promise<void> }> = ({ team, onClose, onSave }) => {
    const [name, setName] = useState(team.name);
    const [logo, setLogo] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState<string | null>(team.logoUrl);
    const [isLoading, setIsLoading] = useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setLogo(file);
            setLogoPreview(URL.createObjectURL(file));
        }
    }

    const handleSave = async () => {
        setIsLoading(true);
        let logoUrl: string | null = team.logoUrl;
        // Check if there is a new logo file or if the preview has changed to a data URL
        if (logo) {
            logoUrl = await fileToDataUri(logo);
        } else if (logoPreview !== team.logoUrl) {
             // Case where user might clear the image, etc. For now we assume they can only upload a new one
             // if they remove it, logoUrl should be null. Let's assume for now they just upload.
        }
        await onSave(team._id, { name, logoUrl });
        setIsLoading(false);
        onClose();
    };

    return (
         <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md">
                <h3 className="text-xl font-bold mb-4">Edit Team Details</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-300">Team Name</label>
                        <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-gray-700 text-white p-2 rounded mt-1 border border-gray-600" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300">Team Logo</label>
                        <div className="mt-2 flex items-center gap-4">
                            {logoPreview ? (
                                <img src={logoPreview} alt="Logo preview" className="w-16 h-16 rounded-full object-cover" />
                            ) : (
                                <div className="w-16 h-16 rounded-full bg-gray-700 flex items-center justify-center">
                                    <span className="text-2xl font-bold text-gray-500">{name.charAt(0)}</span>
                                </div>
                            )}
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleFileChange}
                                className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-600 file:text-white hover:file:bg-green-700"
                            />
                        </div>
                    </div>
                </div>
                <div className="flex justify-end gap-4 mt-6">
                    <button onClick={onClose} className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg" disabled={isLoading}>Cancel</button>
                    <button onClick={handleSave} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg" disabled={isLoading}>
                        {isLoading ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default TeamPage;
