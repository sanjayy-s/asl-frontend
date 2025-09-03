const Tournament = require('../models/Tournament');
const Team = require('../models/Team');
const User = require('../models/User');
const mongoose = require('mongoose');

const populateOptions = [
    { 
        path: 'teams', 
        model: 'Team', 
        populate: { 
            path: 'members adminIds captainId viceCaptainId', 
            model: 'User', 
            select: '-passwordHash' 
        } 
    },
    { path: 'adminId', model: 'User', select: '-passwordHash' },
    { path: 'matches.teamAId', model: 'Team' },
    { path: 'matches.teamBId', model: 'Team' },
    { path: 'matches.goals.scorerId', model: 'User', select: 'profile' },
    { path: 'matches.goals.assistId', model: 'User', select: 'profile' },
    { path: 'matches.cards.playerId', model: 'User', select: 'profile' },
    { path: 'matches.playerOfTheMatchId', model: 'User', select: 'profile' }
];

// Helper to get and populate a tournament
const getAndPopulateTournament = async (tournamentId) => {
    return await Tournament.findById(tournamentId).populate(populateOptions);
}

// @route   POST /api/tournaments
// @desc    Create a new tournament
exports.createTournament = async (req, res) => {
    try {
        const { name, logoUrl } = req.body;
        const newTournament = new Tournament({
            name,
            logoUrl,
            adminId: req.user.id
        });
        await newTournament.save();
        res.status(201).json(newTournament);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @route   GET /api/tournaments/:id
// @desc    Get a tournament by ID
exports.getTournamentById = async (req, res) => {
    try {
        const tournament = await getAndPopulateTournament(req.params.id);
        if (!tournament) {
            return res.status(404).json({ message: 'Tournament not found' });
        }
        res.json(tournament);
    } catch (error) {
        console.error(error);
        if (error.kind === 'ObjectId') {
            return res.status(404).json({ message: 'Tournament not found' });
        }
        res.status(500).json({ message: 'Server Error' });
    }
};

// @route   POST /api/tournaments/join
// @desc    Join a tournament with an invite code
exports.joinTournament = async (req, res) => {
    try {
        const { inviteCode, teamId } = req.body;
        const tournament = await Tournament.findOne({ inviteCode });
        if (!tournament) {
            return res.status(404).json({ success: false, message: 'Tournament not found with this invite code.' });
        }

        const team = await Team.findById(teamId);
        if (!team) {
            return res.status(404).json({ success: false, message: 'Your team was not found.' });
        }

        // Ensure the user is an admin of the team they are trying to register
        if (!team.adminIds.includes(req.user.id)) {
            return res.status(403).json({ success: false, message: 'You must be an admin of the team to join a tournament.' });
        }

        if (tournament.teams.includes(team._id)) {
            return res.status(400).json({ success: false, message: 'This team is already in the tournament.' });
        }

        tournament.teams.push(team._id);
        await tournament.save();

        res.json({ success: true, message: 'Successfully joined tournament!', tournamentId: tournament._id });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};


// @route   POST /api/tournaments/:id/teams
// @desc    Add a team to a tournament
exports.addTeamToTournament = async (req, res) => {
    try {
        const tournament = await Tournament.findById(req.params.id);
        if (!tournament) return res.status(404).json({ success: false, message: 'Tournament not found' });
        if (tournament.adminId.toString() !== req.user.id) return res.status(403).json({ success: false, message: 'User not authorized' });

        const { teamCodeOrId } = req.body;
        
        // Find team by EITHER invite code or ID
        const team = await Team.findOne({
            $or: [
                { _id: mongoose.Types.ObjectId.isValid(teamCodeOrId) ? teamCodeOrId : null },
                { inviteCode: teamCodeOrId }
            ]
        });

        if (!team) return res.status(404).json({ success: false, message: 'Team not found with that ID or Invite Code' });

        if (tournament.teams.includes(team._id)) {
            return res.status(400).json({ success: false, message: 'Team is already in this tournament' });
        }

        tournament.teams.push(team._id);
        await tournament.save();
        
        const populatedTournament = await getAndPopulateTournament(req.params.id);
        res.json({ success: true, message: 'Team added successfully.', tournament: populatedTournament });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @route   POST /api/tournaments/:id/schedule
// @desc    Auto-schedule matches for a tournament
exports.scheduleMatches = async (req, res) => {
    try {
        const tournament = await Tournament.findById(req.params.id);
        if (!tournament) return res.status(404).json({ message: 'Tournament not found' });
        if (tournament.adminId.toString() !== req.user.id) return res.status(403).json({ message: 'User not authorized' });
        if (tournament.teams.length < 2) return res.status(400).json({ message: 'Need at least 2 teams to schedule matches' });
        
        tournament.matches = []; // Clear existing matches
        let matchNumber = 1;
        for (let i = 0; i < tournament.teams.length; i++) {
            for (let j = i + 1; j < tournament.teams.length; j++) {
                tournament.matches.push({
                    matchNumber: matchNumber++,
                    teamAId: tournament.teams[i],
                    teamBId: tournament.teams[j],
                    round: 'League Stage',
                });
            }
        }
        tournament.isSchedulingDone = true;
        await tournament.save();
        
        const populatedTournament = await getAndPopulateTournament(req.params.id);
        res.json(populatedTournament);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @route   POST /api/tournaments/:id/matches
// @desc    Add a match manually
exports.addMatchManually = async (req, res) => {
    try {
        const { teamAId, teamBId, round } = req.body;
        const tournament = await Tournament.findById(req.params.id);
        if (!tournament) return res.status(404).json({ message: 'Tournament not found' });
        if (tournament.adminId.toString() !== req.user.id) return res.status(403).json({ message: 'User not authorized' });

        const maxMatchNumber = tournament.matches.reduce((max, m) => Math.max(max, m.matchNumber), 0);
        
        tournament.matches.push({
            matchNumber: maxMatchNumber + 1,
            teamAId,
            teamBId,
            round,
        });
        await tournament.save();
        const populatedTournament = await getAndPopulateTournament(req.params.id);
        res.json(populatedTournament);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @route   PUT /api/tournaments/:id/matches/:matchId
// @desc    Update match details (teams, date, time)
exports.updateMatchDetails = async (req, res) => {
    try {
        const { teamAId, teamBId, date, time } = req.body;
        const tournament = await Tournament.findById(req.params.id);
        if (!tournament) return res.status(404).json({ message: 'Tournament not found' });
        if (tournament.adminId.toString() !== req.user.id) return res.status(403).json({ message: 'User not authorized' });

        const match = tournament.matches.id(req.params.matchId);
        if (!match) return res.status(404).json({ message: 'Match not found' });

        if (teamAId) match.teamAId = teamAId;
        if (teamBId) match.teamBId = teamBId;
        if (date !== undefined) match.date = date;
        if (time !== undefined) match.time = time;

        await tournament.save();
        
        // Repopulate the single match to return it correctly
        const populatedTournament = await getAndPopulateTournament(req.params.id);
        const updatedMatch = populatedTournament.matches.find(m => m._id.equals(req.params.matchId));

        res.json(updatedMatch);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @route   PATCH /api/tournaments/:id/matches/:matchId/status
// @desc    Start or end a match
exports.updateMatchStatus = async (req, res) => {
    try {
        const { status, penaltyScoreA, penaltyScoreB } = req.body; // 'Live' or 'Finished'
        const tournament = await Tournament.findById(req.params.id);
        if (!tournament) return res.status(404).json({ message: 'Tournament not found' });
        if (tournament.adminId.toString() !== req.user.id) return res.status(403).json({ message: 'User not authorized' });

        const match = tournament.matches.id(req.params.matchId);
        if (!match) return res.status(404).json({ message: 'Match not found' });

        match.status = status;

        if (status === 'Finished') {
            if (match.scoreA > match.scoreB) {
                match.winnerId = match.teamAId;
            } else if (match.scoreB > match.scoreA) {
                match.winnerId = match.teamBId;
            } else { // It's a draw
                const knockoutRounds = ['Final', 'Semi-Final', 'Quarter-Final', 'Eliminator'];
                if (knockoutRounds.includes(match.round)) {
                    // This is a knockout draw, penalties are required
                    if (typeof penaltyScoreA !== 'number' || typeof penaltyScoreB !== 'number' || penaltyScoreA === penaltyScoreB) {
                        return res.status(400).json({ message: 'Valid, non-equal penalty scores are required for a knockout draw.' });
                    }
                    match.penaltyScoreA = penaltyScoreA;
                    match.penaltyScoreB = penaltyScoreB;
                    match.winnerId = penaltyScoreA > penaltyScoreB ? match.teamAId : match.teamBId;
                } else {
                    // This is a league/group stage draw
                    match.winnerId = null;
                }
            }
        }
        
        await tournament.save();
        
        const populatedTournament = await getAndPopulateTournament(req.params.id);
        const updatedMatch = populatedTournament.matches.find(m => m._id.equals(req.params.matchId));
        res.json(updatedMatch);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @route   POST /api/tournaments/:id/matches/:matchId/goal
// @desc    Record a goal
exports.recordGoal = async (req, res) => {
    try {
        const { scorerId, assistId, isOwnGoal } = req.body;
        const tournament = await Tournament.findById(req.params.id);
        if (!tournament) return res.status(404).json({ message: 'Tournament not found' });
        if (tournament.adminId.toString() !== req.user.id) return res.status(403).json({ message: 'User not authorized' });
        
        const match = tournament.matches.id(req.params.matchId);
        if (!match) return res.status(404).json({ message: 'Match not found' });
        
        const scorer = await User.findById(scorerId);
        if (!scorer) return res.status(404).json({ message: 'Scorer not found' });

        const scorerTeam = await Team.findOne({ members: scorerId });
        if (!scorerTeam) return res.status(400).json({ message: 'Scorer is not part of any team in this match' });
        
        const benefitingTeamId = isOwnGoal 
            ? (scorerTeam._id.equals(match.teamAId) ? match.teamBId : match.teamAId) 
            : scorerTeam._id;
        
        if (benefitingTeamId.equals(match.teamAId)) match.scoreA += 1;
        else match.scoreB += 1;

        match.goals.push({ scorerId, assistId, isOwnGoal, teamId: benefitingTeamId });
        await tournament.save();
        
        const populatedTournament = await getAndPopulateTournament(req.params.id);
        const updatedMatch = populatedTournament.matches.find(m => m._id.equals(req.params.matchId));
        res.json(updatedMatch);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @route   POST /api/tournaments/:id/matches/:matchId/card
// @desc    Record a card
exports.recordCard = async (req, res) => {
    try {
        const { playerId, cardType } = req.body;
        const tournament = await Tournament.findById(req.params.id);
        if (!tournament) return res.status(404).json({ message: 'Tournament not found' });
        if (tournament.adminId.toString() !== req.user.id) return res.status(403).json({ message: 'User not authorized' });
        
        const match = tournament.matches.id(req.params.matchId);
        if (!match) return res.status(404).json({ message: 'Match not found' });

        const playerTeam = await Team.findOne({ members: playerId });
        if (!playerTeam) return res.status(400).json({ message: 'Player is not part of any team' });
        
        match.cards.push({ playerId, type: cardType, teamId: playerTeam._id });
        await tournament.save();
        
        const populatedTournament = await getAndPopulateTournament(req.params.id);
        const updatedMatch = populatedTournament.matches.find(m => m._id.equals(req.params.matchId));
        res.json(updatedMatch);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @route   PATCH /api/tournaments/:id/matches/:matchId/potm
// @desc    Set Player of the Match
exports.setPlayerOfTheMatch = async (req, res) => {
    try {
        const { playerId } = req.body;
        const tournament = await Tournament.findById(req.params.id);
        if (!tournament) return res.status(404).json({ message: 'Tournament not found' });
        if (tournament.adminId.toString() !== req.user.id) return res.status(403).json({ message: 'User not authorized' });
        
        const match = tournament.matches.id(req.params.matchId);
        if (!match) return res.status(404).json({ message: 'Match not found' });

        match.playerOfTheMatchId = playerId;
        await tournament.save();
        
        const populatedTournament = await getAndPopulateTournament(req.params.id);
        const updatedMatch = populatedTournament.matches.find(m => m._id.equals(req.params.matchId));
        res.json(updatedMatch);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};