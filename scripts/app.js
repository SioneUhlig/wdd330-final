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

        const events = DataManager.generateMockEvents();

        events.forEach(event => {
            event.distance = Math.floor(Math.random() * 100) + 1;
        });

        displayEvents(events, container);

        updateEventCount(events.length);

    } catch (error) {
        console.error('Error loading events:', error);
        container.innerHTML = '<p>Error loading events. Please try again.</p>';
    }
}

function displayEvents(events, container) {
    if (events.length === 0) {
        container.innerHTML = '<p style="text-align: center; padding: 2rem;">No events found.</p>';
        return;
    }

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
    const isFavorite = DataManager.isFavorite(event.id);
    const distance = event.distance ? `${event.distance} miles away` : '';

    return `
        <div class="event-card" data-event-id="${event.id}">
            <img src="${event.image}" alt="${event.title}" class="event-card-image">
            <div class="event-card-content">
                <span class="event-category" style="background: ${getCategoryColor(event.category)}">
                    ${event.category}
                </span>
                <h3>${event.title}</h3>
                <p class="event-date">📅 ${event.date} at ${event.time}</p>
                <p class="event-location">📍 ${event.location}</p>
                ${distance ? `<p class="event-distance">🚗 ${distance}</p>` : ''}
                <p class="event-price">💵 ${event.price}</p>
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

function toggleFavorite(eventId, button) {
    DataManager.toggleFavorite(eventId);
    const isFavorite = DataManager.isFavorite(eventId);

    button.textContent = isFavorite ? '❤️' : '🤍';
    button.classList.toggle('active', isFavorite);

    updateFavoritesCount();
    if (typeof Utility !== 'undefined' && Utility.showToast) {
        Utility.showToast(
            isFavorite ? 'Added to favorites!' : 'Removed from favorites',
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

function showEventModal(eventId) {
    const event = DataManager.getEventById(eventId);
    if (!event) return;

    const modal = document.getElementById('event-modal');
    const modalContent = document.getElementById('event-detail-content');

    if (modal && modalContent) {
        const isFavorite = DataManager.isFavorite(eventId);
        const distance = event.distance ? `<p><strong>🚗 Distance:</strong> ${event.distance} miles away</p>` : '';

        modalContent.innerHTML = `
            <div style="padding: 2rem;">
                <h2 style="color: #1F2937; margin-bottom: 1rem;">${event.title}</h2>
                <img src="${event.image}" alt="${event.title}" style="width: 100%; border-radius: 12px; margin-bottom: 1.5rem;">
                
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
                    <button class="btn-primary" style="flex: 1; min-width: 150px;">
                        Get Tickets
                    </button>
                </div>
            </div>
        `;

        modal.style.display = 'block';

        DataManager.trackEventView(eventId);
    }
}

function toggleFavoriteFromModal(eventId) {
    DataManager.toggleFavorite(eventId);
    const isFavorite = DataManager.isFavorite(eventId);

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

    let events = DataManager.generateMockEvents();

    events.forEach(event => {
        if (!event.distance) {
            event.distance = Math.floor(Math.random() * 100) + 1;
        }
    });

    if (category !== 'all') {
        events = events.filter(e => e.category === category);
    }

    if (price === 'free') {
        events = events.filter(e => e.price === 'Free');
    } else if (price === 'paid') {
        events = events.filter(e => e.price !== 'Free');
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

function loadFavorites() {
    const container = document.getElementById('favorites-container');
    if (!container) return;

    const favorites = DataManager.getFavorites();

    if (favorites.length === 0) {
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
    } else {
        displayEvents(favorites, container);
        const shareSection = document.getElementById('share-section');
        if (shareSection) {
            shareSection.style.display = 'block';
        }
    }

    updateFavoritesCount();
}

function filterFavorites(tab) {
    const favorites = DataManager.getFavorites();
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
            const message = document.getElementById('share-message')?.value || '';
            const favorites = DataManager.getFavorites();

            if (favorites.length === 0) {
                alert('You need to have some favorite events to share!');
                return;
            }

            const shareId = Features.generateShareableList(favorites, message);
            const shareUrl = `${window.location.origin}${window.location.pathname}?share=${shareId}`;

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
                Utility.copyToClipboard(shareUrlInput.value);
            }
        });
    }
}

function handleSearch() {
    const locationInput = document.getElementById('location-search');
    const location = locationInput?.value || 'Dallas, TX';
    const activeFilter = document.querySelector('.filter-chip.active');
    const category = activeFilter?.dataset.category || 'all';

    if (typeof DataManager !== 'undefined') {
        DataManager.saveSearchHistory({ location, category, date: new Date().toISOString() });
    }

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