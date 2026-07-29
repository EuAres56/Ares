export async function onRequestGet(context) {
    try {
        // Consulta todos os projetos do D1 ordenados pelo mais recente
        const { results } = await context.env.DB.prepare(
            "SELECT * FROM projects ORDER BY created_at DESC"
        ).all();

        // Formata os campos serializados
        const formattedProjects = results.map(p => ({
            ...p,
            tags: JSON.parse(p.tags || '[]'),
            links: JSON.parse(p.links || '[]')
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
