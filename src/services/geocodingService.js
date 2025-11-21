const axios = require('axios');
const logger = require('../utils/logger');

/**
 * Geocoding Service
 * Handles location-based operations, geocoding, and distance calculations
 */

class GeocodingService {
  constructor() {
    this.googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY;
    this.geocodingApiUrl = 'https://maps.googleapis.com/maps/api/geocode/json';
    this.distanceMatrixApiUrl = 'https://maps.googleapis.com/maps/api/distancematrix/json';
    this.placesApiUrl = 'https://maps.googleapis.com/maps/api/place/autocomplete/json';
  }

  /**
   * Geocode an address to coordinates
   */
  async geocodeAddress(address) {
    try {
      const response = await axios.get(this.geocodingApiUrl, {
        params: {
          address,
          key: this.googleMapsApiKey,
          region: 'lk' // Sri Lanka
        }
      });

      if (response.data.status !== 'OK' || response.data.results.length === 0) {
        throw new Error(`Geocoding failed: ${response.data.status}`);
      }

      const result = response.data.results[0];
      const location = result.geometry.location;

      logger.info(`Geocoded address: ${address}`);

      return {
        latitude: location.lat,
        longitude: location.lng,
        formattedAddress: result.formatted_address,
        placeId: result.place_id,
        addressComponents: result.address_components,
        locationType: result.geometry.location_type
      };
    } catch (error) {
      logger.error(`Error geocoding address: ${error.message}`);
      throw new Error('Failed to geocode address');
    }
  }

  /**
   * Reverse geocode coordinates to address
   */
  async reverseGeocode(latitude, longitude) {
    try {
      const response = await axios.get(this.geocodingApiUrl, {
        params: {
          latlng: `${latitude},${longitude}`,
          key: this.googleMapsApiKey
        }
      });

      if (response.data.status !== 'OK' || response.data.results.length === 0) {
        throw new Error(`Reverse geocoding failed: ${response.data.status}`);
      }

      const result = response.data.results[0];

      // Extract city, district, and country
      const addressComponents = result.address_components;
      const city = this.extractComponent(addressComponents, 'locality');
      const district = this.extractComponent(addressComponents, 'administrative_area_level_2');
      const province = this.extractComponent(addressComponents, 'administrative_area_level_1');
      const country = this.extractComponent(addressComponents, 'country');
      const postalCode = this.extractComponent(addressComponents, 'postal_code');

      logger.info(`Reverse geocoded coordinates: ${latitude}, ${longitude}`);

      return {
        formattedAddress: result.formatted_address,
        city,
        district,
        province,
        country,
        postalCode,
        placeId: result.place_id,
        addressComponents: result.address_components
      };
    } catch (error) {
      logger.error(`Error reverse geocoding: ${error.message}`);
      throw new Error('Failed to reverse geocode coordinates');
    }
  }

  /**
   * Extract specific component from address components
   */
  extractComponent(addressComponents, type) {
    const component = addressComponents.find(comp => 
      comp.types.includes(type)
    );
    return component ? component.long_name : null;
  }

  /**
   * Calculate distance between two locations
   */
  async calculateDistance(origin, destination) {
    try {
      const response = await axios.get(this.distanceMatrixApiUrl, {
        params: {
          origins: `${origin.latitude},${origin.longitude}`,
          destinations: `${destination.latitude},${destination.longitude}`,
          key: this.googleMapsApiKey,
          mode: 'driving',
          units: 'metric'
        }
      });

      if (response.data.status !== 'OK') {
        throw new Error(`Distance calculation failed: ${response.data.status}`);
      }

      const element = response.data.rows[0].elements[0];

      if (element.status !== 'OK') {
        throw new Error(`No route found between locations`);
      }

      logger.info(`Calculated distance: ${element.distance.text}`);

      return {
        distance: {
          value: element.distance.value, // in meters
          text: element.distance.text
        },
        duration: {
          value: element.duration.value, // in seconds
          text: element.duration.text
        },
        distanceKm: (element.distance.value / 1000).toFixed(2),
        durationMinutes: Math.round(element.duration.value / 60)
      };
    } catch (error) {
      logger.error(`Error calculating distance: ${error.message}`);
      
      // Fallback to straight-line distance calculation
      return this.calculateStraightLineDistance(origin, destination);
    }
  }

