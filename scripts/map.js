let map;
let markers = [];
let infoWindow;
let allEvents = [];
let currentFilter = 'all';
let currentLocation = 'Dallas, TX';
let currentRadius = '10';
let isLoading = false;

async function initMap() {
    const defaultLocation = { lat: 32.7767, lng: -96.7970 };

    map = new google.maps.Map(document.getElementById('map'), {
        center: defaultLocation,
        zoom: 12,
        mapTypeControl: true,
        streetViewControl: true,
        fullscreenControl: true,
        zoomControl: true,
        styles: [
            {
                featureType: "poi",
                elementType: "labels",
                stylers: [{ visibility: "off" }]
            }
        ]
    });

    infoWindow = new google.maps.InfoWindow();

    await loadEventMarkers();

    setupFilters();

    setupSidebarToggle();

    setupSearchButton();

    setupGPSButton();
}

function setupSearchButton() {
    const updateBtn = document.getElementById('update-map-search');
    const locationInput = document.getElementById('map-location');

    if (updateBtn && locationInput) {
        updateBtn.addEventListener('click', async () => {
            const newLocation = locationInput.value.trim();

            if (!newLocation) {
                alert('Please enter a location');
                return;
            }

            if (isLoading) return;

            updateBtn.textContent = '⏳ Searching...';
            updateBtn.disabled = true;

            currentLocation = newLocation;

            await reloadEvents();

            updateBtn.textContent = '🔍 Update Search';
            updateBtn.disabled = false;
        });

        locationInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                updateBtn.click();
            }
        });
    }
}

function setupGPSButton() {
    const gpsBtn = document.getElementById('use-gps-map');
    const locationInput = document.getElementById('map-location');

    if (gpsBtn && locationInput) {
        gpsBtn.addEventListener('click', () => {
            if (!navigator.geolocation) {
                alert('Geolocation is not supported by your browser');
                return;
            }

            if (isLoading) return;

            gpsBtn.textContent = '⏳';
            gpsBtn.disabled = true;

            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const { latitude, longitude } = position.coords;

                    map.setCenter({ lat: latitude, lng: longitude });
                    map.setZoom(12);

                    locationInput.value = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
                    currentLocation = locationInput.value;

                    await reloadEvents();

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
        });
    }
}

function clearMarkers() {
    markers.forEach(marker => marker.setMap(null));
    markers = [];
}

async function reloadEvents() {
    if (isLoading) return;

    clearMarkers();

    const eventList = document.getElementById('map-event-list');
    if (eventList) {
        eventList.innerHTML = '<div class="loading-spinner"></div>';
    }

    try {
        await loadEventMarkers();
        showToast(`Loaded events for ${currentLocation}`, 'success');
    } catch (error) {
        showToast('Failed to load events', 'error');
    }
}

