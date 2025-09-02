import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useAppContext } from '../hooks/useAppContext';
import { MatchStatus, CardType, Tournament, Match, Team, User } from '../types';
import { FootballIcon } from './common/Icons';

const LiveScoringPage: React.FC = () => {
  const { matchId } = useParams<{ matchId: string }>();
  const [searchParams] = useSearchParams();
  const tournamentId = searchParams.get('tournamentId');
  const navigate = useNavigate();

  const { getTournamentById, recordGoal, recordCard, endMatch, currentUser } = useAppContext();
  
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [match, setMatch] = useState<Match | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchMatchData = async () => {
        if (!tournamentId || !matchId) {
            setError("Missing tournament or match ID.");
            setIsLoading(false);
            return;
        }
        try {
            setIsLoading(true);
            const fetchedTournament = await getTournamentById(tournamentId);
            if (fetchedTournament) {
                setTournament(fetchedTournament);
                const currentMatch = fetchedTournament.matches.find(m => m._id === matchId);
                if (currentMatch) {
                    setMatch(currentMatch);
                } else {
                    setError("Match not found in this tournament.");
                }
            } else {
                setError("Tournament not found.");
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };
    fetchMatchData();
  }, [tournamentId, matchId, getTournamentById]);

  const teamA = match?.teamAId as Team | undefined;
  const teamB = match?.teamBId as Team | undefined;

  const [isGoalModalOpen, setGoalModalOpen] = useState(false);
  const [isCardModalOpen, setCardModalOpen] = useState(false);
  const [isEndModalOpen, setEndModalOpen] = useState(false);
  const [modalTeamId, setModalTeamId] = useState('');
  
  const [isOwnGoal, setIsOwnGoal] = useState(false);
  const [scorerId, setScorerId] = useState('');
  const [assistId, setAssistId] = useState('');

  const [cardPlayerId, setCardPlayerId] = useState('');
  const [cardType, setCardType] = useState<CardType>(CardType.YELLOW);

  const modalTeamPlayers = useMemo(() => {
    const team = modalTeamId === teamA?._id ? teamA : teamB;
    return team?.members || [];
  }, [modalTeamId, teamA, teamB]);
  
  const opposingTeamPlayers = useMemo(() => {
    const team = modalTeamId === teamA?._id ? teamB : teamA;
    return team?.members || [];
  }, [modalTeamId, teamA, teamB]);

  const scorerPlayers = isOwnGoal ? opposingTeamPlayers : modalTeamPlayers;
  const assistPlayers = modalTeamPlayers.filter(p => p._id !== scorerId);


  if (isLoading) {
    return <div className="text-center p-10"><FootballIcon className="h-12 w-12 mx-auto text-green-500 animate-spin"/></div>;
  }
  
  if (error || !tournament || !match || !teamA || !teamB) {
    return <div className="text-center text-red-500">{error || 'Match data could not be loaded.'}</div>;
  }

  const isAdmin = currentUser?._id === tournament.adminId;
  if (!isAdmin) {
    return <div className="text-center text-yellow-500">Live scoring is only available for tournament admins.</div>;
  }

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
    if (!scorerId || !tournamentId || !matchId) return;
    await recordGoal(tournamentId, matchId, scorerId, assistId || undefined, isOwnGoal);
    setGoalModalOpen(false);
  };

  const handleRecordCard = async () => {
    if (!cardPlayerId || !tournamentId || !matchId) return;
    await recordCard(tournamentId, matchId, cardPlayerId, cardType);
    setCardModalOpen(false);
  }

  const handleConfirmEndMatch = async () => {
    if (!tournamentId || !matchId) return;
    await endMatch(tournamentId, matchId);
    setEndModalOpen(false);
    navigate(`/tournament/${tournamentId}`);
  };

  return (
    <div className="bg-gray-800 p-6 rounded-lg shadow-lg max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-center mb-2">Live Scoring</h1>
      <p className="text-center text-red-500 font-semibold animate-pulse mb-6">MATCH IS LIVE</p>

      <div className="grid grid-cols-3 items-start mb-8 text-center">
        <div className="flex flex-col items-center gap-2">
          <img
            src={teamA.logoUrl || `https://picsum.photos/seed/${teamA._id}/96`}
            className="w-24 h-24 rounded-full object-cover"
            alt={teamA.name}
          />
          <h2 className="text-2xl font-bold">{teamA.name}</h2>
          <div className="flex flex-col gap-2 w-full max-w-xs mt-2">
            <button onClick={() => openGoalModal(teamA._id)} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg text-md"> + Goal </button>
            <button onClick={() => openCardModal(teamA._id)} className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-6 rounded-lg text-md"> + Card </button>
          </div>
        </div>

        <div className="text-6xl font-extrabold mt-12">{match.scoreA} - {match.scoreB}</div>

        <div className="flex flex-col items-center gap-2">
          <img
            src={teamB.logoUrl || `https://picsum.photos/seed/${teamB._id}/96`}
            className="w-24 h-24 rounded-full object-cover"
            alt={teamB.name}
          />
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
              <button onClick={handleRecordGoal} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg" disabled={!scorerId}> Confirm Goal </button>
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
              <button onClick={handleRecordCard} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg" disabled={!cardPlayerId}>Confirm Card</button>
            </div>
          </div>
        </div>
      )}

      {isEndModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">End Match</h3>
            <p className="text-gray-300 mb-4">
              Are you sure you want to end this match? Final Score: {teamA.name} {match.scoreA} - {match.scoreB}{' '}
              {teamB.name}
            </p>
            <div className="flex justify-end gap-4">
              <button onClick={() => setEndModalOpen(false)} className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg"> Cancel </button>
              <button onClick={handleConfirmEndMatch} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg"> Confirm </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveScoringPage;
