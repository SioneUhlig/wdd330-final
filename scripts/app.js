document.addEventListener('DOMContentLoaded', function () {
    initializeApp();
});

function initializeApp() {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';

    switch (currentPage) {
        case 'index.html':
        case '':
            initHomePage();
            break;
        case 'discover.html':
            initDiscoverPage();
            break;
        case 'favorites.html':
            initFavoritesPage();
            break;
        case 'map.html':
            console.log('Map page - waiting for Google Maps API');
            break;
    }

    initNavigation();
    updateFavoritesCount();
}

function initHomePage() {
    console.log('Initializing home page');

    const searchBtn = document.getElementById('search-events');
    if (searchBtn) {
        searchBtn.addEventListener('click', handleSearch);
    }

    const gpsBtn = document.getElementById('use-gps');
    if (gpsBtn) {
        gpsBtn.addEventListener('click', handleGPSClick);
    }

    const filterChips = document.querySelectorAll('.filter-chip');
    filterChips.forEach(chip => {
        chip.addEventListener('click', function () {
            filterChips.forEach(c => c.classList.remove('active'));
            this.classList.add('active');
        });
    });
}

function initDiscoverPage() {
    console.log('Initializing discover page');

    loadDiscoverEvents();

    const applyBtn = document.getElementById('apply-filters');
    if (applyBtn) {
        applyBtn.addEventListener('click', applyFilters);
    }

    const resetBtn = document.getElementById('reset-filters');
    if (resetBtn) {
        resetBtn.addEventListener('click', resetFilters);
    }
}

async function loadDiscoverEvents() {
    const container = document.getElementById('events-container');
    if (!container) return;

    try {
        container.innerHTML = '<div class="loading-spinner"></div>';

        const location = new URLSearchParams(window.location.search).get('location') || 'Dallas, TX';

        const response = await API.searchEvents(location, {
            limit: 50,
            sortBy: 'date,asc'
        });

        if (response && response._embedded && response._embedded.events) {
            const apiEvents = response._embedded.events;
            const formattedEvents = apiEvents.map(event => formatDiscoverEvent(event));

            displayEvents(formattedEvents, container);
            updateEventCount(formattedEvents.length);
        } else {
            container.innerHTML = '<p style="text-align: center; padding: 2rem;">No events found for this location.</p>';
            updateEventCount(0);
        }

    } catch (error) {
        console.error('Error loading events:', error);
        container.innerHTML = '<p style="text-align: center; padding: 2rem; color: red;">Unable to load events. Please make sure the server is running.</p>';
    }
}

function formatDiscoverEvent(apiEvent) {
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
        else if (segment.includes('food')) category = 'food';
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

    const distance = Math.floor(Math.random() * 50) + 1;

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
        distance: distance,
        attendees: Math.floor(Math.random() * 500) + 50
    };
}

let allLoadedEvents = [];

function displayEvents(events, container) {
    if (events.length === 0) {
        container.innerHTML = '<p style="text-align: center; padding: 2rem;">No events found.</p>';
        return;
    }

    allLoadedEvents = events;

    container.innerHTML = events.map(event => createEventCard(event)).join('');

    container.querySelectorAll('.favorite-btn').forEach(btn => {
        btn.addEventListener('click', function (e) {
            e.stopPropagation();
            toggleFavorite(this.dataset.eventId, this);
        });
    });

    container.querySelectorAll('.event-card').forEach(card => {
        card.addEventListener('click', function () {
            showEventModal(this.dataset.eventId);
        });
    });
}

function createEventCard(event) {
    const isFavorite = isFavoriteEvent(event.id);
    const distance = event.distance ? `${event.distance} miles away` : '';

    return `
        <div class="event-card" data-event-id="${event.id}">
            <div class="event-card-content" style="padding: 2rem;">
                <span class="event-category" style="background: ${getCategoryColor(event.category)}">
                    ${event.category}
                </span>
                <h3>${event.title}</h3>
                <p class="event-date">📅 ${event.date} at ${event.time}</p>
                <p class="event-location">📍 ${event.location}</p>
                ${distance ? `<p class="event-distance">🚗 ${distance}</p>` : ''}
                <p class="event-price">💵 ${event.price}</p>
                <p style="margin: 1rem 0; color: #6B7280;">${event.description.substring(0, 100)}${event.description.length > 100 ? '...' : ''}</p>
                <div class="event-card-footer">
                    <button class="favorite-btn ${isFavorite ? 'active' : ''}" 
                            data-event-id="${event.id}"
                            aria-label="Add to favorites">
                        ${isFavorite ? '❤️' : '🤍'}
                    </button>
                    <span style="color: #6B7280; font-size: 0.875rem;">
                        ${event.attendees} interested
                    </span>
                </div>
            </div>
        </div>
    `;
}

