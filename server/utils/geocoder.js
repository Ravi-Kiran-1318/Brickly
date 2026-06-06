const axios = require('axios');

const geocodeAddress = async (addressText) => {
  try {
    if (!addressText) return null;
    
    const response = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: {
        q: addressText,
        format: 'json',
        limit: 1
      },
      headers: {
        'User-Agent': 'BuildR_App/1.0' // Nominatim requires a User-Agent
      }
    });

    if (response.data && response.data.length > 0) {
      const { lat, lon } = response.data[0];
      return {
        type: 'Point',
        coordinates: [parseFloat(lon), parseFloat(lat)]
      };
    }
    return null;
  } catch (error) {
    console.error('Geocoding error:', error.message);
    return null;
  }
};

module.exports = { geocodeAddress };
