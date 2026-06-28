/* =============================================================================================== */
/* ======================== CK ENGINE (DIRECT CINEMATIC UI) ===================================== */
/* =============================================================================================== */

const SCENE_MAP = [
    { id: "hero", effects: [] },
    { id: "about", effects: [] },
    { id: "projects", effects: [] },
    {
        id: "skills", effects: [
            { type: "class", target: "#section-skills .skill-bar span", className: "is-filled", delay: "0s", transition: "1.4s" }
        ]
    },
    { id: "services", effects: [] },
    { id: "contact", effects: [] }
];

function collectAllEffects(sceneMap) {
    const classEffects = [];
    sceneMap.forEach(scene => {
        scene.effects.forEach(effect => {
            if (effect.type === "class") {
                classEffects.push({ target: effect.target, className: effect.className });
            }
        });
    });
    return { classEffects };
}

class SceneEngine {
    constructor() {
        this.scene = 1;
        this.maxScene = SCENE_MAP.length;
        this.transitioning = false;
        this.allClassEffects = collectAllEffects(SCENE_MAP).classEffects;
        this.pages = [];
        this.startY = 0;

        // Timings da animação CSS (350ms saída + 450ms entrada)
        this.exitDuration = 350;
        this.entryDuration = 450;
    }

    init() {
        this.viewport = document.getElementById("viewport");
        this.pages = Array.from(document.querySelectorAll(".section"));

        this.bindIndexClicks();
        this.bindKeyboard();
        this.bindDataGoToClicks();
        this.bindScroll();
        this.bindTouch();

        this.renderInitialState();
    }

    renderInitialState() {
        const config = SCENE_MAP[this.scene - 1];
        if (!config) return;

        this.pages.forEach(p => {
            p.classList.remove("is-active", "is-exiting");
        });

        const firstPage = document.getElementById(`section-${config.id}`);
        if (firstPage) firstPage.classList.add("is-active");

        this.applyEffects(config.effects);
        this.syncIndex(config.id);
    }

    clearAllEffects() {
        this.allClassEffects.forEach(({ target, className }) => {
            document.querySelectorAll(target).forEach(el => {
                className.split(" ").forEach(c => el.classList.remove(c));
                el.style.removeProperty("--delay");
                el.style.removeProperty("--transition");
            });
        });
    }

    applyEffects(effects) {
        effects.forEach(effect => {
            document.querySelectorAll(effect.target).forEach(el => {
                if (effect.type === "class") {
                    if (effect.delay !== undefined) el.style.setProperty("--delay", effect.delay);
                    if (effect.transition !== undefined) el.style.setProperty("--transition", effect.transition);
                    effect.className.split(" ").forEach(c => el.classList.add(c));
                }
            });
        });
    }

    syncIndex(id) {
        document.querySelectorAll(".navbar-index li").forEach(li => {
            li.classList.toggle("is-current", li.dataset.sceneId === id);
        });
    }

    // TRANSICÃO DIRETA E ASSÍNCRONA: Vai direto ao ponto melhorando a UX
    async goTo(targetScene) {
        if (this.transitioning || targetScene < 1 || targetScene > this.maxScene || targetScene === this.scene) return;
        this.transitioning = true;

        // 1. Acende o efeito box-shadow inset vermelho nas bordas do monitor
        if (this.viewport) this.viewport.classList.add("is-transitioning");

        // 2. ISOLAMENTO DA SAÍDA: Remove apenas a tela atual
        const currentConfig = SCENE_MAP[this.scene - 1];
        const currentPage = document.getElementById(`section-${currentConfig.id}`);

        if (currentPage) {
            currentPage.classList.remove("is-active");
            currentPage.classList.add("is-exiting");
        }

        // Aguarda o término do fade-out/scale-down da página que sai
        await new Promise(resolve => setTimeout(resolve, this.exitDuration));

        if (currentPage) {
            currentPage.classList.remove("is-exiting");
        }

        // 3. ATUALIZAÇÃO DIRETA: Salta direto para o ID selecionado
        this.scene = targetScene;

        const nextConfig = SCENE_MAP[this.scene - 1];
        const nextPage = document.getElementById(`section-${nextConfig.id}`);

        // Prepara os estados da nova interface (index, classes de animação interna)
        this.clearAllEffects();
        this.syncIndex(nextConfig.id);

        // Dispara o evento global para o restante do ecossistema do portfólio[cite: 9]
        document.dispatchEvent(new CustomEvent("z1:scenechange", {
            detail: { id: nextConfig.id, scene: this.scene }
        }));

        // 4. ISOLAMENTO DA ENTRADA: Introduz a nova página com desaceleração óptica
        if (nextPage) {
            nextPage.classList.add("is-active");
            this.applyEffects(nextConfig.effects);
        }

        // Aguarda a estabilização completa da escala da nova tela antes de liberar o motor
        await new Promise(resolve => setTimeout(resolve, this.entryDuration));

        // 5. Apaga o reflexo vermelho perimetral
        if (this.viewport) this.viewport.classList.remove("is-transitioning");
        this.transitioning = false;
    }