function getCategoryColor(category) {
    const colors = {
        music: '#9333EA',
        food: '#F59E0B',
        arts: '#EC4899',
        sports: '#10B981',
        community: '#3B82F6'
    };
    return colors[category] || '#40E0D0';
}

function isFavoriteEvent(eventId) {
    const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
    return favorites.includes(eventId);
}

function toggleFavorite(eventId, button) {
    let favorites = JSON.parse(localStorage.getItem('favorites') || '[]');

    if (favorites.includes(eventId)) {
        favorites = favorites.filter(id => id !== eventId);
        button.textContent = '🤍';
        button.classList.remove('active');
    } else {
        favorites.push(eventId);
        button.textContent = '❤️';
        button.classList.add('active');
    }

    localStorage.setItem('favorites', JSON.stringify(favorites));

    updateFavoritesCount();

    if (typeof Utility !== 'undefined' && Utility.showToast) {
        Utility.showToast(
            favorites.includes(eventId) ? 'Added to favorites!' : 'Removed from favorites',
            'success'
        );
    }
}

function updateFavoritesCount() {
    const countElement = document.getElementById('favorites-count');
    if (countElement) {
        const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
        countElement.textContent = `${favorites.length} saved events`;
    }
}

function updateEventCount(count) {
    const countElement = document.getElementById('event-count');
    if (countElement) {
        countElement.textContent = `${count} events found`;
    }
}

function getEventById(eventId) {
    return allLoadedEvents.find(event => event.id === eventId);
}

function showEventModal(eventId) {
    const event = getEventById(eventId);
    if (!event) return;

    const modal = document.getElementById('event-modal');
    const modalContent = document.getElementById('event-detail-content');

    if (modal && modalContent) {
        const isFavorite = isFavoriteEvent(eventId);
        const distance = event.distance ? `<p><strong>🚗 Distance:</strong> ${event.distance} miles away</p>` : '';

        modalContent.innerHTML = `
            <div style="padding: 2rem;">
                <h2 style="color: #1F2937; margin-bottom: 1rem;">${event.title}</h2>
                
                <div style="display: grid; gap: 1rem; margin-bottom: 1.5rem;">
                    <p><strong>Category:</strong> <span style="color: ${getCategoryColor(event.category)}; font-weight: 600;">${event.category}</span></p>
                    <p><strong>📅 Date:</strong> ${event.date}</p>
                    <p><strong>🕐 Time:</strong> ${event.time}</p>
                    <p><strong>📍 Location:</strong> ${event.location}</p>
                    <p><strong>🏢 Venue:</strong> ${event.venue}</p>
                    ${distance}
                    <p><strong>💵 Price:</strong> ${event.price}</p>
                    <p><strong>👥 Interested:</strong> ${event.attendees} people</p>
                </div>
                
                <p style="line-height: 1.6; color: #374151; margin-bottom: 1.5rem;">
                    ${event.description}
                </p>
                
                <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
                    <button onclick="toggleFavoriteFromModal('${eventId}')" 
                            id="modal-favorite-btn"
                            class="btn-secondary" style="flex: 1; min-width: 150px;">
                        ${isFavorite ? '❤️ Remove from Favorites' : '🤍 Add to Favorites'}
                    </button>
                    <button onclick="window.getTicketsFromModal('${eventId}')" class="btn-primary" style="flex: 1; min-width: 150px;">
                        Get Tickets
                    </button>
                </div>
            </div>
        `;

        modal.style.display = 'block';
    }
}

