import { isAuthorized, unauthorizedResponse } from './_auth.js';

/**
 * Rota administrativa (plural) para o dashboard gerenciar orçamentos.
 * A rota pública /api/budget?o=ID (singular, já existente no projeto)
 * continua igual e é usada pela budget.html para o cliente final.
 * Esta aqui exige a chave do dashboard em todas as operações, inclusive
 * na listagem, pois expõe nome de cliente e valores.
 */

export async function onRequestGet(context) {
  const { request, env } = context;
  if (!isAuthorized(request, env)) return unauthorizedResponse();

  try {
    const { results } = await env.DB.prepare(
      "SELECT * FROM budgets ORDER BY created_at DESC"
    ).all();

    return new Response(JSON.stringify(results), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return serverError(error);
  }
}

export async function onRequestPost(context) {
  const { request, env } = context;
  if (!isAuthorized(request, env)) return unauthorizedResponse();

  try {
    const body = await request.json();
    const {
      id, title, client_name = '', date, status = 'pending',
      total_amount = 0, md_file = ''
    } = body;

    if (!id || !title) return badRequest('id e title são obrigatórios.');

    const finalDate = date || new Date().toISOString().slice(0, 10);

    await env.DB.prepare(
      `INSERT INTO budgets (id, title, client_name, date, status, total_amount, md_file, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    ).bind(id, title, client_name, finalDate, status, total_amount, md_file).run();

    return new Response(JSON.stringify({ success: true, id }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return serverError(error);
  }
}

export async function onRequestPut(context) {
  const { request, env } = context;
  if (!isAuthorized(request, env)) return unauthorizedResponse();

  try {
    const body = await request.json();
    const { id, title, client_name = '', date, status, total_amount = 0, md_file = '' } = body;

    if (!id) return badRequest('id é obrigatório.');

    await env.DB.prepare(
      `UPDATE budgets SET
        title = ?, client_name = ?, date = ?, status = ?, total_amount = ?, md_file = ?
       WHERE id = ?`
    ).bind(title, client_name, date, status, total_amount, md_file, id).run();

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return serverError(error);
  }
}

export async function onRequestDelete(context) {
  const { request, env } = context;
  if (!isAuthorized(request, env)) return unauthorizedResponse();

  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    if (!id) return badRequest('id é obrigatório.');

    await env.DB.prepare("DELETE FROM budgets WHERE id = ?").bind(id).run();

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
