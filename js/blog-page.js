/**
 * ARES — Blog Page Controller
 * =====================================================================
 * Orquestra a página /blog.html:
 *  - Consome as postagens do Cloudflare D1 (/api/posts) com fallback estático
 *  - Suporta filtro e busca em tempo real no topo
 *  - Sincroniza abertura do modal com o parâmetro de busca na URL (?post=slug ou ?p=slug ou ?id=slug)
 *  - Suporta navegação via histórico do navegador (popstate)
 *  - Faz fetch e renderiza o arquivo .md no modal via md-renderer.js
 *  - Suporta diagramas Mermaid
 *  - Partículas de fundo via window.ParticleEngine
 */

import { CacheSystem } from './cache-system.js';
import { fetchMarkdown, parseMarkdown } from './engines/md-renderer.js';

// Estado global das postagens
let POSTS = [];
let FILTERED_POSTS = [];
let currentController = null;

// =====================================================================
// BOOTSTRAP
// =====================================================================

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Cache e imagens de fundo
    try {
        await CacheSystem.init();
        const bg_pg_projects = await CacheSystem.getBlobUrl("./assets/images/Bg_projects.webp");
        if (bg_pg_projects) {
            document.documentElement.style.setProperty('--bg-page-projects', `url('${bg_pg_projects}')`);
        }
    } catch (e) {
        console.warn('[BlogPage] CacheSystem init warning:', e);
    }

    // 2. Carrega lista de postagens
    await loadPostsData();

    // 3. Motores de interface
    initParticles();
    initSearchInput();
    renderPostCards();
    initModalEvents();
    initBackLink();

    // 4. Roteador de Query Parameter (?post=slug ou ?p=slug ou ?id=slug)
    window.addEventListener('popstate', checkUrlAndSyncModal);
    checkUrlAndSyncModal();
});

// =====================================================================
// FETCH DE DADOS (CLOUDFLARE D1 / API POSTS)
// =====================================================================

async function loadPostsData() {
    try {
        const response = await fetch('/api/posts');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.json();

        if (Array.isArray(data) && data.length > 0) {
            POSTS = data.map(item => ({
                ...item,
                tags: typeof item.tags === 'string' ? JSON.parse(item.tags || '[]') : (item.tags || []),
                read_time: item.read_time || '5 min',
                category: item.category || 'Artigo'
            }));
            console.log(`[BlogPage] ${POSTS.length} postagem(ns) carregada(s) do D1.`);
        } else {
            throw new Error('API retornou array vazio.');
        }
    } catch (err) {
        console.warn('[BlogPage] Falha ao consultar D1 (/api/posts). Carregando fallback estático:', err);

        try {
            const fallbackModule = await import('../assets/posts/posts-data.js');
            POSTS = fallbackModule.POSTS || [];
        } catch (fallbackErr) {
            console.error('[BlogPage] Erro crítico ao carregar posts estáticos:', fallbackErr);
            POSTS = [];
        }
    }

    FILTERED_POSTS = [...POSTS];
}

// =====================================================================
// ROTAS & URL (QUERY PARAMETERS)
// =====================================================================

/**
 * Lê a URL atual e sincroniza o modal com o parâmetro 'post', 'p' ou 'id'
 */
function checkUrlAndSyncModal() {
    const params = new URLSearchParams(window.location.search);
    const postSlug = params.get('post') || params.get('p') || params.get('id');

    if (postSlug) {
        const post = POSTS.find(item => item.id === postSlug);
        if (post) {
            openPostModal(post);
        } else {
            closePostModal(false);
        }
    } else {
        closePostModal(false);
    }
}

/**
 * Adiciona o parâmetro do post à URL e atualiza o histórico do navegador
 */
function setPostQueryParam(postSlug) {
    const url = new URL(window.location.href);
    url.searchParams.set('post', postSlug);
    window.history.pushState({ postSlug }, '', url.toString());
    checkUrlAndSyncModal();
}

/**
 * Remove os parâmetros de busca da postagem da URL
 */
function clearPostQueryParam() {
    const url = new URL(window.location.href);
    let changed = false;
    ['post', 'p', 'id'].forEach(param => {
        if (url.searchParams.has(param)) {
            url.searchParams.delete(param);
            changed = true;
        }
    });

    if (changed) {
        window.history.pushState({}, '', url.pathname);
    }
}

// =====================================================================
// CARDS & BUSCA EM TEMPO REAL
// =====================================================================

function initSearchInput() {
    const searchInput = document.getElementById('blog-search-input');
    if (!searchInput) return;

    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();

        if (!query) {
            FILTERED_POSTS = [...POSTS];
        } else {
            FILTERED_POSTS = POSTS.filter(post => {
                const titleMatch = post.title?.toLowerCase().includes(query);
                const summaryMatch = post.summary?.toLowerCase().includes(query);
                const catMatch = post.category?.toLowerCase().includes(query);
                const tagsMatch = (post.tags || []).some(t => t.toLowerCase().includes(query));
                return titleMatch || summaryMatch || catMatch || tagsMatch;
            });
        }

        renderPostCards();
    });
}

function renderPostCards() {
    const listEl = document.getElementById('blog-list');
    if (!listEl) return;

    if (FILTERED_POSTS.length === 0) {
        listEl.innerHTML = `<div class="blog-empty">Nenhum artigo encontrado com esse termo de busca.</div>`;
        return;
    }

    listEl.innerHTML = FILTERED_POSTS.map(post => buildCardHTML(post)).join('');

    // Eventos de clique nos cards
    listEl.querySelectorAll('.bcard').forEach(card => {
        const handleSelect = () => {
            const id = card.dataset.postId;
            setPostQueryParam(id);
        };

        card.addEventListener('click', handleSelect);
        card.addEventListener('keydown', e => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleSelect();
            }
        });
    });
}

