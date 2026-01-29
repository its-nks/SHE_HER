// Backend/simple-test.js
const axios = require('axios');

const BASE_URL = 'http://localhost:4000/api';

async function runTests() {
    try {
        console.log('=== Testing Sathi-Her Backend ===\n');

        // Test 1: Check if server is running
        console.log('1. Testing server connection...');
        try {
            const testResponse = await axios.get(`${BASE_URL}/test`);
            console.log('✓ Server is running:', testResponse.data.message);
        } catch (error) {
            console.log('✗ Server is not running. Start it with: node simple-server.js');
            return;
        }

        // Test 2: Find companions
        console.log('\n2. Testing companion matching...');
        try {
            const companionResponse = await axios.post(`${BASE_URL}/maps/find-companions`, {
                userId: 'test123',
                source: { lat: 28.6139, lng: 77.2090 },
                destination: { lat: 28.4595, lng: 77.0266 },
                travelMode: 'metro',
                preferredTime: '2024-01-15T08:30:00Z'
            });

            if (companionResponse.data.success) {
                console.log('✓ Companion matching successful!');
                console.log('  Found', companionResponse.data.companions.length, 'companions');
                companionResponse.data.companions.forEach((comp, i) => {
                    console.log(`  ${i + 1}. ${comp.name} - ${comp.routeOverlap}% overlap`);
                });
            }
        } catch (error) {
            console.log('✗ Companion matching failed:', error.message);
        }

        // Test 3: Meeting point suggestion
        console.log('\n3. Testing meeting point suggestion...');
        try {
            const meetingResponse = await axios.post(`${BASE_URL}/maps/suggest-meeting-point`, {
                userId: 'user1',
                companionId: 'companion1'
            });

            if (meetingResponse.data.success) {
                console.log('✓ Meeting point suggestion successful!');
                console.log('  Location:', meetingResponse.data.meetingPoint.name);
                console.log('  Address:', meetingResponse.data.meetingPoint.address);
                console.log('  Safety Score:', meetingResponse.data.meetingPoint.safetyScore);
            }
        } catch (error) {
            console.log('✗ Meeting point suggestion failed:', error.message);
        }

        console.log('\n=== All tests completed ===');

    } catch (error) {
        console.error('Test error:', error.message);
    }
}

runTests();