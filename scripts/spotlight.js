const spotlightContainer = document.getElementById('spotlight-container');

async function loadProjects() {
    try {
        spotlightContainer.innerHTML = '<p class="loading">Loading featured events...</p>';

        // Fetch real events from Ticketmaster API
        const location = localStorage.getItem('userLocation') || 'Dallas, TX';

        const response = await API.searchEvents(location, {
            limit: 20,
            sortBy: 'date,asc'
        });

        if (response && response._embedded && response._embedded.events) {
            const apiEvents = response._embedded.events;

            // Convert API events to our format
            const formattedEvents = apiEvents.map(event => formatApiEvent(event));

            // Get 3 random events
            const spotlightProjects = getRandomSubset(formattedEvents, 3);

            displayProjects(spotlightProjects);
        } else {
            throw new Error('No events found');
        }

    } catch (error) {
        console.error('Error loading events from API:', error);
        spotlightContainer.innerHTML = '<p style="color: red;">Unable to load events. Please make sure the server is running.</p>';
    }
}

function formatApiEvent(apiEvent) {
    const venue = apiEvent._embedded?.venues?.[0];
    const prices = apiEvent.priceRanges?.[0];
    const classification = apiEvent.classifications?.[0];

    let category = 'community';
    if (classification?.segment?.name) {
        const segment = classification.segment.name.toLowerCase();
        if (segment.includes('music')) category = 'music';
        else if (segment.includes('sports')) category = 'sports';
        else if (segment.includes('arts')) category = 'arts';
        else if (segment.includes('film')) category = 'arts';
    }

    const eventDate = apiEvent.dates?.start?.localDate || new Date().toISOString().split('T')[0];
    const eventTime = apiEvent.dates?.start?.localTime || '7:00 PM';

    let priceString = 'Check website';
    if (prices) {
        if (prices.min === prices.max) {
            priceString = `$${prices.min.toFixed(2)}`;
        } else {
            priceString = `$${prices.min.toFixed(2)} - $${prices.max.toFixed(2)}`;
        }
    }

    return {
        id: apiEvent.id,
        title: apiEvent.name,
        description: apiEvent.info || apiEvent.pleaseNote || `Join us for ${apiEvent.name}. Don't miss this exciting event!`,
        category: category,
        date: eventDate,
        time: eventTime,
        location: venue?.city?.name ? `${venue.city.name}, ${venue.state?.stateCode || 'TX'}` : 'Dallas, TX',
        venue: venue?.name || 'TBA',
        price: priceString,
        url: apiEvent.url,
        attendees: Math.floor(Math.random() * 500) + 50
    };
}

function getCategoryColorHex(category) {
    const colors = {
        music: '9333EA',
        food: 'F59E0B',
        arts: 'EC4899',
        sports: '10B981',
        community: '3B82F6'
    };
    return colors[category] || '40E0D0';
}

function displayProjects(events) {
    spotlightContainer.innerHTML = '';

    // Store events globally so they can be accessed by modal
    window.spotlightEvents = events;

    events.forEach(event => {
        const eventCard = createProjectCard(event);
        spotlightContainer.appendChild(eventCard);
    });
}

function createProjectCard(event) {
    const card = document.createElement('div');
    card.className = 'card';

    const favorites = JSON.parse(localStorage.getItem('favoriteEvents') || '{}');
    const isFavorite = favorites.hasOwnProperty(event.id);

    card.innerHTML = `
        <div class="card-content" style="padding: 2rem;">
            <h2>${event.title}</h2>
            <p><strong>Category:</strong> ${event.category || 'Event'}</p>
            <p><strong>Price:</strong> ${event.price}</p>
            <p><strong>Date:</strong> ${event.date} at ${event.time}</p>
            <p>${event.description.substring(0, 100)}${event.description.length > 100 ? '...' : ''}</p>
            <div class="card-actions" style="display: flex; justify-content: space-between; align-items: center; margin-top: 1rem;">
                <button class="favorite-btn ${isFavorite ? 'active' : ''}" 
                        data-event-id="${event.id}"
                        aria-label="Add to favorites"
                        style="background: none; border: none; font-size: 1.5rem; cursor: pointer;">
                    ${isFavorite ? '❤️' : '🤍'}
                </button>
                <button class="btn-primary" onclick="window.showEventModal('${event.id}')">View Details</button>
            </div>
        </div>
    `;

    const favoriteBtn = card.querySelector('.favorite-btn');
    favoriteBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        toggleSpotlightFavorite(event.id, this, event);
    });

    return card;
}

