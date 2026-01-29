// Backend/simple-server.js
const express = require('express');
require('dotenv').config();

const app = express();

app.use(express.json());

// Simple test endpoint
app.get('/api/test', (req, res) => {
    res.json({
        message: 'Server is working!',
        timestamp: new Date().toISOString()
    });
});

// Test companion matching endpoint
app.post('/api/maps/find-companions', (req, res) => {
    console.log('Find companions request:', req.body);

    // Mock response for testing
    res.json({
        success: true,
        companions: [
            {
                id: '1',
                name: 'Priya Sharma',
                trustScore: 85,
                routeOverlap: 75,
                distance: 1200,
                travelMode: 'metro',
                preferredTime: '2024-01-15T08:30:00Z'
            },
            {
                id: '2',
                name: 'Anjali Patel',
                trustScore: 92,
                routeOverlap: 68,
                distance: 1800,
                travelMode: 'metro',
                preferredTime: '2024-01-15T08:45:00Z'
            }
        ]
    });
});

// Test meeting point endpoint
app.post('/api/maps/suggest-meeting-point', (req, res) => {
    console.log('Meeting point request:', req.body);

    // Mock response for testing
    res.json({
        success: true,
        meetingPoint: {
            coordinates: { lat: 28.6139, lng: 77.2090 },
            name: 'Connaught Place Metro Station',
            address: 'Connaught Place, New Delhi, India',
            safetyScore: 0.85,
            suggestedTime: '2024-01-15T08:40:00Z'
        }
    });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`Simple test server running on port ${PORT}`);
    console.log(`Test endpoints:`);
    console.log(`- GET http://localhost:${PORT}/api/test`);
    console.log(`- POST http://localhost:${PORT}/api/maps/find-companions`);
    console.log(`- POST http://localhost:${PORT}/api/maps/suggest-meeting-point`);
});