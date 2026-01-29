// test-db-query.js
const mongoose = require('mongoose');
const TravelIntent = require('../models/TravelIntent.model');
require('dotenv').config();

async function testQuery() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sathi-her');
        console.log('Connected to MongoDB');

        // Simple test query
        console.log('\nTesting simple query...');
        const query = {
            travelMode: 'metro',
            isActive: true
        };

        console.log('Query:', JSON.stringify(query));
        const results = await TravelIntent.find(query).limit(5);

        console.log('\nQuery successful!');
        console.log('Number of results:', results.length);
        console.log('Results type:', typeof results);
        console.log('Is array?', Array.isArray(results));

        if (results.length > 0) {
            console.log('\nFirst result:');
            console.log('ID:', results[0]._id);
            console.log('Source:', results[0].source);
            console.log('Travel mode:', results[0].travelMode);
        }

    } catch (error) {
        console.error('\nERROR:', error.message);
        console.error('Stack:', error.stack);
    } finally {
        await mongoose.disconnect();
        console.log('\nDisconnected from MongoDB');
    }
}

testQuery();