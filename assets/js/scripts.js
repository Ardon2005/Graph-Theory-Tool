document.addEventListener('DOMContentLoaded', () => {
    // Create canvas dynamically instead of requiring an HTML element
    const bgCanvas = document.createElement('canvas');
    bgCanvas.id = 'bgGraphCanvas';
    document.body.insertBefore(bgCanvas, document.body.firstChild); // Add as first child
    const bgCtx = bgCanvas.getContext('2d');

    // Style canvas to act as background
    bgCanvas.style.position = 'fixed';
    bgCanvas.style.top = '0';
    bgCanvas.style.left = '0';
    bgCanvas.style.width = '100%';
    bgCanvas.style.height = '100%';
    bgCanvas.style.zIndex = '-1'; // Put behind content
    bgCanvas.width = window.innerWidth;
    bgCanvas.height = window.innerHeight;

    // Resize canvas when window is resized
    window.addEventListener('resize', () => {
        bgCanvas.width = window.innerWidth;
        bgCanvas.height = window.innerHeight;
    });

    // Variables for pointer position
    const pointer = {
        x: bgCanvas.width / 2,
        y: bgCanvas.height / 2,
    };

    // Update pointer position on mousemove
    bgCanvas.addEventListener('mousemove', (event) => {
        pointer.x = event.clientX;
        pointer.y = event.clientY;
    });

    // Dot class
    class Dot {
        constructor(posX, posY) {
            this.posX = posX;
            this.posY = posY;
            this.velX = (Math.random() - 0.5) * 0.5; // Slower velocity
            this.velY = (Math.random() - 0.5) * 0.5;
            this.dotSize = 3; // Bigger dots
        }

        // Update dot position
        update() {
            this.posX += this.velX;
            this.posY += this.velY;

            // Bounce off walls
            if (this.posX < 0 || this.posX > bgCanvas.width) this.velX *= -1;
            if (this.posY < 0 || this.posY > bgCanvas.height) this.velY *= -1;
        }

        // Draw dot
        draw() {
            bgCtx.beginPath();
            bgCtx.arc(this.posX, this.posY, this.dotSize, 0, Math.PI * 2);
            bgCtx.fillStyle = '#ffffff';
            bgCtx.fill();
        }
    }

    // Line class (for connecting dots)
    class Line {
        constructor(dot1, dot2) {
            this.dot1 = dot1;
            this.dot2 = dot2;
        }

        // Draw line
        draw() {
            bgCtx.beginPath();
            bgCtx.moveTo(this.dot1.posX, this.dot1.posY);
            bgCtx.lineTo(this.dot2.posX, this.dot2.posY);
            bgCtx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
            bgCtx.lineWidth = 0.8;
            bgCtx.stroke();
        }
    }

    // Create dots
    const dots = [];
    for (let i = 0; i < 100; i++) {
        const xPos = Math.random() * bgCanvas.width;
        const yPos = Math.random() * bgCanvas.height;
        dots.push(new Dot(xPos, yPos));
    }

    // Animation loop
    function render() {
        bgCtx.clearRect(0, 0, bgCanvas.width, bgCanvas.height);

        // Update and draw dots
        dots.forEach((dot) => {
            dot.update();
            dot.draw();

            // Draw lines to nearby dots or pointer
            dots.forEach((otherDot) => {
                const dist = Math.hypot(dot.posX - otherDot.posX, dot.posY - otherDot.posY);
                if (dist < 150) { // Increased connection range
                    new Line(dot, otherDot).draw();
                }
            });

            // Draw lines to pointer
            const distToPointer = Math.hypot(dot.posX - pointer.x, dot.posY - pointer.y);
            if (distToPointer < 200) { // Increased pointer connection range
                new Line(dot, { posX: pointer.x, posY: pointer.y }).draw();
            }
        });

        requestAnimationFrame(render);
    }

    // Start animation
    render();
});