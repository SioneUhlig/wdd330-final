const navbutton = document.querySelector('#ham-btn');
const navlinks = document.querySelector('#nav-bar');

const filterBtns = document.querySelectorAll('.filter-btn');
const courseCards = document.querySelectorAll('.course-card');
const totalCreditsSpan = document.getElementById('total-credits');

const courseModal = document.getElementById('courseModal');
const modalContent = document.getElementById('modalContent');


navbutton.addEventListener('click', () => {
    navbutton.classList.toggle('show');
    navlinks.classList.toggle('show');
});

filterBtns.forEach(btn => {
    btn.addEventListener('click', function () {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const filter = btn.getAttribute('data-filter');
        let visibleCredits = 0;

        courseCards.forEach(card => {
            const category = card.getAttribute('data-category');
            const credits = parseInt(card.getAttribute('data-credits'));

            if (filter === 'all' || category === filter) {
                card.style.display = 'block';
                visibleCredits += credits;
            } else {
                card.style.display = 'none';
            }
        });

        totalCreditsSpan.textContent = visibleCredits;
    });
});