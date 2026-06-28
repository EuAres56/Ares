/**
 * ===============================================================================================
 * ===================================== SKILLS NOTEBOOK ENGINE ==================================
 * ===============================================================================================
 */
class SkillsNotebookEngine {
    constructor() {
        this.scene = null;
        this.notebooks = [];
        this.openNotebookIndex = 0;
        this.notebooksData = [
            {
                title: "Front-End",
                color: "radial-gradient(circle at top left, rgb(255, 0, 55), rgb(85, 12, 29) 70%)",
                pages: [
                    { title: "HTML5 / CSS3", content: "[Placeholder] Texto descrevendo experiência prática com HTML5 e CSS3 — estruturação semântica, responsividade, animações nativas." },
                    { title: "JavaScript", content: "[Placeholder] Texto descrevendo experiência com JavaScript nativo — manipulação de DOM, APIs do navegador, lógica de interface sem dependências." },
                    { title: "React", content: "[Placeholder] Texto descrevendo quando e como React entra nos projetos — componentização, estado, casos onde faz sentido usar." }
                ]
            },
            {
                title: "Back-End & Dados",
                color: "radial-gradient(circle at top left, rgb(255, 0, 55), rgb(85, 12, 29) 70%)",
                pages: [
                    { title: "Node.js / Express", content: "[Placeholder] Texto descrevendo experiência com Node.js e Express — APIs REST, estruturação de back-end, integrações." },
                    { title: "PostgreSQL / MySQL", content: "[Placeholder] Texto descrevendo modelagem e manipulação de dados — estruturas relacionais, consultas, performance." },
                    { title: "Django / Flask", content: "[Placeholder] Texto descrevendo uso de Django e Flask — quando cada um entra, estruturação de sistemas em Python." }
                ]
            },
            {
                title: "Automação & Ferramentas",
                color: "radial-gradient(circle at top left, rgb(255, 0, 55), rgb(85, 12, 29) 70%)",
                pages: [
                    { title: "Python (Pandas, NumPy)", content: "[Placeholder] Texto descrevendo automações em Python — tratamento de dados, geração de relatórios, scripts utilitários." },
                    { title: "Git", content: "[Placeholder] Texto descrevendo fluxo de versionamento — branches, organization de histórico, colaboração." },
                    { title: "Figma / UI Design", content: "[Placeholder] Texto descrevendo o processo de design em Figma antes de codar — protótipos, sistema visual, handoff." }
                ]
            }
        ];

        this.handleNotebookClick = this.handleNotebookClick.bind(this);
    }

    buildNotebooks() {
        this.notebooksData.forEach((bookData, i) => {
            const notebook = document.createElement("div");
            notebook.classList.add("notebook");
            notebook.dataset.index = i;
            notebook.dataset.currentPage = 0;

            // Capa
            const cover = document.createElement("div");
            cover.classList.add("page", "cover");
            const coverZ = (bookData.pages.length + 1) * 0.5;
            cover.dataset.baseZ = coverZ;
            cover.style.background = bookData.color;
            cover.style.transform = `translateZ(${coverZ}px)`;
            cover.style.zIndex = bookData.pages.length + 1;
            cover.innerHTML = `
                <div class="page-content">
                    <div class="page-text">
                        <h2>${bookData.title}</h2>
                        <small>${bookData.pages.length} páginas</small>
                    </div>
                    <span class="cover-cta">Clique para ver →</span>
                </div>
            `;

            cover.addEventListener("click", (e) => {
                e.stopPropagation();
                this.handleCoverClick(notebook);
            });

            notebook.appendChild(cover);

            // Páginas
            bookData.pages.forEach((pageData, p) => {
                const page = document.createElement("div");
                page.classList.add("page");
                const z = (bookData.pages.length - p) * 0.5;
                page.dataset.baseZ = z;
                page.style.transform = `translateZ(${z}px)`;
                page.style.zIndex = bookData.pages.length - p;
                const isLast = p === bookData.pages.length - 1;

                page.innerHTML = `
                    <div class="page-content page-front">
                        <div class="page-text">
                            <h3>${pageData.title}</h3>
                            <p>${pageData.content}</p>
                        </div>
                        <div class="page-indicators">
                            <span class="page-indic page-indic-prev" data-dir="prev" title="Página anterior">←</span>
                            <span class="page-indic-count">${p + 1} / ${bookData.pages.length}</span>
                            ${isLast
                        ? '<span class="page-indic page-indic-next" style="visibility: hidden;">→</span>'
                        : '<span class="page-indic page-indic-next" data-dir="next" title="Próxima página">→</span>'}
                        </div>
                    </div>
                    <div class="page-content page-back"></div>
                `;
                notebook.appendChild(page);
            });

            notebook.addEventListener("click", this.handleNotebookClick);
            this.scene.appendChild(notebook);
            this.notebooks.push(notebook);
        });

        this.updateLayout();
    }

