const TravelIntent = require('../models/TravelIntent.model');

exports.findCompanions = async (req, res) => {
    try {
        const {
            userId,
            sourceCoordinates,
            travelMode,
            travelTime
        } = req.body;

        const timeWindowStart = new Date(new Date(travelTime).getTime() - 30 * 60000);
        const timeWindowEnd = new Date(new Date(travelTime).getTime() + 30 * 60000);

        const matches = await TravelIntent.find({
            userId: { $ne: userId },
            travelMode,
            travelTime: { $gte: timeWindowStart, $lte: timeWindowEnd },
            isActive: true,
            'source.coordinates': {
                $near: {
                    $geometry: {
                        type: 'Point',
                        coordinates: sourceCoordinates
                    },
                    $maxDistance: 2000
                }
            }
        }).populate('userId', 'name trustScore');

        return res.status(200).json({
            success: true,
            companions: matches
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
};
