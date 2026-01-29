// Backend/services/maps.service.js
const axios = require('axios');
const NodeCache = require('node-cache');
const turf = require('@turf/turf'); // Install: npm install @turf/turf

require('dotenv').config();

class MapsService {
  constructor() {
    // Initialize cache with 5 minute TTL
    this.cache = new NodeCache({ stdTTL: 300, checkperiod: 60 });
    this.nominatimUrl = 'https://nominatim.openstreetmap.org';
    this.osrmUrl = 'https://router.project-osrm.org';
    this.overpassUrl = 'https://overpass-api.de/api/interpreter';
  }

  // Calculate route overlap percentage using OSRM
  async calculateRouteOverlap(route1, route2) {
    const cacheKey = `overlap_${JSON.stringify(route1)}_${JSON.stringify(route2)}`;

    try {
      // Check cache first
      const cached = this.cache.get(cacheKey);
      if (cached) return cached;

      // Get routes from OSRM
      const [route1Geometry, route2Geometry] = await Promise.all([
        this.getOSRMRoute(route1.source, route1.destination),
        this.getOSRMRoute(route2.source, route2.destination)
      ]);

      if (!route1Geometry || !route2Geometry) return 0;

      // Create Turf.js linestrings for comparison
      const line1 = turf.lineString(route1Geometry.coordinates);
      const line2 = turf.lineString(route2Geometry.coordinates);

      // Buffer the lines and find intersection
      const buffer1 = turf.buffer(line1, 0.1, { units: 'kilometers' }); // 100m buffer
      const buffer2 = turf.buffer(line2, 0.1, { units: 'kilometers' });

      // Calculate overlap
      const intersection = turf.intersect(buffer1, buffer2);
      const area1 = turf.area(buffer1);
      const area2 = turf.area(buffer2);

      if (!intersection) return 0;

      const intersectionArea = turf.area(intersection);
      const minArea = Math.min(area1, area2);
      const overlapPercentage = intersectionArea / minArea;

      // Cache the result
      this.cache.set(cacheKey, overlapPercentage);
      return overlapPercentage;

    } catch (error) {
      console.error('Error calculating route overlap:', error);
      return 0;
    }
  }

  // Calculate distance between two coordinates using OSRM
  async calculateDistance(coord1, coord2) {
    const cacheKey = `distance_${coord1.lat}_${coord1.lng}_${coord2.lat}_${coord2.lng}`;

    try {
      const cached = this.cache.get(cacheKey);
      if (cached) return cached;

      const response = await axios.get(`${this.osrmUrl}/route/v1/driving/${coord1.lng},${coord1.lat};${coord2.lng},${coord2.lat}?overview=false`);

      if (response.data.routes && response.data.routes.length > 0) {
        const distance = response.data.routes[0].distance; // in meters
        this.cache.set(cacheKey, distance);
        return distance;
      }
      return this.calculateHaversineDistance(coord1, coord2);

    } catch (error) {
      console.error('Error calculating OSRM distance:', error);
      return this.calculateHaversineDistance(coord1, coord2);
    }
  }

  // Haversine distance calculation as fallback
  calculateHaversineDistance(coord1, coord2) {
    const R = 6371000; // Earth's radius in meters
    const φ1 = coord1.lat * Math.PI / 180;
    const φ2 = coord2.lat * Math.PI / 180;
    const Δφ = (coord2.lat - coord1.lat) * Math.PI / 180;
    const Δλ = (coord2.lng - coord1.lng) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) *
      Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  // Find optimal meeting point using OSM data
  async findOptimalMeetingPoint(userSource, companionSource, userDest, companionDest) {
    try {
      // Find midpoint
      const midpoint = {
        lat: (userSource.lat + companionSource.lat) / 2,
        lng: (userSource.lng + companionSource.lng) / 2
      };

      // Find safe public locations near midpoint
      const safeLocations = await this.findSafeLocationsNearby(midpoint);

      if (safeLocations.length > 0) {
        // Find location that minimizes total travel distance
        const optimalLocation = await this.findMinimalDistanceLocation(
          safeLocations,
          [userSource, companionSource],
          [userDest, companionDest]
        );

        return {
          coordinates: optimalLocation.coordinates,
          name: optimalLocation.name,
          type: optimalLocation.type,
          address: optimalLocation.address || await this.reverseGeocode(optimalLocation.coordinates),
          safetyScore: await this.calculateOSMSafetyScore(optimalLocation.coordinates),
          amenities: optimalLocation.amenities || []
        };
      }

      // Fallback: use midpoint with reverse geocoding
      const address = await this.reverseGeocode(midpoint);
      return {
        coordinates: midpoint,
        name: 'Midpoint',
        type: 'midpoint',
        address: address,
        safetyScore: 0.5,
        amenities: []
      };

    } catch (error) {
      console.error('Error finding meeting point:', error);
      // Return simple midpoint as fallback
      return {
        lat: (userSource.lat + companionSource.lat) / 2,
        lng: (userSource.lng + companionSource.lng) / 2,
        name: 'Suggested Meeting Point',
        safetyScore: 0.5
      };
    }
  }

