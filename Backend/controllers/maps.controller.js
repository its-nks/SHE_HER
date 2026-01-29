// // controllers/maps.controller.js
// const TravelIntent = require('../models/TravelIntent.model');

// exports.findCompanions = async (req, res) => {
//     try {
//         const { userName, source, destination, travelMode, travelTime } = req.body; // CHANGED: userId -> userName

//         // Input validation
//         if (!userName || !source || !destination || !travelMode || !travelTime) { // CHANGED: userId -> userName
//             return res.status(400).json({
//                 success: false,
//                 error: 'Missing required fields'
//             });
//         }

//         // Calculate time window
//         const timeWindowStart = new Date(new Date(travelTime).getTime() - 30 * 60000);
//         const timeWindowEnd = new Date(new Date(travelTime).getTime() + 30 * 60000);

//         // Find matches
//         const matches = await TravelIntent.find({
//             userName: { $ne: userName }, // CHANGED: userId -> userName
//             travelMode,
//             travelTime: { $gte: timeWindowStart, $lte: timeWindowEnd },
//             isActive: true
//         }).limit(10);

//         // Format response
//         const companions = matches.map(match => ({
//             id: match._id,
//             userName: match.userName, // CHANGED: userId -> userName
//             source: match.source,
//             destination: match.destination,
//             travelMode: match.travelMode,
//             travelTime: match.travelTime
//         }));

//         return res.status(200).json({
//             success: true,
//             companions: companions,
//             count: companions.length
//         });

//     } catch (error) {
//         console.error('Error in findCompanions:', error);
//         return res.status(500).json({
//             success: false,
//             error: 'Server error'
//         });
//     }
// };

// exports.suggestMeetingPoint = async (req, res) => {
//     try {
//         const { userName, companionId } = req.body; // CHANGED: userId -> userName

//         if (!userName || !companionId) { // CHANGED: userId -> userName
//             return res.status(400).json({
//                 success: false,
//                 error: 'Missing fields'
//             });
//         }

//         const meetingPoint = {
//             coordinates: { lat: 28.6139, lng: 77.2090 },
//             name: "Meeting Point",
//             safetyScore: 0.8
//         };

//         return res.status(200).json({
//             success: true,
//             meetingPoint: meetingPoint
//         });

//     } catch (error) {
//         console.error('Error in suggestMeetingPoint:', error);
//         return res.status(500).json({
//             success: false,
//             error: 'Server error'
//         });
//     }
// };

// exports.refreshMeetingPoint = async (req, res) => {
//     return res.status(200).json({
//         success: true,
//         message: "Refresh endpoint working"
//     });
// };

// controllers/maps.controller.js - ENHANCED VERSION
const TravelIntent = require('../models/TravelIntent.model');
const geolib = require('geolib');
const axios = require('axios');

// OpenStreetMap configuration
const OSM_CONFIG = {
    nominatimUrl: 'https://nominatim.openstreetmap.org',
    userAgent: 'Sathi-Her/1.0 (women-safety-app)'
};

exports.findCompanions = async (req, res) => {
    try {
        const { userName, source, destination, travelMode, travelTime } = req.body;

        // Input validation
        if (!userName || !source || !destination || !travelMode || !travelTime) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields'
            });
        }

        // Calculate time window
        const timeWindowStart = new Date(new Date(travelTime).getTime() - 30 * 60000);
        const timeWindowEnd = new Date(new Date(travelTime).getTime() + 30 * 60000);

        // Find matches
        const matches = await TravelIntent.find({
            userName: { $ne: userName },
            travelMode,
            travelTime: { $gte: timeWindowStart, $lte: timeWindowEnd },
            isActive: true
        }).limit(20);

        // 🔥 NEW FEATURE 1: Distance-based ranking with geolib
        const userSourceCoords = {
            latitude: source.coordinates[1],
            longitude: source.coordinates[0]
        };

        const companionsWithDistance = matches.map(match => {
            const matchSourceCoords = {
                latitude: match.source.coordinates[1],
                longitude: match.source.coordinates[0]
            };

            // Calculate distance in meters
            const distance = geolib.getDistance(userSourceCoords, matchSourceCoords);

            // Calculate route similarity (simplified)
            const userDestCoords = {
                latitude: destination.coordinates[1],
                longitude: destination.coordinates[0]
            };

            const matchDestCoords = {
                latitude: match.destination.coordinates[1],
                longitude: match.destination.coordinates[0]
            };

            const destDistance = geolib.getDistance(userDestCoords, matchDestCoords);

            // Calculate match score (lower distance = better match)
            const matchScore = calculateMatchScore(distance, destDistance);

            return {
                id: match._id,
                userName: match.userName,
                source: match.source,
                destination: match.destination,
                travelMode: match.travelMode,
                travelTime: match.travelTime,
                isActive: match.isActive,
                matchMetrics: {
                    distanceFromYou: distance, // meters
                    distanceInKm: (distance / 1000).toFixed(1),
                    destinationDistance: destDistance,
                    matchScore: matchScore,
                    matchLevel: getMatchLevel(matchScore)
                }
            };
        });

        // Sort by best match (shortest distance first)
        companionsWithDistance.sort((a, b) => a.matchMetrics.distanceFromYou - b.matchMetrics.distanceFromYou);

        return res.status(200).json({
            success: true,
            companions: companionsWithDistance,
            count: companionsWithDistance.length,
            matchingCriteria: {
                travelMode,
                timeWindow: '±30 minutes',
                ranking: 'distance-based',
                userLocation: userSourceCoords
            }
        });

    } catch (error) {
        console.error('Error in findCompanions:', error);
        return res.status(500).json({
            success: false,
            error: 'Server error'
        });
    }
};