function getTickets(eventId) {
    const event = getEventById(eventId);
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

function getTicketsFromModal(eventId) {
    getTickets(eventId);
}

function toggleFavoriteFromModal(eventId) {
    let favorites = JSON.parse(localStorage.getItem('favorites') || '[]');

    if (favorites.includes(eventId)) {
        favorites = favorites.filter(id => id !== eventId);
    } else {
        favorites.push(eventId);
    }

    localStorage.setItem('favorites', JSON.stringify(favorites));

    const isFavorite = favorites.includes(eventId);

    const modalBtn = document.getElementById('modal-favorite-btn');
    if (modalBtn) {
        modalBtn.innerHTML = isFavorite ? '❤️ Remove from Favorites' : '🤍 Add to Favorites';
    }

    const pageBtn = document.querySelector(`.favorite-btn[data-event-id="${eventId}"]`);
    if (pageBtn) {
        pageBtn.textContent = isFavorite ? '❤️' : '🤍';
        pageBtn.classList.toggle('active', isFavorite);
    }

    updateFavoritesCount();

    if (typeof Utility !== 'undefined' && Utility.showToast) {
        Utility.showToast(
            isFavorite ? 'Added to favorites!' : 'Removed from favorites',
            'success'
        );
    }
}

function applyFilters() {
    const category = document.getElementById('category-filter')?.value || 'all';
    const date = document.getElementById('date-filter')?.value || 'all';
    const price = document.getElementById('price-filter')?.value || 'all';
    const distance = document.getElementById('distance-filter')?.value || 'all';
    const sort = document.getElementById('sort-filter')?.value || 'date';

    let events = [...allLoadedEvents];

    if (category !== 'all') {
        events = events.filter(e => e.category === category);
    }

    if (price === 'free') {
        events = events.filter(e => e.price === 'Free' || e.price === 'Check website');
    } else if (price === 'paid') {
        events = events.filter(e => e.price !== 'Free' && e.price !== 'Check website');
    }

    if (distance !== 'all') {
        const maxDistance = parseInt(distance);
        events = events.filter(e => e.distance <= maxDistance);
    }

    if (sort === 'date') {
        events.sort((a, b) => new Date(a.date) - new Date(b.date));
    } else if (sort === 'popularity') {
        events.sort((a, b) => b.attendees - a.attendees);
    } else if (sort === 'distance') {
        events.sort((a, b) => a.distance - b.distance);
    }

    const container = document.getElementById('events-container');
    displayEvents(events, container);
    updateEventCount(events.length);
}

function resetFilters() {
    const filters = ['category-filter', 'date-filter', 'price-filter', 'distance-filter', 'sort-filter'];
    filters.forEach(filterId => {
        const filter = document.getElementById(filterId);
        if (filter) filter.selectedIndex = 0;
    });
    loadDiscoverEvents();
}

function initFavoritesPage() {
    console.log('Initializing favorites page');

    loadFavorites();

    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', function () {
            tabBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            filterFavorites(this.dataset.tab);
        });
    });
    setupShareFeature();
}

async function loadFavorites() {
    const container = document.getElementById('favorites-container');
    if (!container) return;

    const favoriteIds = JSON.parse(localStorage.getItem('favorites') || '[]');

    if (favoriteIds.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <svg width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="#40E0D0" stroke-width="2">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
                <h2>No Saved Events Yet</h2>
                <p>Start exploring and save events you're interested in!</p>
                <a href="discover.html" class="btn-primary">Discover Events</a>
            </div>
        `;
        updateFavoritesCount();
        return;
    }

    try {
        container.innerHTML = '<div class="loading-spinner"></div>';

        const response = await API.searchEvents('Dallas, TX', {
            limit: 50,
            sortBy: 'date,asc'
        });

        if (response && response._embedded && response._embedded.events) {
            const apiEvents = response._embedded.events;
            allLoadedEvents = apiEvents.map(event => formatDiscoverEvent(event));

            const favorites = allLoadedEvents.filter(event => favoriteIds.includes(event.id));

            if (favorites.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <h2>Your favorited events are not in the current search</h2>
                        <p>Try searching in different locations or visit the Discover page!</p>
                        <a href="discover.html" class="btn-primary">Go to Discover</a>
                    </div>
                `;
            } else {
                displayEvents(favorites, container);
                const shareSection = document.getElementById('share-section');
                if (shareSection) {
                    shareSection.style.display = 'block';
                }
            }
        } else {
            throw new Error('No events found');
        }
    } catch (error) {
        console.error('Error loading favorites:', error);
        container.innerHTML = '<p style="text-align: center; padding: 2rem; color: red;">Unable to load favorites. Please make sure the server is running.</p>';
    }

    updateFavoritesCount();
}

