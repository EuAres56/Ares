import { isAuthorized, unauthorizedResponse } from './_auth.js';

// =====================================================================
// GET — Lista pública (usada em /projects.html e na LP via ?featured=1)
// =====================================================================
export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const onlyFeatured = url.searchParams.get('featured');

  try {
    const query = onlyFeatured === '1'
      ? "SELECT * FROM projects WHERE featured = 1 ORDER BY featured_order ASC"
      : "SELECT * FROM projects ORDER BY created_at DESC";

    const { results } = await env.DB.prepare(query).all();

    const formattedProjects = results.map(p => ({
      ...p,
      tags: JSON.parse(p.tags || '[]'),
      links: JSON.parse(p.links || '[]'),
      featured: Boolean(p.featured)
    }));

    return new Response(JSON.stringify(formattedProjects), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "max-age=60, s-maxage=300"
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

// =====================================================================
// POST — Cria um novo projeto (dashboard)
// =====================================================================
export async function onRequestPost(context) {
  const { request, env } = context;
  if (!isAuthorized(request, env)) return unauthorizedResponse();

  try {
    const body = await request.json();
    const {
      id, title, desc = '', thumb = '', icon = 'code',
      tags = [], links = [], status = 'dev', mdFile = ''
    } = body;

    if (!id || !title) {
      return badRequest('id e title são obrigatórios.');
    }

    await env.DB.prepare(
      `INSERT INTO projects (id, title, desc, thumb, icon, tags, links, status, mdFile, featured, featured_order, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NULL, datetime('now'))`
    ).bind(id, title, desc, thumb, icon, JSON.stringify(tags), JSON.stringify(links), status, mdFile).run();

    return new Response(JSON.stringify({ success: true, id }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return serverError(error);
  }
}

// =====================================================================
// PUT — Atualiza metadados (inclui toggle de "featured", máx. 3)
// =====================================================================
export async function onRequestPut(context) {
  const { request, env } = context;
  if (!isAuthorized(request, env)) return unauthorizedResponse();

  try {
    const body = await request.json();
    const {
      id, title, desc = '', thumb = '', icon = 'code',
      tags = [], links = [], status = 'dev', mdFile = '',
      featured = false, featured_order = null
    } = body;

    if (!id) return badRequest('id é obrigatório.');

    if (featured) {
      const { results } = await env.DB.prepare(
        "SELECT id FROM projects WHERE featured = 1 AND id != ?"
      ).bind(id).all();

      if (results.length >= 3) {
        return badRequest('Já existem 3 projetos em destaque. Remova um antes de adicionar outro.');
      }
    }

    await env.DB.prepare(
      `UPDATE projects SET
        title = ?, desc = ?, thumb = ?, icon = ?, tags = ?, links = ?,
        status = ?, mdFile = ?, featured = ?, featured_order = ?
       WHERE id = ?`
    ).bind(
      title, desc, thumb, icon, JSON.stringify(tags), JSON.stringify(links),
      status, mdFile, featured ? 1 : 0, featured ? (featured_order || 1) : null, id
    ).run();

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return serverError(error);
  }
}

// =====================================================================
// DELETE — Remove projeto (?id=)
// =====================================================================
export async function onRequestDelete(context) {
  const { request, env } = context;
  if (!isAuthorized(request, env)) return unauthorizedResponse();

  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    if (!id) return badRequest('id é obrigatório.');

    await env.DB.prepare("DELETE FROM projects WHERE id = ?").bind(id).run();

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return serverError(error);
  }
}

function badRequest(message) {
  return new Response(JSON.stringify({ error: message }), {
    status: 400,
    headers: { 'Content-Type': 'application/json' }
  });
}

function serverError(error) {
  return new Response(JSON.stringify({ error: error.message }), {
    status: 500,
    headers: { 'Content-Type': 'application/json' }
  });
}
