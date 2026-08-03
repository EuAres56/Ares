/**
 * ARES — Dashboard Controller
 * =====================================================================
 * Gerencia login simples por chave, as duas abas (Projetos / Orçamentos),
 * CRUD via /api/projects e /api/budgets, upload de .md para o R2 via
 * /api/upload-md, e o controle de "destaque" (máx. 3) que a LP consome
 * em /api/projects?featured=1.
 */

const STORAGE_KEY = 'ares_dashboard_key';

let PROJECTS = [];
let BUDGETS = [];
let projectLinkRows = []; // estado das linhas de link do form de projeto

// =====================================================================
// BOOTSTRAP
// =====================================================================

document.addEventListener('DOMContentLoaded', () => {
    initBackLink();
    initLogout();
    initLoginForm();
    initTabs();
    initProjectForm();
    initBudgetForm();

    const savedKey = sessionStorage.getItem(STORAGE_KEY);
    if (savedKey) {
        tryEnterDashboard(savedKey);
    }
});

function initBackLink() {
    document.getElementById('proj-back')?.addEventListener('click', () => {
        window.location.href = './index.html';
    });
}

function initLogout() {
    document.getElementById('dash-logout')?.addEventListener('click', () => {
        sessionStorage.removeItem(STORAGE_KEY);
        window.location.reload();
    });
}

// =====================================================================
// LOGIN
// =====================================================================

function initLoginForm() {
    const form = document.getElementById('dash-login-form');
    form?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const key = document.getElementById('dash-key-input').value.trim();
        if (!key) return;
        await tryEnterDashboard(key);
    });
}

async function tryEnterDashboard(key) {
    const errorEl = document.getElementById('dash-login-error');
    errorEl.hidden = true;

    try {
        // Usa /api/budgets (protegida) como teste de validade da chave
        const response = await fetch('/api/budgets', {
            headers: { Authorization: `Bearer ${key}` }
        });

        if (response.status === 401) {
            errorEl.textContent = 'Chave inválida.';
            errorEl.hidden = false;
            sessionStorage.removeItem(STORAGE_KEY);
            return;
        }
        if (!response.ok) {
            errorEl.textContent = `Erro ao validar chave (HTTP ${response.status}).`;
            errorEl.hidden = false;
            return;
        }

        sessionStorage.setItem(STORAGE_KEY, key);
        document.getElementById('dash-login-overlay').hidden = true;
        document.getElementById('dash-app').hidden = false;

        await Promise.all([loadProjects(), loadBudgets()]);
    } catch (err) {
        errorEl.textContent = `Falha de conexão: ${err.message}`;
        errorEl.hidden = false;
    }
}

function authHeaders() {
    const key = sessionStorage.getItem(STORAGE_KEY);
    return {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`
    };
}

// =====================================================================
// TABS
// =====================================================================

function initTabs() {
    const tabs = document.querySelectorAll('.dash-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('is-active'));
            tab.classList.add('is-active');

            document.querySelectorAll('.dash-panel').forEach(p => p.classList.remove('is-active'));
            document.getElementById(`panel-${tab.dataset.tab}`)?.classList.add('is-active');
        });
    });
}

// =====================================================================
// UPLOAD DE MARKDOWN (R2)
// =====================================================================

async function uploadMarkdown(file, type, id) {
    const key = sessionStorage.getItem(STORAGE_KEY);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);
    formData.append('id', id);

    const response = await fetch('/api/upload-md', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}` },
        body: formData
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Falha no upload do arquivo .md');
    return data.path; // ex: /api/md/projects/meu-projeto.md
}

// =====================================================================
// PROJETOS — LISTA
// =====================================================================

async function loadProjects() {
    try {
        const response = await fetch('/api/projects');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        PROJECTS = await response.json();
        renderProjectsList();
    } catch (err) {
        console.error('[Dashboard] Erro ao carregar projetos:', err);
    }
}

