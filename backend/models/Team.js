const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const { nanoid } = require('nanoid');

const TeamSchema = new Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    logoUrl: {
        type: String,
        default: null
    },
    adminIds: [{
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }],
    captainId: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    viceCaptainId: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    members: [{
        type: Schema.Types.ObjectId,
        ref: 'User'
    }],
    inviteCode: {
        type: String,
        default: () => nanoid(8).toUpperCase(),
        unique: true,
        required: true
    }
}, { timestamps: true });

module.exports = mongoose.model('Team', TeamSchema);