const API_CONFIG = {
    ticketmaster: {
        apiKey: 'AZXBgygoWqnwsmMji9gGqAHvdTHzoyhu', 
        baseUrl: 'https://app.ticketmaster.com/discovery/v2',
        endpoints: {
            searchEvents: '/events.json',
            eventDetails: '/events/',
            classifications: '/classifications.json',
            venues: '/venues.json'
        }
    },

    googleMaps: {
        apiKey: 'AIzaSyCV-awjx4Qa0OWgQlT8bbYaxjLEawWfu7s', 
        libraries: ['places', 'geometry'],
        mapOptions: {
            zoom: 12,
            center: { lat: 32.7767, lng: -96.7970 }, 
            styles: []
        }
    },

    defaults: {
        location: 'Dallas, TX',
        radius: '25',
        unit: 'miles',
        limit: 20,
        sortBy: 'date,asc'
    }
};

const API = {
    ticketmasterRequest: async function (endpoint, params) {
        const url = new URL(API_CONFIG.ticketmaster.baseUrl + endpoint);
        params = params || {};
        params.apikey = API_CONFIG.ticketmaster.apiKey;

        Object.keys(params).forEach(key => {
            if (params[key] !== null && params[key] !== undefined) {
                url.searchParams.append(key, params[key]);
            }
        });

        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Ticketmaster API Error: ${response.status} ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Ticketmaster API request failed:', error);
            throw error;
        }
    },

    searchEvents: async function (location, options) {
        options = options || {};

        const params = {
            city: this.extractCity(location),
            stateCode: this.extractStateCode(location),
            radius: options.radius || API_CONFIG.defaults.radius,
            unit: API_CONFIG.defaults.unit,
            size: options.limit || API_CONFIG.defaults.limit,
            sort: options.sortBy || API_CONFIG.defaults.sortBy
        };

        if (options.classificationName) {
            params.classificationName = options.classificationName;
        }

     
        if (options.segmentName) {
            params.segmentName = options.segmentName;
        }

        if (options.startDateTime) {
            params.startDateTime = options.startDateTime;
        }
        if (options.endDateTime) {
            params.endDateTime = options.endDateTime;
        }
        if (options.keyword) {
            params.keyword = options.keyword;
        }

        return await this.ticketmasterRequest(API_CONFIG.ticketmaster.endpoints.searchEvents, params);
    },

    getEventDetails: async function (eventId) {
        return await this.ticketmasterRequest(API_CONFIG.ticketmaster.endpoints.eventDetails + eventId + '.json');
    },

    extractCity: function (location) {
        if (!location) return 'Dallas';
        const parts = location.split(',');
        return parts[0].trim();
    },

    extractStateCode: function (location) {
        if (!location) return 'TX';
        const parts = location.split(',');
        if (parts.length > 1) {
            const state = parts[1].trim();
            if (state.length === 2) return state.toUpperCase();
            return this.getStateCode(state);
        }
        return 'TX';
    },
    getStateCode: function (stateName) {
        const stateMap = {
            'texas': 'TX',
            'california': 'CA',
            'new york': 'NY',
            'florida': 'FL',
            'illinois': 'IL',
            'pennsylvania': 'PA',
            'ohio': 'OH',
            'georgia': 'GA',
            'north carolina': 'NC',
            'michigan': 'MI'
        };
        return stateMap[stateName.toLowerCase()] || 'TX';
    },

    geocodeAddress: async function (address) {
        if (API_CONFIG.googleMaps.apiKey === 'YOUR_GOOGLE_MAPS_API_KEY') {
            throw new Error('Google Maps API key not configured');
        }

        const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${API_CONFIG.googleMaps.apiKey}`;

        try {
            const response = await fetch(url);
            const data = await response.json();

            if (data.status === 'OK' && data.results.length > 0) {
                return {
                    lat: data.results[0].geometry.location.lat,
                    lng: data.results[0].geometry.location.lng,
                    formattedAddress: data.results[0].formatted_address
                };
            } else {
                throw new Error('Geocoding failed: ' + data.status);
            }
        } catch (error) {
            console.error('Geocoding error:', error);
            throw error;
        }
    },

    reverseGeocode: async function (lat, lng) {
        if (API_CONFIG.googleMaps.apiKey === 'YOUR_GOOGLE_MAPS_API_KEY') {
            return `${lat.toFixed(2)}, ${lng.toFixed(2)}`;
        }

        const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${API_CONFIG.googleMaps.apiKey}`;

        try {
            const response = await fetch(url);
            const data = await response.json();

            if (data.status === 'OK' && data.results.length > 0) {
                return data.results[0].formatted_address;
            } else {
                throw new Error('Reverse geocoding failed: ' + data.status);
            }
        } catch (error) {
            console.error('Reverse geocoding error:', error);
            return `${lat.toFixed(2)}, ${lng.toFixed(2)}`;
        }
    },
    isConfigured: function () {
        const ticketmasterConfigured = API_CONFIG.ticketmaster.apiKey !== 'YOUR_TICKETMASTER_API_KEY';
        const mapsConfigured = API_CONFIG.googleMaps.apiKey !== 'YOUR_GOOGLE_MAPS_API_KEY';

        return {
            ticketmaster: ticketmasterConfigured,
            googleMaps: mapsConfigured,
            allConfigured: ticketmasterConfigured && mapsConfigured
        };
    }
};

window.API_CONFIG = API_CONFIG;
window.API = API;