export async function onRequestGet(context) {
    try {
        // Consulta todos os projetos do D1 ordenados pelo mais recente
        const { results } = await context.env.DB.prepare(
            "SELECT * FROM projects ORDER BY created_at DESC"
        ).all();

        // Converte as colunas de JSON String (tags e links) de volta para Objetos/Arrays
        const formattedProjects = results.map(p => ({
            ...p,
            tags: JSON.parse(p.tags || '[]'),
            links: JSON.parse(p.links || '[]')
        }));

        return new Response(JSON.stringify(formattedProjects), {
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Cache-Control": "max-age=60, s-maxage=300" // Cache leve para performance extrema
            }
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
}
