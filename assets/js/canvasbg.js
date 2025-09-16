document.addEventListener('DOMContentLoaded', () => {
    // Klasa Dot
    class Dot {
        constructor(posX, posY, canvas) {
            this.posX = posX;
            this.posY = posY;
            this.velX = (Math.random() - 0.5) * 0.5;
            this.velY = (Math.random() - 0.5) * 0.5;
            this.dotSize = 3;
            this.canvas = canvas; // Ruaj referencën e kanvasit
        }

        update() {
            this.posX += this.velX;
            this.posY += this.velY;

            // Kufizo lëvizjen brenda kanvasit
            if (this.posX < 0 || this.posX > this.canvas.width) this.velX *= -1;
            if (this.posY < 0 || this.posY > this.canvas.height) this.velY *= -1;
        }

        draw(ctx) {
            ctx.beginPath();
            ctx.arc(this.posX, this.posY, this.dotSize, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff';
            ctx.fill();
        }
    }

    // Klasa Line
    class Line {
        constructor(dot1, dot2) {
            this.dot1 = dot1;
            this.dot2 = dot2;
        }

        draw(ctx) {
            ctx.beginPath();
            ctx.moveTo(this.dot1.posX, this.dot1.posY);
            ctx.lineTo(this.dot2.posX, this.dot2.posY);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.lineWidth = 0.8;
            ctx.stroke();
        }
    }

    // Funksion për të inicializuar dhe menaxhuar një kanvas
    function initCanvas(container, canvas) {
        const ctx = canvas.getContext('2d');

        // Përshtat madhësinë e kanvasit me kontejnerin
        function resizeCanvas() {
            canvas.width = container.offsetWidth;
            canvas.height = container.offsetHeight;
        }
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        // Variablat për pozicionin e pointer-it
        const pointer = {
            x: canvas.width / 2,
            y: canvas.height / 2,
        };

        // Përditëso pozicionin e pointer-it me lëvizjen e miut
        container.addEventListener('mousemove', (event) => {
            const rect = canvas.getBoundingClientRect();
            pointer.x = event.clientX - rect.left;
            pointer.y = event.clientY - rect.top;
        });

        // Krijo pikat
        const dots = [];
        const dotCount = Math.min(50, Math.floor(canvas.width * canvas.height / 5000)); // Numër dinamik pikash
        for (let i = 0; i < dotCount; i++) {
            const xPos = Math.random() * canvas.width;
            const yPos = Math.random() * canvas.height;
            dots.push(new Dot(xPos, yPos, canvas));
        }

        // Cikli i animacionit për këtë kanvas
        function render() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            dots.forEach((dot) => {
                dot.update();
                dot.draw(ctx);

                // Vizato linjat me pikat e tjera
                dots.forEach((otherDot) => {
                    const dist = Math.hypot(dot.posX - otherDot.posX, dot.posY - otherDot.posY);
                    if (dist < 100) {
                        new Line(dot, otherDot).draw(ctx);
                    }
                });

                // Vizato linjat me pointer-in
                const distToPointer = Math.hypot(dot.posX - pointer.x, dot.posY - pointer.y);
                if (distToPointer < 150) {
                    new Line(dot, { posX: pointer.x, posY: pointer.y }).draw(ctx);
                }
            });

            requestAnimationFrame(render);
        }

        // Nis animacionin
        render();
    }

    // Inicializo kanvasin për header-in e leksioneve
    const lectureHeader = document.querySelector('#main header');
    const lectureCanvas = document.getElementById('spectral-lecture-canvas');
    if (lectureHeader && lectureCanvas) {
        initCanvas(lectureHeader, lectureCanvas);
    }

    // Inicializo kanvasët për çdo lesson-block
    const lessonBlocks = document.querySelectorAll('.lesson-block');
    lessonBlocks.forEach((block) => {
        const canvas = block.querySelector('.spectral-lesson-canvas');
        if (canvas) {
            initCanvas(block, canvas);
        }
    });
});