  /**
   * Calculate straight-line distance (Haversine formula)
   */
  calculateStraightLineDistance(origin, destination) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(destination.latitude - origin.latitude);
    const dLon = this.toRadians(destination.longitude - origin.longitude);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(origin.latitude)) * 
              Math.cos(this.toRadians(destination.latitude)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    const distanceKm = distance.toFixed(2);
    
    logger.info(`Calculated straight-line distance: ${distanceKm} km`);

    return {
      distance: {
        value: Math.round(distance * 1000),
        text: `${distanceKm} km`
      },
      duration: {
        value: null,
        text: 'N/A'
      },
      distanceKm,
      durationMinutes: null,
      isStraightLine: true
    };
  }

  /**
   * Convert degrees to radians
   */
  toRadians(degrees) {
    return degrees * (Math.PI / 180);
  }

  /**
   * Get place autocomplete suggestions
   */
  async getPlaceSuggestions(input, location = null) {
    try {
      const params = {
        input,
        key: this.googleMapsApiKey,
        components: 'country:lk', // Restrict to Sri Lanka
        types: 'geocode'
      };

      // Add location bias if provided
      if (location) {
        params.location = `${location.latitude},${location.longitude}`;
        params.radius = 50000; // 50km radius
      }

      const response = await axios.get(this.placesApiUrl, { params });

      if (response.data.status !== 'OK' && response.data.status !== 'ZERO_RESULTS') {
        throw new Error(`Place autocomplete failed: ${response.data.status}`);
      }

      const predictions = response.data.predictions || [];

      logger.info(`Found ${predictions.length} place suggestions for: ${input}`);

      return predictions.map(pred => ({
        placeId: pred.place_id,
        description: pred.description,
        mainText: pred.structured_formatting.main_text,
        secondaryText: pred.structured_formatting.secondary_text,
        types: pred.types
      }));
    } catch (error) {
      logger.error(`Error getting place suggestions: ${error.message}`);
      return [];
    }
  }

  /**
   * Get place details by place ID
   */
  async getPlaceDetails(placeId) {
    try {
      const response = await axios.get(
        'https://maps.googleapis.com/maps/api/place/details/json',
        {
          params: {
            place_id: placeId,
            key: this.googleMapsApiKey,
            fields: 'formatted_address,geometry,address_components,name'
          }
        }
      );

      if (response.data.status !== 'OK') {
        throw new Error(`Place details failed: ${response.data.status}`);
      }

      const result = response.data.result;
      const location = result.geometry.location;

      return {
        name: result.name,
        formattedAddress: result.formatted_address,
        latitude: location.lat,
        longitude: location.lng,
        addressComponents: result.address_components
      };
    } catch (error) {
      logger.error(`Error getting place details: ${error.message}`);
      throw error;
    }
  }

  /**
   * Find nearby locations within radius
   */
  async findNearbyLocations(center, radius, type = null) {
    try {
      const params = {
        location: `${center.latitude},${center.longitude}`,
        radius: radius * 1000, // Convert km to meters
        key: this.googleMapsApiKey
      };

      if (type) {
        params.type = type;
      }

      const response = await axios.get(
        'https://maps.googleapis.com/maps/api/place/nearbysearch/json',
        { params }
      );

      if (response.data.status !== 'OK' && response.data.status !== 'ZERO_RESULTS') {
        throw new Error(`Nearby search failed: ${response.data.status}`);
      }

      const results = response.data.results || [];

      logger.info(`Found ${results.length} nearby locations`);

      return results.map(place => ({
        placeId: place.place_id,
        name: place.name,
        vicinity: place.vicinity,
        location: {
          latitude: place.geometry.location.lat,
          longitude: place.geometry.location.lng
        },
        rating: place.rating,
        types: place.types
      }));
    } catch (error) {
      logger.error(`Error finding nearby locations: ${error.message}`);
      return [];
    }
  }

  /**
   * Validate coordinates
   */
  validateCoordinates(latitude, longitude) {
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lng)) {
      return {
        valid: false,
        error: 'Invalid coordinate values'
      };
    }

    if (lat < -90 || lat > 90) {
      return {
        valid: false,
        error: 'Latitude must be between -90 and 90'
      };
    }

    if (lng < -180 || lng > 180) {
      return {
        valid: false,
        error: 'Longitude must be between -180 and 180'
      };
    }

    // Check if coordinates are within Sri Lanka bounds (approximately)
    const sriLankaBounds = {
      north: 9.9,
      south: 5.9,
      east: 82.0,
      west: 79.5
    };

    if (lat < sriLankaBounds.south || lat > sriLankaBounds.north ||
        lng < sriLankaBounds.west || lng > sriLankaBounds.east) {
      return {
        valid: true,
        warning: 'Coordinates appear to be outside Sri Lanka'
      };
    }

    return {
      valid: true
    };
  }

  /**
   * Get location from IP address (fallback method)
   */
  async getLocationFromIP(ipAddress) {
    try {
      // Using ipapi.co for IP geolocation (free tier)
      const response = await axios.get(`https://ipapi.co/${ipAddress}/json/`);

      if (response.data.error) {
        throw new Error(response.data.reason);
      }

      logger.info(`Retrieved location from IP: ${ipAddress}`);

      return {
        latitude: response.data.latitude,
        longitude: response.data.longitude,
        city: response.data.city,
        region: response.data.region,
        country: response.data.country_name,
        postalCode: response.data.postal
      };
    } catch (error) {
      logger.error(`Error getting location from IP: ${error.message}`);
      
      // Return Colombo as default location
      return {
        latitude: 6.9271,
        longitude: 79.8612,
        city: 'Colombo',
        region: 'Western Province',
        country: 'Sri Lanka',
        postalCode: null,
        isDefault: true
      };
    }
  }

  /**
   * Calculate area from polygon coordinates
   */
  calculatePolygonArea(coordinates) {
    // coordinates should be an array of [lng, lat] pairs
    if (!coordinates || coordinates.length < 3) {
      return 0;
    }

    let area = 0;
    const numPoints = coordinates.length;

    for (let i = 0; i < numPoints; i++) {
      const j = (i + 1) % numPoints;
      const xi = coordinates[i][0];
      const yi = coordinates[i][1];
      const xj = coordinates[j][0];
      const yj = coordinates[j][1];
      
      area += xi * yj;
      area -= xj * yi;
    }

    area = Math.abs(area) / 2;

    // Convert to square kilometers (approximate)
    const areaKm2 = area * 12364; // rough conversion factor
    
    return areaKm2.toFixed(2);
  }

  /**
   * Check if point is within radius of center
   */
  isWithinRadius(center, point, radiusKm) {
    const distance = this.calculateStraightLineDistance(center, point);
    return parseFloat(distance.distanceKm) <= radiusKm;
  }

  /**
   * Get district from coordinates (Sri Lanka specific)
   */
  async getDistrict(latitude, longitude) {
    try {
      const addressData = await this.reverseGeocode(latitude, longitude);
      return addressData.district || addressData.city || 'Unknown';
    } catch (error) {
      logger.error(`Error getting district: ${error.message}`);
      return 'Unknown';
    }
  }

  /**
   * Format location for display
   */
  formatLocationDisplay(location) {
    const parts = [];

    if (location.city) parts.push(location.city);
    if (location.district && location.district !== location.city) {
      parts.push(location.district);
    }
    if (location.province) parts.push(location.province);

    return parts.join(', ') || location.formattedAddress || 'Unknown Location';
  }

  /**
   * Batch geocode multiple addresses
   */
  async batchGeocode(addresses) {
    try {
      const results = await Promise.allSettled(
        addresses.map(address => this.geocodeAddress(address))
      );

      return results.map((result, index) => {
        if (result.status === 'fulfilled') {
          return {
            address: addresses[index],
            success: true,
            data: result.value
          };
        } else {
          return {
            address: addresses[index],
            success: false,
            error: result.reason.message
          };
        }
      });
    } catch (error) {
      logger.error(`Error in batch geocoding: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get travel time between two locations
   */
  async getTravelTime(origin, destination, mode = 'driving') {
    try {
      const distance = await this.calculateDistance(origin, destination);
      return {
        duration: distance.duration,
        durationMinutes: distance.durationMinutes,
        mode
      };
    } catch (error) {
      logger.error(`Error getting travel time: ${error.message}`);
      throw error;
    }
  }
}

module.exports = new GeocodingService();