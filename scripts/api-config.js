const API_CONFIG = {
    ticketmaster: {
        apiKey: 'AZXBgygoWqnwsmMji9gGqAHvdTHzoyhu',
        // Use localhost for development, Netlify Functions for production
        baseUrl: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
            ? 'http://localhost:3000/api'
            : '/.netlify/functions',
        endpoints: {
            searchEvents: '/events',
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
        const url = new URL(API_CONFIG.ticketmaster.baseUrl + endpoint, window.location.origin);
        params = params || {};

        Object.keys(params).forEach(key => {
            if (params[key] !== null && params[key] !== undefined) {
                url.searchParams.append(key, params[key]);
            }
        });

        try {
            console.log('Making request to:', url.toString());

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`API Error: ${response.status} ${response.statusText}`);
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

    isConfigured: function () {
        return {
            ticketmaster: true,
            googleMaps: true,
            allConfigured: true
        };
    }
};

window.API_CONFIG = API_CONFIG;
window.API = API;