function renderProjectsList() {
    const list = document.getElementById('projects-list');
    const counter = document.getElementById('p-featured-counter');
    const featuredCount = PROJECTS.filter(p => p.featured).length;
    counter.textContent = `${featuredCount}/3 em destaque`;

    if (!PROJECTS.length) {
        list.innerHTML = '<p class="dash-empty">Nenhum projeto cadastrado ainda.</p>';
        return;
    }

    list.innerHTML = PROJECTS.map(p => `
        <div class="dash-list-item" data-id="${escapeHtml(p.id)}">
            <label class="dash-featured-toggle">
                <input type="checkbox" class="p-featured-checkbox" data-id="${escapeHtml(p.id)}" ${p.featured ? 'checked' : ''}
                    ${(!p.featured && featuredCount >= 3) ? 'disabled' : ''}>
                Destaque
            </label>
            <div class="dash-list-item__info">
                <strong>${escapeHtml(p.title)}</strong>
                <span>${escapeHtml(p.id)} · ${escapeHtml(p.status)}</span>
            </div>
            <div class="dash-list-item__actions">
                <button type="button" class="p-edit-btn" data-id="${escapeHtml(p.id)}">Editar</button>
                <button type="button" class="is-danger p-delete-btn" data-id="${escapeHtml(p.id)}">Excluir</button>
            </div>
        </div>
    `).join('');

    list.querySelectorAll('.p-featured-checkbox').forEach(cb => {
        cb.addEventListener('change', onToggleFeatured);
    });
    list.querySelectorAll('.p-edit-btn').forEach(btn => {
        btn.addEventListener('click', () => fillProjectForm(btn.dataset.id));
    });
    list.querySelectorAll('.p-delete-btn').forEach(btn => {
        btn.addEventListener('click', () => deleteProject(btn.dataset.id));
    });
}

