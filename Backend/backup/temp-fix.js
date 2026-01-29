// temp-fix.js
const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sathi-her')
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB error:', err));

// Simple controller
const findCompanions = async (req, res) => {
    console.log('TEMP FIX: findCompanions called');

    try {
        const data = req.body;
        console.log('Received data:', JSON.stringify(data));

        // Simple validation
        if (!data.userId || !data.travelMode || !data.travelTime) {
            return res.json({
                success: false,
                error: 'Missing fields'
            });
        }

        // Simple response - NO database query
        return res.json({
            success: true,
            message: 'Temporary fix working',
            companions: [
                {
                    id: 'temp1',
                    source: { coordinates: [77.2, 28.6], address: 'Temp Location' },
                    destination: { coordinates: [77.3, 28.7], address: 'Temp Destination' },
                    travelMode: data.travelMode,
                    travelTime: data.travelTime
                }
            ],
            count: 1
        });

    } catch (error) {
        console.error('Error:', error);
        return res.json({
            success: false,
            error: 'Error: ' + error.message
        });
    }
};

const suggestMeetingPoint = (req, res) => {
    return res.json({
        success: true,
        meetingPoint: {
            coordinates: { lat: 28.6139, lng: 77.2090 },
            name: 'Test Point'
        }
    });
};

// Routes
app.post('/api/maps/find-companions', findCompanions);
app.post('/api/maps/suggest-meeting-point', suggestMeetingPoint);

app.get('/', (req, res) => {
    res.json({ message: 'Temp fix server' });
});

app.listen(4003, () => {
    console.log('Temp fix server on port 4003');
    console.log('Test: curl -X POST http://localhost:4003/api/maps/find-companions -H "Content-Type: application/json" -d "{\"userId\":\"test\",\"travelMode\":\"metro\",\"travelTime\":\"2024-01-27T10:30:00Z\"}"');
});