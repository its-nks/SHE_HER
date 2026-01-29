// add-test-intent.js
const mongoose = require('mongoose');
const TravelIntent = require('../models/TravelIntent.model');
require('dotenv').config();

async function addTestIntent() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sathi-her');
        console.log('Connected to MongoDB');

        // Create a test travel intent
        const testIntent = await TravelIntent.create({
            userId: new mongoose.Types.ObjectId(), // Random user ID
            source: {
                address: 'Connaught Place, Delhi',
                coordinates: [77.2090, 28.6139] // longitude, latitude
            },
            destination: {
                address: 'Cyber City, Gurgaon',
                coordinates: [77.0266, 28.4595]
            },
            travelMode: 'metro',
            travelTime: new Date('2024-01-27T10:30:00Z'),
            isActive: true
        });

        console.log('Created test travel intent:', testIntent._id);
        console.log('User ID:', testIntent.userId);

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await mongoose.disconnect();
    }
}

addTestIntent();