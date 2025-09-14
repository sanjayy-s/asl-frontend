

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
    setGoalModalOpen(true);
  };
  
  const openCardModal = (teamId: string) => {
    setModalTeamId(teamId);
    setCardPlayerId('');
    setCardType(CardType.YELLOW);
    setCardModalOpen(true);
  }

  const handleRecordGoal = async () => {
    if (!scorerId || !tournamentId || !matchId || !modalTeamId || isSubmitting) return;
    setIsSubmitting(true);
    try {
        await recordGoal(tournamentId, matchId, scorerId, modalTeamId, assistId || undefined, isOwnGoal);
        setGoalModalOpen(false);
    } catch (error) {
        console.error("Failed to record goal:", error);
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleRecordCard = async () => {
    if (!cardPlayerId || !tournamentId || !matchId || !modalTeamId || isSubmitting) return;
    setIsSubmitting(true);
    try {
        await recordCard(tournamentId, matchId, cardPlayerId, cardType, modalTeamId);
        setCardModalOpen(false);
    } catch(error) {
        console.error("Failed to record card", error);
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
    <div className="bg-gray-800 p-6 rounded-lg shadow-lg max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-center mb-2">Live Scoring</h1>
      <p className="text-center text-red-500 font-semibold animate-pulse mb-6">MATCH IS LIVE</p>

      <div className="grid grid-cols-3 items-start mb-8 text-center">
        <div className="flex flex-col items-center gap-2">
           {teamA.logoUrl ? (
                <img src={teamA.logoUrl} className="w-24 h-24 rounded-full object-cover" alt={teamA.name} />
           ) : (
                <div className="w-24 h-24 rounded-full bg-gray-700 flex items-center justify-center">
                    <span className="text-4xl font-bold text-gray-500">{teamA.name.charAt(0)}</span>
                </div>
           )}
          <h2 className="text-2xl font-bold">{teamA.name}</h2>
          <div className="flex flex-col gap-2 w-full max-w-xs mt-2">
            <button onClick={() => openGoalModal(teamA._id)} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg text-md"> + Goal </button>
            <button onClick={() => openCardModal(teamA._id)} className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-6 rounded-lg text-md"> + Card </button>
          </div>
        </div>

        <div className="text-6xl font-extrabold mt-12">{match.scoreA} - {match.scoreB}</div>

        <div className="flex flex-col items-center gap-2">
          {teamB.logoUrl ? (
                <img src={teamB.logoUrl} className="w-24 h-24 rounded-full object-cover" alt={teamB.name} />
           ) : (
                <div className="w-24 h-24 rounded-full bg-gray-700 flex items-center justify-center">
                    <span className="text-4xl font-bold text-gray-500">{teamB.name.charAt(0)}</span>
                </div>
           )}
          <h2 className="text-2xl font-bold">{teamB.name}</h2>
           <div className="flex flex-col gap-2 w-full max-w-xs mt-2">
            <button onClick={() => openGoalModal(teamB._id)} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg text-md"> + Goal </button>
            <button onClick={() => openCardModal(teamB._id)} className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-6 rounded-lg text-md"> + Card </button>
          </div>
        </div>
      </div>

      <div className="text-center mt-12 border-t border-gray-700 pt-6">
        <button
          onClick={() => setEndModalOpen(true)}
          className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-10 rounded-lg text-lg"
          disabled={match.status === MatchStatus.FINISHED}
        >
          End Match
        </button>
      </div>

      {isGoalModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">Record Goal</h3>
            <div className="space-y-4">
              <div className="flex items-center">
                <input type="checkbox" id="ownGoal" checked={isOwnGoal} onChange={(e) => setIsOwnGoal(e.target.checked)} className="h-4 w-4 rounded bg-gray-700 border-gray-600 text-green-500 focus:ring-green-500"/>
                <label htmlFor="ownGoal" className="ml-2 text-sm font-medium text-gray-300">Is this an Own Goal?</label>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300">Scorer</label>
                <select value={scorerId} onChange={(e) => setScorerId(e.target.value)} className="w-full bg-gray-700 text-white p-2 rounded mt-1">
                  <option value="">Select scorer</option>
                  {scorerPlayers.map((p) => (<option key={p._id} value={p._id}>{p.profile.name}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300">Assist (Optional)</label>
                <select value={assistId} onChange={(e) => setAssistId(e.target.value)} className="w-full bg-gray-700 text-white p-2 rounded mt-1">
                  <option value="">Select assist provider</option>
                  {assistPlayers.map((p) => (<option key={p._id} value={p._id}>{p.profile.name}</option>))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-4 mt-6">
              <button onClick={() => setGoalModalOpen(false)} className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg"> Cancel </button>
              <button onClick={handleRecordGoal} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg disabled:bg-gray-500 disabled:cursor-not-allowed" disabled={!scorerId || isSubmitting}>
                 {isSubmitting ? 'Confirming...' : 'Confirm Goal'}
              </button>
            </div>
          </div>
        </div>
      )}

      {isCardModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">Record Card</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300">Player</label>
                <select value={cardPlayerId} onChange={(e) => setCardPlayerId(e.target.value)} className="w-full bg-gray-700 text-white p-2 rounded mt-1">
                  <option value="">Select player</option>
                  {modalTeamPlayers.map((p) => (<option key={p._id} value={p._id}>{p.profile.name}</option>))}
                </select>
              </div>
               <div>
                <label className="block text-sm font-medium text-gray-300">Card Type</label>
                <div className="mt-2 flex gap-4">
                  <label className="flex items-center">
                    <input type="radio" name="cardType" value={CardType.YELLOW} checked={cardType === CardType.YELLOW} onChange={() => setCardType(CardType.YELLOW)} className="text-yellow-500 focus:ring-yellow-500" />
                    <span className="ml-2">Yellow</span>
                  </label>
                  <label className="flex items-center">
                    <input type="radio" name="cardType" value={CardType.RED} checked={cardType === CardType.RED} onChange={() => setCardType(CardType.RED)} className="text-red-500 focus:ring-red-500" />
                    <span className="ml-2">Red</span>
                  </label>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-4 mt-6">
              <button onClick={() => setCardModalOpen(false)} className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg">Cancel</button>
              <button onClick={handleRecordCard} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg disabled:bg-gray-500 disabled:cursor-not-allowed" disabled={!cardPlayerId || isSubmitting}>
                 {isSubmitting ? 'Confirming...' : 'Confirm Card'}
              </button>
            </div>
          </div>
        </div>
      )}

      {isEndModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-lg">
            <h3 className="text-xl font-bold mb-4">End Match</h3>
            <p className="text-gray-300 mb-4">
              Are you sure you want to end this match? Final Score: {teamA.name} {match.scoreA} - {match.scoreB}{' '}
              {teamB.name}
            </p>
            {needsPenalties && (
                <div className="my-4 border-t border-b border-gray-700 py-4">
                    <h4 className="font-semibold text-lg text-yellow-400 mb-3">Penalty Shootout Required</h4>
                    <p className="text-sm text-gray-400 mb-4">This is a knockout match that ended in a draw. Please enter the final penalty shootout scores to determine a winner.</p>
                    <div className="grid grid-cols-2 gap-4 items-center">
                        <div className="text-center">
                            <label className="font-bold text-lg">{teamA.name}</label>
                            <input
                                type="number"
                                value={penaltyScores.scoreA}
                                onChange={(e) => setPenaltyScores(prev => ({ ...prev, scoreA: e.target.value }))}
                                className="mt-2 w-24 text-center bg-gray-700 border-gray-600 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-lg text-white px-3 py-2"
                                placeholder="Pens"
                            />
                        </div>
                        <div className="text-center">
                            <label className="font-bold text-lg">{teamB.name}</label>
                            <input
                                type="number"
                                value={penaltyScores.scoreB}
                                onChange={(e) => setPenaltyScores(prev => ({ ...prev, scoreB: e.target.value }))}
                                className="mt-2 w-24 text-center bg-gray-700 border-gray-600 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-lg text-white px-3 py-2"
                                placeholder="Pens"
                            />
                        </div>
                    </div>
                </div>
            )}
            {endMatchError && <p className="text-red-400 text-sm mt-2">{endMatchError}</p>}
            <div className="flex justify-end gap-4 mt-6">
              <button onClick={() => setEndModalOpen(false)} className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg"> Cancel </button>
              <button onClick={handleConfirmEndMatch} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg disabled:bg-gray-500 disabled:cursor-not-allowed" disabled={isSubmitting}>
                 {isSubmitting ? 'Confirming...' : 'Confirm End Match'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveScoringPage;
