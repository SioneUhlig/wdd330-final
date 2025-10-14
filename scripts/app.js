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

    setTimeout(() => loadDiscoverEvents(), 100);

    const applyBtn = document.getElementById('apply-filters');
    if (applyBtn) {
        applyBtn.addEventListener('click', applyFilters);
    }

    const resetBtn = document.getElementById('reset-filters');
    if (resetBtn) {
        resetBtn.addEventListener('click', resetFilters);
    }

    const discoverGpsBtn = document.getElementById('discover-gps');
    const discoverLocationInput = document.getElementById('discover-location');

    if (discoverGpsBtn && discoverLocationInput) {
        discoverGpsBtn.addEventListener('click', () => {
            if (!navigator.geolocation) {
                alert('Geolocation is not supported by your browser');
                return;
            }

            discoverGpsBtn.textContent = '⏳';
            discoverGpsBtn.disabled = true;

            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const { latitude, longitude } = position.coords;

                    try {
                        const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=AIzaSyCV-awjx4Qa0OWgQlT8bbYaxjLEawWfu7s`);
                        const data = await response.json();

                        if (data.results && data.results.length > 0) {
                            let city = '';
                            let state = '';

                            for (const component of data.results[0].address_components) {
                                if (component.types.includes('locality')) {
                                    city = component.long_name;
                                }
                                if (component.types.includes('administrative_area_level_1')) {
                                    state = component.short_name;
                                }
                            }

                            if (city && state) {
                                const locationString = `${city}, ${state}`;
                                discoverLocationInput.value = locationString;
                                loadDiscoverEvents(locationString);
                            } else {
                                discoverLocationInput.value = 'Dallas, TX';
                                alert('Could not determine city from your location. Using Dallas, TX');
                                loadDiscoverEvents('Dallas, TX');
                            }
                        }
                    } catch (error) {
                        console.error('Geocoding error:', error);
                        discoverLocationInput.value = 'Dallas, TX';
                        alert('Could not determine city from your location. Using Dallas, TX');
                        loadDiscoverEvents('Dallas, TX');
                    }

                    discoverGpsBtn.textContent = '📍';
                    discoverGpsBtn.disabled = false;
                },
                (error) => {
                    console.error('Error getting location:', error);
                    alert('Unable to get your location. Please enter it manually.');
                    discoverGpsBtn.textContent = '📍';
                    discoverGpsBtn.disabled = false;
                }
            );
        });
    }

    const quickFilterDropdown = document.getElementById('quick-filter-dropdown');
    if (quickFilterDropdown) {

        updateQuickActionsDropdown();

        quickFilterDropdown.addEventListener('change', function () {
            const action = this.value;
            if (action) {
                handleQuickAction(action);
                this.value = '';
            }
        });
    }
}

function updateQuickActionsDropdown() {
    const dropdown = document.getElementById('quick-filter-dropdown');
    if (!dropdown) return;
}

async function loadDiscoverEvents(locationOverride) {
    const container = document.getElementById('events-container');
    if (!container) return;

    try {
        container.innerHTML = '<div class="loading-spinner"></div>';

        let location;
        if (locationOverride) {
            location = locationOverride;
        } else {
            location = new URLSearchParams(window.location.search).get('location') || 'Dallas, TX';
        }

        const locationInput = document.getElementById('discover-location');
        if (locationInput) {
            locationInput.value = location;
            locationInput.setAttribute('data-last-location', location);
        }

        localStorage.setItem('userLocation', location);

        const categoryFilter = document.getElementById('category-filter');
        const category = categoryFilter ? categoryFilter.value : 'all';
        saveSearchHistory(location, category);

        console.log('🔍 Discover Page: Searching for events in', location);

        // Make the API call
        const response = await window.API.searchEvents(location, {
            limit: 50,
            sortBy: 'date,asc'
        });

        console.log('✅ Discover Page: API Response:', response);

        if (response && response._embedded && response._embedded.events) {
            const apiEvents = response._embedded.events;
            console.log(`✅ Discover Page: Got ${apiEvents.length} events`);

            const formattedEvents = apiEvents.map(event => formatDiscoverEvent(event));

            displayEvents(formattedEvents, container);
            updateEventCount(formattedEvents.length);
        } else {
            console.warn('⚠️ Discover Page: No events in response');
            container.innerHTML = '<p style="text-align: center; padding: 2rem;">No events found for this location.</p>';
            updateEventCount(0);
        }

    } catch (error) {
        console.error('❌ Discover Page: Error loading events:', error);
        console.error('Error details:', error.message, error.stack);
        container.innerHTML = `
            <div style="text-align: center; padding: 2rem;">
                <p style="color: red; font-weight: bold;">Unable to load events</p>
                <p style="color: #666; margin-top: 1rem;">Error: ${error.message}</p>
                <p style="color: #666; margin-top: 0.5rem;">Please check the console for more details.</p>
                <button onclick="location.reload()" class="btn-primary" style="margin-top: 1rem;">
                    Retry
                </button>
            </div>
        `;
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
            const eventId = this.dataset.eventId;
            const event = getEventById(eventId);
            toggleFavorite(eventId, this, event);
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
    const favorites = JSON.parse(localStorage.getItem('favoriteEvents') || '{}');
    return favorites.hasOwnProperty(eventId);
}

function toggleFavorite(eventId, button, eventData) {
    let favorites = JSON.parse(localStorage.getItem('favoriteEvents') || '{}');

    if (favorites.hasOwnProperty(eventId)) {
        delete favorites[eventId];
        button.textContent = '🤍';
        button.classList.remove('active');
    } else {
        if (eventData) {
            favorites[eventId] = eventData;
        } else {
            const event = getEventById(eventId);
            if (event) {
                favorites[eventId] = event;
            } else {
                console.error('Event data not found for:', eventId);
                return;
            }
        }
        button.textContent = '❤️';
        button.classList.add('active');
    }

    localStorage.setItem('favoriteEvents', JSON.stringify(favorites));

    updateFavoritesCount();

    if (typeof Utility !== 'undefined' && Utility.showToast) {
        Utility.showToast(
            favorites.hasOwnProperty(eventId) ? 'Added to favorites!' : 'Removed from favorites',
            'success'
        );
    }
}

function updateFavoritesCount() {
    const countElement = document.getElementById('favorites-count');
    if (countElement) {
        const favorites = JSON.parse(localStorage.getItem('favoriteEvents') || '{}');
        const count = Object.keys(favorites).length;
        countElement.textContent = `${count} saved events`;
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
    let event = getEventById(eventId);

    // Track that user viewed this event
    trackRecentlyViewed(eventId);

    // If not in current loaded events, check spotlight events
    if (!event && window.spotlightEvents) {
        event = window.spotlightEvents.find(e => e.id === eventId);
    }

    // If still not found, check favorites
    if (!event) {
        const favorites = JSON.parse(localStorage.getItem('favoriteEvents') || '{}');
        event = favorites[eventId];
    }

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
    let event = getEventById(eventId);

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

function getTicketsFromModal(eventId) {
    getTickets(eventId);
}

function toggleFavoriteFromModal(eventId) {
    let favorites = JSON.parse(localStorage.getItem('favoriteEvents') || '{}');
    let event = getEventById(eventId);

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
    const locationInput = document.getElementById('discover-location');
    const currentLocation = locationInput?.value.trim();

    const lastLoadedLocation = locationInput?.getAttribute('data-last-location') || 'Dallas, TX';

    if (currentLocation && currentLocation !== lastLoadedLocation) {
        locationInput?.setAttribute('data-last-location', currentLocation);
        loadDiscoverEvents(currentLocation).then(() => {
            if (category !== 'all' || price !== 'all' || distance !== 'all' || sort !== 'date') {
                applyClientSideFilters(category, price, distance, sort);
            }
        });
        return;
    }

    applyClientSideFilters(category, price, distance, sort);
}

function applyClientSideFilters(category, price, distance, sort) {
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

    saveFilterPreferences();
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

function loadFavorites() {
    const container = document.getElementById('favorites-container');
    if (!container) return;

    const favorites = JSON.parse(localStorage.getItem('favoriteEvents') || '{}');
    const favoriteEvents = Object.values(favorites);

    if (favoriteEvents.length === 0) {
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

    allLoadedEvents = favoriteEvents;
    displayEvents(favoriteEvents, container);

    const shareSection = document.getElementById('share-section');
    if (shareSection) {
        shareSection.style.display = 'block';
    }

    updateFavoritesCount();
}

function filterFavorites(tab) {
    const favorites = JSON.parse(localStorage.getItem('favoriteEvents') || '{}');
    let favoriteEvents = Object.values(favorites);
    let filtered = favoriteEvents;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (tab === 'upcoming') {
        filtered = favoriteEvents.filter(event => {
            const eventDate = new Date(event.date);
            return eventDate >= today;
        });
    } else if (tab === 'past') {
        filtered = favoriteEvents.filter(event => {
            const eventDate = new Date(event.date);
            return eventDate < today;
        });
    }

    const container = document.getElementById('favorites-container');
    if (filtered.length === 0) {
        container.innerHTML = '<p style="text-align: center; padding: 2rem;">No events in this category.</p>';
    } else {
        allLoadedEvents = filtered;
        displayEvents(filtered, container);
    }
}

function setupShareFeature() {
    const generateBtn = document.getElementById('generate-link');
    const copyBtn = document.getElementById('copy-link');

    if (generateBtn) {
        generateBtn.addEventListener('click', function () {
            const favorites = JSON.parse(localStorage.getItem('favoriteEvents') || '{}');

            if (Object.keys(favorites).length === 0) {
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


function getRecentlyViewedCount() {
    const recentlyViewed = JSON.parse(localStorage.getItem('recentlyViewed') || '[]');
    return recentlyViewed.length;
}

function getSearchHistoryCount() {
    const searchHistory = JSON.parse(localStorage.getItem('searchHistory') || '[]');
    return searchHistory.length;
}

function trackRecentlyViewed(eventId) {
    let recentEvents = JSON.parse(localStorage.getItem('recentlyViewed') || '[]');

    recentEvents = recentEvents.filter(id => id !== eventId);

    recentEvents.unshift(eventId);

    if (recentEvents.length > 10) {
        recentEvents = recentEvents.slice(0, 10);
    }

    localStorage.setItem('recentlyViewed', JSON.stringify(recentEvents));
    console.log('Tracked recently viewed:', eventId);
}

function saveFilterPreferences() {
    const preferences = {
        category: document.getElementById('category-filter')?.value || 'all',
        priceFilter: document.getElementById('price-filter')?.value || 'all',
        distanceFilter: document.getElementById('distance-filter')?.value || 'all',
        sortBy: document.getElementById('sort-filter')?.value || 'date'
    };
    localStorage.setItem('filterPreferences', JSON.stringify(preferences));
    console.log('Saved filter preferences:', preferences);
}

function saveSearchHistory(location, category) {
    let searchHistory = JSON.parse(localStorage.getItem('searchHistory') || '[]');

    const search = {
        location: location,
        category: category || 'all',
        timestamp: new Date().toISOString()
    };

    searchHistory.unshift(search);

    if (searchHistory.length > 20) {
        searchHistory = searchHistory.slice(0, 20);
    }

    localStorage.setItem('searchHistory', JSON.stringify(searchHistory));
    console.log('Saved search history:', search);
}

function handleQuickAction(action) {
    switch (action) {
        case 'recent-filters':
            loadLastFilters();
            break;
        case 'recent-location':
            loadLastLocation();
            break;
        case 'view-history':
            showRecentlyViewed();
            break;
        case 'view-searches':
            showSearchHistory();
            break;
        case 'view-storage':
            showAllStorageData();
            break;
    }
}

function loadLastFilters() {
    const saved = localStorage.getItem('filterPreferences');
    if (saved) {
        const preferences = JSON.parse(saved);
        if (document.getElementById('category-filter')) {
            document.getElementById('category-filter').value = preferences.category || 'all';
        }
        if (document.getElementById('price-filter')) {
            document.getElementById('price-filter').value = preferences.priceFilter || 'all';
        }
        if (document.getElementById('distance-filter')) {
            document.getElementById('distance-filter').value = preferences.distanceFilter || 'all';
        }
        if (document.getElementById('sort-filter')) {
            document.getElementById('sort-filter').value = preferences.sortBy || 'date';
        }
        if (typeof Utility !== 'undefined' && Utility.showToast) {
            Utility.showToast('✅ Last filter settings restored!', 'success');
        } else {
            alert('✅ Last filter settings restored!');
        }
    } else {
        alert('No saved filter preferences found. Use filters and they will be saved automatically!');
    }
}

function loadLastLocation() {
    const lastLocation = localStorage.getItem('userLocation');
    const locationInput = document.getElementById('discover-location');

    if (lastLocation && locationInput) {
        locationInput.value = lastLocation;
        loadDiscoverEvents(lastLocation);
        if (typeof Utility !== 'undefined' && Utility.showToast) {
            Utility.showToast('📍 Last location loaded!', 'success');
        }
    } else {
        alert('No saved location found. Use the GPS button or enter a location!');
    }
}

function showRecentlyViewed() {
    const recentlyViewed = JSON.parse(localStorage.getItem('recentlyViewed') || '[]');
    const favorites = JSON.parse(localStorage.getItem('favoriteEvents') || '{}');

    if (recentlyViewed.length === 0) {
        alert('No recently viewed events yet. Click on event cards to view them!');
        return;
    }

    let html = `
        <div style="max-width: 600px; max-height: 70vh; overflow-y: auto;">
            <h3 style="margin-bottom: 1rem; color: #1F2937;">👁️ Recently Viewed Events (${recentlyViewed.length})</h3>
            <p style="color: #6B7280; margin-bottom: 1.5rem;">Events you've clicked on recently:</p>
    `;

    recentlyViewed.forEach((eventId, index) => {
        const event = favorites[eventId] || allLoadedEvents.find(e => e.id === eventId);
        if (event) {
            html += `
                <div style="background: #F8FAFB; padding: 1rem; border-radius: 8px; margin-bottom: 0.75rem; border-left: 4px solid #3B82F6;">
                    <strong>${index + 1}. ${event.title}</strong>
                    <div style="color: #6B7280; font-size: 0.9rem; margin-top: 0.25rem;">
                        📅 ${event.date} | 📍 ${event.location}
                    </div>
                </div>
            `;
        } else {
            html += `
                <div style="background: #F8FAFB; padding: 1rem; border-radius: 8px; margin-bottom: 0.75rem; border-left: 4px solid #9CA3AF;">
                    <strong>${index + 1}. Event ID: ${eventId}</strong>
                    <div style="color: #6B7280; font-size: 0.9rem; margin-top: 0.25rem;">
                        (Event data not currently loaded)
                    </div>
                </div>
            `;
        }
    });

    html += '</div>';

    showCustomModal('Recently Viewed', html);
}

function showSearchHistory() {
    const searchHistory = JSON.parse(localStorage.getItem('searchHistory') || '[]');

    if (searchHistory.length === 0) {
        alert('No search history yet. Search for events and your history will be saved!');
        return;
    }

    let html = `
        <div style="max-width: 600px; max-height: 70vh; overflow-y: auto;">
            <h3 style="margin-bottom: 1rem; color: #1F2937;">🔍 Search History (${searchHistory.length})</h3>
            <p style="color: #6B7280; margin-bottom: 1.5rem;">Your recent searches:</p>
    `;

    searchHistory.forEach((search, index) => {
        const date = new Date(search.timestamp);
        const timeAgo = getTimeAgo(date);

        html += `
            <div style="background: #F8FAFB; padding: 1rem; border-radius: 8px; margin-bottom: 0.75rem; border-left: 4px solid #40E0D0;">
                <div style="display: flex; justify-content: space-between; align-items: start;">
                    <div>
                        <strong>${index + 1}. ${search.location}</strong>
                        <div style="color: #6B7280; font-size: 0.9rem; margin-top: 0.25rem;">
                            Category: ${search.category} | ${timeAgo}
                        </div>
                    </div>
                    <button onclick="loadSearchFromHistory('${search.location}', '${search.category}')" 
                            style="background: #3B82F6; color: white; border: none; padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer; font-size: 0.85rem;">
                        Load
                    </button>
                </div>
            </div>
        `;
    });

    html += '</div>';

    showCustomModal('Search History', html);
}

function showAllStorageData() {
    const favorites = JSON.parse(localStorage.getItem('favoriteEvents') || '{}');
    const filterPrefs = JSON.parse(localStorage.getItem('filterPreferences') || '{}');
    const recentlyViewed = JSON.parse(localStorage.getItem('recentlyViewed') || '[]');
    const searchHistory = JSON.parse(localStorage.getItem('searchHistory') || '[]');
    const userLocation = localStorage.getItem('userLocation') || 'Not set';

    let html = `
        <div style="max-width: 700px; max-height: 70vh; overflow-y: auto;">
            <h3 style="margin-bottom: 1rem; color: #1F2937;">📊 All LocalStorage Data</h3>
            
            <div style="background: #F8FAFB; padding: 1rem; border-radius: 8px; margin-bottom: 1rem; border-left: 4px solid #EF4444;">
                <strong>❤️ Favorite Events</strong>
                <div style="color: #6B7280; font-size: 0.9rem; margin-top: 0.5rem;">
                    ${Object.keys(favorites).length} events saved
                </div>
            </div>
            
            <div style="background: #F8FAFB; padding: 1rem; border-radius: 8px; margin-bottom: 1rem; border-left: 4px solid #3B82F6;">
                <strong>🎛️ Filter Preferences</strong>
                <div style="color: #6B7280; font-size: 0.9rem; margin-top: 0.5rem;">
                    Category: ${filterPrefs.category || 'Not set'}<br>
                    Price: ${filterPrefs.priceFilter || 'Not set'}<br>
                    Distance: ${filterPrefs.distanceFilter || 'Not set'}<br>
                    Sort: ${filterPrefs.sortBy || 'Not set'}
                </div>
            </div>
            
            <div style="background: #F8FAFB; padding: 1rem; border-radius: 8px; margin-bottom: 1rem; border-left: 4px solid #40E0D0;">
                <strong>👁️ Recently Viewed</strong>
                <div style="color: #6B7280; font-size: 0.9rem; margin-top: 0.5rem;">
                    ${recentlyViewed.length} events viewed
                </div>
            </div>
            
            <div style="background: #F8FAFB; padding: 1rem; border-radius: 8px; margin-bottom: 1rem; border-left: 4px solid #9333EA;">
                <strong>🔍 Search History</strong>
                <div style="color: #6B7280; font-size: 0.9rem; margin-top: 0.5rem;">
                    ${searchHistory.length} searches recorded
                </div>
            </div>
            
            <div style="background: #F8FAFB; padding: 1rem; border-radius: 8px; margin-bottom: 1rem; border-left: 4px solid #10B981;">
                <strong>📍 User Location</strong>
                <div style="color: #6B7280; font-size: 0.9rem; margin-top: 0.5rem;">
                    ${userLocation}
                </div>
            </div>
            
            <p style="color: #6B7280; font-size: 0.9rem; margin-top: 1.5rem; text-align: center;">
                <strong>Total Storage Items:</strong> ${Object.keys(localStorage).length}
            </p>
        </div>
    `;

    showCustomModal('LocalStorage Overview', html);
}

function showCustomModal(title, htmlContent) {
    const existingModal = document.getElementById('custom-storage-modal');
    if (existingModal) {
        existingModal.remove();
    }

    const modal = document.createElement('div');
    modal.id = 'custom-storage-modal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.6);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        padding: 1rem;
    `;

    modal.innerHTML = `
        <div style="background: white; border-radius: 16px; padding: 2rem; max-width: 90vw; position: relative;">
            <button onclick="closeCustomModal()" style="position: absolute; top: 1rem; right: 1rem; background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #6B7280; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 50%; transition: all 0.3s;">
                ×
            </button>
            ${htmlContent}
        </div>
    `;

    document.body.appendChild(modal);

    modal.addEventListener('click', function (e) {
        if (e.target === modal) {
            closeCustomModal();
        }
    });
}

function closeCustomModal() {
    const modal = document.getElementById('custom-storage-modal');
    if (modal) {
        modal.remove();
    }
}

function loadSearchFromHistory(location, category) {
    closeCustomModal();

    const locationInput = document.getElementById('discover-location');
    if (locationInput) {
        locationInput.value = location;
    }

    if (category !== 'all') {
        const categoryFilter = document.getElementById('category-filter');
        if (categoryFilter) {
            categoryFilter.value = category;
        }
    }

    loadDiscoverEvents(location);

    if (typeof Utility !== 'undefined' && Utility.showToast) {
        Utility.showToast(`🔍 Loaded search: ${location}`, 'success');
    }
}

function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);

    let interval = Math.floor(seconds / 31536000);
    if (interval > 1) return interval + ' years ago';
    if (interval === 1) return '1 year ago';

    interval = Math.floor(seconds / 2592000);
    if (interval > 1) return interval + ' months ago';
    if (interval === 1) return '1 month ago';

    interval = Math.floor(seconds / 86400);
    if (interval > 1) return interval + ' days ago';
    if (interval === 1) return '1 day ago';

    interval = Math.floor(seconds / 3600);
    if (interval > 1) return interval + ' hours ago';
    if (interval === 1) return '1 hour ago';

    interval = Math.floor(seconds / 60);
    if (interval > 1) return interval + ' minutes ago';
    if (interval === 1) return '1 minute ago';

    return 'Just now';
}

window.loadSearchFromHistory = loadSearchFromHistory;
window.closeCustomModal = closeCustomModal;