async function loadEventMarkers() {
    if (isLoading) {
        console.log('Already loading, skipping...');
        return;
    }

    isLoading = true;
    const eventList = document.getElementById('map-event-list');

    try {
        console.log(`🔍 Map Page: Searching for events in ${currentLocation}, Radius: ${currentRadius} miles`);

        const response = await API.searchEvents(currentLocation, {
            limit: 100,
            radius: currentRadius,
            sortBy: 'date,asc'
        });

        if (response && response._embedded && response._embedded.events) {
            const apiEvents = response._embedded.events;
            console.log(`✅ Map Page: API returned ${apiEvents.length} events`);

            allEvents = apiEvents.map(event => formatApiEvent(event));

            console.log(`✅ Map Page: Formatted ${allEvents.length} events`);

            if (allEvents.length === 0) {
                if (eventList) {
                    eventList.innerHTML = '<p style="padding: 1rem; text-align: center; color: #6B7280;">No events found for this location. Try a different city or increase the radius.</p>';
                }
                isLoading = false;
                return;
            }
        } else {
            console.log(`❌ Map Page: No events in response`);
            if (eventList) {
                eventList.innerHTML = '<p style="padding: 1rem; text-align: center; color: #6B7280;">No events found for this location. Try a different city or increase the radius.</p>';
            }
            isLoading = false;
            return;
        }

        displayEventList(allEvents);

        console.log(`📍 Map Page: Adding ${allEvents.length} markers to map...`);

        const bounds = new google.maps.LatLngBounds();

        allEvents.forEach((event, index) => {
            addMarker(event);

            const lat = event.lat || 32.7767;
            const lng = event.lng || -96.7970;
            bounds.extend(new google.maps.LatLng(lat, lng));
        });

        console.log(`✅ Map Page: Added ${markers.length} markers to map`);

        if (markers.length > 0) {
            map.fitBounds(bounds);

            const listener = google.maps.event.addListenerOnce(map, 'idle', () => {
                if (map.getZoom() > 15) {
                    map.setZoom(12);
                }
            });
        }

    } catch (error) {
        console.error('❌ Map Page: Error loading event markers:', error);
        if (eventList) {
            eventList.innerHTML = '<p style="padding: 1rem; text-align: center; color: red;">Unable to load events. Please make sure the server is running and try a different location.</p>';
        }
    } finally {
        isLoading = false;
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

    const lat = venue?.location?.latitude ? parseFloat(venue.location.latitude) : 32.7767 + (Math.random() - 0.5) * 0.3;
    const lng = venue?.location?.longitude ? parseFloat(venue.location.longitude) : -96.7970 + (Math.random() - 0.5) * 0.3;

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
        lat: lat,
        lng: lng,
        attendees: Math.floor(Math.random() * 500) + 50
    };
}

function addMarker(event) {
    let lat, lng;

    if (event.lat && event.lng) {
        lat = event.lat;
        lng = event.lng;
    } else {
        const center = map.getCenter();
        lat = center.lat() + (Math.random() - 0.5) * 0.3;
        lng = center.lng() + (Math.random() - 0.5) * 0.3;
    }

    const marker = new google.maps.Marker({
        position: { lat, lng },
        map: map,
        title: event.title,
        animation: google.maps.Animation.DROP,
        icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: getCategoryColor(event.category),
            fillOpacity: 0.9,
            strokeColor: '#ffffff',
            strokeWeight: 2
        }
    });

    marker.eventData = event;
    marker.eventCategory = event.category;

    marker.addListener('click', () => {
        showEventInfoWindow(event, marker);
    });

    markers.push(marker);
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

function getCategoryEmoji(category) {
    const emojis = {
        music: '🎵',
        food: '🍔',
        arts: '🎨',
        sports: '⚽',
        community: '👥'
    };
    return emojis[category] || '📅';
}

function isFavoriteEvent(eventId) {
    const favorites = JSON.parse(localStorage.getItem('favoriteEvents') || '{}');
    return favorites.hasOwnProperty(eventId);
}

