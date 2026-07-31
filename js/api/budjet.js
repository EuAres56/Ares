export async function onRequestGet(context) {
    const { request, env } = context;
    const url = new URL(request.url);
    const budgetId = url.searchParams.get('o');

    if (!budgetId) {
        return new Response(
            JSON.stringify({ error: 'Parâmetro de busca ?o= é obrigatório.' }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
    }

    try {
        // Consulta no Cloudflare D1 vinculado ao env.DB
        const stmt = env.DB.prepare('SELECT * FROM budgets WHERE id = ?').bind(budgetId);
        const budget = await stmt.first();

        if (!budget) {
            return new Response(
                JSON.stringify({ error: 'Orçamento não encontrado ou expirado.' }),
                { status: 404, headers: { 'Content-Type': 'application/json' } }
            );
        }

        return new Response(JSON.stringify(budget), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error) {
        return new Response(
            JSON.stringify({ error: `Erro interno no servidor: ${error.message}` }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}
