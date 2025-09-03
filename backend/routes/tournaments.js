const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
    createTournament,
    getTournamentById,
    addTeamToTournament,
    scheduleMatches,
    addMatchManually,
    updateMatchDetails,
    updateMatchStatus,
    recordGoal,
    recordCard,
    setPlayerOfTheMatch,
    joinTournament
} = require('../controllers/tournamentController');

// All routes are protected
router.use(auth);

// Create and get tournaments
router.post('/', createTournament);
router.post('/join', joinTournament); // Route for joining with code
router.get('/:id', getTournamentById);


// Manage teams in tournament
router.post('/:id/teams', addTeamToTournament);

// Manage matches
router.post('/:id/schedule', scheduleMatches);
router.post('/:id/matches', addMatchManually);
router.put('/:id/matches/:matchId', updateMatchDetails);
router.patch('/:id/matches/:matchId/status', updateMatchStatus);
router.patch('/:id/matches/:matchId/potm', setPlayerOfTheMatch);

// Live scoring
router.post('/:id/matches/:matchId/goal', recordGoal);
router.post('/:id/matches/:matchId/card', recordCard);

module.exports = router;
