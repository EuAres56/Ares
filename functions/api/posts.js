import { isAuthorized, unauthorizedResponse } from './_auth.js';

// =====================================================================
// GET — Lista pública de postagens (usada em /blog.html)
// =====================================================================
export async function onRequestGet(context) {
  const { request, env } = context;

  try {
    // Tenta buscar no banco D1 se a binding DB existir
    if (env && env.DB) {
      const { results } = await env.DB.prepare(
        "SELECT * FROM posts WHERE status = 'published' OR status IS NULL ORDER BY created_at DESC"
      ).all();

      const formattedPosts = results.map(p => ({
        ...p,
        tags: typeof p.tags === 'string' ? JSON.parse(p.tags || '[]') : (p.tags || []),
        read_time: p.read_time || '5 min',
        category: p.category || 'Artigo'
      }));

      return new Response(JSON.stringify(formattedPosts), {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "max-age=60, s-maxage=300"
        }
      });
    }

    return new Response(JSON.stringify([]), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

// =====================================================================
// POST — Cria uma nova postagem (dashboard)
// =====================================================================
export async function onRequestPost(context) {
  const { request, env } = context;
  if (!isAuthorized(request, env)) return unauthorizedResponse();

  try {
    const body = await request.json();
    const {
      id, title, summary = '', cover = '', category = 'Artigo',
      tags = [], read_time = '5 min', status = 'published', mdFile = '', author = 'ARES'
    } = body;

    if (!id || !title) {
      return badRequest('id e title são obrigatórios.');
    }

    if (!env.DB) return serverErrorMsg('Banco D1 (DB) não configurado.');

    await env.DB.prepare(
      `INSERT INTO posts (id, title, summary, cover, category, tags, read_time, status, mdFile, author, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    ).bind(
      id, title, summary, cover, category,
      JSON.stringify(tags), read_time, status, mdFile, author
    ).run();

    return new Response(JSON.stringify({ success: true, id }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return serverErrorMsg(error.message);
  }
}

// =====================================================================
// PUT — Atualiza metadados da postagem
// =====================================================================
export async function onRequestPut(context) {
  const { request, env } = context;
  if (!isAuthorized(request, env)) return unauthorizedResponse();

  try {
    const body = await request.json();
    const {
      id, title, summary = '', cover = '', category = 'Artigo',
      tags = [], read_time = '5 min', status = 'published', mdFile = '', author = 'ARES'
    } = body;

    if (!id) return badRequest('id é obrigatório.');
    if (!env.DB) return serverErrorMsg('Banco D1 (DB) não configurado.');

    await env.DB.prepare(
      `UPDATE posts SET
        title = ?, summary = ?, cover = ?, category = ?, tags = ?,
        read_time = ?, status = ?, mdFile = ?, author = ?
       WHERE id = ?`
    ).bind(
      title, summary, cover, category, JSON.stringify(tags),
      read_time, status, mdFile, author, id
    ).run();

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return serverErrorMsg(error.message);
  }
}

// =====================================================================
// DELETE — Remove postagem (?id=)
// =====================================================================
export async function onRequestDelete(context) {
  const { request, env } = context;
  if (!isAuthorized(request, env)) return unauthorizedResponse();

  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    if (!id) return badRequest('id é obrigatório.');
    if (!env.DB) return serverErrorMsg('Banco D1 (DB) não configurado.');

    await env.DB.prepare("DELETE FROM posts WHERE id = ?").bind(id).run();

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return serverErrorMsg(error.message);
  }
}

function badRequest(message) {
  return new Response(JSON.stringify({ error: message }), {
    status: 400,
    headers: { 'Content-Type': 'application/json' }
  });
}

function serverErrorMsg(message) {
  return new Response(JSON.stringify({ error: message }), {
    status: 500,
    headers: { 'Content-Type': 'application/json' }
  });
}
