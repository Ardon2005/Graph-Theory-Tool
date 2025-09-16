document.addEventListener("DOMContentLoaded", function() {
    const items = document.querySelectorAll(".features li");

    function checkScroll() {
        for (let i = 0; i < items.length; i += 2) {
            const item1 = items[i];
            const item2 = items[i + 1]; // Elementi i dytë në çift

            const rect1 = item1.getBoundingClientRect();
            const isVisible1 = rect1.top < window.innerHeight && rect1.bottom >= 0;

            if (isVisible1) {
                item1.classList.add("visible");
                if (item2) { // Kontrollojmë nëse ekziston elementi i dytë
                    item2.classList.add("visible");
                }
            }
        }
    }

    // Kontrollo scroll-in dhe shfaq elementet
    window.addEventListener("scroll", checkScroll);
    checkScroll(); // Kontrollo fillimisht nëse disa elemente janë tashmë në pamje
});