// test-import.js
console.log('Testing imports...\n');

// Test 1: Can we load the controller?
try {
    const mapsController = require('../controllers/maps.controller');
    console.log('✓ 1. maps.controller.js loaded successfully');
    console.log('   Exports:', Object.keys(mapsController));
    console.log('   findCompanions type:', typeof mapsController.findCompanions);
} catch (error) {
    console.log('✗ 1. Error loading maps.controller.js:', error.message);
}

console.log('\n---\n');

// Test 2: Can we load the routes?
try {
    const mapsRoutes = require('../routes/maps.routes');
    console.log('✓ 2. maps.routes.js loaded successfully');
} catch (error) {
    console.log('✗ 2. Error loading maps.routes.js:', error.message);
    console.log('   Stack:', error.stack);
}

console.log('\n---\n');

// Test 3: Test the controller function directly
try {
    const mapsController = require('../controllers/maps.controller');
    const mockReq = { body: {} };
    const mockRes = {
        json: function (data) {
            console.log('✓ 3. Controller function works');
            console.log('   Response would be:', JSON.stringify(data, null, 2));
        },
        status: function () { return this; }
    };

    // Test findCompanions
    mapsController.findCompanions(mockReq, mockRes);
} catch (error) {
    console.log('✗ 3. Error testing controller:', error.message);
}