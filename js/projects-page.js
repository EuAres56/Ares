/**
 * ARES — Projects Page Controller
 * =====================================================================
 * Orquestra a página /projects.html:
 *  - Renderiza os cards a partir do manifest (projects-data.js)
 *  - Abre/fecha o modal ao clicar em um card
 *  - Faz fetch e renderiza o arquivo .md no modal via md-renderer.js
 *  - Partículas de fundo via window.ParticleEngine (particles-engine.js)
 *  - Efeito tilt 3D nos cards (mesmo padrão do portfólio principal)
 *
 * NOTA DE IMPORT PATHS:
 *   Este arquivo vive em /js/projects-page.js.
 *   O HTML serve na raiz (/projects.html), mas o <script> aponta para
 *   ./js/projects-page.js, logo o CWD para imports é /js/.
 */

// ─────────────────────────────────────────────────────────────────────────────
//  Importações (caminhos relativos a /js/projects-page.js)
// ─────────────────────────────────────────────────────────────────────────────// ---------------- CORE ----------------
import { CacheSystem } from './cache-system.js'; // CORREÇÃO: Adicionada a barra './' necessária para caminhos relativos
import { PROJECTS, STATUS_LABELS } from '../assets/projects/projects-data.js';
import { fetchMarkdown, parseMarkdown } from './engines/md-renderer.js';

// =====================================================================
// BOOTSTRAP
// =====================================================================

document.addEventListener('DOMContentLoaded', async () => {
    await CacheSystem.init();
    const bg_pg_projects = await CacheSystem.getBlobUrl("./assets/images/Bg_projects.webp");
    // Injeção no :root CSS com aspas explicitas '...' em volta das URLs/Blobs
    const rootStyle = document.documentElement.style;
    rootStyle.setProperty('--bg-page-projects', `url('${bg_pg_projects}')`);

    initParticles();
    renderCards();
    initTilt();
    initModal();
    initBackLink();
});

// =====================================================================
// PARTÍCULAS — Reutiliza o engine existente do portfólio
// =====================================================================

function initParticles() {
    // particles-engine.js é carregado via <script type="module"> no HTML
    // e expõe window.ParticleEngine antes de DOMContentLoaded via módulo
    // Pequeno timeout para garantir que o módulo já registrou o singleton
    const tryStart = (attempts = 0) => {
        if (window.ParticleEngine) {
            window.ParticleEngine.start('projects-page-bg');
        } else if (attempts < 20) {
            setTimeout(() => tryStart(attempts + 1), 50);
        }
    };
    tryStart();
}

// =====================================================================
// CARDS
// =====================================================================

function renderCards() {
    const grid = document.getElementById('proj-grid');
    if (!grid) return;

    grid.innerHTML = PROJECTS.map((project, i) => buildCardHTML(project, i)).join('');

    // Bind de cliques e teclado (acessibilidade)
    grid.querySelectorAll('.pcard').forEach(card => {
        const open = () => {
            const id = card.dataset.projectId;
            const project = PROJECTS.find(p => p.id === id);
            if (project) openProjectModal(project);
        };

        card.addEventListener('click', open);
        card.addEventListener('keydown', e => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
        });
    });
}

function buildCardHTML(project, index) {
    const statusLabel = STATUS_LABELS[project.status] || project.status;
    const statusClass = `pcard__status--${project.status}`;

    const tagsHtml = project.tags
        .map(t => `<span class="pcard__tag">${t}</span>`)
        .join('');

    return `
    <article
        class="pcard"
        data-project-id="${project.id}"
        role="listitem button"
        tabindex="0"
        aria-label="Abrir detalhes: ${project.title}"
        style="--pcard-i: ${index}"
    >
        <div class="pcard__inner">
            <div class="pcard__thumb">
                <img src="${project.thumb}" alt="${project.title}" loading="lazy" draggable="false">
                <span class="pcard__status ${statusClass}">${statusLabel}</span>
            </div>
            <div class="pcard__body">
                <h3 class="pcard__title">${project.title}</h3>
                <p class="pcard__desc">${project.desc}</p>
                <div class="pcard__tags">${tagsHtml}</div>
            </div>
        </div>
        <div class="pcard__hover-ring" aria-hidden="true"></div>
    </article>`;
}

// =====================================================================
// EFEITO TILT 3D — mesmo padrão do portfólio principal
// =====================================================================

