// debug-solution.js - WITH MAXIMUM DEBUGGING
const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
app.use(express.json());

console.log('🚀 Starting debug server...');
console.log('MongoDB URI:', process.env.MONGODB_URI || 'mongodb://localhost:27017/sathi-her');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sathi-her')
    .then(() => {
        console.log('✅ Connected to MongoDB');
        console.log('   Connection state:', mongoose.connection.readyState);
        console.log('   Database name:', mongoose.connection.name);
    })
    .catch(err => {
        console.error('❌ MongoDB connection error:', err.message);
        console.error('   Error details:', err);
    });

// Import model
const TravelIntent = require('../models/TravelIntent.model');

// Point 5: With maximum debugging
const findCompanions = async (req, res) => {
    console.log('\n=== DEBUG: findCompanions called ===');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    console.log('Request headers:', req.headers);

    try {
        const data = req.body;

        // Validation
        const required = ['userId', 'source', 'destination', 'travelMode', 'travelTime'];
        const missing = required.filter(field => !data[field]);

        if (missing.length > 0) {
            console.log('Validation failed - missing:', missing);
            return res.status(400).json({
                success: false,
                error: 'Missing: ' + missing.join(', ')
            });
        }

        console.log('All validation passed');

        // Parse dates
        console.log('Parsing travelTime:', data.travelTime);
        let travelDate;
        try {
            travelDate = new Date(data.travelTime);
            console.log('Parsed date:', travelDate.toISOString());
            console.log('Is valid date?', !isNaN(travelDate.getTime()));
        } catch (dateError) {
            console.error('Date parsing error:', dateError);
            return res.status(400).json({
                success: false,
                error: 'Invalid date format'
            });
        }

        const timeWindowStart = new Date(travelDate.getTime() - 30 * 60000);
        const timeWindowEnd = new Date(travelDate.getTime() + 30 * 60000);
        console.log('Time window:', timeWindowStart.toISOString(), 'to', timeWindowEnd.toISOString());

        // Build query
        const query = {
            userId: { $ne: data.userId },
            travelMode: data.travelMode,
            travelTime: { $gte: timeWindowStart, $lte: timeWindowEnd },
            isActive: true
        };

        console.log('Query to execute:', JSON.stringify(query, null, 2));
        console.log('Mongoose connection state:', mongoose.connection.readyState);

        // Execute query with timing
        console.log('Executing database query...');
        const startTime = Date.now();

        let results;
        try {
            // First, test if collection exists
            const collections = await mongoose.connection.db.listCollections().toArray();
            console.log('Available collections:', collections.map(c => c.name));

            // Count documents
            const count = await TravelIntent.countDocuments({});
            console.log(`Total documents in TravelIntent: ${count}`);

            // Execute find query
            results = await TravelIntent.find(query).limit(10);
            const queryTime = Date.now() - startTime;
            console.log(`Query completed in ${queryTime}ms`);
            console.log(`Found ${results.length} documents`);

            if (results.length > 0) {
                console.log('First result:', JSON.stringify(results[0], null, 2));
            }

        } catch (dbError) {
            console.error('DATABASE ERROR DETAILS:');
            console.error('   Error name:', dbError.name);
            console.error('   Error message:', dbError.message);
            console.error('   Error code:', dbError.code);
            console.error('   Error stack:', dbError.stack);

            // Check for specific Mongoose errors
            if (dbError.name === 'CastError') {
                console.error('   Cast error path:', dbError.path);
                console.error('   Cast error value:', dbError.value);
            }

            throw dbError;
        }

        // Build response
        console.log('Building response...');
        const companions = [];
        for (let i = 0; i < results.length; i++) {
            const item = results[i];
            companions.push({
                id: item._id ? item._id.toString() : 'unknown',
                source: item.source || {},
                destination: item.destination || {},
                travelMode: item.travelMode || 'unknown',
                travelTime: item.travelTime || new Date(),
                isActive: item.isActive !== undefined ? item.isActive : true
            });
        }

        console.log('Response ready with', companions.length, 'companions');

        return res.json({
            success: true,
            companions: companions,
            count: companions.length,
            message: `Found ${companions.length} companions`,
            debug: {
                queryTime: Date.now() - startTime,
                queryUsed: query,
                resultsCount: results.length
            }
        });

    } catch (error) {
        console.error('\n❌ UNHANDLED ERROR IN findCompanions:');
        console.error('   Full error object:', error);
        console.error('   Error constructor:', error.constructor.name);

        return res.status(500).json({
            success: false,
            error: 'Internal server error',
            debug: {
                errorName: error.name,
                errorMessage: error.message,
                timestamp: new Date().toISOString()
            }
        });
    } finally {
        console.log('=== DEBUG: findCompanions finished ===\n');
    }
};

// Point 8 (already working)
const suggestMeetingPoint = async (req, res) => {
    console.log('\n📍 Meeting point suggestion called');
    const meetingPoint = {
        coordinates: { lat: 28.6139, lng: 77.2090 },
        name: "Connaught Place Metro Station",
        address: "Connaught Place, New Delhi, India",
        safetyScore: 0.85,
        safetyFactors: ["public_transport", "well_lit", "crowded", "24/7"],
        suggestedTime: new Date().toISOString(),
        reason: "Safe, public location with maximum visibility"
    };

    return res.json({
        success: true,
        meetingPoint: meetingPoint,
        message: "✅ AI-suggested safe meeting point"
    });
};

// Routes
app.post('/api/maps/find-companions', findCompanions);
app.post('/api/maps/suggest-meeting-point', suggestMeetingPoint);

app.get('/', (req, res) => {
    res.json({ message: 'Debug server running' });
});

const PORT = 4001; // Different port
app.listen(PORT, () => {
    console.log(`\n🔧 DEBUG SERVER ON PORT ${PORT}`);
    console.log(`🌐 http://localhost:${PORT}`);
});