function toggleSpotlightFavorite(eventId, button, eventData) {
    let favorites = JSON.parse(localStorage.getItem('favoriteEvents') || '{}');

    if (favorites.hasOwnProperty(eventId)) {
        // Remove from favorites
        delete favorites[eventId];
        button.textContent = '🤍';
        button.classList.remove('active');
        if (typeof Utility !== 'undefined' && Utility.showToast) {
            Utility.showToast('Removed from favorites', 'info');
        }
    } else {
        // Add to favorites with full event data
        favorites[eventId] = eventData;
        button.textContent = '❤️';
        button.classList.add('active');
        if (typeof Utility !== 'undefined' && Utility.showToast) {
            Utility.showToast('Added to favorites!', 'success');
        }
    }

    localStorage.setItem('favoriteEvents', JSON.stringify(favorites));
    updateSpotlightFavoritesCount();
}

function updateSpotlightFavoritesCount() {
    const countElement = document.getElementById('favorites-count');
    if (countElement) {
        const favorites = JSON.parse(localStorage.getItem('favoriteEvents') || '{}');
        const count = Object.keys(favorites).length;
        countElement.textContent = `${count} saved events`;
    }
}

function getRandomSubset(array, count) {
    const shuffled = [...array].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
}

function showEventDetails(eventId) {
    // Use the main modal function from app.js
    if (typeof showEventModal === 'function') {
        showEventModal(eventId);
    } else {
        alert('View Details - Event ID: ' + eventId);
    }
}

document.addEventListener('DOMContentLoaded', function () {
    loadProjects();

    const filterChips = document.querySelectorAll('.filter-chip');
    filterChips.forEach(chip => {
        chip.addEventListener('click', function () {
            filterChips.forEach(c => c.classList.remove('active'));
            this.classList.add('active');
            const category = this.dataset.category;
            console.log('Filter selected:', category);
        });
    });

    const gpsBtn = document.getElementById('use-gps');
    if (gpsBtn) {
        gpsBtn.addEventListener('click', function () {
            const locationInput = document.getElementById('location-search');

            if (navigator.geolocation) {
                this.textContent = '⏳';

                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        locationInput.value = `Dallas, TX (Current Location)`;
                        this.textContent = '📍';
                        localStorage.setItem('userLocation', locationInput.value);
                    },
                    (error) => {
                        console.error('Error getting location:', error);
                        alert('Unable to get your location. Please enter it manually.');
                        this.textContent = '📍';
                    }
                );
            } else {
                alert('Geolocation is not supported by your browser');
            }
        });
    }

    const searchBtn = document.getElementById('search-events');
    if (searchBtn) {
        searchBtn.addEventListener('click', function () {
            const locationInput = document.getElementById('location-search');
            const location = locationInput ? locationInput.value : 'Dallas, TX';
            const activeFilter = document.querySelector('.filter-chip.active');
            const category = activeFilter ? activeFilter.dataset.category : 'all';

            const searchHistory = JSON.parse(localStorage.getItem('searchHistory') || '[]');
            searchHistory.unshift({ location, category, date: new Date().toISOString() });
            localStorage.setItem('searchHistory', JSON.stringify(searchHistory.slice(0, 10)));

            window.location.href = `discover.html?location=${encodeURIComponent(location)}&category=${category}`;
        });
    }
});