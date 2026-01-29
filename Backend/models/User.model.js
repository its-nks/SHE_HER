const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },

    phone: {
        type: String,
        required: true,
        unique: true
    },

    gender: {
        type: String,
        enum: ['female'],
        required: true
    },

    isVerified: {
        type: Boolean,
        default: false
    },

    trustScore: {
        type: Number,
        default: 0,
        min: 0,
        max: 5
    }

}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