function showEventInfoWindow(event, marker) {
    const isFavorite = isFavoriteEvent(event.id);

    const content = `
        <div style="padding: 15px; max-width: 300px; font-family: 'Roboto', sans-serif;">
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                <span style="font-size: 2rem;">${getCategoryEmoji(event.category)}</span>
                <h3 style="margin: 0; color: #1F2937; font-size: 1.25rem;">${event.title}</h3>
            </div>
            <p style="margin: 8px 0; color: #6B7280;">
                <strong>Category:</strong> ${event.category.charAt(0).toUpperCase() + event.category.slice(1)}
            </p>
            <p style="margin: 8px 0; color: #6B7280;">
                <strong>📅 Date:</strong> ${event.date}
            </p>
            <p style="margin: 8px 0; color: #6B7280;">
                <strong>🕐 Time:</strong> ${event.time}
            </p>
            <p style="margin: 8px 0; color: #6B7280;">
                <strong>📍 Location:</strong> ${event.location}
            </p>
            <p style="margin: 8px 0; color: #6B7280;">
                <strong>🏢 Venue:</strong> ${event.venue}
            </p>
            <p style="margin: 8px 0; color: #6B7280;">
                <strong>💵 Price:</strong> ${event.price}
            </p>
            <p style="margin: 10px 0; color: #374151; line-height: 1.5; font-size: 0.9rem;">
                ${event.description.substring(0, 150)}${event.description.length > 150 ? '...' : ''}
            </p>
            <div style="display: flex; gap: 8px; margin-top: 12px;">
                <button onclick="toggleMapFavorite('${event.id}')" 
                        id="map-fav-btn-${event.id}"
                        style="flex: 1; padding: 10px; background: ${isFavorite ? 'linear-gradient(135deg, #EF4444, #FCA5A5)' : 'rgba(59, 130, 246, 0.1)'}; 
                               color: ${isFavorite ? 'white' : '#3B82F6'}; border: ${isFavorite ? 'none' : '2px solid #3B82F6'}; border-radius: 8px; cursor: pointer; font-weight: 600; 
                               transition: all 0.3s ease; font-size: 1.2rem;">
                    ${isFavorite ? '❤️' : '🤍'}
                </button>
                <button onclick="getEventTickets('${event.id}')" 
                        style="flex: 3; padding: 10px 20px; background: linear-gradient(135deg, #3B82F6, #40E0D0); 
                               color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; 
                               transition: all 0.3s ease;">
                    🎫 Get Tickets
                </button>
            </div>
        </div>
    `;

    infoWindow.setContent(content);
    infoWindow.open(map, marker);

    map.panTo(marker.getPosition());
    map.setZoom(14);
}

function toggleMapFavorite(eventId) {
    let favorites = JSON.parse(localStorage.getItem('favoriteEvents') || '{}');
    const event = allEvents.find(e => e.id === eventId);

    if (!event) {
        console.error('Event not found:', eventId);
        return;
    }

    if (favorites.hasOwnProperty(eventId)) {
        // Remove from favorites
        delete favorites[eventId];
        showToast('Removed from favorites', 'info');
    } else {
        // Add to favorites with full event data
        favorites[eventId] = event;
        showToast('Added to favorites!', 'success');
    }

    localStorage.setItem('favoriteEvents', JSON.stringify(favorites));

    const isFavorite = favorites.hasOwnProperty(eventId);

    // Update button in info window
    const button = document.getElementById(`map-fav-btn-${eventId}`);
    if (button) {
        if (isFavorite) {
            button.style.background = 'linear-gradient(135deg, #EF4444, #FCA5A5)';
            button.style.color = 'white';
            button.style.border = 'none';
            button.innerHTML = '❤️';
        } else {
            button.style.background = 'rgba(59, 130, 246, 0.1)';
            button.style.color = '#3B82F6';
            button.style.border = '2px solid #3B82F6';
            button.innerHTML = '🤍';
        }
    }

    updateFavoritesCount();
}

function getEventTickets(eventId) {
    const event = allEvents.find(e => e.id === eventId);
    if (!event) return;

    if (event.url) {
        window.open(event.url, '_blank');
        showToast('Opening Ticketmaster...', 'info');
        return;
    }

    const searchQuery = encodeURIComponent(`${event.title} ${event.location} tickets`);
    const ticketmasterSearchUrl = `https://www.ticketmaster.com/search?q=${searchQuery}`;

    window.open(ticketmasterSearchUrl, '_blank');

    showToast('Opening ticket purchase page...', 'info');
}

function displayEventList(events) {
    const eventList = document.getElementById('map-event-list');
    if (!eventList) return;

    if (events.length === 0) {
        eventList.innerHTML = '<p style="padding: 1rem; text-align: center; color: #6B7280;">No events found</p>';
        return;
    }

    eventList.innerHTML = events.map(event => `
        <div class="event-list-item" data-event-id="${event.id}" onclick="focusMarker('${event.id}')">
            <div class="event-list-icon">${getCategoryEmoji(event.category)}</div>
            <div class="event-list-content">
                <h4>${event.title}</h4>
                <p class="event-list-date">📅 ${event.date}</p>
                <p class="event-list-location">📍 ${event.location}</p>
                <p class="event-list-price">💵 ${event.price}</p>
            </div>
        </div>
    `).join('');
}