function buildCardHTML(post) {
    const coverImage = post.cover || 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=1000&auto=format&fit=crop';

    const tagsHtml = (post.tags || [])
        .map(t => `<span class="bcard__tag">${t}</span>`)
        .join('');

    const formattedDate = post.created_at ? post.created_at.substring(0, 10) : '';

    return `
    <article
        class="bcard"
        data-post-id="${post.id}"
        role="button"
        tabindex="0"
        aria-label="Ler postagem: ${post.title}"
    >
        <div class="bcard__thumb">
            <img src="${coverImage}" alt="${post.title}" loading="lazy" draggable="false">
        </div>
        <div class="bcard__body">
            <div class="bcard__header">
                <span class="bcard__category">${post.category || 'Artigo'}</span>
                <div class="bcard__meta">
                    ${formattedDate ? `<span>${formattedDate}</span> • ` : ''}
                    <span>${post.read_time || '5 min'}</span>
                </div>
            </div>
            <h2 class="bcard__title">${post.title}</h2>
            <p class="bcard__summary">${post.summary || ''}</p>
            <div class="bcard__footer">
                <div class="bcard__tags">${tagsHtml}</div>
                <span class="bcard__action">
                    Ler artigo
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                        <polyline points="12 5 19 12 12 19"></polyline>
                    </svg>
                </span>
            </div>
        </div>
    </article>`;
}

// =====================================================================
// MODAL EM TELA CHEIA (FULL-SCREEN)
// =====================================================================

function initModalEvents() {
    const overlay = document.getElementById('blog-modal-overlay');
    const closeBtn = document.getElementById('blog-modal-close');

    closeBtn?.addEventListener('click', () => closePostModal(true));

    overlay?.addEventListener('click', e => {
        if (e.target === overlay) closePostModal(true);
    });

    window.addEventListener('keydown', e => {
        if (e.key === 'Escape') closePostModal(true);
    });
}

async function openPostModal(post) {
    const overlay = document.getElementById('blog-modal-overlay');
    const titleEl = document.getElementById('blog-modal-title');
    const categoryEl = document.getElementById('blog-modal-category');
    const authorEl = document.getElementById('blog-modal-author');
    const dateEl = document.getElementById('blog-modal-date');
    const readTimeEl = document.getElementById('blog-modal-readtime');
    const bodyEl = document.getElementById('blog-modal-body');

    if (!overlay || !bodyEl) return;

    currentController?.abort();
    currentController = new AbortController();

    if (titleEl) titleEl.textContent = post.title;
    if (categoryEl) categoryEl.textContent = post.category || 'Artigo';
    if (authorEl) authorEl.textContent = post.author || 'Elizeu Sanches (Ares)';
    if (dateEl) dateEl.textContent = post.created_at ? post.created_at.substring(0, 10) : '';
    if (readTimeEl) readTimeEl.textContent = post.read_time || '5 min de leitura';

    bodyEl.innerHTML = `
        <div class="blog-modal__content-wrap">
            <div class="blog-modal__loader" id="blog-modal-loader">Carregando artigo...</div>
            <div class="blog-modal__error" id="blog-modal-error" hidden></div>
            <div class="blog-markdown-content" id="blog-modal-content"></div>
        </div>
    `;

    overlay.classList.add('is-open');
    document.body.classList.add('modal-open');

    try {
        const md = await fetchMarkdown(post.mdFile);
        const html = parseMarkdown(md);

        const loaderEl = document.getElementById('blog-modal-loader');
        const contentEl = document.getElementById('blog-modal-content');

        if (contentEl) contentEl.innerHTML = html;
        if (loaderEl) loaderEl.style.display = 'none';

        // Renderização dos diagramas Mermaid
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
                console.error('[Mermaid] Erro na renderização:', err);
            }
        }

        bodyEl.scrollTop = 0;
    } catch (err) {
        if (err.name === 'AbortError') return;
        console.error('[BlogPage] Erro ao carregar MD do post:', err);

        const loaderEl = document.getElementById('blog-modal-loader');
        const errorEl = document.getElementById('blog-modal-error');

        if (loaderEl) loaderEl.style.display = 'none';
        if (errorEl) {
            errorEl.hidden = false;
            errorEl.textContent = `Não foi possível carregar a postagem. (${err.message})`;
        }
    }
}

function closePostModal(updateUrl = true) {
    const overlay = document.getElementById('blog-modal-overlay');
    overlay?.classList.remove('is-open');
    document.body.classList.remove('modal-open');

    currentController?.abort();
    currentController = null;

    if (updateUrl) {
        clearPostQueryParam();
    }
}

// =====================================================================
// OUTROS EFEITOS (PARTÍCULAS & BACK LINK)
// =====================================================================

function initParticles() {
    const tryStart = (attempts = 0) => {
        if (window.ParticleEngine) {
            window.ParticleEngine.start('blog-page-bg');
        } else if (attempts < 20) {
            setTimeout(() => tryStart(attempts + 1), 50);
        }
    };
    tryStart();
}

function initBackLink() {
    const btn = document.getElementById('blog-back');
    btn?.addEventListener('click', () => {
        window.location.href = './index.html';
    });
}