  // Find safe locations using Overpass API
  async findSafeLocationsNearby(center, radius = 1000) {
    try {
      const overpassQuery = `
                [out:json][timeout:25];
                (
                    node["amenity"~"cafe|restaurant|fast_food|bank|library|community_centre|post_office"](around:${radius},${center.lat},${center.lng});
                    node["shop"~"mall|department_store|supermarket"](around:${radius},${center.lat},${center.lng});
                    node["public_transport"~"station|stop_position"](around:${radius},${center.lat},${center.lng});
                    node["tourism"~"information|museum"](around:${radius},${center.lat},${center.lng});
                );
                out body;
            `;

      const response = await axios.post(this.overpassUrl, overpassQuery, {
        headers: { 'Content-Type': 'text/plain' }
      });

      const locations = response.data.elements.map(element => ({
        id: element.id,
        coordinates: { lat: element.lat, lng: element.lon },
        name: element.tags?.name || 'Unnamed Location',
        type: this.categorizeLocation(element.tags),
        address: this.buildAddress(element.tags),
        amenities: this.extractAmenities(element.tags)
      }));

      // Filter for 24/7 or well-lit locations if available
      return locations.filter(loc =>
        loc.type !== 'unknown' &&
        !loc.name.toLowerCase().includes('bar') && // Avoid bars for safety
        !loc.name.toLowerCase().includes('liquor')
      );

    } catch (error) {
      console.error('Error finding safe locations:', error);
      return [];
    }
  }

  // Find location that minimizes total travel distance
  async findMinimalDistanceLocation(locations, sources, destinations) {
    let minTotalDistance = Infinity;
    let optimalLocation = locations[0];

    for (const location of locations) {
      let totalDistance = 0;

      // Calculate distance from each source to location
      for (const source of sources) {
        const distance = await this.calculateDistance(source, location.coordinates);
        totalDistance += distance;
      }

      // Add penalty if location is far from destinations
      for (const dest of destinations) {
        const fromLocationToDest = await this.calculateDistance(location.coordinates, dest);
        totalDistance += fromLocationToDest * 0.5; // Weight factor
      }

      if (totalDistance < minTotalDistance) {
        minTotalDistance = totalDistance;
        optimalLocation = location;
      }
    }

    return optimalLocation;
  }

  // Reverse geocode using Nominatim
  async reverseGeocode(coordinates) {
    const cacheKey = `geocode_${coordinates.lat}_${coordinates.lng}`;

    try {
      const cached = this.cache.get(cacheKey);
      if (cached) return cached;

      const response = await axios.get(`${this.nominatimUrl}/reverse`, {
        params: {
          lat: coordinates.lat,
          lon: coordinates.lng,
          format: 'json',
          addressdetails: 1,
          zoom: 18
        },
        headers: {
          'User-Agent': 'Sathi-Her/1.0 (contact@example.com)'
        }
      });

      if (response.data.display_name) {
        const address = response.data.display_name;
        this.cache.set(cacheKey, address);
        return address;
      }
      return 'Address not available';

    } catch (error) {
      console.error('Error reverse geocoding:', error);
      return 'Address not available';
    }
  }

  // Get route geometry from OSRM
  async getOSRMRoute(source, destination, profile = 'driving') {
    try {
      const response = await axios.get(
        `${this.osrmUrl}/route/v1/${profile}/${source.lng},${source.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson`
      );

      if (response.data.routes && response.data.routes.length > 0) {
        return response.data.routes[0].geometry;
      }
      return null;
    } catch (error) {
      console.error('Error getting OSRM route:', error);
      return null;
    }
  }