function focusMarker(eventId) {
    const marker = markers.find(m => m.eventData.id === eventId);
    if (marker) {
        map.panTo(marker.getPosition());
        map.setZoom(14);
        showEventInfoWindow(marker.eventData, marker);

        marker.setAnimation(google.maps.Animation.BOUNCE);
        setTimeout(() => marker.setAnimation(null), 1500);
    }
}

function setupFilters() {
    const categoryFilter = document.getElementById('map-category');
    const radiusFilter = document.getElementById('map-radius');

    if (categoryFilter) {
        categoryFilter.addEventListener('change', (e) => {
            currentFilter = e.target.value;
            filterMarkers(currentFilter);
        });
    }

    if (radiusFilter) {
        radiusFilter.addEventListener('change', async (e) => {
            const newRadius = e.target.value;
            currentRadius = newRadius;

            console.log('Radius changed to:', newRadius);

            if (isLoading) return;

            radiusFilter.disabled = true;

            await reloadEvents();

            showToast(`Showing events within ${newRadius} miles`, 'success');

            radiusFilter.disabled = false;
        });
    }
}

function filterMarkers(category) {
    let filteredEvents = allEvents;

    if (category !== 'all') {
        filteredEvents = allEvents.filter(event => event.category === category);
    }

    markers.forEach(marker => {
        if (category === 'all' || marker.eventCategory === category) {
            marker.setVisible(true);
        } else {
            marker.setVisible(false);
        }
    });

    displayEventList(filteredEvents);

    if (filteredEvents.length > 0) {
        const bounds = new google.maps.LatLngBounds();
        markers.forEach(marker => {
            if (marker.getVisible()) {
                bounds.extend(marker.getPosition());
            }
        });
        map.fitBounds(bounds);
    }

    showToast(`Showing ${filteredEvents.length} ${category === 'all' ? '' : category} events`, 'info');
}

function setupSidebarToggle() {
    const toggleBtn = document.getElementById('toggle-sidebar');
    const closeBtn = document.getElementById('close-sidebar');
    const sidebar = document.getElementById('map-sidebar');

    if (toggleBtn && sidebar) {
        toggleBtn.addEventListener('click', () => {
            sidebar.classList.add('show');
        });
    }

    if (closeBtn && sidebar) {
        closeBtn.addEventListener('click', () => {
            sidebar.classList.remove('show');
        });
    }

    document.addEventListener('click', (e) => {
        if (sidebar && sidebar.classList.contains('show')) {
            if (!sidebar.contains(e.target) && !toggleBtn.contains(e.target)) {
                sidebar.classList.remove('show');
            }
        }
    });
}


function updateFavoritesCount() {
    const countElement = document.getElementById('favorites-count');
    if (countElement) {
        const favorites = JSON.parse(localStorage.getItem('favoriteEvents') || '{}');
        const count = Object.keys(favorites).length;
        countElement.textContent = `${count} saved events`;
    }
}

function showToast(message, type) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;

    const bgColor = type === 'success' ? '#10B981' : type === 'error' ? '#EF4444' : '#3B82F6';

    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        background: ${bgColor};
        color: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        z-index: 10000;
        animation: slideIn 0.3s ease;
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            if (document.body.contains(toast)) {
                document.body.removeChild(toast);
            }
        }, 300);
    }, 3000);
}

function viewEventDetails(eventId) {
    const event = allEvents.find(e => e.id === eventId);
    if (event) {
        alert(`Event Details for: ${event.title}\n\nThis would open a detailed view or redirect to event page.`);
    }
}

const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

window.initMap = initMap;
window.focusMarker = focusMarker;
window.viewEventDetails = viewEventDetails;
window.toggleMapFavorite = toggleMapFavorite;
window.getEventTickets = getEventTickets;