/**
 * ARES — Markdown Renderer Engine (Proteção contra tags dentro do Mermaid)
 */

/**
 * Carrega um arquivo Markdown (suporta caminhos locais e URLs remotas do GitHub/R2).
 * @param {string} mdFile — nome do arquivo ou URL completa
 * @returns {Promise<string>} — texto bruto do Markdown
 */
export async function fetchMarkdown(mdFile) {

    const res = await fetch(mdFile);
    if (!res.ok) throw new Error(`Não foi possível carregar o arquivo (${res.status})`);

    const text = await res.text();

    // Trava de segurança: Se a resposta for um documento HTML por engano (ex: erro 404 redirecionado), rejeita
    if (text.trim().toLowerCase().startsWith('<!doctype html') || text.trim().toLowerCase().startsWith('<html')) {
        throw new Error("O arquivo Markdown retornado é inválido (resposta HTML de fallback).");
    }

    return text;
}

export function parseMarkdown(md) {
    let html = md.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    // Array para armazenar os blocos de código e Mermaid sem contaminação por <p>
    const codeBlocks = [];

    // ── 1. Extrai e oculta os blocos Mermaid ──────────────────────
    html = html.replace(/```mermaid\n([\s\S]*?)```/gm, (_, code) => {
        const placeholder = `%%MERMAID_BLOCK_${codeBlocks.length}%%`;
        const cleanCode = code
            .trim()
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');

        codeBlocks.push(`<div class="mermaid-wrap"><pre class="mermaid">${cleanCode}</pre></div>`);
        return placeholder;
    });

    // ── 2. Extrai e oculta blocos de código genéricos ─────────────
    html = html.replace(/```(\w*)\n([\s\S]*?)```/gm, (_, lang, code) => {
        const placeholder = `%%CODE_BLOCK_${codeBlocks.length}%%`;
        const escaped = escapeHtml(code.trimEnd());
        const langLabel = lang ? `<span class="md-code-lang">${lang}</span>` : '';

        codeBlocks.push(`<pre class="md-pre">${langLabel}<code class="md-code-block">${escaped}</code></pre>`);
        return placeholder;
    });

    // ── 3. Tabelas ───────────────────────────────────────────────────
    html = html.replace(/(?:^|\n)((?:\|[^\n]+\|\n?)+)/g, (_, table) => {
        const rows = table.trim().split('\n').filter(r => r.trim());
        if (rows.length < 2) return _;

        const header = rows[0].split('|').slice(1, -1).map(c => `<th>${inlineMarkdown(c.trim())}</th>`).join('');
        const bodyRows = rows.slice(2).map(row => {
            const cells = row.split('|').slice(1, -1).map(c => `<td>${inlineMarkdown(c.trim())}</td>`).join('');
            return `<tr>${cells}</tr>`;
        }).join('');

        return `<div class="md-table-wrap"><table class="md-table"><thead><tr>${header}</tr></thead><tbody>${bodyRows}</tbody></table></div>`;
    });

    // ── 4. Separadores ──────────────────────────────────────────────
    html = html.replace(/^---+$/gm, '<hr class="md-hr">');

    // ── 5. Blockquotes ──────────────────────────────────────────────
    html = html.replace(/^> (.+)$/gm, (_, content) =>
        `<blockquote class="md-blockquote">${inlineMarkdown(content)}</blockquote>`
    );

    // ── 6. Headings ────────────────────────────────────────────────
    html = html.replace(/^#{6}\s+(.+)$/gm, (_, t) => `<h6 class="md-h6">${inlineMarkdown(t)}</h6>`);
    html = html.replace(/^#{5}\s+(.+)$/gm, (_, t) => `<h5 class="md-h5">${inlineMarkdown(t)}</h5>`);
    html = html.replace(/^#{4}\s+(.+)$/gm, (_, t) => `<h4 class="md-h4">${inlineMarkdown(t)}</h4>`);
    html = html.replace(/^#{3}\s+(.+)$/gm, (_, t) => `<h3 class="md-h3">${inlineMarkdown(t)}</h3>`);
    html = html.replace(/^#{2}\s+(.+)$/gm, (_, t) => `<h2 class="md-h2">${inlineMarkdown(t)}</h2>`);
    html = html.replace(/^#{1}\s+(.+)$/gm, (_, t) => `<h1 class="md-h1">${inlineMarkdown(t)}</h1>`);

    // ── 7. Listas ───────────────────────────────────────────────────
    html = html.replace(/((?:^[-*+] .+\n?)+)/gm, block => {
        const items = block.trim().split('\n').map(line =>
            `<li>${inlineMarkdown(line.replace(/^[-*+] /, ''))}</li>`
        ).join('');
        return `<ul class="md-ul">${items}</ul>`;
    });

    html = html.replace(/((?:^\d+\. .+\n?)+)/gm, block => {
        const items = block.trim().split('\n').map(line =>
            `<li>${inlineMarkdown(line.replace(/^\d+\. /, ''))}</li>`
        ).join('');
        return `<ol class="md-ol">${items}</ol>`;
    });

    // ── 8. Parágrafos (Apenas no texto normal fora de placeholders) ─
    html = html.replace(/^(?!<[a-zA-Z\/\!])(?!%%(?:MERMAID|CODE)_BLOCK_\d+%%)(.+)$/gm, line => {
        const trimmed = line.trim();
        if (!trimmed) return '';
        return `<p class="md-p">${inlineMarkdown(trimmed)}</p>`;
    });

    // ── 9. Reinjeta os blocos de código e Mermaid intactos ──────────
    codeBlocks.forEach((block, index) => {
        html = html.replace(`%%MERMAID_BLOCK_${index}%%`, block);
        html = html.replace(`%%CODE_BLOCK_${index}%%`, block);
    });

    html = html.replace(/\n{3,}/g, '\n\n');
    return html;
}

function inlineMarkdown(text) {
    let t = escapeHtmlPartial(text);

    t = t.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, src) =>
        `<img class="md-img" src="${src}" alt="${alt}">`
    );

    t = t.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, href) =>
        `<a class="md-link" href="${href}" target="_blank" rel="noopener">${label}</a>`
    );

    t = t.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
    t = t.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    t = t.replace(/\*(.+?)\*/g, '<em>$1</em>');
    t = t.replace(/`([^`]+)`/g, '<code class="md-inline-code">$1</code>');

    return t;
}

function escapeHtml(str) {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function escapeHtmlPartial(str) {
    if (/<[a-zA-Z]/.test(str)) return str;
    return str.replace(/&(?![a-z#]\w*;)/g, '&amp;');
}
