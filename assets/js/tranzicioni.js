document.addEventListener("DOMContentLoaded", function () {
    // Hiq klasën is-preload për të lejuar tranzicionet
    document.body.classList.remove("is-preload");

    // Merr të gjithë elementët .content brenda .spotlight
    const contents = document.querySelectorAll(".spotlight .content");

    // Kontrollo nëse IntersectionObserver mbështetet
    if ("IntersectionObserver" in window) {
        // Krijo Intersection Observer
        const observer = new IntersectionObserver(
            (entries, observer) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        // Shto klasën 'visible' kur elementi hyn në viewport
                        entry.target.classList.add("visible");
                        // Ndal vëzhgimin pas animacionit të parë
                        observer.unobserve(entry.target);
                    }
                });
            },
            {
                threshold: 0.5 // Aktivizo kur 50% e elementit është në ekran
            }
        );

        // Vëzhgo çdo element .content
        contents.forEach((content) => {
            observer.observe(content);
        });
    } else {
        // Fallback: Shto klasën "visible" menjëherë nëse IntersectionObserver nuk mbështetet
        contents.forEach((content) => {
            content.classList.add("visible");
        });
    }
});