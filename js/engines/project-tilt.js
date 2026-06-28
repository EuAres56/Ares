/**
 * ===============================================================================================
 * ===================================== PROJECT CARD TILT ENGINE ================================
 * ===============================================================================================
 */
class ProjectCardTiltEngine {
    constructor() {
        this.MAX_TILT = 10;
        this.cards = [];
        this.cardStates = new Map(); // Guarda instâncias de RAF e valores de interpolação por card
        this.running = false;
    }

    applyTransform(card, state) {
        state.currentX += (state.targetX - state.currentX) * 0.12;
        state.currentY += (state.targetY - state.currentY) * 0.12;

        state.inner.style.transform =
            `rotateX(${state.currentY * -this.MAX_TILT}deg) rotateY(${state.currentX * this.MAX_TILT}deg)`;

        if (state.thumb) state.thumb.style.transform = `translate(${state.currentX * 8}px, ${state.currentY * 8}px) scale(1.04)`;
        if (state.body) state.body.style.transform = `translate(${state.currentX * -4}px, ${state.currentY * -4}px)`;

        card.style.setProperty("--mx", `${(state.currentX + 1) * 50}%`);
        card.style.setProperty("--my", `${(state.currentY + 1) * 50}%`);

        if (Math.abs(state.targetX - state.currentX) > 0.001 || Math.abs(state.targetY - state.currentY) > 0.001) {
            state.rafId = requestAnimationFrame(() => this.applyTransform(card, state));
        } else {
            state.rafId = null;
        }
    }

    createMoveHandler(card, state) {
        return (e) => {
            const rect = card.getBoundingClientRect();
            const x = (e.clientX - rect.left) / rect.width;
            const y = (e.clientY - rect.top) / rect.height;
            state.targetX = (x - 0.5) * 2;
            state.targetY = (y - 0.5) * 2;

            if (!state.rafId) state.rafId = requestAnimationFrame(() => this.applyTransform(card, state));
        };
    }

    createLeaveHandler(card, state) {
        return () => {
            state.targetX = 0;
            state.targetY = 0;
            if (!state.rafId) state.rafId = requestAnimationFrame(() => this.applyTransform(card, state));
        };
    }

    start(parentContainerId) {
        this.stop();
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

        const container = document.getElementById(parentContainerId);
        if (!container) return;

        this.cards = Array.from(container.querySelectorAll(".project-card"));
        this.running = true;

        this.cards.forEach(card => {
            const inner = card.querySelector(".project-card-inner");
            if (!inner) return;

            const state = {
                inner: inner,
                thumb: card.querySelector(".project-thumb"),
                body: card.querySelector(".project-body"),
                rafId: null,
                targetX: 0,
                targetY: 0,
                currentX: 0,
                currentY: 0,
                onMouseMove: null,
                onMouseLeave: null
            };

            state.onMouseMove = this.createMoveHandler(card, state);
            state.onMouseLeave = this.createLeaveHandler(card, state);

            card.addEventListener("mousemove", state.onMouseMove);
            card.addEventListener("mouseleave", state.onMouseLeave);

            this.cardStates.set(card, state);
        });
    }

    stop() {
        this.running = false;
        this.cardStates.forEach((state, card) => {
            if (state.rafId) cancelAnimationFrame(state.rafId);
            card.removeEventListener("mousemove", state.onMouseMove);
            card.removeEventListener("mouseleave", state.onMouseLeave);

            // Reseta estilos inline aplicados pelo motor
            state.inner.style.transform = "";
            if (state.thumb) state.thumb.style.transform = "";
            if (state.body) state.body.style.transform = "";
        });

        this.cardStates.clear();
        this.cards = [];
    }
}
window.CardTiltEngine = new ProjectCardTiltEngine();
