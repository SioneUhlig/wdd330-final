const DataManager = {
    generateMockEvents: function() {
        const categories = ['music', 'food', 'arts', 'sports', 'community'];
        const locations = ['Dallas', 'Fort Worth', 'Plano', 'Irving', 'Arlington'];
        const events = [];

        for (let i = 1; i <= 20; i++) {
            const category = categories[Math.floor(Math.random() * categories.length)];
            const location = locations[Math.floor(Math.random() * locations.length)];
            const daysAhead = Math.floor(Math.random() * 30);
            const date = new Date();
            date.setDate(date.getDate() + daysAhead);

            events.push({
                id: `event-${i}`,
                title: this.generateEventTitle(category, i),
                description: `Join us for an amazing ${category} event in ${location}. This will be an unforgettable experience!`,
                category: category,
                date: date.toISOString().split('T')[0],
                time: `${Math.floor(Math.random() * 12) + 1}:00 PM`,
                location: `${location}, TX`,
                venue: `${location} Convention Center`,
                price: Math.random() > 0.5 ? `$${(Math.random() * 50 + 10).toFixed(2)}` : 'Free',
                image: `https://via.placeholder.com/400x250/${this.getCategoryColor(category)}/ffffff?text=${category}`,
                featured: i <= 3,
                attendees: Math.floor(Math.random() * 500) + 50
            });
        }

        return events;
    },

    generateEventTitle: function(category, index) {
        const titles = {
            music: ['Live Music Night', 'Jazz Festival', 'Rock Concert', 'Classical Evening'],
            food: ['Food Truck Festival', 'Wine Tasting', 'BBQ Cook-off', 'Culinary Workshop'],
            arts: ['Art Gallery Opening', 'Theater Performance', 'Dance Showcase', 'Film Festival'],
            sports: ['Marathon Run', 'Basketball Tournament', 'Yoga in the Park', 'Soccer Match'],
            community: ['Community Meetup', 'Charity Fundraiser', 'Volunteer Day', 'Networking Event']
        };

        const categoryTitles = titles[category] || ['Local Event'];
        return categoryTitles[index % categoryTitles.length] + ` ${index}`;
    },

    getCategoryColor: function(category) {
        const colors = {
            music: '9333EA',
            food: 'F59E0B',
            arts: 'EC4899',
            sports: '10B981',
            community: '3B82F6'
        };
        return colors[category] || '40E0D0';
    },

    getEvents: function(filters) {
        filters = filters || {};
        
        return new Promise((resolve) => {
            setTimeout(() => {
                let events = this.generateMockEvents();
                if (filters.category && filters.category !== 'all') {
                    events = events.filter(e => e.category === filters.category);
                }

                if (filters.featured) {
                    events = events.filter(e => e.featured);
                }

                if (filters.limit) {
                    events = events.slice(0, filters.limit);
                }

                resolve(events);
            }, 500);
        });
    },

    getFavorites: function() {
        const favIds = JSON.parse(localStorage.getItem('favorites') || '[]');
        const allEvents = this.generateMockEvents();
        return allEvents.filter(event => favIds.includes(event.id));
    },

    isFavorite: function(eventId) {
        const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
        return favorites.includes(eventId);
    },

    toggleFavorite: function(eventId) {
        let favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
        
        if (favorites.includes(eventId)) {
            favorites = favorites.filter(id => id !== eventId);
        } else {
            favorites.push(eventId);
        }
        
        localStorage.setItem('favorites', JSON.stringify(favorites));
    },

    getUserPreferences: function() {
        return {
            location: localStorage.getItem('userLocation') || 'Dallas, TX',
            favoriteCategories: JSON.parse(localStorage.getItem('favoriteCategories') || '[]'),
            searchHistory: JSON.parse(localStorage.getItem('searchHistory') || '[]'),
            viewedEvents: JSON.parse(localStorage.getItem('viewedEvents') || '[]')
        };
    },

    saveSearchHistory: function(search) {
        let history = JSON.parse(localStorage.getItem('searchHistory') || '[]');
        history.unshift(search);
        
        if (history.length > 20) {
            history = history.slice(0, 20);
        }
        
        localStorage.setItem('searchHistory', JSON.stringify(history));
    },

    trackEventView: function(eventId) {
        let viewedEvents = JSON.parse(localStorage.getItem('viewedEvents') || '[]');
        
        if (!viewedEvents.includes(eventId)) {
            viewedEvents.push(eventId);
            localStorage.setItem('viewedEvents', JSON.stringify(viewedEvents));
        }
    },
    getEventById: function(id) {
        const events = this.generateMockEvents();
        return events.find(event => event.id === id);
    },

    clearUserData: function() {
        localStorage.removeItem('favorites');
        localStorage.removeItem('searchHistory');
        localStorage.removeItem('viewedEvents');
        localStorage.removeItem('favoriteCategories');
    }
};

window.DataManager = DataManager;