/**
 * Serve arquivos .md armazenados no bucket R2 (MD_BUCKET).
 * Ex: GET /api/md/projects/meu-projeto.md
 * Público de propósito — é o mesmo conteúdo que fetchMarkdown() já
 * busca hoje em ../assets/projects/*.md, só que agora vindo do bucket.
 */
export async function onRequestGet(context) {
  const { env, params } = context;
  const pathSegments = Array.isArray(params.path) ? params.path.join('/') : params.path;

  if (!env.MD_BUCKET) {
    return new Response('Bucket R2 (MD_BUCKET) não está vinculado neste ambiente.', { status: 500 });
  }

  try {
    const object = await env.MD_BUCKET.get(pathSegments);
    if (!object) {
      return new Response('Arquivo não encontrado.', { status: 404 });
    }

    return new Response(object.body, {
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Cache-Control': 'public, max-age=300'
      }
    });
  } catch (error) {
    return new Response(`Erro ao buscar arquivo: ${error.message}`, { status: 500 });
  }
}
