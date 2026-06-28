/**
 * ===============================================================================================
 * ===================================== BLUEPRINT TECH ENGINE ===================================
 * ===============================================================================================
 */
class BlueprintTechEngine {
    constructor() {
        this.container = null;
        this.canvas = null;
        this.ctx = null;
        this.running = false;
        this.animationId = null;
        this.mouse = { x: -9999, y: -9999 };

        this.GRID_SIZE = 128;
        this.nodes = [];
        this.links = [];

        this.resize = this.resize.bind(this);
        this.handleMouseMove = this.handleMouseMove.bind(this);
        this.handleMouseLeave = this.handleMouseLeave.bind(this);
        this.loop = this.loop.bind(this);
    }

    buildNodes() {
        this.nodes = [];
        this.links = [];
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        const cols = Math.ceil(width / this.GRID_SIZE) + 1;
        const rows = Math.ceil(height / this.GRID_SIZE) + 1;
        const count = Math.min(16, Math.floor((cols * rows) / 5));

        for (let i = 0; i < count; i++) {
            const gx = Math.floor(Math.random() * cols);
            const gy = Math.floor(Math.random() * rows);
            this.nodes.push({
                x: gx * this.GRID_SIZE,
                y: gy * this.GRID_SIZE,
                pulse: Math.random() * Math.PI * 2,
                speed: 0.015 + Math.random() * 0.02
            });
        }

        this.nodes.forEach((n, i) => {
            let nearest = null;
            let nearestDist = Infinity;
            this.nodes.forEach((m, j) => {
                if (i === j) return;
                const d = Math.hypot(n.x - m.x, n.y - m.y);
                if (d < nearestDist) { nearestDist = d; nearest = j; }
            });
            if (nearest !== null) this.links.push([i, nearest]);
        });
    }

    resize() {
        if (!this.container || !this.canvas) return;
        const w = this.container.clientWidth;
        const h = this.container.clientHeight;
        this.canvas.width = w * devicePixelRatio;
        this.canvas.height = h * devicePixelRatio;
        this.canvas.style.width = w + "px";
        this.canvas.style.height = h + "px";
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.scale(devicePixelRatio, devicePixelRatio);
        this.buildNodes();
    }

    handleMouseMove(e) {
        const rect = this.container.getBoundingClientRect();
        this.mouse.x = e.clientX - rect.left;
        this.mouse.y = e.clientY - rect.top;
    }

    handleMouseLeave() {
        this.mouse.x = -9999;
        this.mouse.y = -9999;
    }

    drawGrid(w, h) {
        this.ctx.strokeStyle = "rgba(255, 0, 55, 0.06)";
        this.ctx.lineWidth = 4;
        for (let x = 0; x < w; x += this.GRID_SIZE) {
            this.ctx.beginPath(); this.ctx.moveTo(x, 0); this.ctx.lineTo(x, h); this.ctx.stroke();
        }
        for (let y = 0; y < h; y += this.GRID_SIZE) {
            this.ctx.beginPath(); this.ctx.moveTo(0, y); this.ctx.lineTo(w, y); this.ctx.stroke();
        }
    }

    drawLinks() {
        this.links.forEach(([a, b]) => {
            const n1 = this.nodes[a], n2 = this.nodes[b];
            if (!n1 || !n2) return;
            const midX = n2.x;
            const midY = n1.y;

            this.ctx.strokeStyle = "rgba(255, 0, 55, 0.18)";
            this.ctx.lineWidth = 1;
            this.ctx.beginPath();
            this.ctx.moveTo(n1.x, n1.y);
            this.ctx.lineTo(midX, midY);
            this.ctx.lineTo(n2.x, n2.y);
            this.ctx.stroke();
        });
    }

    drawNodes(t) {
        this.nodes.forEach(n => {
            const pulse = (Math.sin(t * n.speed + n.pulse) + 1) / 2;
            const dist = Math.hypot(n.x - this.mouse.x, n.y - this.mouse.y);
            const boost = Math.max(0, 1 - dist / 220);

            const r = 2.5 + pulse * 1.5 + boost * 3;
            const alpha = 0.35 + pulse * 0.35 + boost * 0.5;

            this.ctx.beginPath();
            this.ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
            this.ctx.fillStyle = `rgba(255, 0, 55, ${Math.min(alpha, 1)})`;
            this.ctx.fill();

            if (boost > 0.15) {
                this.ctx.beginPath();
                this.ctx.arc(n.x, n.y, r + 6, 0, Math.PI * 2);
                this.ctx.strokeStyle = `rgba(255, 0, 55, ${boost * 0.4})`;
                this.ctx.lineWidth = 1;
                this.ctx.stroke();
            }
        });
    }

    loop(t) {
        if (!this.running) return;
        const w = this.container.clientWidth;
        const h = this.container.clientHeight;

        this.ctx.clearRect(0, 0, w, h);
        this.drawGrid(w, h);
        this.drawLinks();
        this.drawNodes(t * 0.06);

        this.animationId = requestAnimationFrame(this.loop);
    }

    start(containerId) {
        if (this.running && this.container && this.container.id === containerId) return;
        this.stop();

        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

        this.container = document.getElementById(containerId);
        if (!this.container) return;

        this.canvas = document.createElement("canvas");
        this.canvas.id = "projects-blueprint";
        this.container.prepend(this.canvas);
        this.ctx = this.canvas.getContext("2d");

        this.running = true;
        this.resize();

        window.addEventListener("resize", this.resize);
        this.container.addEventListener("mousemove", this.handleMouseMove);
        this.container.addEventListener("mouseleave", this.handleMouseLeave);

        this.animationId = requestAnimationFrame(this.loop);
    }

    stop() {
        this.running = false;
        if (this.animationId) cancelAnimationFrame(this.animationId);

        window.removeEventListener("resize", this.resize);
        if (this.container) {
            this.container.removeEventListener("mousemove", this.handleMouseMove);
            this.container.removeEventListener("mouseleave", this.handleMouseLeave);
        }

        if (this.canvas && this.canvas.parentNode) {
            this.canvas.parentNode.removeChild(this.canvas);
        }

        this.container = null;
        this.canvas = null;
        this.ctx = null;
        this.nodes = [];
        this.links = [];
    }
}
window.BlueprintEngine = new BlueprintTechEngine();
