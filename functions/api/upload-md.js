import { isAuthorized, unauthorizedResponse } from './_auth.js';

/**
 * Recebe multipart/form-data com:
 *  - file: o .md em si
 *  - type: 'projects' | 'budgets'
 *  - id:   o id do registro (usado como nome do arquivo no bucket)
 *
 * Salva em R2 como `${type}/${id}.md` e devolve o caminho público
 * (`/api/md/${type}/${id}.md`) para ser gravado no campo mdFile/md_file.
 *
 * Requer o binding R2 `MD_BUCKET` no wrangler.toml (ver README-DASHBOARD.md).
 */
export async function onRequestPost(context) {
  const { request, env } = context;
  if (!isAuthorized(request, env)) return unauthorizedResponse();

  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const type = formData.get('type');
    const id = formData.get('id');

    if (!file || !type || !id) {
      return badRequest('file, type e id são obrigatórios.');
    }
    if (!['projects', 'budgets'].includes(type)) {
      return badRequest("type deve ser 'projects' ou 'budgets'.");
    }
    if (!env.MD_BUCKET) {
      return serverErrorMsg('Bucket R2 (MD_BUCKET) não está vinculado neste ambiente.');
    }

    const key = `${type}/${id}.md`;
    const content = await file.text();

    await env.MD_BUCKET.put(key, content, {
      httpMetadata: { contentType: 'text/markdown; charset=utf-8' }
    });

    return new Response(JSON.stringify({ success: true, path: `/api/md/${key}` }), {
      status: 201,
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
