const seeMoreButtons = document.querySelectorAll('.seemore');

seeMoreButtons.forEach(button => {
    button.addEventListener('click', function() {

        const developerCard = button.closest('.developer-card');
        const paragraph = developerCard.querySelector('.paragraph');
        
        if (paragraph.style.display === 'none' || paragraph.style.display === '') {
            paragraph.style.display = 'block';
            button.textContent = 'Mbyll';
        } else {
            paragraph.style.display = 'none';
            button.textContent = 'Mëso më shumë';
        }
    });
});