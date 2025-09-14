import React, { useState, useMemo } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useAppContext } from '../hooks/useAppContext';
import { MatchStatus, CardType, Tournament, Match, Team, User } from '../types';
import { FootballIcon } from './common/Icons';

const LiveScoringPage: React.FC = () => {
  const { matchId } = useParams<{ matchId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // Get global state and actions from context
  const { tournaments, recordGoal, recordCard, endMatch, currentUser, isLoading: isAppLoading } = useAppContext();

  // --- DERIVE STATE FROM CONTEXT ---
  // Find the current tournament and match from the global 'tournaments' array.
  const { tournament, match } = useMemo(() => {
    const tournamentId = searchParams.get('tournamentId');
    if (!tournamentId || !matchId || !tournaments) {
        return { tournament: null, match: null };
    }
    const currentTournament = tournaments.find(t => t._id === tournamentId);
    if (!currentTournament) {
        return { tournament: null, match: null };
    }
    const currentMatch = currentTournament.matches.find(m => m._id === matchId);
    return { tournament: currentTournament, match: currentMatch || null };
  }, [tournaments, searchParams, matchId]);

  // FIX: The teamAId/teamBId on the match object might not be fully populated with members.
  // To ensure we have the full team data, we find the complete team object
  // from the tournament's top-level 'teams' array, which is guaranteed to be populated.
  const teamA = useMemo(() => {
    if (!match || !tournament) return null;
    const teamAId = typeof match.teamAId === 'string' ? match.teamAId : match.teamAId?._id;
    return tournament.teams.find(t => t._id === teamAId) || null;
  }, [match, tournament]);

  const teamB = useMemo(() => {
    if (!match || !tournament) return null;
    const teamBId = typeof match.teamBId === 'string' ? match.teamBId : match.teamBId?._id;
    return tournament.teams.find(t => t._id === teamBId) || null;
  }, [match, tournament]);

  const tournamentId = tournament?._id;

  // Local UI state for modals
  const [isGoalModalOpen, setGoalModalOpen] = useState(false);
  const [isCardModalOpen, setCardModalOpen] = useState(false);
  const [isEndModalOpen, setEndModalOpen] = useState(false);
  const [modalTeamId, setModalTeamId] = useState('');
  
  const [isOwnGoal, setIsOwnGoal] = useState(false);
  const [scorerId, setScorerId] = useState('');
  const [assistId, setAssistId] = useState('');

  const [cardPlayerId, setCardPlayerId] = useState('');
  const [cardType, setCardType] = useState<CardType>(CardType.YELLOW);

  const [penaltyScores, setPenaltyScores] = useState<{ scoreA: string, scoreB: string }>({ scoreA: '', scoreB: '' });
  const [endMatchError, setEndMatchError] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Manual entry states
  const [scorerName, setScorerName] = useState('');
  const [assistName, setAssistName] = useState('');
  const [cardPlayerName, setCardPlayerName] = useState('');
  const [error, setError] = useState('');

  const modalTeamPlayers = useMemo(() => {
    const team = modalTeamId === teamA?._id ? teamA : teamB;
    return (team?.members || []).filter(player => player && player.profile);
  }, [modalTeamId, teamA, teamB]);
  
  const opposingTeamPlayers = useMemo(() => {
    const team = modalTeamId === teamA?._id ? teamB : teamA;
    return (team?.members || []).filter(player => player && player.profile);
  }, [modalTeamId, teamA, teamB]);

  const scorerPlayers = isOwnGoal ? opposingTeamPlayers : modalTeamPlayers;
  const assistPlayers = modalTeamPlayers.filter(p => p._id !== scorerId);

  // --- RENDER LOGIC ---
  if (isAppLoading) {
    return <div className="text-center p-10"><FootballIcon className="h-12 w-12 mx-auto text-green-500 animate-spin"/></div>;
  }
  
  if (!tournament || !match || !teamA || !teamB) {
    return <div className="text-center text-red-500">Match data could not be loaded. It might not exist.</div>;
  }
  
  const isAdmin = currentUser?._id === tournament.adminId;
  if (!isAdmin) {
    return <div className="text-center text-yellow-500">Live scoring is only available for tournament admins.</div>;
  }

  // --- EVENT HANDLERS ---
  const openGoalModal = (teamId: string) => {
    setModalTeamId(teamId);
    setIsOwnGoal(false);
    setScorerId('');
    setAssistId('');
    setScorerName('');
    setAssistName('');
    setError('');
    setGoalModalOpen(true);
  };
  
  const openCardModal = (teamId: string) => {
    setModalTeamId(teamId);
    setCardPlayerId('');
    setCardPlayerName('');
    setCardType(CardType.YELLOW);
    setError('');
    setCardModalOpen(true);
  }

  const handleRecordGoal = async () => {
    if ((!scorerId && !scorerName.trim()) || !tournamentId || !matchId || !modalTeamId || isSubmitting) {
        setError("A scorer must be selected or entered.");
        return;
    }
    setIsSubmitting(true);
    setError('');
    try {
        await recordGoal(tournamentId, matchId, {
            scorerId: scorerId || undefined,
            scorerName: scorerName.trim() || undefined,
            benefitingTeamId: modalTeamId,
            assistId: assistId || undefined,
            assistName: assistName.trim() || undefined,
            isOwnGoal,
        });
        setGoalModalOpen(false);
    } catch (err: any) {
        console.error("Failed to record goal:", err);
        setError(err.message || 'An unknown error occurred.');
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleRecordCard = async () => {
    if ((!cardPlayerId && !cardPlayerName.trim()) || !tournamentId || !matchId || !modalTeamId || isSubmitting) {
        setError("A player must be selected or entered for the card.");
        return;
    }
    setIsSubmitting(true);
    setError('');
    try {
        await recordCard(tournamentId, matchId, {
            playerId: cardPlayerId || undefined,
            playerName: cardPlayerName.trim() || undefined,
            cardType,
            teamId: modalTeamId
        });
        setCardModalOpen(false);
    } catch(err: any) {
        console.error("Failed to record card", err);
        setError(err.message || 'An unknown error occurred.');
    } finally {
        setIsSubmitting(false);
    }
  }

  const isKnockout = ['Final', 'Semi-Final', 'Quarter-Final', 'Eliminator'].includes(match.round);
  const needsPenalties = isKnockout && match.scoreA === match.scoreB;

  const handleConfirmEndMatch = async () => {
    if (!tournamentId || !matchId || isSubmitting) return;
    
    let penaltyPayload: { penaltyScoreA: number, penaltyScoreB: number } | undefined = undefined;
    if (needsPenalties) {
      const scoreA = parseInt(penaltyScores.scoreA, 10);
      const scoreB = parseInt(penaltyScores.scoreB, 10);
      if (isNaN(scoreA) || isNaN(scoreB) || scoreA < 0 || scoreB < 0) {
        setEndMatchError("Please enter valid, non-negative penalty scores.");
        return;
      }
      if (scoreA === scoreB) {
        setEndMatchError("Penalty scores cannot be a draw.");
        return;
      }
      penaltyPayload = { penaltyScoreA: scoreA, penaltyScoreB: scoreB };
    }
    
    setEndMatchError('');
    setIsSubmitting(true);
    try {
        await endMatch(tournamentId, matchId, penaltyPayload);
        setEndModalOpen(false);
        navigate(`/tournament/${tournamentId}`);
    } catch(err: any) {
        setEndMatchError(err.message || "Failed to end match.");
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-gray-800 p-4 sm:p-6 rounded-lg shadow-lg max-w-4xl mx-auto">
      <h1 className="text-2xl sm:text-3xl font-bold text-center mb-2">Live Scoring</h1>
      <p className="text-center text-red-500 font-semibold animate-pulse mb-6">MATCH IS LIVE</p>

      <div className="flex flex-col sm:grid sm:grid-cols-3 items-center sm:items-start gap-4 sm:gap-0 mb-8 text-center">
        <div className="flex flex-col items-center gap-2 w-full">
          {teamA.logoUrl ? (
            <img src={teamA.logoUrl} alt={teamA.name} className="w-20 h-20 sm:w-28 sm:h-28 rounded-full object-cover border-4 border-gray-600" />
          ) : (
            <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-full bg-gray-700 flex items-center justify-center border-4 border-gray-600">
              <span className="text-3xl sm:text-4xl font-bold text-gray-400">{teamA.name.charAt(0)}</span>
            </div>
          )}
          <h2 className="text-xl sm:text-2xl font-bold truncate max-w-full px-2">{teamA.name}</h2>
          <div className="flex gap-2 mt-2">
            <button onClick={() => openGoalModal(teamA._id)} className="bg-green-600 hover:bg-green-700 text-white font-bold py-1 px-3 rounded text-sm">Goal</button>
            <button onClick={() => openCardModal(teamA._id)} className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-1 px-3 rounded text-sm">Card</button>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center sm:h-full">
            <p className="text-5xl sm:text-7xl font-extrabold tracking-tighter">
                {match.scoreA} - {match.scoreB}
            </p>
            <button onClick={() => setEndModalOpen(true)} className="mt-4 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-lg">
                End Match
            </button>
        </div>

        <div className="flex flex-col items-center gap-2 w-full">
            {teamB.logoUrl ? (
                <img src={teamB.logoUrl} alt={teamB.name} className="w-20 h-20 sm:w-28 sm:h-28 rounded-full object-cover border-4 border-gray-600" />
            ) : (
                <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-full bg-gray-700 flex items-center justify-center border-4 border-gray-600">
                    <span className="text-3xl sm:text-4xl font-bold text-gray-400">{teamB.name.charAt(0)}</span>
                </div>
            )}
            <h2 className="text-xl sm:text-2xl font-bold truncate max-w-full px-2">{teamB.name}</h2>
            <div className="flex gap-2 mt-2">
                <button onClick={() => openGoalModal(teamB._id)} className="bg-green-600 hover:bg-green-700 text-white font-bold py-1 px-3 rounded text-sm">Goal</button>
                <button onClick={() => openCardModal(teamB._id)} className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-1 px-3 rounded text-sm">Card</button>
            </div>
        </div>
      </div>

       {isGoalModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-lg">
                <h3 className="text-xl font-bold mb-4">Record Goal for {modalTeamId === teamA._id ? teamA.name : teamB.name}</h3>
                {error && <p className="text-red-400 bg-red-500/10 p-2 rounded-md mb-4 text-sm">{error}</p>}
                <div className="space-y-4">
                    <div>
                        <label className="flex items-center">
                            <input type="checkbox" checked={isOwnGoal} onChange={e => setIsOwnGoal(e.target.checked)} className="h-4 w-4 text-green-600 bg-gray-700 border-gray-600 rounded focus:ring-green-500"/>
                            <span className="ml-2 text-gray-300">Is this an own goal?</span>
                        </label>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300">Scorer</label>
                        <select value={scorerId} onChange={e => { setScorerId(e.target.value); if (e.target.value) setScorerName(''); }} className="w-full bg-gray-700 text-white p-2 rounded mt-1">
                            <option value="">-- Select Player --</option>
                            {scorerPlayers.map(p => <option key={p._id} value={p._id}>{p.profile.name}</option>)}
                        </select>
                        <input type="text" placeholder="Or type name manually" value={scorerName} onChange={e => { setScorerName(e.target.value); if (e.target.value) setScorerId(''); }} className="w-full bg-gray-700 text-white p-2 rounded mt-2 text-sm" />
                    </div>
                    {!isOwnGoal && (
                        <div>
                            <label className="block text-sm font-medium text-gray-300">Assist (Optional)</label>
                            <select value={assistId} onChange={e => { setAssistId(e.target.value); if (e.target.value) setAssistName(''); }} className="w-full bg-gray-700 text-white p-2 rounded mt-1">
                                <option value="">-- Select Player --</option>
                                {assistPlayers.map(p => <option key={p._id} value={p._id}>{p.profile.name}</option>)}
                            </select>
                             <input type="text" placeholder="Or type name manually" value={assistName} onChange={e => { setAssistName(e.target.value); if (e.target.value) setAssistId(''); }} className="w-full bg-gray-700 text-white p-2 rounded mt-2 text-sm" />
                        </div>
                    )}
                </div>
                <div className="flex justify-end gap-4 mt-6">
                    <button onClick={() => setGoalModalOpen(false)} className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg" disabled={isSubmitting}>Cancel</button>
                    <button onClick={handleRecordGoal} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg" disabled={isSubmitting}>{isSubmitting ? 'Recording...' : 'Record Goal'}</button>
                </div>
            </div>
        </div>
      )}
      
      {isCardModalOpen && (
         <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-lg">
                <h3 className="text-xl font-bold mb-4">Record Card for {modalTeamId === teamA._id ? teamA.name : teamB.name}</h3>
                {error && <p className="text-red-400 bg-red-500/10 p-2 rounded-md mb-4 text-sm">{error}</p>}
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-300">Player</label>
                        <select value={cardPlayerId} onChange={e => { setCardPlayerId(e.target.value); if(e.target.value) setCardPlayerName(''); }} className="w-full bg-gray-700 text-white p-2 rounded mt-1">
                            <option value="">-- Select Player --</option>
                            {modalTeamPlayers.map(p => <option key={p._id} value={p._id}>{p.profile.name}</option>)}
                        </select>
                        <input type="text" placeholder="Or type name manually" value={cardPlayerName} onChange={e => { setCardPlayerName(e.target.value); if(e.target.value) setCardPlayerId(''); }} className="w-full bg-gray-700 text-white p-2 rounded mt-2 text-sm" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300">Card Type</label>
                        <select value={cardType} onChange={e => setCardType(e.target.value as CardType)} className="w-full bg-gray-700 text-white p-2 rounded mt-1">
                            <option value={CardType.YELLOW}>Yellow</option>
                            <option value={CardType.RED}>Red</option>
                        </select>
                    </div>
                </div>
                <div className="flex justify-end gap-4 mt-6">
                    <button onClick={() => setCardModalOpen(false)} className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg" disabled={isSubmitting}>Cancel</button>
                    <button onClick={handleRecordCard} className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-4 rounded-lg" disabled={isSubmitting}>{isSubmitting ? 'Recording...' : 'Record Card'}</button>
                </div>
            </div>
        </div>
      )}
      
      {isEndModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-lg">
                <h3 className="text-xl font-bold mb-4">Confirm End Match</h3>
                <p className="text-gray-300 mb-4">Are you sure you want to end this match? The result will be final.</p>
                
                {needsPenalties && (
                    <div className="bg-gray-700 p-4 rounded-lg mb-4">
                        <h4 className="font-semibold mb-2">Penalty Shootout Required</h4>
                        <p className="text-sm text-gray-400 mb-3">The match is a draw in a knockout round. Please enter the final penalty scores.</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                            <div className="flex flex-col items-center">
                                 <label className="font-bold text-sm mb-1">{teamA.name}</label>
                                <input
                                    type="number"
                                    value={penaltyScores.scoreA}
                                    onChange={(e) => setPenaltyScores(prev => ({ ...prev, scoreA: e.target.value }))}
                                    className="w-20 bg-gray-800 text-white p-2 rounded text-center text-lg"
                                    min="0"
                                />
                            </div>
                             <div className="flex flex-col items-center">
                                 <label className="font-bold text-sm mb-1">{teamB.name}</label>
                                <input
                                    type="number"
                                    value={penaltyScores.scoreB}
                                    onChange={(e) => setPenaltyScores(prev => ({ ...prev, scoreB: e.target.value }))}
                                    className="w-20 bg-gray-800 text-white p-2 rounded text-center text-lg"
                                    min="0"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {endMatchError && <p className="text-red-400 bg-red-500/10 p-2 rounded-md mb-4 text-sm">{endMatchError}</p>}
                
                <div className="flex justify-end gap-4 mt-6">
                    <button onClick={() => setEndModalOpen(false)} className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg" disabled={isSubmitting}>Cancel</button>
                    <button onClick={handleConfirmEndMatch} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg" disabled={isSubmitting}>{isSubmitting ? 'Ending...' : 'Confirm & End Match'}</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default LiveScoringPage;