exports.suggestMeetingPoint = async (req, res) => {
    try {
        const { userName, companionId, userSource, companionSource } = req.body;

        if (!userName || !companionId) {
            return res.status(400).json({
                success: false,
                error: 'Missing userName or companionId'
            });
        }

        // Get companion's travel intent
        const companionIntent = await TravelIntent.findById(companionId);

        if (!companionIntent) {
            return res.status(404).json({
                success: false,
                error: 'Companion travel intent not found'
            });
        }

        // Use provided coordinates or fallback to intent coordinates
        const userStart = userSource || companionIntent.source.coordinates;
        const companionStart = companionSource || companionIntent.source.coordinates;

        // 🔥 NEW FEATURE 2: Calculate actual midpoint between users
        const midpoint = calculateMidpoint(
            { lat: userStart[1], lng: userStart[0] },
            { lat: companionStart[1], lng: companionStart[0] }
        );

        // 🔥 NEW FEATURE 3: Integrate OpenStreetMap for real location data
        const meetingPoint = await findSafeMeetingPoint(midpoint);

        // Calculate distances for fairness
        const userDistance = geolib.getDistance(
            { latitude: userStart[1], longitude: userStart[0] },
            { latitude: meetingPoint.coordinates.lat, longitude: meetingPoint.coordinates.lng }
        );

        const companionDistance = geolib.getDistance(
            { latitude: companionStart[1], longitude: companionStart[0] },
            { latitude: meetingPoint.coordinates.lat, longitude: meetingPoint.coordinates.lng }
        );

        const fairnessScore = calculateFairnessScore(userDistance, companionDistance);

        return res.status(200).json({
            success: true,
            meetingPoint: {
                ...meetingPoint,
                distances: {
                    userDistance: `${(userDistance / 1000).toFixed(1)} km`,
                    companionDistance: `${(companionDistance / 1000).toFixed(1)} km`,
                    userTime: `${Math.ceil(userDistance / 80)} mins walk`, // ~80m/min walking speed
                    companionTime: `${Math.ceil(companionDistance / 80)} mins walk`,
                    fairnessScore: fairnessScore.toFixed(2)
                },
                midpoint: {
                    calculated: midpoint,
                    isExact: meetingPoint.isExactMidpoint || false
                }
            },
            calculations: {
                userStart: userStart,
                companionStart: companionStart,
                midpoint: midpoint,
                algorithm: 'OpenStreetMap + Safety Scoring'
            },
            message: "AI-suggested safe meeting point with distance optimization"
        });

    } catch (error) {
        console.error('Error in suggestMeetingPoint:', error);

        // Fallback to simple midpoint if OpenStreetMap fails
        return res.status(200).json({
            success: true,
            meetingPoint: {
                coordinates: { lat: 28.6139, lng: 77.2090 },
                name: "Central Meeting Point (Fallback)",
                safetyScore: 0.7,
                note: "Using fallback location"
            },
            message: "Meeting point suggested (fallback mode)"
        });
    }
};

exports.refreshMeetingPoint = async (req, res) => {
    try {
        const { userLocation, companionLocation } = req.body;

        if (!userLocation || !companionLocation) {
            return res.status(400).json({
                success: false,
                error: 'Missing locations'
            });
        }

        // Calculate new midpoint
        const midpoint = calculateMidpoint(
            { lat: userLocation[1], lng: userLocation[0] },
            { lat: companionLocation[1], lng: companionLocation[0] }
        );

        // Find alternative meeting points
        const alternatives = await findAlternativeMeetingPoints(midpoint);

        return res.status(200).json({
            success: true,
            alternatives: alternatives,
            originalMidpoint: midpoint,
            message: "Alternative meeting points suggested"
        });

    } catch (error) {
        console.error('Error in refreshMeetingPoint:', error);
        return res.status(500).json({
            success: false,
            error: 'Server error'
        });
    }
};

// ==================== HELPER FUNCTIONS ====================

// Calculate match score based on distances
function calculateMatchScore(distance, destDistance) {
    // Normalize distances (0-1 scale, lower is better)
    const normalizedDist = 1 - Math.min(distance / 10000, 1); // 10km max
    const normalizedDest = 1 - Math.min(destDistance / 10000, 1);

    // Weight source distance more than destination distance
    return (normalizedDist * 0.7 + normalizedDest * 0.3) * 100;
}

function getMatchLevel(score) {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Basic';
}

