const API_CONFIG = {
    ticketmaster: {
        apiKey: '',
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
        limit: 100,
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
                const errorText = await response.text();
                console.error('API Error Response:', errorText);
                throw new Error(`API Error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.message || data.error);
            }

            return data;
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
            'michigan': 'MI',
            'arizona': 'AZ',
            'washington': 'WA',
            'massachusetts': 'MA',
            'tennessee': 'TN',
            'indiana': 'IN',
            'missouri': 'MO',
            'maryland': 'MD',
            'wisconsin': 'WI',
            'colorado': 'CO',
            'minnesota': 'MN',
            'south carolina': 'SC',
            'alabama': 'AL',
            'louisiana': 'LA',
            'kentucky': 'KY',
            'oregon': 'OR',
            'oklahoma': 'OK',
            'connecticut': 'CT',
            'utah': 'UT',
            'iowa': 'IA',
            'nevada': 'NV',
            'arkansas': 'AR',
            'mississippi': 'MS',
            'kansas': 'KS',
            'new mexico': 'NM',
            'nebraska': 'NE',
            'west virginia': 'WV',
            'idaho': 'ID',
            'hawaii': 'HI',
            'new hampshire': 'NH',
            'maine': 'ME',
            'montana': 'MT',
            'rhode island': 'RI',
            'delaware': 'DE',
            'south dakota': 'SD',
            'north dakota': 'ND',
            'alaska': 'AK',
            'vermont': 'VT',
            'wyoming': 'WY'
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