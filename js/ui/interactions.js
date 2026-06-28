/* =============================================================================================== */
/* ========================================= INTERAÇÕES ============================================ */
/* =============================================================================================== */

document.addEventListener("DOMContentLoaded", () => {

    // Função auxiliar para amarrar os botões do notebook quando ele iniciar
    function setupNotebookControls() {
        const buttons = document.querySelectorAll('.nav-trigger');
        buttons.forEach(btn => {
            // Remove listener antigo se existir para não duplicar eventos
            btn.replaceWith(btn.cloneNode(true));
        });

        // Re-seleciona após o clone para aplicar o evento limpo
        const freshButtons = document.querySelectorAll('.nav-trigger');
        freshButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const page = parseInt(btn.getAttribute('data-page'), 10);
                if (!isNaN(page)) {
                    window.Notebook3DEngine?.setPage(page);
                    syncNotebookMenu(page);
                }
            });
        });
    }

    function syncNotebookMenu(index) {
        const buttons = document.querySelectorAll('.nav-trigger');
        buttons.forEach((b, idx) => {
            if (idx === index) b.classList.add('active');
            else b.classList.remove('active');
        });
    }

    /* ---------------------------- GERAL: CONTROLE DE ANIMAÇÕES/MOTORES ---------------------------- */

    // Função centralizada para gerenciar o ciclo de vida e ativação dos motores técnicos
    function handleSceneEngineChange(activeSceneId) {
        // Vincula os cliques dos cards do HTML ao motor 3D do notebook
        function setupServiceCardsControls() {
            const cards = document.querySelectorAll('.service-card');
            cards.forEach((card, index) => {
                // Remove e reinicia listeners para evitar duplicações indesejadas
                const newCard = card.cloneNode(true);
                card.parentNode.replaceChild(newCard, card);

                newCard.addEventListener('click', () => {
                    window.Notebook3DEngine?.setPage(index);
                });
            });
        }

        // Sincroniza a classe ativa do HTML quando o scroll mudar dentro do canvas 3D
        function syncServiceCardsMenu(index) {
            const cards = document.querySelectorAll('.service-card');
            cards.forEach((card, idx) => {
                if (idx === index) {
                    card.classList.add('active'); // Garanta que seu CSS estilize o .service-card.active
                } else {
                    card.classList.remove('active');
                }
            });
        }

        // Desliga TODOS os motores (incluindo o Notebook3D) ao trocar de página
        window.ParticleEngine?.stop();
        window.BlueprintEngine?.stop();
        window.SkillsEngine?.stop();
        window.DossierEngine?.stop();
        window.CardTiltEngine?.stop();
        window.Notebook3DEngine?.stop();

        // Inicializa cirurgicamente apenas o motor da página atual
        switch (activeSceneId) {
            case "hero":
                window.ParticleEngine?.start("page-intro-background");
                break;

            case "about":
                window.DossierEngine?.start("dossierEngine");
                break;

            case "projects":
            case "projetos": // Adicionado por segurança de nomenclatura do SCENE_MAP
                window.BlueprintEngine?.start("page-projects-background");
                window.CardTiltEngine?.start("projects-grid");
                break;

            case "skills":
                window.SkillsEngine?.start("skills-scene");
                break;

            case "services":
                // Inicia o ciclo do Three.js apenas quando o usuário pisar na tela de serviços
                window.Notebook3DEngine?.start('services-3d', {
                    modelPath: './assets/models/notebook.glb',
                    onPageChange: (index) => syncServiceCardsMenu(index)
                });
                setupServiceCardsControls();
                break;

            case "contact":
                break;
        }
    }

    // Ouve o evento global emitido pelo motor de cenas
    document.addEventListener("z1:scenechange", (e) => {
        handleSceneEngineChange(e.detail.id);
    });

    // GATILHO DE BOOTSTRAP: Força o motor a rodar na primeira cena ativa imediatamente
    if (window.CK) {
        const initialSceneId = window.CK.pages[window.CK.scene - 1]?.id?.replace('section-', '') || 'hero';
        handleSceneEngineChange(initialSceneId);
    }

    /* ---------------------------- FLIP CARDS (Sobre) ---------------------------- */
    document.querySelectorAll(".flip-card").forEach(card => {
        const front = card.querySelector(".flip-front");
        front?.addEventListener("click", () => {
            card.classList.toggle("is-flipped");
        });
    });

    /* ---------------------------- MODAL EXPANDIDO ---------------------------- */
    const overlay = document.getElementById("modal-overlay");
    const modalTitle = overlay?.querySelector(".modal-head h3");
    const modalBody = overlay?.querySelector(".modal-body");

    function openModal(titleKey, textKey) {
        if (!overlay) return;
        const dict = window.I18N?.dict;
        const title = window.I18N?.getValue(dict, titleKey) || "";
        const text = window.I18N?.getValue(dict, textKey) || "";

        modalTitle.textContent = title;
        modalBody.innerHTML = "";
        text.split("\n\n").forEach(paragraph => {
            if (!paragraph.trim()) return;
            const p = document.createElement("p");
            p.textContent = paragraph.trim();
            modalBody.appendChild(p);
        });

        overlay.classList.add("is-open");
        overlay.dataset.titleKey = titleKey;
        overlay.dataset.textKey = textKey;
        document.body.style.overflow = "hidden";
    }

    function closeModal() {
        overlay?.classList.remove("is-open");
        document.body.style.overflow = "";
    }

    document.querySelectorAll("[data-modal-open]").forEach(btn => {
        btn.addEventListener("click", e => {
            e.stopPropagation();
            const [titleKey, textKey] = btn.dataset.modalOpen.split("|");
            openModal(titleKey, textKey);
        });
    });

    overlay?.querySelector(".modal-close")?.addEventListener("click", closeModal);
    overlay?.addEventListener("click", e => {
        if (e.target === overlay) closeModal();
    });
    window.addEventListener("keydown", e => {
        if (e.key === "Escape") closeModal();
    });

    document.addEventListener("i18n:changed", () => {
        if (overlay?.classList.contains("is-open")) {
            openModal(overlay.dataset.titleKey, overlay.dataset.textKey);
        }
    });

    /* ---------------------------- NAVBAR MOBILE TOGGLE ---------------------------- */
    const navToggle = document.getElementById("navbar-toggle");
    const navOverlay = document.getElementById("nav-overlay");

    function setNavState() {
        if (window.innerWidth <= 768) {
            document.body.classList.remove("nav-collapsed");
        } else {
            document.body.classList.remove("nav-open");
        }
    }
    setNavState();
    window.addEventListener("resize", setNavState);

    navToggle?.addEventListener("click", () => {
        if (window.innerWidth <= 768) {
            document.body.classList.toggle("nav-open");
        } else {
            document.body.classList.toggle("nav-collapsed");
        }
    });

    navOverlay?.addEventListener("click", () => {
        document.body.classList.remove("nav-open");
    });

    /* ---------------------------- FORM DEMO ---------------------------- */
    const form = document.querySelector(".contact-form");
    form?.addEventListener("submit", e => {
        e.preventDefault();
        const btn = form.querySelector(".btn");
        const original = btn.textContent;
        btn.textContent = "✓";
        setTimeout(() => { btn.textContent = original; form.reset(); }, 1800);
    });
});
