
document.addEventListener('DOMContentLoaded', function () {
    loadProjectsContent();
    handleVisitorMessage();
    initializeModal();
    addFilterFunctionality();
});

let projectsData = [];

async function loadProjectsContent() {
    try {
        const response = await fetch('data/projects.json');
        const data = await response.json();
        projectsData = data.projects;
        displayProjects(data.projects);

        localStorage.setItem('projectsCache', JSON.stringify(data.projects));
        localStorage.setItem('projectsCacheTime', Date.now().toString());

    } catch (error) {
        console.error('Error loading projects:', error);
        const cached = localStorage.getItem('projectsCache');
        if (cached) {
            projectsData = JSON.parse(cached);
            displayProjects(projectsData);
        }
    }
}

function displayProjects(projects) {
    const container = document.getElementById('discover-container');
    if (!container) return;

    container.innerHTML = '';

    projects.forEach((project, index) => {
        const projectCard = createProjectCard(project, index);
        container.appendChild(projectCard);
    });


    updateProjectCount();
}

function createProjectCard(project, index = 0) {
    const card = document.createElement('div');
    card.className = 'card';
    card.setAttribute('data-category', project.category);

    const imageUrl = project.image ||
        `https://via.placeholder.com/300x200/4a90e2/ffffff?text=${encodeURIComponent(project.title)}`;

    card.innerHTML = `
        <figure class="card-image">
            <img src="${imageUrl}" 
                 alt="${project.alt || project.title}" 
                 loading="lazy" 
                 width="300" 
                 height="200">
        </figure>
        <div class="card-content">
            <h2>${project.title}</h2>
            <p class="price"><strong>Price:</strong> ${project.price}</p>
            <p class="timeline"><strong>Timeline:</strong> ${project.timeline}</p>
            <p class="description">${project.description}</p>
            <div class="card-actions">
                <button class="btn-primary" onclick="learnMore('${project.title}')" 
                        aria-label="Learn more about ${project.title}">
                    Show Interest
                </button>
            </div>
        </div>
    `;

    return card;
}

function handleVisitorMessage() {
    const messageElement = document.getElementById('visitor-message');
    if (!messageElement) return;

    const now = Date.now();
    const lastVisit = localStorage.getItem('lastVisit');
    const visitCount = parseInt(localStorage.getItem('visitCount') || '0') + 1;

    localStorage.setItem('visitCount', visitCount.toString());
    localStorage.setItem('lastVisit', now.toString());

    const visitHistory = JSON.parse(localStorage.getItem('visitHistory') || '[]');
    visitHistory.push(now);
    localStorage.setItem('visitHistory', JSON.stringify(visitHistory));

    let message = '';
    if (!lastVisit) {
        message = 'Welcome! Let us know if you have any questions.';
        localStorage.setItem('firstVisit', now.toString());
    } else {
        const daysDifference = Math.floor((now - parseInt(lastVisit)) / (1000 * 60 * 60 * 24));

        if (daysDifference === 0) {
            message = `Back so soon! Awesome! Visit #${visitCount}`;
        } else if (daysDifference === 1) {
            message = `You last visited 1 day ago. Welcome back!`;
        } else {
            message = `You last visited ${daysDifference} days ago. Visit #${visitCount}`;
        }
    }

    messageElement.innerHTML = `
        <div class="visitor-welcome ${visitCount > 1 ? 'returning-visitor' : 'new-visitor'}">
            <p>${message}</p>
            ${visitCount > 5 ? `<p class="loyal-customer">Thanks for being a loyal visitor!</p>` : ''}
        </div>
    `;
}

