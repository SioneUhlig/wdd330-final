const Features = {
    getCurrentLocation: function () {
        if (!navigator.geolocation) {
            alert('Geolocation is not supported by your browser');
            return;
        }

        const locationInput = document.getElementById('location-search');

        if (locationInput) {
            locationInput.value = 'Getting your location...';
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                Features.reverseGeocode(latitude, longitude);
            },
            (error) => {
                console.error('Error getting location:', error);
                alert('Unable to get your location. Please enter it manually.');
                if (locationInput) {
                    locationInput.value = 'Dallas, TX';
                }
            }
        );
    },

    reverseGeocode: function (lat, lon) {
        const locationInput = document.getElementById('location-search');

        if (locationInput) {
            locationInput.value = `Dallas, TX (${lat.toFixed(2)}, ${lon.toFixed(2)})`;
            localStorage.setItem('userLocation', locationInput.value);
        }
    },

    getRecommendedEvents: function (userPreferences, allEvents) {
        const { favoriteCategories = [], viewedEvents = [], searchHistory = [] } = userPreferences;

        const scoredEvents = allEvents.map(event => {
            let score = 0;

            if (favoriteCategories.includes(event.category)) {
                score += 5;
            }

            if (viewedEvents.includes(event.id)) {
                score += 3;
            }

            searchHistory.forEach(search => {
                if (search.category === event.category) {
                    score += 2;
                }
            });
            score += Math.random() * 2;

            return { ...event, score };
        });

        return scoredEvents
            .sort((a, b) => b.score - a.score)
            .slice(0, 6);
    },

    analyzeFavoriteCategories: function () {
        const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
        const viewedEvents = JSON.parse(localStorage.getItem('viewedEvents') || '[]');

        const categoryCount = {};

        favorites.forEach(eventId => {
            const category = 'general';
            categoryCount[category] = (categoryCount[category] || 0) + 2;
        });
        const topCategories = Object.entries(categoryCount)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(entry => entry[0]);

        localStorage.setItem('favoriteCategories', JSON.stringify(topCategories));

        return topCategories;
    },

    enableNotifications: function () {
        if (!('Notification' in window)) {
            alert('This browser does not support notifications');
            return;
        }

        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                localStorage.setItem('notificationsEnabled', 'true');
                alert('Notifications enabled! We\'ll remind you about upcoming events.');
            }
        });
    },

    notifyUpcomingEvent: function (event) {
        if (localStorage.getItem('notificationsEnabled') !== 'true') return;
        if (!('Notification' in window)) return;

        if (Notification.permission === 'granted') {
            new Notification('Upcoming Event Reminder', {
                body: `${event.title} is happening soon at ${event.location}`,
                icon: event.image || 'images/favicon.webp'
            });
        }
    },

    exportToCalendar: function (events) {
        let icalContent = 'BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//Local Event Discovery//EN\n';

        events.forEach(event => {
            const startDate = event.date ? event.date.replace(/-/g, '') : '20250101';
            icalContent += `BEGIN:VEVENT\n`;
            icalContent += `DTSTART:${startDate}\n`;
            icalContent += `SUMMARY:${event.title}\n`;
            icalContent += `DESCRIPTION:${event.description || ''}\n`;
            icalContent += `LOCATION:${event.location || ''}\n`;
            icalContent += `END:VEVENT\n`;
        });

        icalContent += 'END:VCALENDAR';
        const blob = new Blob([icalContent], { type: 'text/calendar' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'my-events.ics';
        link.click();
        URL.revokeObjectURL(url);
    },

    getEventStats: function (events) {
        const stats = {
            total: events.length,
            byCategory: {},
            free: 0,
            paid: 0
        };

        events.forEach(event => {
            const category = event.category || 'general';
            stats.byCategory[category] = (stats.byCategory[category] || 0) + 1;

            if (event.price === 'Free' || !event.price) {
                stats.free++;
            } else {
                stats.paid++;
            }
        });

        return stats;
    },

    trackPopularEvent: function (eventId) {
        let popularEvents = JSON.parse(localStorage.getItem('popularEvents') || '{}');
        popularEvents[eventId] = (popularEvents[eventId] || 0) + 1;
        localStorage.setItem('popularEvents', JSON.stringify(popularEvents));
    },

    getPopularEvents: function (limit = 5) {
        const popularEvents = JSON.parse(localStorage.getItem('popularEvents') || '{}');

        const sorted = Object.entries(popularEvents)
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit)
            .map(([id]) => id);

        return sorted;
    },

    generateShareableList: function (events, message = '') {
        const eventData = events.map(e => ({
            id: e.id || e.title,
            title: e.title,
            date: e.timeline || e.date,
            category: e.category
        }));

        const shareData = {
            message,
            events: eventData,
            sharedBy: 'Local Event Discovery User',
            sharedOn: new Date().toISOString()
        };

        const shareId = Math.random().toString(36).substring(2, 9);
        localStorage.setItem(`share_${shareId}`, JSON.stringify(shareData));

        return shareId;
    },

    loadSharedList: function (shareId) {
        const shareData = localStorage.getItem(`share_${shareId}`);
        return shareData ? JSON.parse(shareData) : null;
    }
};

window.Features = Features;