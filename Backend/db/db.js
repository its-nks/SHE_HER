const mongoose = require('mongoose');

async function connectToDb() {
    try {
        await mongoose.connect(process.env.DB_CONNECT);
        console.log('Connected to DB');
    } catch (error) {
        console.error('Database connection failed:', error.message);
    }
}

module.exports = connectToDb;