    handleCoverClick(notebook) {
        if (notebook.classList.contains('closed')) {
            this.openNotebookIndex = parseInt(notebook.dataset.index, 10);
            this.updateLayout();
        }
    }

    handleNotebookClick(e) {
        const clickedNotebook = e.currentTarget;
        const isClosed = clickedNotebook.classList.contains('closed');

        if (isClosed) {
            this.openNotebookIndex = parseInt(clickedNotebook.dataset.index, 10);
            this.updateLayout();
            return;
        }

        const indicator = e.target.closest(".page-indic");
        if (indicator) {
            this.turnPage(e, clickedNotebook, indicator.dataset.dir);
            return;
        }

        this.turnPage(e, clickedNotebook);
    }

    turnPage(e, notebook, forcedDir = null) {
        const pages = [...notebook.querySelectorAll(".page:not(.cover)")];
        const maxPage = pages.length - 1;
        let currentPage = Number(notebook.dataset.currentPage);
        let dir = forcedDir;

        if (!dir) {
            const rect = notebook.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            dir = clickX > rect.width * 0.5 ? "next" : "prev";
        }

        if (dir === "next" && currentPage < maxPage) {
            const page = pages[currentPage];
            page.style.zIndex = 0;
            page.style.transform = `translateZ(-6px) rotateX(179.9deg)`;
            currentPage++;
        } else if (dir === "prev" && currentPage > 0) {
            currentPage--;
            const page = pages[currentPage];
            page.style.zIndex = pages.length + 5;
            page.style.transform = `translateZ(${page.dataset.baseZ}px) rotateX(0deg)`;
        }

        notebook.dataset.currentPage = currentPage;
        requestAnimationFrame(() => this.normalizeZIndex(notebook));
    }

    normalizeZIndex(notebook) {
        const current = Number(notebook.dataset.currentPage);
        const pages = [...notebook.querySelectorAll(".page:not(.cover)")];
        pages.forEach((page, i) => {
            page.style.zIndex = i < current ? i : pages.length - i + 1;
        });
    }

    updateLayout() {
        let stackCounter = 1;
        this.notebooks.forEach((notebook, index) => {
            const isOpen = index === this.openNotebookIndex;
            notebook.className = "notebook";
            if (isOpen) {
                notebook.classList.add("open");
            } else {
                notebook.classList.add("closed", `stack-${stackCounter}`);
                stackCounter++;
            }
            this.resetPages(notebook);
        });
    }

    resetPages(notebook) {
        notebook.dataset.currentPage = 0;
        const pages = [...notebook.querySelectorAll(".page:not(.cover)")];
        pages.forEach((page, i) => {
            page.style.zIndex = pages.length - i + 1;
            page.style.transform = `translateZ(${page.dataset.baseZ}px) rotateX(0deg)`;
        });
    }

    start(sceneId) {
        this.stop();
        this.scene = document.getElementById(sceneId);
        if (!this.scene) return;
        this.buildNotebooks();
    }

    stop() {
        if (this.notebooks.length) {
            this.notebooks.forEach(notebook => {
                notebook.removeEventListener("click", this.handleNotebookClick);
            });
        }
        if (this.scene) this.scene.innerHTML = "";
        this.notebooks = [];
        this.openNotebookIndex = 0;
        this.scene = null;
    }
}
window.SkillsEngine = new SkillsNotebookEngine();
