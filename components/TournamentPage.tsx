

import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAppContext } from '../hooks/useAppContext';
import { MatchStatus, Team, Match, User, Card, Goal, CardType, Tournament } from '../types';
import { EditIcon, ClipboardCopyIcon, TrophyIcon, CardYellowIcon, CardRedIcon, FootballIcon, TrashIcon } from './common/Icons';

type Tab = 'fixtures' | 'table' | 'leaders' | 'teams';

const formatDate = (dateString: string | undefined | null): string => {
    if (!dateString) return 'TBD';
    try {
        // Add T00:00:00 to handle timezone properly, assuming date is in UTC.
        const date = new Date(dateString + 'T00:00:00');
        const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };
        // Replace spaces with hyphens for the desired format "12-Sep-2025"
        return new Intl.DateTimeFormat('en-GB', options).format(date).replace(/ /g, '-').toLowerCase();
    } catch (e) {
        return dateString; // Fallback to original string if format is invalid
    }
};

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

const TournamentPage: React.FC = () => {
    const { tournamentId } = useParams<{ tournamentId: string }>();
    const { getTournamentById, currentUser, addTeamToTournament, scheduleMatches, startMatch, addMatchManually, updateMatchDetails, deleteMatch, setPlayerOfTheMatch, tournaments, updateTournament } = useAppContext();
    const [tournament, setTournament] = useState<Tournament | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    
    const [activeTab, setActiveTab] = useState<Tab>('fixtures');
    const [teamIdToAdd, setTeamIdToAdd] = useState('');
    const [isMatchModalOpen, setIsMatchModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingMatch, setEditingMatch] = useState<Match | null>(null);
    const [potmModalMatch, setPotmModalMatch] = useState<Match | null>(null);
    const [newMatchData, setNewMatchData] = useState({ teamAId: '', teamBId: '', round: 'League Match' });
    const [message, setMessage] = useState({ type: '', text: '' });

    useEffect(() => {
        const fetchTournamentData = async () => {
            if (!tournamentId) {
                setError("No tournament ID provided.");
                setIsLoading(false);
                return;
            }
            try {
                setIsLoading(true);
                const fetchedTournament = await getTournamentById(tournamentId);
                if (fetchedTournament) {
                    setTournament(fetchedTournament);
                } else {
                    setError("Tournament not found.");
                }
            } catch (err: any) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };
        fetchTournamentData();
    }, [tournamentId, getTournamentById, tournaments]);

    const isAdmin = currentUser?._id === tournament?.adminId;

    const handleAddTeam = async () => {
        if (tournamentId && teamIdToAdd) {
            const result = await addTeamToTournament(tournamentId, teamIdToAdd);
            setMessage({ type: result.success ? 'success' : 'error', text: result.message });
            if (result.success) {
                setTeamIdToAdd('');
            }
            setTimeout(() => setMessage({ type: '', text: '' }), 3000);
        }
    };

    const handleAutoSchedule = async () => {
        if (!tournamentId) return;
        if (tournament?.isSchedulingDone) {
            if (window.confirm("This will overwrite all existing matches, including any results. Are you sure?")) {
                await scheduleMatches(tournamentId);
            }
        } else {
            await scheduleMatches(tournamentId);
        }
    };
    
    if (isLoading) {
        return <div className="text-center p-10"><FootballIcon className="h-12 w-12 mx-auto text-green-500 animate-spin"/></div>;
    }
    
    if (error || !tournament) {
        return <div className="text-center text-red-500">{error || 'Tournament could not be loaded.'}</div>;
    }
    
    const tournamentTeams = tournament.teams;

    const handleManualMatchCreate = async () => {
        if(tournamentId && newMatchData.teamAId && newMatchData.teamBId && newMatchData.round && newMatchData.teamAId !== newMatchData.teamBId) {
            await addMatchManually(tournamentId, newMatchData);
            setIsMatchModalOpen(false);
            setNewMatchData({ teamAId: '', teamBId: '', round: 'League Match' });
        } else {
            alert("Please select two different teams and a round.");
        }
    };
    
    const handleUpdateMatch = async (details: Partial<Match>) => {
        if(tournamentId && editingMatch) {
            await updateMatchDetails(tournamentId, editingMatch._id, details);
            setEditingMatch(null);
        }
    };

    const handleSetPotm = async (details: { playerId?: string, playerName?: string }) => {
        if (potmModalMatch && tournamentId) {
            await setPlayerOfTheMatch(tournamentId, potmModalMatch._id, details);
            setPotmModalMatch(null);
        }
    };

    const copyInviteCode = () => {
        navigator.clipboard.writeText(tournament.inviteCode);
        setMessage({ type: 'success', text: 'Invite code copied!' });
        setTimeout(() => setMessage({ type: '', text: '' }), 2000);
    };

    return (
        <div className="bg-gray-800 p-4 sm:p-6 rounded-lg shadow-lg">
            <div className="flex flex-col md:flex-row items-center gap-6 mb-6">
                 {tournament.logoUrl ? (
                    <img src={tournament.logoUrl} alt={tournament.name} className="w-24 h-24 rounded-full border-4 border-purple-500 object-cover" />
                ) : (
                    <div className="w-24 h-24 rounded-full border-4 border-purple-500 bg-gray-700 flex items-center justify-center">
                        <span className="text-4xl font-bold text-gray-500">{tournament.name.charAt(0)}</span>
                    </div>
                )}
                <div className="flex-grow">
                     <div className="flex items-center gap-4">
                        <h1 className="text-4xl font-bold">{tournament.name}</h1>
                        {isAdmin && (
                            <button onClick={() => setIsEditModalOpen(true)} className="text-gray-400 hover:text-white" title="Edit Tournament Details">
                                <EditIcon />
                            </button>
                        )}
                    </div>
                    {isAdmin && (
                        <div className="mt-2">
                            <span className="text-gray-400">Invite Code: </span>
                            <span onClick={copyInviteCode} className="font-mono bg-gray-700 text-purple-400 px-3 py-1 rounded cursor-pointer hover:bg-gray-600 flex items-center gap-2">
                                {tournament.inviteCode}
                                <ClipboardCopyIcon />
                            </span>
                        </div>
                    )}
                </div>
            </div>
            
            {message.text && (
                <div className={`mb-4 p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
                    {message.text}
                </div>
            )}

            {isAdmin && (
                <div className="bg-gray-700 p-4 rounded-lg mb-6">
                    <h3 className="text-lg font-semibold mb-3">Admin Controls</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={teamIdToAdd}
                                onChange={e => setTeamIdToAdd(e.target.value)}
                                placeholder="Enter Team ID or Invite Code"
                                className="w-full bg-gray-800 text-white p-2 rounded border border-gray-600"
                            />
                            <button onClick={handleAddTeam} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg" disabled={!teamIdToAdd}>Add Team</button>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <button onClick={handleAutoSchedule} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg">Auto-Schedule</button>
                            <button onClick={() => setIsMatchModalOpen(true)} className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg">Add Match Manually</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="border-b border-gray-700 mb-6">
                <nav className="flex space-x-4">
                    {(['fixtures', 'table', 'leaders', 'teams'] as Tab[]).map(tab => (
                        <button key={tab} onClick={() => setActiveTab(tab)} className={`capitalize py-2 px-4 font-semibold rounded-t-lg ${activeTab === tab ? 'bg-gray-700 text-green-400' : 'text-gray-400 hover:bg-gray-700/50'}`}>
                            {tab}
                        </button>
                    ))}
                </nav>
            </div>
            
            {activeTab === 'teams' && <TeamsTab teams={tournamentTeams} />}
            {activeTab === 'fixtures' && <FixturesTab matches={tournament.matches} isAdmin={isAdmin} tournamentId={tournament._id} startMatch={startMatch} deleteMatch={deleteMatch} onEditMatch={setEditingMatch} onSetPlayerOfTheMatch={setPotmModalMatch} />}
            {activeTab === 'table' && <PointsTableTab matches={tournament.matches} teams={tournamentTeams} />}
            {activeTab === 'leaders' && <LeadersTab matches={tournament.matches} />}

            {editingMatch && <EditMatchModal match={editingMatch} teams={tournamentTeams} onClose={() => setEditingMatch(null)} onSave={handleUpdateMatch} />}
            {potmModalMatch && <PlayerOfTheMatchModal match={potmModalMatch} tournamentTeams={tournament.teams} onClose={() => setPotmModalMatch(null)} onSave={handleSetPotm} />}
            {isEditModalOpen && <EditTournamentModal tournament={tournament} onClose={() => setIsEditModalOpen(false)} onSave={updateTournament} />}

            {isMatchModalOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
                <div className="bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-lg">
                <h3 className="text-xl font-bold mb-4">Add Manual Match</h3>
                <div className="space-y-4">
                    <div>
                    <label className="block text-sm font-medium text-gray-300">Round / Stage</label>
                    <select
                        value={newMatchData.round}
                        onChange={e => setNewMatchData(prev => ({ ...prev, round: e.target.value }))}
                        className="w-full bg-gray-700 text-white p-2 rounded mt-1"
                    >
                        <option>League Match</option>
                        <option>Quarter-Final</option>
                        <option>Semi-Final</option>
                        <option>Eliminator</option>
                        <option>Final</option>
                    </select>
                    </div>
                    <div>
                    <label className="block text-sm font-medium text-gray-300">Team A</label>
                    <select
                        value={newMatchData.teamAId}
                        onChange={e => setNewMatchData(prev => ({ ...prev, teamAId: e.target.value }))}
                        className="w-full bg-gray-700 text-white p-2 rounded mt-1"
                    >
                        <option value="">Select Team A</option>
                        {tournamentTeams.filter(t => t._id !== newMatchData.teamBId).map(team => (
                        <option key={team._id} value={team._id}>{team.name}</option>
                        ))}
                    </select>
                    </div>
                    <div>
                    <label className="block text-sm font-medium text-gray-300">Team B</label>
                    <select
                        value={newMatchData.teamBId}
                        onChange={e => setNewMatchData(prev => ({ ...prev, teamBId: e.target.value }))}
                        className="w-full bg-gray-700 text-white p-2 rounded mt-1"
                    >
                        <option value="">Select Team B</option>
                        {tournamentTeams.filter(t => t._id !== newMatchData.teamAId).map(team => (
                        <option key={team._id} value={team._id}>{team.name}</option>
                        ))}
                    </select>
                    </div>
                </div>
                <div className="flex justify-end gap-4 mt-6">
                    <button onClick={() => setIsMatchModalOpen(false)} className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg">Cancel</button>
                    <button onClick={handleManualMatchCreate} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg">Create Match</button>
                </div>
                </div>
            </div>
            )}
        </div>
    );
};

const TeamsTab: React.FC<{ teams: Team[] }> = ({ teams }) => (
    <div>
        <h3 className="text-xl font-bold mb-4">Participating Teams ({teams.length})</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {teams.map(team => (
                <Link to={`/team/${team._id}`} key={team._id} className="bg-gray-700 p-3 rounded text-center hover:bg-gray-600 transition-colors">
                    {team.logoUrl ? (
                         <img src={team.logoUrl} className="w-16 h-16 rounded-full mx-auto mb-2 object-cover" alt={team.name} />
                    ) : (
                        <div className="w-16 h-16 rounded-full bg-gray-600 flex items-center justify-center mx-auto mb-2">
                             <span className="text-2xl font-bold text-gray-400">{team.name.charAt(0)}</span>
                        </div>
                    )}
                    <p className="font-semibold">{team.name}</p>
                </Link>
            ))}
        </div>
    </div>
);

const FixturesTab: React.FC<{ matches: Match[], isAdmin: boolean, tournamentId: string, startMatch: (tournId: string, matchId: string) => Promise<void>, deleteMatch: (tournId: string, matchId: string) => Promise<void>, onEditMatch: (match: Match) => void, onSetPlayerOfTheMatch: (match: Match) => void }> = ({ matches, isAdmin, tournamentId, startMatch, deleteMatch, onEditMatch, onSetPlayerOfTheMatch }) => {
    const navigate = useNavigate();
    const [viewingDetailsMatchId, setViewingDetailsMatchId] = useState<string | null>(null);

    const handleStartMatch = async (matchId: string) => {
        await startMatch(tournamentId, matchId);
        navigate(`/match/${matchId}/score?tournamentId=${tournamentId}`);
    };

    const handleDeleteMatch = async (matchId: string) => {
        if (window.confirm("Are you sure you want to delete this match? This action cannot be undone and will affect standings.")) {
            await deleteMatch(tournamentId, matchId);
        }
    };

    const getTeamClasses = (teamId: string, match: Match): string => {
        if (match.status !== MatchStatus.FINISHED) return 'font-semibold';
        if (match.winnerId === teamId) return 'font-bold text-green-400';
        if (match.winnerId === null) return 'font-semibold';
        return 'font-semibold text-gray-400';
    };

    const getTimelineEvents = (match: Match) => {
        const goals = match.goals.map(g => ({ ...g, eventType: 'goal' as const, time: g.minute }));
        const cards = match.cards.map(c => ({ ...c, eventType: 'card' as const, time: c.minute }));
        return [...goals, ...cards].sort((a, b) => a.time - b.time);
    };

    return (
        <div>
            <h3 className="text-xl font-bold mb-4">Fixtures & Results</h3>
            <div className="space-y-3">
                {matches.sort((a,b) => a.matchNumber - b.matchNumber).map(match => {
                    const teamA = match.teamAId;
                    const teamB = match.teamBId;
                    if (!teamA || !teamB) return null;
                    const potm = match.playerOfTheMatchId;
                    const potmName = potm?.profile?.name || match.playerOfTheMatchName;
                    const timelineEvents = getTimelineEvents(match);
                    const hasPenalties = typeof match.penaltyScoreA === 'number' && typeof match.penaltyScoreB === 'number';
                    
                    return (
                        <div 
                            key={match._id}
                            className={`bg-gray-700 p-4 rounded-lg ${match.status === MatchStatus.FINISHED ? 'cursor-pointer hover:bg-gray-600 transition-colors' : ''}`}
                            onClick={() => {
                                if (match.status === MatchStatus.FINISHED) {
                                    setViewingDetailsMatchId(prev => prev === match._id ? null : match._id);
                                }
                            }}
                        >
                            <div className="flex items-center justify-between">
                                <div className="text-xs text-gray-400">Match #{match.matchNumber} &bull; {match.round}</div>
                                <div className="flex items-center gap-2">
                                {isAdmin && match.status === MatchStatus.SCHEDULED && (
                                    <button onClick={(e) => { e.stopPropagation(); onEditMatch(match); }} className="text-gray-400 hover:text-white"><EditIcon /></button>
                                )}
                                {isAdmin && (
                                    <button onClick={(e) => { e.stopPropagation(); handleDeleteMatch(match._id); }} className="text-gray-400 hover:text-red-500">
                                        <TrashIcon className="h-4 w-4" />
                                    </button>
                                )}
                                </div>
                            </div>
                            <div className="flex items-center justify-between mt-2">
                                <Link to={`/team/${teamA._id}`} className="flex items-center gap-3 w-2/5 hover:opacity-80">
                                    {teamA.logoUrl ? (
                                        <img src={teamA.logoUrl} className="w-8 h-8 rounded-full object-cover" alt={teamA.name}/>
                                    ) : (
                                        <div className="w-8 h-8 rounded-full bg-gray-600 flex-shrink-0 flex items-center justify-center">
                                            <span className="font-bold text-gray-400 text-sm">{teamA.name.charAt(0)}</span>
                                        </div>
                                    )}
                                    <span className={getTeamClasses(teamA._id, match)}>{teamA.name}</span>
                                </Link>
                                {match.status === MatchStatus.FINISHED ? (
                                     <div className="text-center">
                                        <div className="font-bold text-xl">{match.scoreA} - {match.scoreB}</div>
                                        <div className="text-xs text-gray-400">
                                            {match.winnerId === null ? 'Draw' : 'Final'}
                                            {hasPenalties && <span className="font-semibold text-gray-300"> (Pen {match.penaltyScoreA} - {match.penaltyScoreB})</span>}
                                        </div>
                                    </div>
                                ) : match.status === MatchStatus.LIVE ? (
                                    <div className="text-center text-red-500 animate-pulse">LIVE ({match.scoreA} - {match.scoreB})</div>
                                ) : (
                                    <div className="text-center text-gray-400 text-sm">
                                        <div>{formatDate(match.date)}</div>
                                        <div>{match.time || ' '}</div>
                                    </div>
                                )}
                                <Link to={`/team/${teamB._id}`} className="flex items-center gap-3 w-2/5 justify-end hover:opacity-80">
                                    <span className={`${getTeamClasses(teamB._id, match)} text-right`}>{teamB.name}</span>
                                    {teamB.logoUrl ? (
                                        <img src={teamB.logoUrl} className="w-8 h-8 rounded-full object-cover" alt={teamB.name}/>
                                    ) : (
                                        <div className="w-8 h-8 rounded-full bg-gray-600 flex-shrink-0 flex items-center justify-center">
                                            <span className="font-bold text-gray-400 text-sm">{teamB.name.charAt(0)}</span>
                                        </div>
                                    )}
                                </Link>
                                {isAdmin && match.status === MatchStatus.SCHEDULED && (
                                    <button onClick={(e) => { e.stopPropagation(); handleStartMatch(match._id); }} className="bg-green-500 hover:bg-green-600 text-white font-bold py-1 px-3 rounded text-sm ml-4">Start</button>
                                )}
                            </div>
                             {viewingDetailsMatchId === match._id && (
                                <div className="mt-4 border-t border-gray-600 pt-3 text-sm">
                                    <h4 className="font-bold mb-2">Match Timeline:</h4>
                                    {timelineEvents.length > 0 || hasPenalties ? (
                                        <ul className="space-y-1 text-gray-300">
                                            {timelineEvents.map((event, index) => {
                                                if (event.eventType === 'goal') {
                                                    const goal = event as Goal & { eventType: 'goal' };
                                                    const scorer = goal.scorerId;
                                                    const scorerName = scorer?.profile?.name || goal.scorerName || 'Unknown Player';
                                                    const assister = goal.assistId;
                                                    const assisterName = assister?.profile?.name || goal.assistName;
                                                    const benefitingTeam = goal.teamId === teamA._id ? teamA : teamB;
                                                    return (
                                                        <li key={`goal-${index}`} className="flex items-center gap-2">
                                                            <span className="font-bold text-green-400">⚽</span>
                                                            <span>
                                                                Goal for <Link to={`/team/${benefitingTeam._id}`} className="font-semibold hover:underline">{benefitingTeam.name}</Link>.
                                                                Scored by {scorer ? <Link to={`/player/${scorer._id}`} className="font-semibold hover:underline">{scorerName}</Link> : <span className="font-semibold">{scorerName}</span>}
                                                                {goal.isOwnGoal && <span className="text-red-400 font-semibold"> (OG)</span>}.
                                                                {assisterName && <span className="text-gray-400"> (A: {assister ? <Link to={`/player/${assister._id}`} className="hover:underline">{assisterName}</Link> : assisterName})</span>}
                                                            </span>
                                                        </li>
                                                    );
                                                } else {
                                                    const card = event as Card & { eventType: 'card' };
                                                    const player = card.playerId;
                                                    const playerName = player?.profile?.name || card.playerName || 'Unknown Player';
                                                    return (
                                                        <li key={`card-${index}`} className="flex items-center gap-2">
                                                            {card.type === CardType.YELLOW ? <CardYellowIcon /> : <CardRedIcon />}
                                                            <span>
                                                                {player ? <Link to={`/player/${player._id}`} className="font-semibold hover:underline">{playerName}</Link> : <span className="font-semibold">{playerName}</span>}
                                                                {' '}received a {card.type} Card.
                                                            </span>
                                                        </li>
                                                    );
                                                }
                                            })}
                                            {hasPenalties && (
                                                <li className="flex items-center gap-2 font-semibold pt-2 border-t border-gray-600/50 mt-2">
                                                    <span className="font-bold text-yellow-400">🥅</span>
                                                    <span>Penalty Shootout: {teamA.name} {match.penaltyScoreA} - {match.penaltyScoreB} {teamB.name}</span>
                                                </li>
                                            )}
                                        </ul>
                                    ) : <p className="text-gray-400">No events were recorded for this match.</p>}
                                    
                                    <div className="mt-4">
                                        <h4 className="font-bold mb-2 flex items-center gap-2"><TrophyIcon className="text-yellow-400 w-5 h-5" /> Player of the Match</h4>
                                        {potmName ? (
                                            potm ? (
                                                <Link to={`/player/${potm._id}`} className="flex items-center gap-3 bg-gray-900/50 p-2 rounded-lg w-fit hover:bg-gray-900 transition-colors">
                                                    {potm.profile.imageUrl ? (
                                                        <img src={potm.profile.imageUrl} className="w-10 h-10 rounded-full object-cover" alt={potm.profile.name}/>
                                                    ) : (
                                                        <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center">
                                                            <span className="text-lg font-bold text-gray-400">{potm.profile.name.charAt(0)}</span>
                                                        </div>
                                                    )}
                                                    <span className="font-bold">{potmName}</span>
                                                </Link>
                                            ) : (
                                                 <div className="flex items-center gap-3 bg-gray-900/50 p-2 rounded-lg w-fit">
                                                    <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center">
                                                        <span className="text-lg font-bold text-gray-400">?</span>
                                                    </div>
                                                    <span className="font-bold">{potmName}</span>
                                                </div>
                                            )
                                        ) : (
                                            <p className="text-gray-400">Not selected yet.</p>
                                        )}
                                        {isAdmin && (
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); onSetPlayerOfTheMatch(match); }}
                                                className="mt-2 bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-1 px-3 rounded text-xs"
                                            >
                                                {potmName ? 'Change' : 'Select'} POTM
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
                 {matches.length === 0 && <p className="text-center text-gray-400 py-4">No matches scheduled yet.</p>}
            </div>
        </div>
    );
};


const PointsTableTab: React.FC<{ matches: Match[], teams: Team[] }> = ({ matches, teams }) => {
    const tableData = useMemo(() => {
        const stats: { [key: string]: { p: number, w: number, d: number, l: number, pts: number, gf: number, ga: number } } = {};
        teams.forEach(t => { stats[t._id] = { p: 0, w: 0, d: 0, l: 0, pts: 0, gf: 0, ga: 0 }; });
        
        const knockoutRounds = ['Final', 'Semi-Final', 'Quarter-Final', 'Eliminator'];

        matches
            .filter(m => m.status === MatchStatus.FINISHED && !knockoutRounds.includes(m.round))
            .forEach(m => {
                 if (!m.teamAId || !m.teamBId) return;
                const teamAId = m.teamAId._id;
                const teamBId = m.teamBId._id;
                
                stats[teamAId].p++;
                stats[teamBId].p++;
                
                stats[teamAId].gf += m.scoreA;
                stats[teamAId].ga += m.scoreB;
                stats[teamBId].gf += m.scoreB;
                stats[teamBId].ga += m.scoreA;

                if (m.winnerId === teamAId) { // A wins
                    stats[teamAId].w++;
                    stats[teamAId].pts += 3;
                    stats[teamBId].l++;
                } else if (m.winnerId === teamBId) { // B wins
                    stats[teamBId].w++;
                    stats[teamBId].pts += 3;
                    stats[teamAId].l++;
                } else { // Draw
                    stats[teamAId].d++;
                    stats[teamAId].pts++;
                    stats[teamBId].d++;
                    stats[teamBId].pts++;
                }
            });

        return teams.map(t => {
            const teamStats = stats[t._id];
            const gd = teamStats.gf - teamStats.ga;
            return { ...t, ...teamStats, gd };
        }).sort((a, b) => {
            if (b.pts !== a.pts) {
                return b.pts - a.pts;
            }
            return b.gd - a.gd;
        });
    }, [matches, teams]);

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-left">
                <thead className="bg-gray-700">
                    <tr>
                        <th className="p-3">Team</th>
                        <th className="p-3">P</th>
                        <th className="p-3">W</th>
                        <th className="p-3">D</th>
                        <th className="p-3">L</th>
                        <th className="p-3">GD</th>
                        <th className="p-3">Pts</th>
                    </tr>
                </thead>
                <tbody>
                    {tableData.map((t, i) => (
                        <tr key={t._id} className="border-b border-gray-700">
                            <td className="p-3">
                                <Link to={`/team/${t._id}`} className="flex items-center gap-2 font-bold hover:opacity-80">
                                    <span className="w-6">{i+1}</span> 
                                    {t.logoUrl ? (
                                        <img src={t.logoUrl} alt={t.name} className="w-6 h-6 rounded-full object-cover"/> 
                                    ) : (
                                        <div className="w-6 h-6 rounded-full bg-gray-600 flex-shrink-0 flex items-center justify-center">
                                            <span className="font-bold text-gray-400 text-xs">{t.name.charAt(0)}</span>
                                        </div>
                                    )}
                                    {t.name}
                                </Link>
                            </td>
                            <td className="p-3">{t.p}</td>
                            <td className="p-3">{t.w}</td>
                            <td className="p-3">{t.d}</td>
                            <td className="p-3">{t.l}</td>
                            <td className="p-3">{t.gd > 0 ? `+${t.gd}` : t.gd}</td>
                            <td className="p-3 font-bold">{t.pts}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

const LeadersTab: React.FC<{ matches: Match[] }> = ({ matches }) => {
    const { topScorers, topAssisters } = useMemo(() => {
        const goalCounts: { [key: string]: { player?: User, name: string, goals: number } } = {};
        const assistCounts: { [key: string]: { player?: User, name: string, assists: number } } = {};

        matches.forEach(m => {
            m.goals.forEach(g => {
                // Process scorers
                if (g.scorerId && g.scorerId.profile && !g.isOwnGoal) {
                    const key = g.scorerId._id;
                    if (!goalCounts[key]) {
                        goalCounts[key] = { player: g.scorerId, name: g.scorerId.profile.name, goals: 0 };
                    }
                    goalCounts[key].goals++;
                } else if (g.scorerName && !g.isOwnGoal) {
                    const key = g.scorerName.trim().toLowerCase();
                    if (!goalCounts[key]) {
                        goalCounts[key] = { name: g.scorerName.trim(), goals: 0 };
                    }
                    goalCounts[key].goals++;
                }

                // Process assists
                if (g.assistId && g.assistId.profile) {
                    const key = g.assistId._id;
                    if (!assistCounts[key]) {
                        assistCounts[key] = { player: g.assistId, name: g.assistId.profile.name, assists: 0 };
                    }
                    assistCounts[key].assists++;
                } else if (g.assistName) {
                    const key = g.assistName.trim().toLowerCase();
                    if (!assistCounts[key]) {
                        assistCounts[key] = { name: g.assistName.trim(), assists: 0 };
                    }
                    assistCounts[key].assists++;
                }
            });
        });
        
        const sortedScorers = Object.values(goalCounts)
            .sort((a, b) => b.goals - a.goals)
            .slice(0, 10);

        const sortedAssisters = Object.values(assistCounts)
            .sort((a, b) => b.assists - a.assists)
            .slice(0, 10);
            
        return { topScorers: sortedScorers, topAssisters: sortedAssisters };
    }, [matches]);

    const Leaderboard: React.FC<{title: string; data: { player?: User, name: string, [key: string]: any }[], metric: string}> = ({title, data, metric}) => {
        return (
            <div className="bg-gray-700 p-4 rounded-lg">
                <h4 className="text-lg font-bold mb-3">{title}</h4>
                <ul className="space-y-2">
                    {data.map((item, index) => (
                        <li key={(item.player?._id || item.name) + index} className="flex items-center justify-between text-sm p-2 rounded-md bg-gray-800/50">
                            {item.player ? (
                                <Link to={`/player/${item.player._id}`} className="flex items-center gap-3 hover:underline truncate">
                                    <span className="font-bold w-6 text-center flex-shrink-0">{index + 1}</span>
                                    {item.player.profile.imageUrl ? (
                                        <img src={item.player.profile.imageUrl} alt={item.name} className="w-8 h-8 rounded-full object-cover flex-shrink-0"/>
                                    ) : (
                                         <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center flex-shrink-0">
                                            <span className="text-sm font-bold text-gray-400">{item.name.charAt(0).toUpperCase()}</span>
                                        </div>
                                    )}
                                    <span className="truncate">{item.name}</span>
                                </Link>
                            ) : (
                               <div className="flex items-center gap-3 truncate">
                                    <span className="font-bold w-6 text-center flex-shrink-0">{index + 1}</span>
                                    <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center flex-shrink-0">
                                        <span className="text-sm font-bold text-gray-400">{item.name.charAt(0).toUpperCase()}</span>
                                    </div>
                                    <span className="truncate">{item.name}</span>
                               </div>
                            )}
                            <span className="font-extrabold text-lg text-green-400 ml-2">{item[metric]}</span>
                        </li>
                    ))}
                     {data.length === 0 && <p className="text-center text-gray-400 py-4">No data yet.</p>}
                </ul>
            </div>
        );
    }
    
    return (
        <div className="grid md:grid-cols-2 gap-8">
            <Leaderboard title="Top Goalscorers" data={topScorers} metric="goals" />
            <Leaderboard title="Top Assists" data={topAssisters} metric="assists" />
        </div>
    );
};


const EditMatchModal: React.FC<{match: Match; teams: Team[]; onClose: () => void; onSave: (details: Partial<Match>) => void;}> = ({ match, teams, onClose, onSave }) => {
    const [details, setDetails] = useState({
        teamAId: match.teamAId,
        teamBId: match.teamBId,
        date: match.date || '',
        time: match.time || '',
    });

    const handleSave = () => {
        if(details.teamAId._id === details.teamBId._id) {
            alert("A team cannot play against itself.");
            return;
        }
        onSave(details);
    };
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-lg">
            <h3 className="text-xl font-bold mb-4">Edit Match #{match.matchNumber}</h3>
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-300">Date</label>
                        <input type="date" value={details.date} onChange={e => setDetails(d => ({...d, date: e.target.value}))} className="w-full bg-gray-700 text-white p-2 rounded mt-1"/>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300">Time</label>
                        <input type="time" value={details.time} onChange={e => setDetails(d => ({...d, time: e.target.value}))} className="w-full bg-gray-700 text-white p-2 rounded mt-1"/>
                    </div>
                </div>
                <div>
                <label className="block text-sm font-medium text-gray-300">Team A</label>
                <select value={details.teamAId._id} onChange={e => setDetails(d => ({...d, teamAId: teams.find(t=>t._id === e.target.value)!}))} className="w-full bg-gray-700 text-white p-2 rounded mt-1">
                    {teams.map(team => <option key={team._id} value={team._id}>{team.name}</option>)}
                </select>
                </div>
                <div>
                <label className="block text-sm font-medium text-gray-300">Team B</label>
                 <select value={details.teamBId._id} onChange={e => setDetails(d => ({...d, teamBId: teams.find(t=>t._id === e.target.value)!}))} className="w-full bg-gray-700 text-white p-2 rounded mt-1">
                    {teams.map(team => <option key={team._id} value={team._id}>{team.name}</option>)}
                </select>
                </div>
            </div>
            <div className="flex justify-end gap-4 mt-6">
                <button onClick={onClose} className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg">Cancel</button>
                <button onClick={handleSave} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg">Save Changes</button>
            </div>
            </div>
        </div>
    )
};

const PlayerOfTheMatchModal: React.FC<{ match: Match; tournamentTeams: Team[]; onClose: () => void; onSave: (details: { playerId?: string; playerName?: string }) => void; }> = ({ match, tournamentTeams, onClose, onSave }) => {
    const [selectedPlayerId, setSelectedPlayerId] = useState(match.playerOfTheMatchId?._id || '');
    const [manualName, setManualName] = useState(match.playerOfTheMatchName || '');
    const playersInMatch = useMemo(() => {
        const teamA = tournamentTeams.find(t => t._id === match.teamAId._id);
        const teamB = tournamentTeams.find(t => t._id === match.teamBId._id);
        return [...(teamA?.members || []), ...(teamB?.members || [])].filter(p => p && p.profile);
    }, [match, tournamentTeams]);

    const handleSave = () => {
        if (manualName.trim()) {
            onSave({ playerName: manualName.trim() });
        } else if (selectedPlayerId) {
            onSave({ playerId: selectedPlayerId });
        } else {
            // Can also be used to clear the POTM
            onSave({});
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md">
                <h3 className="text-xl font-bold mb-4">Select Player of the Match</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-300">Select from Roster</label>
                        <select
                            value={selectedPlayerId}
                            onChange={(e) => {
                                setSelectedPlayerId(e.target.value);
                                if (e.target.value) setManualName('');
                            }}
                            className="w-full bg-gray-700 text-white p-2 rounded mt-1"
                        >
                            <option value="">-- Choose a player --</option>
                            {playersInMatch.map(p => <option key={p._id} value={p._id}>{p.profile.name}</option>)}
                        </select>
                    </div>
                    <div className="text-center text-gray-400 text-sm">OR</div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300">Enter Name Manually</label>
                        <input
                            type="text"
                            value={manualName}
                            onChange={(e) => {
                                setManualName(e.target.value);
                                if (e.target.value) setSelectedPlayerId('');
                            }}
                            placeholder="e.g., Guest Player"
                            className="w-full bg-gray-700 text-white p-2 rounded mt-1"
                        />
                    </div>
                </div>
                <div className="flex justify-end gap-4 mt-6">
                    <button onClick={onClose} className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg">Cancel</button>
                    <button onClick={handleSave} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg">Save</button>
                </div>
            </div>
        </div>
    );
};

const EditTournamentModal: React.FC<{ tournament: Tournament; onClose: () => void; onSave: (tournId: string, details: { name: string, logoUrl: string | null }) => Promise<void> }> = ({ tournament, onClose, onSave }) => {
    const [name, setName] = useState(tournament.name);
    const [logo, setLogo] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState<string | null>(tournament.logoUrl);
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
        let logoUrl: string | null = tournament.logoUrl;
        if (logo) {
            logoUrl = await fileToDataUri(logo);
        }
        await onSave(tournament._id, { name, logoUrl });
        setIsLoading(false);
        onClose();
    };

    return (
         <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md">
                <h3 className="text-xl font-bold mb-4">Edit Tournament Details</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-300">Tournament Name</label>
                        <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-gray-700 text-white p-2 rounded mt-1 border border-gray-600" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300">Tournament Logo</label>
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

export default TournamentPage;
