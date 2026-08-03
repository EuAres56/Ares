/**
 * ARES — Auth helper para rotas administrativas (dashboard)
 * =====================================================================
 * Protege POST/PUT/DELETE com uma chave compartilhada (env.DASHBOARD_KEY).
 * Isso NÃO é um sistema de auth robusto — é uma trava simples para uso
 * solo. Se quiser algo mais sério no futuro, dá pra trocar por
 * Cloudflare Access na frente da rota /dashboard.html sem mexer no resto.
 */

export function isAuthorized(request, env) {
  const header = request.headers.get('Authorization') || '';
  const token = header.replace('Bearer ', '').trim();
  return Boolean(env.DASHBOARD_KEY) && token === env.DASHBOARD_KEY;
}

export function unauthorizedResponse() {
  return new Response(
    JSON.stringify({ error: 'Não autorizado. Verifique a chave do dashboard.' }),
    { status: 401, headers: { 'Content-Type': 'application/json' } }
  );
}
