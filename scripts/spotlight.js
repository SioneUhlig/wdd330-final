const spotlightContainer = document.getElementById('spotlight-container');

async function loadProjects() {
    try {
        spotlightContainer.innerHTML = '<p class="loading">Loading featured projects...</p>';

        const response = await fetch('data/projects.json');
        const data = await response.json();
        const projects = data.projects;

        const spotlightProjects = getRandomSubset(projects, 3);
        displayProjects(spotlightProjects);

    } catch (error) {
        console.error('Error loading projects:', error);
        spotlightContainer.innerHTML = '<p>Unable to load featured projects. Please try again later.</p>';
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
            <p><strong>Price:</strong> ${project.price}</p>
            <p><strong>Timeline:</strong> ${project.timeline}</p>
            <p>${project.description}</p>
            <button class="btn-primary" onclick="learnMore('${project.title}')">Show Interest</button>
        </div>
    `;

    return card;
}

function getRandomSubset(array, count) {
    const shuffled = [...array].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
}

function learnMore(projectTitle) {
    alert(`Thank you for your interest in the "${projectTitle}" project! Please reach out to learn more.`);
}

document.addEventListener('DOMContentLoaded', loadProjects);