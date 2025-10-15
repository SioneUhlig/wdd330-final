const spotlightContainer = document.getElementById('spotlight-container');

async function loadProjects() {
    try {
        spotlightContainer.innerHTML = '<p class="loading">Loading featured events...</p>';

        const location = localStorage.getItem('userLocation') || 'Dallas, TX';

        const response = await API.searchEvents(location, {
            limit: 20,
            sortBy: 'date,asc'
        });

        if (response && response._embedded && response._embedded.events) {
            const apiEvents = response._embedded.events;

            const formattedEvents = apiEvents.map(event => formatApiEvent(event));

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
                        style="background: white; border: 2px solid #E5E7EB; cursor: pointer; font-size: 1.5rem; width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center; transition: all 0.3s ease;">
                    ${isFavorite ? '❤️' : '🤍'}
                </button>
                <button class="btn-primary view-details-btn" data-event-id="${event.id}">View Details</button>
            </div>
        </div>
    `;

    const viewDetailsBtn = card.querySelector('.view-details-btn');
    viewDetailsBtn.addEventListener('click', function () {
        const eventId = this.getAttribute('data-event-id');
        showSpotlightEventModal(eventId);
    });

    const favoriteBtn = card.querySelector('.favorite-btn');
    favoriteBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        toggleSpotlightFavorite(event.id, this, event);
    });

    return card;
}

function showSpotlightEventModal(eventId) {
    let event = window.spotlightEvents?.find(e => e.id === eventId);

    if (!event && typeof window.showEventModal === 'function') {
        window.showEventModal(eventId);
        return;
    }

    if (!event) {
        const favorites = JSON.parse(localStorage.getItem('favoriteEvents') || '{}');
        event = favorites[eventId];
    }

    if (!event) {
        console.error('Event not found:', eventId);
        alert('Unable to load event details. Please try again.');
        return;
    }

    let modal = document.getElementById('event-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'event-modal';
        modal.className = 'modal';
        modal.style.display = 'none';
        modal.innerHTML = `
            <div class="modal-content event-detail">
                <button class="close" aria-label="Close event details">&times;</button>
                <div id="event-detail-content"></div>
            </div>
        `;
        document.body.appendChild(modal);

        const closeBtn = modal.querySelector('.close');
        closeBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.style.display === 'block') {
                modal.style.display = 'none';
            }
        });
    }

    const modalContent = document.getElementById('event-detail-content');
    const isFavorite = isFavoriteEvent(eventId);

    modalContent.innerHTML = `
        <div style="padding: 2rem;">
            <h2 style="color: #1F2937; margin-bottom: 1rem;">${event.title}</h2>
            
            <div style="display: grid; gap: 1rem; margin-bottom: 1.5rem;">
                <p><strong>Category:</strong> <span style="color: ${getCategoryColor(event.category)}; font-weight: 600;">${event.category}</span></p>
                <p><strong>📅 Date:</strong> ${event.date}</p>
                <p><strong>🕐 Time:</strong> ${event.time}</p>
                <p><strong>📍 Location:</strong> ${event.location}</p>
                <p><strong>🏢 Venue:</strong> ${event.venue}</p>
                <p><strong>💵 Price:</strong> ${event.price}</p>
                <p><strong>👥 Interested:</strong> ${event.attendees} people</p>
            </div>
            
            <p style="line-height: 1.6; color: #374151; margin-bottom: 1.5rem;">
                ${event.description}
            </p>
            
            <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
                <button onclick="toggleFavoriteFromSpotlight('${eventId}')" 
                        id="modal-favorite-btn-spotlight"
                        class="btn-secondary" style="flex: 1; min-width: 150px;">
                    ${isFavorite ? '❤️ Remove from Favorites' : '🤍 Add to Favorites'}
                </button>
                <button onclick="getTicketsFromSpotlight('${eventId}')" class="btn-primary" style="flex: 1; min-width: 150px;">
                    Get Tickets
                </button>
            </div>
        </div>
    `;

    modal.style.display = 'block';
}

function getCategoryColor(category) {
    const colors = {
        music: '#D8B4FE',
        food: '#78350F',
        arts: '#EC4899',
        sports: '#10B981',
        community: '#3B82F6'
    };
    return colors[category] || '#40E0D0';
}

function isFavoriteEvent(eventId) {
    const favorites = JSON.parse(localStorage.getItem('favoriteEvents') || '{}');
    return favorites.hasOwnProperty(eventId);
}

function toggleSpotlightFavorite(eventId, button, eventData) {
    let favorites = JSON.parse(localStorage.getItem('favoriteEvents') || '{}');

    if (favorites.hasOwnProperty(eventId)) {
        delete favorites[eventId];
        button.textContent = '🤍';
        button.classList.remove('active');
        if (typeof Utility !== 'undefined' && Utility.showToast) {
            Utility.showToast('Removed from favorites', 'info');
        }
    } else {
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

function toggleFavoriteFromSpotlight(eventId) {
    let favorites = JSON.parse(localStorage.getItem('favoriteEvents') || '{}');
    let event = window.spotlightEvents?.find(e => e.id === eventId);

    if (!event) {
        event = favorites[eventId];
    }

    if (favorites.hasOwnProperty(eventId)) {
        delete favorites[eventId];
    } else {
        if (event) {
            favorites[eventId] = event;
        }
    }

    localStorage.setItem('favoriteEvents', JSON.stringify(favorites));

    const isFavorite = favorites.hasOwnProperty(eventId);

    const modalBtn = document.getElementById('modal-favorite-btn-spotlight');
    if (modalBtn) {
        modalBtn.innerHTML = isFavorite ? '❤️ Remove from Favorites' : '🤍 Add to Favorites';
    }

    const pageBtn = document.querySelector(`.favorite-btn[data-event-id="${eventId}"]`);
    if (pageBtn) {
        pageBtn.textContent = isFavorite ? '❤️' : '🤍';
        pageBtn.classList.toggle('active', isFavorite);
    }

    updateSpotlightFavoritesCount();

    if (typeof Utility !== 'undefined' && Utility.showToast) {
        Utility.showToast(
            isFavorite ? 'Added to favorites!' : 'Removed from favorites',
            'success'
        );
    }
}

function getTicketsFromSpotlight(eventId) {
    let event = window.spotlightEvents?.find(e => e.id === eventId);

    if (!event) {
        const favorites = JSON.parse(localStorage.getItem('favoriteEvents') || '{}');
        event = favorites[eventId];
    }

    if (!event) {
        alert('Event not found');
        return;
    }

    if (event.url) {
        window.open(event.url, '_blank');
    } else {
        const searchQuery = encodeURIComponent(`${event.title} ${event.location} tickets`);
        const ticketmasterSearchUrl = `https://www.ticketmaster.com/search?q=${searchQuery}`;
        window.open(ticketmasterSearchUrl, '_blank');
    }
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

window.toggleFavoriteFromSpotlight = toggleFavoriteFromSpotlight;
window.getTicketsFromSpotlight = getTicketsFromSpotlight;
window.showSpotlightEventModal = showSpotlightEventModal;

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