function initTilt() {
    const grid = document.getElementById('proj-grid');
    if (!grid) return;

    // Observa novos cards injetados
    const bindTilt = () => {
        grid.querySelectorAll('.pcard').forEach(card => {
            if (card._tiltBound) return;
            card._tiltBound = true;

            const inner = card.querySelector('.pcard__inner');

            card.addEventListener('mousemove', e => {
                const rect = card.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                const cx = rect.width / 2;
                const cy = rect.height / 2;

                const rotX = ((y - cy) / cy) * -8;
                const rotY = ((x - cx) / cx) * 8;

                const pctX = Math.round((x / rect.width) * 100);
                const pctY = Math.round((y / rect.height) * 100);

                if (inner) {
                    inner.style.transform = `rotateX(${rotX}deg) rotateY(${rotY}deg)`;
                    inner.style.setProperty('--mx', `${pctX}%`);
                    inner.style.setProperty('--my', `${pctY}%`);
                }
            });

            card.addEventListener('mouseleave', () => {
                if (inner) {
                    inner.style.transform = '';
                    inner.style.removeProperty('--mx');
                    inner.style.removeProperty('--my');
                }
            });
        });
    };

    bindTilt();
}

// =====================================================================
// MODAL
// =====================================================================

let currentController = null; // AbortController para cancelar fetch anterior

function initModal() {
    const overlay = document.getElementById('proj-modal-overlay');
    const closeBtn = document.getElementById('proj-modal-close');

    closeBtn?.addEventListener('click', closeModal);

    overlay?.addEventListener('click', e => {
        if (e.target === overlay) closeModal();
    });

    window.addEventListener('keydown', e => {
        if (e.key === 'Escape') closeModal();
    });
}

// Ícones SVG Inline
const ICONS = {
    download: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>`,
    redirect: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>`
};

async function openProjectModal(project) {
    const overlay = document.getElementById('proj-modal-overlay');
    const titleEl = document.getElementById('proj-modal-title');
    const bodyEl = document.getElementById('proj-modal-body');
    const actionsEl = document.getElementById('proj-modal-actions');

    if (!overlay || !bodyEl) return;

    currentController?.abort();
    currentController = new AbortController();

    titleEl.textContent = project.title;

    // Renderiza a faixa de links se o array existir e não estiver vazio
    if (actionsEl) {
        if (project.links && Array.isArray(project.links) && project.links.length > 0) {
            actionsEl.innerHTML = project.links.map(item => {
                const icon = ICONS[item.type] || ICONS.redirect;
                const isDownload = item.type === 'download';

                return `
                    <a
                        href="${item.link}"
                        class="proj-modal__btn proj-modal__btn--${item.type}"
                        target="_blank"
                        rel="noopener noreferrer"
                        ${isDownload ? `download` : ''}
                    >
                        ${icon}
                        <span>${item.name}</span>
                    </a>
                `;
            }).join('');

            actionsEl.hidden = false;
        } else {
            actionsEl.innerHTML = '';
            actionsEl.hidden = true;
        }
    }

    bodyEl.innerHTML = `
        <div class="proj-modal__loader" id="proj-modal-loader">Carregando documentação</div>
        <p class="proj-modal__error" id="proj-modal-error" hidden></p>
        <div id="proj-modal-content"></div>
    `;

    overlay.classList.add('is-open');
    document.body.classList.add('modal-open');

    try {
        const md = await fetchMarkdown(project.mdFile);
        const html = parseMarkdown(md);

        // Busca as referências recém-criadas no DOM
        const loaderEl = document.getElementById('proj-modal-loader');
        const contentEl = document.getElementById('proj-modal-content');

        // Insere o HTML renderizado do Markdown
        if (contentEl) {
            contentEl.innerHTML = html;
        }

        // Esconde o loader de forma garantida (alterando display e estilo)
        if (loaderEl) {
            loaderEl.style.display = 'none';
            loaderEl.hidden = true;
        }

        // Executa a renderização do diagrama Mermaid
        if (window.mermaid) {
            window.mermaid.initialize({
                startOnLoad: false,
                theme: 'dark',
                securityLevel: 'loose'
            });

            try {
                await window.mermaid.run({
                    nodes: document.querySelectorAll('.mermaid')
                });
            } catch (err) {
                console.error('[Mermaid] Erro na renderização do diagrama:', err);
            }
        }

        // Reseta o scroll para o topo
        bodyEl.scrollTop = 0;

    } catch (err) {
        if (err.name === 'AbortError') return;
        console.error('[ProjectsPage] Erro ao carregar MD:', err);

        const loaderEl = document.getElementById('proj-modal-loader');
        const errorEl = document.getElementById('proj-modal-error');

        if (loaderEl) {
            loaderEl.style.display = 'none';
            loaderEl.hidden = true;
        }

        if (errorEl) {
            errorEl.hidden = false;
            errorEl.style.display = 'block';
            errorEl.textContent = `Não foi possível carregar os detalhes do projeto. (${err.message})`;
        }
    }
}

function closeModal() {
    const overlay = document.getElementById('proj-modal-overlay');
    overlay?.classList.remove('is-open');
    document.body.classList.remove('modal-open');
    currentController?.abort();
    currentController = null;
}

// =====================================================================
// BACK LINK
// =====================================================================

function initBackLink() {
    const btn = document.getElementById('proj-back');
    btn?.addEventListener('click', () => {
        if (history.length > 1) {
            history.back();
        } else {
            window.location.href = './index.html';
        }
    });
}