  // Calculate safety score based on OSM data
  async calculateOSMSafetyScore(coordinates) {
    try {
      // Query for safety-related features
      const overpassQuery = `
                [out:json][timeout:25];
                (
                    node["amenity"="police"](around:500,${coordinates.lat},${coordinates.lng});
                    node["amenity"="hospital"](around:500,${coordinates.lat},${coordinates.lng});
                    node["highway"="street_lamp"](around:200,${coordinates.lat},${coordinates.lng});
                    node["shop"](around:300,${coordinates.lat},${coordinates.lng});
                    way["landuse"="commercial"](around:500,${coordinates.lat},${coordinates.lng});
                );
                out count;
            `;

      const response = await axios.post(this.overpassUrl, overpassQuery, {
        headers: { 'Content-Type': 'text/plain' }
      });

      const elements = response.data.elements;
      let safetyScore = 0.5; // Base score

      // Calculate score based on nearby amenities
      const policeCount = elements.filter(e => e.tags?.amenity === 'police').length;
      const hospitalCount = elements.filter(e => e.tags?.amenity === 'hospital').length;
      const streetLampCount = elements.filter(e => e.tags?.highway === 'street_lamp').length;
      const shopCount = elements.filter(e => e.tags?.shop).length;
      const commercialCount = elements.filter(e => e.tags?.landuse === 'commercial').length;

      // Weight factors
      safetyScore += policeCount * 0.1;
      safetyScore += hospitalCount * 0.05;
      safetyScore += Math.min(streetLampCount * 0.02, 0.1);
      safetyScore += Math.min(shopCount * 0.03, 0.15);
      safetyScore += commercialCount * 0.02;

      return Math.min(Math.max(safetyScore, 0), 1); // Clamp between 0 and 1

    } catch (error) {
      console.error('Error calculating safety score:', error);
      return 0.5;
    }
  }

  // Helper methods for OSM data processing
  categorizeLocation(tags) {
    if (tags.amenity === 'cafe' || tags.amenity === 'restaurant') return 'food';
    if (tags.amenity === 'bank' || tags.amenity === 'post_office') return 'service';
    if (tags.shop === 'mall' || tags.shop === 'department_store') return 'shopping';
    if (tags.public_transport) return 'transport';
    if (tags.tourism) return 'tourism';
    return 'unknown';
  }

  buildAddress(tags) {
    const parts = [];
    if (tags['addr:housenumber']) parts.push(tags['addr:housenumber']);
    if (tags['addr:street']) parts.push(tags['addr:street']);
    return parts.join(' ');
  }

  extractAmenities(tags) {
    const amenities = [];
    if (tags.opening_hours && tags.opening_hours.includes('24/7')) amenities.push('24/7');
    if (tags.wheelchair === 'yes') amenities.push('wheelchair_accessible');
    if (tags.internet_access) amenities.push('wifi');
    return amenities;
  }

  // Get directions for display
  async getDirections(origin, destination, profile = 'driving') {
    try {
      const response = await axios.get(
        `${this.osrmUrl}/route/v1/${profile}/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=simplified&steps=true`
      );

      if (response.data.routes && response.data.routes.length > 0) {
        const route = response.data.routes[0];
        return {
          distance: route.distance,
          duration: route.duration,
          steps: route.legs[0].steps.map(step => ({
            instruction: step.maneuver.instruction,
            distance: step.distance,
            duration: step.duration
          }))
        };
      }
      return null;
    } catch (error) {
      console.error('Error getting directions:', error);
      return null;
    }
  }
}


// ==================== CORE FUNCTIONS FROM HEMLATA ====================

// Add these 3 functions to make your routes work

module.exports.getAddressCoordinate = async (address) => {
  if (!address) {
    throw new Error("Address is required");
  }

  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`;

  try {
    const response = await axios.get(url, {
      headers: {
        "User-Agent": "Sathi-Her-College-Project"
      }
    });

    if (!response.data || response.data.length === 0) {
      throw new Error("Coordinates not found");
    }

    return {
      lat: parseFloat(response.data[0].lat),
      lng: parseFloat(response.data[0].lon)
    };
  } catch (error) {
    console.error("Geocoding error:", error.message);
    throw error;
  }
};

module.exports.getDistanceTime = async (originCoords, destinationCoords) => {
  if (!originCoords || !destinationCoords) {
    throw new Error('Origin and destination coordinates are required');
  }

  const { lat: srcLat, lng: srcLng } = originCoords;
  const { lat: destLat, lng: destLng } = destinationCoords;

  const url = `https://router.project-osrm.org/route/v1/driving/${srcLng},${srcLat};${destLng},${destLat}?overview=false`;

  try {
    const response = await axios.get(url);

    if (!response.data.routes || response.data.routes.length === 0) {
      throw new Error('No routes found');
    }

    const route = response.data.routes[0];

    return {
      distance_km: (route.distance / 1000).toFixed(2),
      duration_min: Math.ceil(route.duration / 60)
    };

  } catch (err) {
    console.error(err.message);
    throw err;
  }
};

module.exports.getAutoCompleteSuggestions = async (input) => {
  if (!input || input.length < 3) {
    throw new Error('Input must be at least 3 characters');
  }

  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
    input
  )}&addressdetails=1&limit=5&countrycodes=in&viewbox=76.84,28.88,77.35,28.40
    &bounded=1`;

  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Sathi-Her-College-Project'
      }
    });

    return response.data.map(place => place.display_name);
  } catch (error) {
    console.error(error);
    throw new Error('Failed to fetch autocomplete suggestions');
  }
};

// Export the MapsService instance as well (for advanced features)
const mapsServiceInstance = new MapsService();
module.exports.MapsService = mapsServiceInstance;