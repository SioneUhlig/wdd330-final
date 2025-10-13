let map;
let markers = [];
let infoWindow;
let allEvents = [];
let currentFilter = 'all';

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
}

async function loadEventMarkers() {
    try {
        allEvents = DataManager.generateMockEvents();

        displayEventList(allEvents);

        allEvents.forEach(event => {
            addMarker(event);
        });

    } catch (error) {
        console.error('Error loading event markers:', error);
        const eventList = document.getElementById('map-event-list');
        if (eventList) {
            eventList.innerHTML = '<p style="padding: 1rem; text-align: center;">Error loading events</p>';
        }
    }
}

function addMarker(event) {
    const lat = 32.7767 + (Math.random() - 0.5) * 0.3;
    const lng = -96.7970 + (Math.random() - 0.5) * 0.3;

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

function showEventInfoWindow(event, marker) {
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
                <strong>💵 Price:</strong> ${event.price}
            </p>
            <p style="margin: 10px 0; color: #374151; line-height: 1.5;">
                ${event.description}
            </p>
            <button onclick="viewEventDetails('${event.id}')" 
                    style="margin-top: 12px; padding: 10px 20px; background: linear-gradient(135deg, #3B82F6, #40E0D0); 
                           color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; 
                           width: 100%; transition: all 0.3s ease;">
                View Full Details
            </button>
        </div>
    `;

    infoWindow.setContent(content);
    infoWindow.open(map, marker);

    map.panTo(marker.getPosition());
    map.setZoom(14);
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
        radiusFilter.addEventListener('change', (e) => {
            console.log('Radius changed to:', e.target.value);
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
}

function setupSidebarToggle() {
    const toggleBtn = document.getElementById('toggle-sidebar');
    const sidebar = document.querySelector('.map-sidebar');

    if (toggleBtn && sidebar) {
        toggleBtn.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
        });
    }
}

function viewEventDetails(eventId) {
    const event = allEvents.find(e => e.id === eventId);
    if (event) {
        alert(`Event Details for: ${event.title}\n\nThis would open a detailed view or redirect to event page.`);

    }
}

window.initMap = initMap;
window.focusMarker = focusMarker;
window.viewEventDetails = viewEventDetails;