// models/TravelIntent.model.js
const mongoose = require('mongoose');

const travelIntentSchema = new mongoose.Schema({
    userName: {  // CHANGED: userId -> userName
        type: String,
        required: true
    },

    source: {
        address: String,
        coordinates: {
            type: [Number], // [longitude, latitude]
            index: '2dsphere'
        }
    },

    destination: {
        address: String,
        coordinates: {
            type: [Number]
        }
    },

    travelMode: {
        type: String,
        enum: ['bus', 'metro', 'cab'],
        required: true
    },

    travelTime: {
        type: Date,
        required: true
    },

    isActive: {
        type: Boolean,
        default: true
    }

}, { timestamps: true });

module.exports = mongoose.model('TravelIntent', travelIntentSchema);