async function onToggleFeatured(e) {
    const checkbox = e.target;
    const id = checkbox.dataset.id;
    const project = PROJECTS.find(p => p.id === id);
    if (!project) return;

    const wantsFeatured = checkbox.checked;
    const currentFeaturedCount = PROJECTS.filter(p => p.featured && p.id !== id).length;

    if (wantsFeatured && currentFeaturedCount >= 3) {
        checkbox.checked = false;
        alert('Você já tem 3 projetos em destaque. Desmarque um antes de adicionar outro.');
        return;
    }

    const nextOrder = wantsFeatured
        ? (currentFeaturedCount + 1)
        : null;

    try {
        const response = await fetch('/api/projects', {
            method: 'PUT',
            headers: authHeaders(),
            body: JSON.stringify({
                ...project,
                featured: wantsFeatured,
                featured_order: nextOrder
            })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Erro ao atualizar destaque.');

        await loadProjects();
    } catch (err) {
        alert(err.message);
        checkbox.checked = !wantsFeatured;
    }
}

async function deleteProject(id) {
    if (!confirm(`Excluir o projeto "${id}"? Essa ação não remove o arquivo .md do bucket.`)) return;

    try {
        const response = await fetch(`/api/projects?id=${encodeURIComponent(id)}`, {
            method: 'DELETE',
            headers: authHeaders()
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Erro ao excluir.');

        await loadProjects();
    } catch (err) {
        alert(err.message);
    }
}

// =====================================================================
// PROJETOS — FORMULÁRIO
// =====================================================================

function initProjectForm() {
    document.getElementById('p-add-link').addEventListener('click', () => addLinkRow());
    document.getElementById('p-cancel-edit').addEventListener('click', resetProjectForm);

    document.getElementById('p-title').addEventListener('input', (e) => {
        const idField = document.getElementById('p-id');
        const originalId = document.getElementById('p-original-id').value;
        // Só auto-preenche o slug se estiver criando um projeto novo
        if (!originalId) {
            idField.value = slugify(e.target.value);
        }
    });

    document.getElementById('project-form').addEventListener('submit', onSubmitProject);
}

function slugify(text) {
    return text
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-');
}

function addLinkRow(link = { type: 'redirect', name: '', link: '' }) {
    const rowId = `link-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    projectLinkRows.push({ rowId, ...link });
    renderLinkRows();
}

function renderLinkRows() {
    const wrap = document.getElementById('p-links-rows');
    wrap.innerHTML = projectLinkRows.map(row => `
        <div class="dash-link-row" data-row-id="${row.rowId}">
            <select class="link-type">
                <option value="redirect" ${row.type === 'redirect' ? 'selected' : ''}>Link</option>
                <option value="download" ${row.type === 'download' ? 'selected' : ''}>Download</option>
            </select>
            <input type="text" class="link-name" placeholder="Nome (ex: Repositório)" value="${escapeHtml(row.name)}">
            <input type="text" class="link-url" placeholder="https://..." value="${escapeHtml(row.link)}">
            <button type="button" class="dash-link-remove" data-row-id="${row.rowId}">✕</button>
        </div>
    `).join('');

    wrap.querySelectorAll('.dash-link-remove').forEach(btn => {
        btn.addEventListener('click', () => {
            projectLinkRows = projectLinkRows.filter(r => r.rowId !== btn.dataset.rowId);
            renderLinkRows();
        });
    });
}

function collectLinkRows() {
    const wrap = document.getElementById('p-links-rows');
    const rows = wrap.querySelectorAll('.dash-link-row');
    const links = [];
    rows.forEach(row => {
        const type = row.querySelector('.link-type').value;
        const name = row.querySelector('.link-name').value.trim();
        const link = row.querySelector('.link-url').value.trim();
        if (name && link) links.push({ type, name, link });
    });
    return links;
}

function fillProjectForm(id) {
    const project = PROJECTS.find(p => p.id === id);
    if (!project) return;

    document.getElementById('project-form-title').textContent = `Editando: ${project.title}`;
    document.getElementById('p-original-id').value = project.id;
    document.getElementById('p-id').value = project.id;
    document.getElementById('p-id').disabled = true; // não deixa trocar o slug em edição (evita órfãos no bucket)
    document.getElementById('p-title').value = project.title;
    document.getElementById('p-desc').value = project.desc || '';
    document.getElementById('p-thumb').value = project.thumb || '';
    document.getElementById('p-icon').value = project.icon || '';
    document.getElementById('p-status').value = project.status || 'dev';
    document.getElementById('p-tags').value = (project.tags || []).join(', ');
    document.getElementById('p-featured').checked = Boolean(project.featured);
    document.getElementById('p-md-current').textContent = project.mdFile
        ? `Arquivo atual: ${project.mdFile}`
        : 'Nenhum arquivo .md associado ainda.';

    projectLinkRows = (project.links || []).map(l => ({
        rowId: `link-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        ...l
    }));
    renderLinkRows();

    document.getElementById('p-cancel-edit').hidden = false;
    document.getElementById('panel-projects').scrollIntoView({ behavior: 'smooth' });
}

function resetProjectForm() {
    document.getElementById('project-form-title').textContent = 'Novo projeto';
    document.getElementById('project-form').reset();
    document.getElementById('p-original-id').value = '';
    document.getElementById('p-id').disabled = false;
    document.getElementById('p-md-current').textContent = '';
    document.getElementById('p-cancel-edit').hidden = true;
    projectLinkRows = [];
    renderLinkRows();
}

async function onSubmitProject(e) {
    e.preventDefault();
    const msgEl = document.getElementById('p-form-msg');
    msgEl.hidden = true;

    const originalId = document.getElementById('p-original-id').value;
    const id = document.getElementById('p-id').value.trim();
    const title = document.getElementById('p-title').value.trim();
    const desc = document.getElementById('p-desc').value.trim();
    const thumb = document.getElementById('p-thumb').value.trim();
    const icon = document.getElementById('p-icon').value.trim() || 'code';
    const status = document.getElementById('p-status').value;
    const tags = document.getElementById('p-tags').value
        .split(',').map(t => t.trim()).filter(Boolean);
    const links = collectLinkRows();
    const featured = document.getElementById('p-featured').checked;
    const mdFileInput = document.getElementById('p-md-file');
    const isEditing = Boolean(originalId);

    try {
        let mdFile = isEditing ? (PROJECTS.find(p => p.id === originalId)?.mdFile || '') : '';

        if (mdFileInput.files.length > 0) {
            mdFile = await uploadMarkdown(mdFileInput.files[0], 'projects', id);
        }

        const payload = { id, title, desc, thumb, icon, status, tags, links, mdFile, featured };

        const response = await fetch('/api/projects', {
            method: isEditing ? 'PUT' : 'POST',
            headers: authHeaders(),
            body: JSON.stringify(payload)
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Erro ao salvar projeto.');

        showMsg(msgEl, 'Projeto salvo com sucesso!', true);
        resetProjectForm();
        await loadProjects();
    } catch (err) {
        showMsg(msgEl, err.message, false);
    }
}

// =====================================================================
// ORÇAMENTOS — LISTA
// =====================================================================

async function loadBudgets() {
    try {
        const response = await fetch('/api/budgets', { headers: authHeaders() });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        BUDGETS = await response.json();
        renderBudgetsList();
    } catch (err) {
        console.error('[Dashboard] Erro ao carregar orçamentos:', err);
    }
}

function renderBudgetsList() {
    const list = document.getElementById('budgets-list');

    if (!BUDGETS.length) {
        list.innerHTML = '<p class="dash-empty">Nenhum orçamento emitido ainda.</p>';
        return;
    }

    const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

    list.innerHTML = BUDGETS.map(b => `
        <div class="dash-list-item" data-id="${escapeHtml(b.id)}">
            <div class="dash-list-item__info">
                <strong>${escapeHtml(b.title)}</strong>
                <span>${escapeHtml(b.client_name || '')} · ${currency.format(b.total_amount || 0)} · ${escapeHtml(b.status)}</span>
            </div>
            <div class="dash-list-item__actions">
                <a href="./budget.html?o=${encodeURIComponent(b.id)}" target="_blank" title="Ver proposta">Ver</a>
                <button type="button" class="b-edit-btn" data-id="${escapeHtml(b.id)}">Editar</button>
                <button type="button" class="is-danger b-delete-btn" data-id="${escapeHtml(b.id)}">Excluir</button>
            </div>
        </div>
    `).join('');

    list.querySelectorAll('.b-edit-btn').forEach(btn => {
        btn.addEventListener('click', () => fillBudgetForm(btn.dataset.id));
    });
    list.querySelectorAll('.b-delete-btn').forEach(btn => {
        btn.addEventListener('click', () => deleteBudget(btn.dataset.id));
    });
}

async function deleteBudget(id) {
    if (!confirm(`Excluir o orçamento "${id}"?`)) return;

    try {
        const response = await fetch(`/api/budgets?id=${encodeURIComponent(id)}`, {
            method: 'DELETE',
            headers: authHeaders()
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Erro ao excluir.');

        await loadBudgets();
    } catch (err) {
        alert(err.message);
    }
}

// =====================================================================
// ORÇAMENTOS — FORMULÁRIO
// =====================================================================

function initBudgetForm() {
    document.getElementById('b-cancel-edit').addEventListener('click', resetBudgetForm);

    document.getElementById('b-title').addEventListener('input', (e) => {
        const idField = document.getElementById('b-id');
        const originalId = document.getElementById('b-original-id').value;
        if (!originalId) {
            idField.value = slugify(e.target.value);
        }
    });

    document.getElementById('budget-form').addEventListener('submit', onSubmitBudget);
}

function fillBudgetForm(id) {
    const budget = BUDGETS.find(b => b.id === id);
    if (!budget) return;

    document.getElementById('budget-form-title').textContent = `Editando: ${budget.title}`;
    document.getElementById('b-original-id').value = budget.id;
    document.getElementById('b-id').value = budget.id;
    document.getElementById('b-id').disabled = true;
    document.getElementById('b-title').value = budget.title;
    document.getElementById('b-client').value = budget.client_name || '';
    document.getElementById('b-date').value = budget.date || '';
    document.getElementById('b-status').value = budget.status || 'pending';
    document.getElementById('b-amount').value = budget.total_amount || 0;
    document.getElementById('b-md-current').textContent = budget.md_file
        ? `Arquivo atual: ${budget.md_file}`
        : 'Nenhum arquivo .md associado ainda.';

    document.getElementById('b-cancel-edit').hidden = false;
    document.getElementById('panel-budgets').scrollIntoView({ behavior: 'smooth' });
}

function resetBudgetForm() {
    document.getElementById('budget-form-title').textContent = 'Novo orçamento';
    document.getElementById('budget-form').reset();
    document.getElementById('b-original-id').value = '';
    document.getElementById('b-id').disabled = false;
    document.getElementById('b-md-current').textContent = '';
    document.getElementById('b-cancel-edit').hidden = true;
}

async function onSubmitBudget(e) {
    e.preventDefault();
    const msgEl = document.getElementById('b-form-msg');
    msgEl.hidden = true;

    const originalId = document.getElementById('b-original-id').value;
    const id = document.getElementById('b-id').value.trim();
    const title = document.getElementById('b-title').value.trim();
    const client_name = document.getElementById('b-client').value.trim();
    const date = document.getElementById('b-date').value;
    const status = document.getElementById('b-status').value;
    const total_amount = parseFloat(document.getElementById('b-amount').value) || 0;
    const mdFileInput = document.getElementById('b-md-file');
    const isEditing = Boolean(originalId);

    try {
        let md_file = isEditing ? (BUDGETS.find(b => b.id === originalId)?.md_file || '') : '';

        if (mdFileInput.files.length > 0) {
            md_file = await uploadMarkdown(mdFileInput.files[0], 'budgets', id);
        }

        const payload = { id, title, client_name, date, status, total_amount, md_file };

        const response = await fetch('/api/budgets', {
            method: isEditing ? 'PUT' : 'POST',
            headers: authHeaders(),
            body: JSON.stringify(payload)
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Erro ao salvar orçamento.');

        showMsg(msgEl, 'Orçamento salvo com sucesso!', true);
        resetBudgetForm();
        await loadBudgets();
    } catch (err) {
        showMsg(msgEl, err.message, false);
    }
}

// =====================================================================
// HELPERS
// =====================================================================

function showMsg(el, text, success) {
    el.textContent = text;
    el.hidden = false;
    el.className = `dash-msg ${success ? 'is-success' : 'is-error'}`;
}

function escapeHtml(str) {
    if (str === undefined || str === null) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
