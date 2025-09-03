const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const PlayerProfileSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    age: {
        type: Number,
        default: null
    },
    position: {
        type: String,
        enum: ['Forward', 'Midfielder', 'Defender', 'Goalkeeper', null],
        default: null
    },
    imageUrl: {
        type: String,
        default: null
    },
    year: String,
    mobile: String,
}, { _id: false });


const UserSchema = new Schema({
    email: {
        type: String,
        required: true,
        unique: true
    },
    passwordHash: {
        type: String,
        required: true
    },
    profile: PlayerProfileSchema,
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);