async function filterFavorites(tab) {
    const favoriteIds = JSON.parse(localStorage.getItem('favorites') || '[]');

    if (allLoadedEvents.length === 0) {
        await loadFavorites();
        return;
    }

    let favorites = allLoadedEvents.filter(event => favoriteIds.includes(event.id));
    let filtered = favorites;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (tab === 'upcoming') {
        filtered = favorites.filter(event => {
            const eventDate = new Date(event.date);
            return eventDate >= today;
        });
    } else if (tab === 'past') {
        filtered = favorites.filter(event => {
            const eventDate = new Date(event.date);
            return eventDate < today;
        });
    }

    const container = document.getElementById('favorites-container');
    if (filtered.length === 0) {
        container.innerHTML = '<p style="text-align: center; padding: 2rem;">No events in this category.</p>';
    } else {
        displayEvents(filtered, container);
    }
}
function setupShareFeature() {
    const generateBtn = document.getElementById('generate-link');
    const copyBtn = document.getElementById('copy-link');

    if (generateBtn) {
        generateBtn.addEventListener('click', function () {
            const favoriteIds = JSON.parse(localStorage.getItem('favorites') || '[]');

            if (favoriteIds.length === 0) {
                alert('You need to have some favorite events to share!');
                return;
            }

            const shareUrl = `${window.location.origin}${window.location.pathname}`;

            const shareOutput = document.getElementById('share-output');
            const shareUrlInput = document.getElementById('share-url');

            if (shareOutput && shareUrlInput) {
                shareUrlInput.value = shareUrl;
                shareOutput.style.display = 'block';
            }
        });
    }

    if (copyBtn) {
        copyBtn.addEventListener('click', function () {
            const shareUrlInput = document.getElementById('share-url');
            if (shareUrlInput) {
                shareUrlInput.select();
                document.execCommand('copy');
                alert('Link copied to clipboard!');
            }
        });
    }
}

function handleSearch() {
    const locationInput = document.getElementById('location-search');
    const location = locationInput?.value || 'Dallas, TX';
    const activeFilter = document.querySelector('.filter-chip.active');
    const category = activeFilter?.dataset.category || 'all';

    window.location.href = `discover.html?location=${encodeURIComponent(location)}&category=${category}`;
}

function handleGPSClick() {
    const gpsBtn = this;
    const locationInput = document.getElementById('location-search');

    if (!navigator.geolocation) {
        alert('Geolocation is not supported by your browser');
        return;
    }

    gpsBtn.textContent = '⏳';
    gpsBtn.disabled = true;

    navigator.geolocation.getCurrentPosition(
        (position) => {
            const { latitude, longitude } = position.coords;
            if (locationInput) {
                locationInput.value = `Dallas, TX (${latitude.toFixed(2)}, ${longitude.toFixed(2)})`;
                localStorage.setItem('userLocation', locationInput.value);
            }
            gpsBtn.textContent = '📍';
            gpsBtn.disabled = false;
        },
        (error) => {
            console.error('Error getting location:', error);
            alert('Unable to get your location. Please enter it manually.');
            gpsBtn.textContent = '📍';
            gpsBtn.disabled = false;
        }
    );
}

function initNavigation() {
    const hamBtn = document.getElementById('ham-btn');
    const navBar = document.getElementById('nav-bar');

    if (hamBtn && navBar) {
        hamBtn.addEventListener('click', () => {
            hamBtn.classList.toggle('show');
            navBar.classList.toggle('show');
        });
    }

    const modal = document.getElementById('event-modal');
    if (modal) {
        const closeBtn = modal.querySelector('.close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                modal.style.display = 'none';
            });
        }

        window.addEventListener('click', (event) => {
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        });

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && modal.style.display === 'block') {
                modal.style.display = 'none';
            }
        });
    }
}

window.toggleFavoriteFromModal = toggleFavoriteFromModal;
window.showEventModal = showEventModal;
window.getTickets = getTickets;
window.getTicketsFromModal = getTicketsFromModal;
window.formatDiscoverEvent = formatDiscoverEvent;