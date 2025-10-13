const spotlightContainer = document.getElementById('spotlight-container');

async function loadProjects() {
    try {
        spotlightContainer.innerHTML = '<p class="loading">Loading featured events...</p>';

        const response = await fetch('data/projects.json');
        const data = await response.json();
        const projects = data.projects;

        const spotlightProjects = getRandomSubset(projects, 3);
        displayProjects(spotlightProjects);

    } catch (error) {
        console.error('Error loading projects:', error);
        spotlightContainer.innerHTML = '<p>Unable to load featured events. Please try again later.</p>';
    }
}

function displayProjects(projects) {
    spotlightContainer.innerHTML = '';

    projects.forEach(project => {
        const projectCard = createProjectCard(project);
        spotlightContainer.appendChild(projectCard);
    });
}

function createProjectCard(project) {
    const card = document.createElement('div');
    card.className = 'card';

    const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
    const isFavorite = favorites.includes(project.title);

    card.innerHTML = `
        <div class="card-image">
            <img src="${project.image}" 
                 alt="${project.alt}" 
                 width="300" 
                 height="200"
                 loading="lazy"
                 style="aspect-ratio: 3/2; object-fit: cover;">
        </div>
        <div class="card-content">
            <h2>${project.title}</h2>
            <p><strong>Category:</strong> ${project.category || 'Event'}</p>
            <p><strong>Price:</strong> ${project.price}</p>
            <p><strong>Date:</strong> ${project.timeline}</p>
            <p>${project.description}</p>
            <div class="card-actions" style="display: flex; justify-content: space-between; align-items: center; margin-top: 1rem;">
                <button class="favorite-btn ${isFavorite ? 'active' : ''}" 
                        data-event="${project.title}"
                        aria-label="Add to favorites"
                        style="background: none; border: none; font-size: 1.5rem; cursor: pointer;">
                    ${isFavorite ? '❤️' : '🤍'}
                </button>
                <button class="btn-primary" onclick="learnMore('${project.title}')">View Details</button>
            </div>
        </div>
    `;

    const favoriteBtn = card.querySelector('.favorite-btn');
    favoriteBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        toggleFavorite(project.title, this);
    });

    return card;
}

function toggleFavorite(eventTitle, button) {
    let favorites = JSON.parse(localStorage.getItem('favorites') || '[]');

    if (favorites.includes(eventTitle)) {
        favorites = favorites.filter(fav => fav !== eventTitle);
        button.textContent = '🤍';
        button.classList.remove('active');
    } else {
        favorites.push(eventTitle);
        button.textContent = '❤️';
        button.classList.add('active');
    }

    localStorage.setItem('favorites', JSON.stringify(favorites));

    updateFavoritesCount();
}

function updateFavoritesCount() {
    const countElement = document.getElementById('favorites-count');
    if (countElement) {
        const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
        countElement.textContent = `${favorites.length} saved events`;
    }
}

function getRandomSubset(array, count) {
    const shuffled = [...array].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
}

function learnMore(projectTitle) {
    alert(`Thank you for your interest in "${projectTitle}"! Click "View all Events" to see more details.`);
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