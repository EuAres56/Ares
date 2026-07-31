/**
 * ARES — Budget Page Controller
 * =====================================================================
 * Gerencia a renderização de propostas comerciais e orçamentos detalhados
 */

import { CacheSystem } from './cache-system.js';
import { fetchMarkdown, parseMarkdown } from './engines/md-renderer.js';

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Inicializa cache de assets e injeta o background de projetos
  await CacheSystem.init();
  const bg_pg_projects = await CacheSystem.getBlobUrl("./assets/images/Bg_projects.webp");
  document.documentElement.style.setProperty('--bg-page-projects', `url('${bg_pg_projects}')`);

  // 2. Extrai o parâmetro ?o= da URL
  const params = new URLSearchParams(window.location.search);
  const budgetId = params.get('o');

  const container = document.getElementById('budget-container');
  const loader = document.getElementById('budget-loader');
  const errorEl = document.getElementById('budget-error');

  if (!budgetId) {
    showError('Nenhum código de orçamento foi especificado na URL.');
    return;
  }

  try {
    // 3. Consulta a API D1
    const response = await fetch(`/api/budget?o=${encodeURIComponent(budgetId)}`);
    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error || `HTTP ${response.status}`);
    }

    const budget = await response.json();

    console.log('[BudgetPage] Orçamento carregado:', budget);

    // 4. Busca e renderiza o arquivo Markdown
    const mdContent = await fetchMarkdown(budget.md_file);
    const htmlContent = parseMarkdown(mdContent);

    // 5. Renderiza a estrutura completa na tela
    renderBudgetUI(budget, htmlContent);

    // 6. Suporte a diagramas Mermaid se existirem na proposta
    if (window.mermaid) {
      window.mermaid.initialize({ startOnLoad: false, theme: 'dark' });
      await window.mermaid.run({ nodes: document.querySelectorAll('.mermaid') });
    }

  } catch (err) {
    console.error('[BudgetPage] Erro ao carregar orçamento:', err);
    showError(err.message);
  }

  function showError(msg) {
    if (loader) loader.style.display = 'none';
    if (errorEl) {
      errorEl.hidden = false;
      errorEl.textContent = msg;
    }
  }
});

function renderBudgetUI(budget, parsedHtml) {
  const loader = document.getElementById('budget-loader');
  const contentArea = document.getElementById('budget-content');

  if (loader) loader.style.display = 'none';

  // Formatação do valor monetário em BRL
  const formattedValue = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(budget.total_amount);

  // Link do WhatsApp com mensagem pré-formatada trazendo o ID e Título do orçamento
  const waMessage = encodeURIComponent(
    `Olá! Gostaria de conversar sobre a proposta #${budget.id} (${budget.title}).`
  );
  const waLink = `https://api.whatsapp.com/send/?phone=558796504291&text=${waMessage}`;

  contentArea.innerHTML = `
    <header class="budget-header">
      <div class="budget-meta">
        <span class="budget-badge budget-badge--${budget.status}">${budget.status.toUpperCase()}</span>
        <span class="budget-date">Emissão/Validade: ${budget.date}</span>
      </div>
      <h1 class="budget-title">${budget.title}</h1>
      <p class="budget-client">Apresentado para: <strong>${budget.client_name}</strong></p>

      <div class="budget-price-box">
        <span>Valor Estimado</span>
        <h2>${formattedValue}</h2>
      </div>
    </header>

    <div class="budget-body markdown-body">
      ${parsedHtml}
    </div>

    <footer class="budget-footer">
      <a href="${waLink}" target="_blank" rel="noopener noreferrer" class="budget-action-btn">
        Aprovar / Tirar Dúvidas no WhatsApp
      </a>
    </footer>
  `;
}
