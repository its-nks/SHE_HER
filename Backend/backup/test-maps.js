// Backend/test-maps.js
const axios = require('axios');

const BASE_URL = 'http://localhost:4000/api/maps';

async function testFindCompanions() {
    try {
        const response = await axios.post(`${BASE_URL}/find-companions`, {
            userId: 'test-user-id',
            source: { lat: 28.6139, lng: 77.2090 }, // Delhi
            destination: { lat: 28.4595, lng: 77.0266 }, // Gurgaon
            travelMode: 'metro',
            preferredTime: new Date().toISOString(),
            maxDistance: 5000
        });

        console.log('Find Companions Response:', JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.error('Error testing find companions:', error.response?.data || error.message);
    }
}

async function testSuggestMeetingPoint() {
    try {
        const response = await axios.post(`${BASE_URL}/suggest-meeting-point`, {
            userId: 'user1',
            companionId: 'companion1'
        });

        console.log('Meeting Point Response:', JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.error('Error testing meeting point:', error.response?.data || error.message);
    }
}

// Run tests
async function runTests() {
    console.log('Testing Companion Match Discovery...');
    await testFindCompanions();

    console.log('\nTesting Meeting Point Suggestion...');
    await testSuggestMeetingPoint();
}

runTests();