const mongoose = require('mongoose');

const journeySchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    source: {
        lat: { type: Number, required: true },
        lng: { type: Number, required: true }
    },

    destination: {
        lat: { type: Number, required: true },
        lng: { type: Number, required: true }
    },

    startTime: {
        type: Date,
        required: true
    },

    transportMode: {
        type: String,
        enum: ['bus', 'metro', 'cab'],
        required: true
    },

    routePolyline: {
        type: Array, // array of lat-lng points
        default: []
    },

    status: {
        type: String,
        enum: ['active', 'completed'],
        default: 'active'
    }

}, { timestamps: true });

module.exports = mongoose.model('Journey', journeySchema);