// Calculate midpoint between two coordinates
function calculateMidpoint(coord1, coord2) {
    return {
        lat: (coord1.lat + coord2.lat) / 2,
        lng: (coord1.lng + coord2.lng) / 2
    };
}

// Find safe meeting point using OpenStreetMap
async function findSafeMeetingPoint(midpoint, radius = 500) {
    try {
        // Search for safe locations near midpoint using Nominatim
        const response = await axios.get(`${OSM_CONFIG.nominatimUrl}/search`, {
            params: {
                q: 'metro station',
                format: 'json',
                lat: midpoint.lat,
                lon: midpoint.lng,
                bounded: 1,
                viewbox: `${midpoint.lng - 0.01},${midpoint.lat + 0.01},${midpoint.lng + 0.01},${midpoint.lat - 0.01}`,
                'accept-language': 'en',
                limit: 5
            },
            headers: {
                'User-Agent': OSM_CONFIG.userAgent
            }
        });

        if (response.data && response.data.length > 0) {
            // Find the closest location to midpoint
            const locations = response.data.map(loc => ({
                coordinates: { lat: parseFloat(loc.lat), lng: parseFloat(loc.lon) },
                name: loc.display_name.split(',')[0],
                address: loc.display_name,
                type: loc.type,
                importance: loc.importance || 0,
                distanceFromMidpoint: geolib.getDistance(
                    { latitude: midpoint.lat, longitude: midpoint.lng },
                    { latitude: parseFloat(loc.lat), longitude: parseFloat(loc.lon) }
                )
            }));

            // Sort by closest distance
            locations.sort((a, b) => a.distanceFromMidpoint - b.distanceFromMidpoint);

            const bestLocation = locations[0];
            const safetyScore = calculateSafetyScore(bestLocation);

            return {
                coordinates: bestLocation.coordinates,
                name: bestLocation.name,
                address: bestLocation.address.substring(0, 150), // Limit length
                type: bestLocation.type,
                safetyScore: safetyScore,
                safetyFactors: getSafetyFactors(bestLocation),
                distanceFromMidpoint: `${(bestLocation.distanceFromMidpoint / 1000).toFixed(1)} km`,
                isExactMidpoint: bestLocation.distanceFromMidpoint < 100, // Within 100m
                source: 'OpenStreetMap'
            };
        }

        // Fallback: return calculated midpoint
        return {
            coordinates: midpoint,
            name: "Calculated Midpoint",
            address: "Coordinates-based location",
            safetyScore: 0.6,
            safetyFactors: ['calculated_location', 'requires_verification'],
            isExactMidpoint: true,
            source: 'calculated'
        };

    } catch (error) {
        console.error('OpenStreetMap error:', error.message);
        // Fallback to simple midpoint
        return {
            coordinates: midpoint,
            name: "Midpoint Location",
            safetyScore: 0.6,
            source: 'fallback'
        };
    }
}

// Calculate safety score based on location type and importance
function calculateSafetyScore(location) {
    let baseScore = 0.5;

    // Adjust based on location type
    if (location.type.includes('station') || location.type.includes('transport')) {
        baseScore += 0.3;
    }
    if (location.type.includes('amenity')) {
        baseScore += 0.2;
    }
    if (location.importance > 0.6) {
        baseScore += 0.1;
    }

    // Adjust based on distance (closer to midpoint is safer)
    const distanceFactor = 1 - Math.min(location.distanceFromMidpoint / 1000, 0.5);
    baseScore *= distanceFactor;

    return Math.min(baseScore, 0.95).toFixed(2);
}

function getSafetyFactors(location) {
    const factors = [];

    if (location.type.includes('station')) factors.push('public_transport');
    if (location.type.includes('amenity')) factors.push('public_amenity');
    if (location.importance > 0.7) factors.push('popular_location');
    if (location.distanceFromMidpoint < 500) factors.push('near_midpoint');

    return factors.length > 0 ? factors : ['general_location'];
}

// Find alternative meeting points
async function findAlternativeMeetingPoints(midpoint) {
    try {
        const response = await axios.get(`${OSM_CONFIG.nominatimUrl}/search`, {
            params: {
                q: 'cafe|restaurant|mall|park',
                format: 'json',
                lat: midpoint.lat,
                lon: midpoint.lng,
                bounded: 1,
                limit: 3
            },
            headers: {
                'User-Agent': OSM_CONFIG.userAgent
            }
        });

        return response.data.map((loc, index) => ({
            coordinates: { lat: parseFloat(loc.lat), lng: parseFloat(loc.lon) },
            name: loc.display_name.split(',')[0],
            type: loc.type,
            rank: index + 1
        }));

    } catch (error) {
        return [
            {
                coordinates: midpoint,
                name: "Alternative 1",
                type: "fallback"
            }
        ];
    }
}

// Calculate fairness score (0-1, 1 = perfectly fair)
function calculateFairnessScore(dist1, dist2) {
    const total = dist1 + dist2;
    if (total === 0) return 1;

    const ratio = Math.min(dist1, dist2) / Math.max(dist1, dist2);
    return ratio;
}