const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const { nanoid } = require('nanoid');

const GoalSchema = new Schema({
    scorerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    assistId: { type: Schema.Types.ObjectId, ref: 'User' },
    minute: { type: Number, default: 0 }, // You might want to track this
    isOwnGoal: { type: Boolean, default: false },
    teamId: { type: Schema.Types.ObjectId, ref: 'Team', required: true }
});

const CardSchema = new Schema({
    playerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    minute: { type: Number, default: 0 },
    type: { type: String, enum: ['Yellow', 'Red'], required: true },
    teamId: { type: Schema.Types.ObjectId, ref: 'Team', required: true }
});

const MatchSchema = new Schema({
    matchNumber: { type: Number, required: true },
    teamAId: { type: Schema.Types.ObjectId, ref: 'Team', required: true },
    teamBId: { type: Schema.Types.ObjectId, ref: 'Team', required: true },
    date: { type: String },
    time: { type: String },
    scoreA: { type: Number, default: 0 },
    scoreB: { type: Number, default: 0 },
    penaltyScoreA: { type: Number },
    penaltyScoreB: { type: Number },
    status: {
        type: String,
        enum: ['Scheduled', 'Live', 'Finished'],
        default: 'Scheduled'
    },
    goals: [GoalSchema],
    cards: [CardSchema],
    round: { type: String, required: true },
    winnerId: { type: Schema.Types.ObjectId, ref: 'Team', default: null },
    playerOfTheMatchId: { type: Schema.Types.ObjectId, ref: 'User' }
});

const TournamentSchema = new Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    logoUrl: {
        type: String,
        default: null
    },
    adminId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    teams: [{
        type: Schema.Types.ObjectId,
        ref: 'Team'
    }],
    matches: [MatchSchema],
    isSchedulingDone: {
        type: Boolean,
        default: false
    },
    inviteCode: {
        type: String,
        default: () => nanoid(10).toUpperCase(),
        unique: true,
        required: true
    }
}, { timestamps: true });

module.exports = mongoose.model('Tournament', TournamentSchema);