function learnMore(projectTitle) {
    const project = projectsData.find(p => p.title === projectTitle);
    if (project) {
        const modalContent = `
            <h2 id="modalTitle">${project.title}</h2>
            <button class="close" aria-label="Close project details dialog">&times;</button>
            <div class="modal-body">
                <img id="modalImage" src="${project.image}" alt="${project.alt || project.title}">
                <div class="project-details">
                    <p id="modalPrice"><strong>Price:</strong> ${project.price}</p>
                    <p id="modalTimeline"><strong>Timeline:</strong> ${project.timeline}</p>
                    <p id="modalDescription">${project.description}</p>
                    <p class="category-badge">
                        <strong>Category:</strong> 
                        <span class="badge badge-${project.category}">
                            ${project.category.charAt(0).toUpperCase() + project.category.slice(1)}
                        </span>
                    </p>
                </div>
            </div>
        `;

        const modalContentElement = document.getElementById('modalContent');
        if (modalContentElement) {
            modalContentElement.innerHTML = modalContent;
        }

        const modal = document.getElementById('projectModal');
        if (modal) {
            modal.style.display = 'block';
            modal.setAttribute('aria-hidden', 'false');

            setTimeout(() => {
                const modalTitle = document.getElementById('modalTitle');
                if (modalTitle) {
                    modalTitle.focus();
                }
            }, 100);
        }

        const modalViews = JSON.parse(localStorage.getItem('modalViews') || '{}');
        modalViews[projectTitle] = (modalViews[projectTitle] || 0) + 1;
        localStorage.setItem('modalViews', JSON.stringify(modalViews));
    }
}

function addFilterFunctionality() {
    const container = document.getElementById('discover-container');
    if (container && !document.querySelector('.filter-controls')) {
        const filterHTML = `
            <div class="filter-controls">
                <h2>Local Events</h2>
                <div class="filter-buttons">
                    <button class="filter-btn active" data-filter="all">All Events</button>
                    <button class="filter-btn" data-filter="furniture">Music</button>
                    <button class="filter-btn" data-filter="kitchen">Food</button>
                    <button class="filter-btn" data-filter="storage">Art</button>
                    <button class="filter-btn" data-filter="decorative">History</button>
                </div>
                <div id="project-count"></div>
            </div>
        `;
        container.insertAdjacentHTML('beforebegin', filterHTML);

        const filterBtns = document.querySelectorAll('.filter-btn');
        filterBtns.forEach(btn => {
            btn.addEventListener('click', function () {
                filterBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                const filter = btn.getAttribute('data-filter');
                filterProjects(filter);
            });
        });
    }
}

function filterProjects(category = 'all') {
    const cards = Array.from(document.querySelectorAll('.card'));

    const visibleCards = cards.filter(card => {
        const cardCategory = card.getAttribute('data-category');
        return category === 'all' || cardCategory === category;
    });
    cards.forEach(card => {
        card.style.transform = 'scale(0.8)';
        card.style.opacity = '0';
        setTimeout(() => {
            card.style.display = 'none';
        }, 200);
    });

    setTimeout(() => {
        visibleCards.forEach((card, index) => {
            card.style.display = 'block';
            setTimeout(() => {
                card.style.transform = 'scale(1)';
                card.style.opacity = '1';
            }, index * 50);
        });

        updateProjectCount(visibleCards.length, cards.length);
    }, 250);
}

function updateProjectCount(visible = null, total = null) {
    const countElement = document.getElementById('project-count');
    if (countElement) {
        if (visible === null) {
            const cards = document.querySelectorAll('.card');
            visible = cards.length;
            total = cards.length;
        }

        if (visible === total) {
            countElement.innerHTML = `Showing all ${total} projects`;
        } else {
            countElement.innerHTML = `Showing ${visible} of ${total} projects`;
        }
    }
}

function initializeModal() {
    const modal = document.getElementById('projectModal');

    if (modal) {
        modal.addEventListener('click', function (e) {
            if (e.target.classList.contains('close')) {
                modal.style.display = 'none';
                modal.setAttribute('aria-hidden', 'true');
            }
        });

        window.addEventListener('click', function (event) {
            if (event.target === modal) {
                modal.style.display = 'none';
                modal.setAttribute('aria-hidden', 'true');
            }
        });

        document.addEventListener('keydown', function (event) {
            if (event.key === 'Escape' && modal.style.display === 'block') {
                modal.style.display = 'none';
                modal.setAttribute('aria-hidden', 'true');
            }
        });
    }
}

window.learnMore = learnMore;