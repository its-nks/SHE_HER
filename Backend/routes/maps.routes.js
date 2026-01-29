const express = require('express');
const router = express.Router();
const mapsController = require('../controllers/maps.controller');
const TravelIntent = require('../models/TravelIntent.model');

// SINGLE IMPORT - ALL 3 FUNCTIONS TOGETHER
const {
  getAddressCoordinate,
  getDistanceTime,
  getAutoCompleteSuggestions
} = require('../services/maps.service');

router.get('/get-coordinates', async (req, res) => {
  try {
    const { address } = req.query;
    const data = await getAddressCoordinate(address);
    res.json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/get-distance-time', async (req, res) => {
  try {
    const { origin, destination } = req.query;

    const originCoords = await getAddressCoordinate(origin);
    const destinationCoords = await getAddressCoordinate(destination);

    const result = await getDistanceTime(originCoords, destinationCoords);

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/autocomplete', async (req, res) => {
  try {
    const { input } = req.query;

    const suggestions = await getAutoCompleteSuggestions(input);
    res.json(suggestions);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// In routes/maps.routes.js, update the create-travel endpoint:
router.post('/create-travel', async (req, res) => {
  try {
    // If you want to accept userName instead of userId
    const intentData = req.body;

    // If the request has userId, rename it to userName
    if (intentData.userId) {
      intentData.userName = intentData.userId;
      delete intentData.userId;
    }

    const intent = await TravelIntent.create(intentData);
    res.status(201).json({ success: true, intent });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/find-companions', mapsController.findCompanions);
router.post('/suggest-meeting-point', mapsController.suggestMeetingPoint);
router.post('/refresh-meeting-point', mapsController.refreshMeetingPoint);

module.exports = router;