    next() {
        if (this.scene >= this.maxScene) return;
        this.goTo(this.scene + 1);
    }

    prev() {
        if (this.scene <= 1) return;
        this.goTo(this.scene - 1);
    }

    goToId(id) {
        const idx = SCENE_MAP.findIndex(s => s.id === id);
        if (idx >= 0) this.goTo(idx + 1);
    }

    // Trava inteligente que impede o avanço de páginas se houver interatividade interna ativa (ex: Notebook 3D)[cite: 9]
    isInsideScrollable(target, deltaY) {
        let current = target;
        while (current && current !== document.body && current !== document.documentElement) {
            if (current.id === "services-3d" || current.closest("#services-3d")) {
                return true;
            }

            const isScrollableY = current.scrollHeight > current.clientHeight;
            const style = window.getComputedStyle(current);
            const overflowY = style.overflowY;

            if (isScrollableY && (overflowY === "auto" || overflowY === "scroll" || current.classList.contains("scroll-thin"))) {
                if (deltaY > 0 && current.scrollTop + current.clientHeight < current.scrollHeight) return true;
                if (deltaY < 0 && current.scrollTop > 0) return true;
            }
            current = current.parentElement;
        }
        return false;
    }

    bindScroll() {
        window.addEventListener("wheel", (e) => {
            if (this.transitioning) return;
            if (this.isInsideScrollable(e.target, e.deltaY)) return;

            if (e.deltaY > 30) {
                this.next();
            } else if (e.deltaY < -30) {
                this.prev();
            }
        }, { passive: false });
    }

    bindTouch() {
        window.addEventListener("touchstart", (e) => {
            this.startY = e.touches[0].clientY;
        }, { passive: true });

        window.addEventListener("touchend", (e) => {
            if (this.transitioning) return;

            const endY = e.changedTouches[0].clientY;
            const deltaY = this.startY - endY;

            if (this.isInsideScrollable(e.target, deltaY)) return;

            if (deltaY > 60) {
                this.next();
            } else if (deltaY < -60) {
                this.prev();
            }
        }, { passive: true });
    }

    bindIndexClicks() {
        document.querySelectorAll(".navbar-index li").forEach((li, i) => {
            li.querySelector("button")?.addEventListener("click", () => {
                this.goTo(i + 1);
                if (window.innerWidth <= 768) document.body.classList.remove("nav-open");
            });
        });
    }

    bindDataGoToClicks() {
        document.querySelectorAll("[data-goto]").forEach(btn => {
            btn.addEventListener("click", () => this.goToId(btn.dataset.goto));
        });
    }

    bindKeyboard() {
        window.addEventListener("keydown", e => {
            const tag = document.activeElement?.tagName;
            if (tag === "INPUT" || tag === "TEXTAREA") return;

            if (e.key === "ArrowDown" || e.key === "PageDown") { e.preventDefault(); this.next(); }
            if (e.key === "ArrowUp" || e.key === "PageUp") { e.preventDefault(); this.prev(); }
        });
    }
}

export const CKEngine = new SceneEngine();
window.CK = CKEngine;

document.addEventListener("DOMContentLoaded", () => {
    CKEngine.init();
});
