import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAppContext } from '../hooks/useAppContext';
// FIX: Cannot find name 'Tournament'. Added Tournament to imports.
import { MatchStatus, Team, Match, User, Card, Goal, CardType, Tournament } from '../types';
import { EditIcon, ClipboardCopyIcon, TrophyIcon, CardYellowIcon, CardRedIcon, FootballIcon } from './common/Icons';

type Tab = 'fixtures' | 'table' | 'leaders' | 'teams';

const TournamentPage: React.FC = () => {
    const { tournamentId } = useParams<{ tournamentId: string }>();
    const { getTournamentById, currentUser, addTeamToTournament, scheduleMatches, startMatch, addMatchManually, updateMatchDetails, setPlayerOfTheMatch } = useAppContext();
    const [tournament, setTournament] = useState<Tournament | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    
    const [activeTab, setActiveTab] = useState<Tab>('fixtures');
    const [teamIdToAdd, setTeamIdToAdd] = useState('');
    const [isMatchModalOpen, setIsMatchModalOpen] = useState(false);
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
    }, [tournamentId, getTournamentById]);

    const isAdmin = currentUser?._id === tournament?.adminId;

    const handleAddTeam = async () => {
        if (tournamentId && teamIdToAdd) {
            const result = await addTeamToTournament(tournamentId, teamIdToAdd);
            setMessage({ type: result.success ? 'success' : 'error', text: result.message });
            if (result.success) {
                setTeamIdToAdd('');
                 const updated = await getTournamentById(tournamentId); // refetch
                 if(updated) setTournament(updated);
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
    
    const tournamentTeams = tournament.teams as Team[];

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

    const handleSetPotm = async (playerId: string) => {
        if (potmModalMatch && tournamentId) {
            await setPlayerOfTheMatch(tournamentId, potmModalMatch._id, playerId);
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
                <img src={tournament.logoUrl || `https://picsum.photos/seed/${tournament._id}/150`} alt={tournament.name} className="w-24 h-24 rounded-full border-4 border-purple-500 object-cover" />
                <div>
                    <h1 className="text-4xl font-bold">{tournament.name}</h1>
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
            {activeTab === 'fixtures' && <FixturesTab matches={tournament.matches} isAdmin={isAdmin} tournamentId={tournament._id} startMatch={startMatch} onEditMatch={setEditingMatch} onSetPlayerOfTheMatch={setPotmModalMatch} />}
            {activeTab === 'table' && <PointsTableTab matches={tournament.matches} teams={tournamentTeams} />}
            {activeTab === 'leaders' && <LeadersTab matches={tournament.matches} />}

            {editingMatch && <EditMatchModal match={editingMatch} teams={tournamentTeams} onClose={() => setEditingMatch(null)} onSave={handleUpdateMatch} />}
            {potmModalMatch && <PlayerOfTheMatchModal match={potmModalMatch} onClose={() => setPotmModalMatch(null)} onSave={handleSetPotm} />}

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
                    <img src={team.logoUrl || `https://picsum.photos/seed/${team._id}/64`} className="w-16 h-16 rounded-full mx-auto mb-2 object-cover" alt={team.name} />
                    <p className="font-semibold">{team.name}</p>
                </Link>
            ))}
        </div>
    </div>
);

const FixturesTab: React.FC<{ matches: Match[], isAdmin: boolean, tournamentId: string, startMatch: (tournId: string, matchId: string) => Promise<void>, onEditMatch: (match: Match) => void, onSetPlayerOfTheMatch: (match: Match) => void }> = ({ matches, isAdmin, tournamentId, startMatch, onEditMatch, onSetPlayerOfTheMatch }) => {
    const navigate = useNavigate();
    const [viewingDetailsMatchId, setViewingDetailsMatchId] = useState<string | null>(null);

    const handleStartMatch = async (matchId: string) => {
        await startMatch(tournamentId, matchId);
        navigate(`/match/${matchId}/score?tournamentId=${tournamentId}`);
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
                    const teamA = match.teamAId as Team;
                    const teamB = match.teamBId as Team;
                    if (!teamA || !teamB) return null;
                    // FIX: Conversion of type 'string' to type 'User' may be a mistake. Cast to unknown first.
                    const potm = match.playerOfTheMatchId ? (match.playerOfTheMatchId as unknown as User) : null;
                    const timelineEvents = getTimelineEvents(match);
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
                                </div>
                            </div>
                            <div className="flex items-center justify-between mt-2">
                                <Link to={`/team/${teamA._id}`} className="flex items-center gap-3 w-2/5 hover:opacity-80">
                                    <img src={teamA.logoUrl || `https://picsum.photos/seed/${teamA._id}/32`} className="w-8 h-8 rounded-full object-cover" alt={teamA.name}/>
                                    <span className={getTeamClasses(teamA._id, match)}>{teamA.name}</span>
                                </Link>
                                {match.status === MatchStatus.FINISHED ? (
                                     <div className="text-center">
                                        <div className="font-bold text-xl">{match.scoreA} - {match.scoreB}</div>
                                        <div className="text-xs text-gray-400">{match.winnerId === null ? 'Draw' : 'Final'}</div>
                                    </div>
                                ) : match.status === MatchStatus.LIVE ? (
                                    <div className="text-center text-red-500 animate-pulse">LIVE ({match.scoreA} - {match.scoreB})</div>
                                ) : (
                                    <div className="text-center text-gray-400 text-sm">
                                        <div>{match.date || 'TBD'}</div>
                                        <div>{match.time || ' '}</div>
                                    </div>
                                )}
                                <Link to={`/team/${teamB._id}`} className="flex items-center gap-3 w-2/5 justify-end hover:opacity-80">
                                    <span className={`${getTeamClasses(teamB._id, match)} text-right`}>{teamB.name}</span>
                                    <img src={teamB.logoUrl || `https://picsum.photos/seed/${teamB._id}/32`} className="w-8 h-8 rounded-full object-cover" alt={teamB.name}/>
                                </Link>
                                {isAdmin && match.status === MatchStatus.SCHEDULED && (
                                    <button onClick={(e) => { e.stopPropagation(); handleStartMatch(match._id); }} className="bg-green-500 hover:bg-green-600 text-white font-bold py-1 px-3 rounded text-sm ml-4">Start</button>
                                )}
                            </div>
                             {viewingDetailsMatchId === match._id && (
                                <div className="mt-4 border-t border-gray-600 pt-3 text-sm">
                                    <h4 className="font-bold mb-2">Match Timeline:</h4>
                                    {timelineEvents.length > 0 ? (
                                        <ul className="space-y-1 text-gray-300">
                                            {timelineEvents.map((event, index) => {
                                                if (event.eventType === 'goal') {
                                                    const goal = event as Goal & { eventType: 'goal' };
                                                    // FIX: Conversion of type 'string' to type 'User' may be a mistake. Cast to unknown first.
                                                    const scorer = goal.scorerId as unknown as User;
                                                    // FIX: Conversion of type 'string' to type 'User' may be a mistake. Cast to unknown first.
                                                    const assister = goal.assistId as unknown as User | undefined;
                                                    const benefitingTeam = goal.teamId === teamA._id ? teamA : teamB;
                                                    return (
                                                        <li key={`goal-${index}`} className="flex items-center gap-2">
                                                          <span className="font-bold text-green-400">⚽</span>
                                                          <span>Goal for <Link to={`/team/${benefitingTeam._id}`} className="font-semibold hover:underline">{benefitingTeam.name}</Link>. Scored by <Link to={`/player/${scorer._id}`} className="font-semibold hover:underline">{scorer.profile.name}</Link>{goal.isOwnGoal && <span className="text-red-400 font-semibold"> (OG)</span>}.{assister && <span className="text-gray-400"> (A: <Link to={`/player/${assister._id}`} className="hover:underline">{assister.profile.name}</Link>)</span>}</span>
                                                        </li>
                                                    );
                                                } else {
                                                    const card = event as Card & { eventType: 'card' };
                                                    // FIX: Conversion of type 'string' to type 'User' may be a mistake. Cast to unknown first.
                                                    const player = card.playerId as unknown as User;
                                                    return (
                                                        <li key={`card-${index}`} className="flex items-center gap-2">
                                                            {card.type === CardType.YELLOW ? <CardYellowIcon /> : <CardRedIcon />}
                                                            <span><Link to={`/player/${player._id}`} className="font-semibold hover:underline">{player.profile.name}</Link> received a {card.type} Card.</span>
                                                        </li>
                                                    );
                                                }
                                            })}
                                        </ul>
                                    ) : <p className="text-gray-400">No events were recorded for this match.</p>}
                                    
                                    <div className="mt-4">
                                        <h4 className="font-bold mb-2 flex items-center gap-2"><TrophyIcon className="text-yellow-400 w-5 h-5" /> Player of the Match</h4>
                                        {potm ? (
                                            <Link to={`/player/${potm._id}`} className="flex items-center gap-3 bg-gray-900/50 p-2 rounded-lg w-fit hover:bg-gray-900 transition-colors">
                                                <img src={potm.profile.imageUrl || `https://picsum.photos/seed/${potm._id}/40`} className="w-10 h-10 rounded-full object-cover" alt={potm.profile.name}/>
                                                <span className="font-bold">{potm.profile.name}</span>
                                            </Link>
                                        ) : (
                                            <p className="text-gray-400">Not selected yet.</p>
                                        )}
                                        {isAdmin && (
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); onSetPlayerOfTheMatch(match); }}
                                                className="mt-2 bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-1 px-3 rounded text-xs"
                                            >
                                                {match.playerOfTheMatchId ? 'Change' : 'Select'} POTM
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

        matches.filter(m => m.status === MatchStatus.FINISHED).forEach(m => {
            const teamAId = (m.teamAId as Team)._id;
            const teamBId = (m.teamBId as Team)._id;
            
            stats[teamAId].p++;
            stats[teamBId].p++;
            
            stats[teamAId].gf += m.scoreA;
            stats[teamAId].ga += m.scoreB;
            stats[teamBId].gf += m.scoreB;
            stats[teamBId].ga += m.scoreA;

            if (m.scoreA > m.scoreB) { // A wins
                stats[teamAId].w++;
                stats[teamAId].pts += 3;
                stats[teamBId].l++;
            } else if (m.scoreB > m.scoreA) { // B wins
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
                                    <img src={t.logoUrl || `https://picsum.photos/seed/${t._id}/24`} alt={t.name} className="w-6 h-6 rounded-full object-cover"/> 
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
        const goalCounts: { [key: string]: number } = {};
        const assistCounts: { [key: string]: number } = {};

        matches.forEach(m => {
            m.goals.forEach(g => {
                // FIX: Conversion of type 'string' to type 'User' may be a mistake. Cast to unknown first.
                const scorer = g.scorerId as unknown as User;
                // FIX: Conversion of type 'string' to type 'User' may be a mistake. Cast to unknown first.
                const assister = g.assistId as unknown as User | undefined;
                if (!g.isOwnGoal) {
                    goalCounts[scorer._id] = (goalCounts[scorer._id] || 0) + 1;
                }
                if(assister) {
                    assistCounts[assister._id] = (assistCounts[assister._id] || 0) + 1;
                }
            });
        });
        
        const topScorers = Object.entries(goalCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
        const topAssisters = Object.entries(assistCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
        return { topScorers, topAssisters };
    }, [matches]);

    const Leaderboard: React.FC<{title: string; data: [string, number][]}> = ({title, data}) => {
        // This component structure assumes the parent will handle fetching the user data
        // For simplicity, we assume user data might be available via a global cache or context
        // In a real app, we might need to fetch users if they're not already loaded.
        // The current implementation is simplified.
        return (
            <div>
                <h4 className="text-lg font-bold mb-2">{title}</h4>
                <p className="text-sm text-gray-400">Player data is not fully populated in this view.</p>
            </div>
        );
    }
    
    return (
        <div className="grid md:grid-cols-2 gap-8">
            <Leaderboard title="Top Goalscorers" data={topScorers} />
            <Leaderboard title="Top Assists" data={topAssisters} />
        </div>
    );
};


const EditMatchModal: React.FC<{match: Match; teams: Team[]; onClose: () => void; onSave: (details: Partial<Match>) => void;}> = ({ match, teams, onClose, onSave }) => {
    const [details, setDetails] = useState({
        teamAId: (match.teamAId as Team)._id,
        teamBId: (match.teamBId as Team)._id,
        date: match.date || '',
        time: match.time || '',
    });

    const handleSave = () => {
        if(details.teamAId === details.teamBId) {
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
                <select value={details.teamAId} onChange={e => setDetails(d => ({...d, teamAId: e.target.value}))} className="w-full bg-gray-700 text-white p-2 rounded mt-1">
                    {teams.map(team => <option key={team._id} value={team._id}>{team.name}</option>)}
                </select>
                </div>
                <div>
                <label className="block text-sm font-medium text-gray-300">Team B</label>
                 <select value={details.teamBId} onChange={e => setDetails(d => ({...d, teamBId: e.target.value}))} className="w-full bg-gray-700 text-white p-2 rounded mt-1">
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
    );
};

const PlayerOfTheMatchModal: React.FC<{ match: Match; onClose: () => void; onSave: (playerId: string) => void; }> = ({ match, onClose, onSave }) => {
    // FIX: Conversion of type 'string' to type 'User' may be a mistake. Cast to unknown first.
    const [selectedPlayerId, setSelectedPlayerId] = useState((match.playerOfTheMatchId as unknown as User)?._id || '');
    
    const { getTeamById, getUserById } = useAppContext();
    const [players, setPlayers] = useState<User[]>([]);

    useEffect(() => {
        const fetchPlayers = async () => {
            const teamA = await getTeamById((match.teamAId as Team)._id);
            const teamB = await getTeamById((match.teamBId as Team)._id);
            const teamAPlayers = (teamA?.members as User[]) || [];
            const teamBPlayers = (teamB?.members as User[]) || [];
            setPlayers([...teamAPlayers, ...teamBPlayers]);
        };
        fetchPlayers();
    }, [match, getTeamById]);
    
    const teamA = match.teamAId as Team;
    const teamB = match.teamBId as Team;

    const handleSave = () => {
        if (selectedPlayerId) {
            onSave(selectedPlayerId);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md">
                <h3 className="text-xl font-bold mb-4">Select Player of the Match</h3>
                <p className="text-gray-400 mb-4">For match: {teamA?.name} vs {teamB?.name}</p>
                <div className="max-h-64 overflow-y-auto space-y-2 pr-2">
                    {players.map(player => {
                        const playerTeam = (teamA?.members as User[]).some(m => m._id === player._id) ? teamA : teamB;
                        return (
                            <label key={player._id} className={`flex items-center gap-4 p-3 rounded-lg cursor-pointer transition-colors ${selectedPlayerId === player._id ? 'bg-green-600' : 'bg-gray-700 hover:bg-gray-600'}`}>
                                <input 
                                    type="radio" 
                                    name="potm" 
                                    value={player._id}
                                    checked={selectedPlayerId === player._id}
                                    onChange={(e) => setSelectedPlayerId(e.target.value)}
                                    className="sr-only"
                                />
                                <img src={player.profile.imageUrl || `https://picsum.photos/seed/${player._id}/40`} className="w-10 h-10 rounded-full object-cover" alt={player.profile.name}/>
                                <div>
                                    <p className="font-bold">{player.profile.name}</p>
                                    <p className="text-sm text-gray-300">{playerTeam?.name}</p>
                                </div>
                            </label>
                        );
                    })}
                </div>
                <div className="flex justify-end gap-4 mt-6">
                    <button onClick={onClose} className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg">Cancel</button>
                    <button onClick={handleSave} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg" disabled={!selectedPlayerId}>Save</button>
                </div>
            </div>
        </div>
    );
};


export default TournamentPage;