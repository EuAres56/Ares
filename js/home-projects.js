/**
 * ARES — Projetos em destaque na LP
 * =====================================================================
 * Busca os projetos marcados como "featured" no dashboard e substitui
 * os 3 cards estáticos de index.html. Se a API falhar ou não houver
 * nenhum destaque configurado ainda, mantém o fallback estático que já
 * existe no HTML (não quebra a LP em produção).
 */

const STATUS_LABELS = {
    live: 'Ao vivo',
    dev: 'Em desenvolvimento',
    concept: 'Estudo de caso',
    archived: 'Arquivado'
};

document.addEventListener('DOMContentLoaded', async () => {
    const grid = document.getElementById('projects-grid');
    if (!grid) return;

    try {
        const response = await fetch('/api/projects?featured=1');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const projects = await response.json();
        if (!Array.isArray(projects) || projects.length === 0) return; // fallback estático permanece

        grid.innerHTML = projects.map(buildCardHTML).join('');
    } catch (err) {
        console.warn('[HomeProjects] Não foi possível carregar destaques dinâmicos, mantendo fallback estático:', err);
    }
});

function buildCardHTML(project) {
    const statusLabel = STATUS_LABELS[project.status] || project.status;
    const tags = (project.tags || []).slice(0, 2)
        .map(t => `<span>${escapeHtml(t)}</span>`).join('');
    const icon = project.icon || 'code';

    return `
        <article class="project-card">
            <div class="project-card-inner">
                <div class="project-thumb">
                    <span class="project-status">${escapeHtml(statusLabel)}</span>
                    <i class="is_10 ${escapeHtml(icon)}"></i>
                </div>
                <div class="project-tags">${tags}</div>
                <div class="project-body">
                    <h3>${escapeHtml(project.title)}</h3>
                    <p>${escapeHtml(project.desc || '')}</p>
                    <a href="/projects.html?p=${encodeURIComponent(project.id)}" class="project-link">
                        <span>Ver projeto</span> →
                    </a>
                </div>
            </div>
        </article>`;
}

function escapeHtml(str) {
    if (str === undefined || str === null) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
