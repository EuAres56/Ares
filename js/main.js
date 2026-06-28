// =====================================================================
// ARES — Portfólio — Script Principal (Orquestrador)
// =====================================================================
// ---------------- CORE ----------------
import { CacheSystem } from './cache-system.js'; // CORREÇÃO: Adicionada a barra './' necessária para caminhos relativos


// -------- UI & UX UTILITIES --------
import './ui/scene-engine.js';       // Inicializa o CKEngine e gerencia as telas
import './ui/interactions.js';       // Gerencia eventos de UI e ciclo de vida dos motores
import './ux/i18n.js';               // Tradução dinâmica

// -------- MOTORES (ENGINES) --------
import './engines/books-engine.js'; // Blocos de anotações da pagina sobre mim (3d css nativo)
import './engines/dossier-engine.js'; // Dossier estilo militar (3d css nativo)
import './engines/particles-engine.js'; // Background geometrico interativo (canvas nativo)
import './engines/project-tilt.js'; // Tilt(efeito parallax) para cards de projetos (3d css nativo)
import './engines/projects-blueprint.js'; // Background blueprint da pagina projetos (3d css nativo)
import { Notebook3D } from './engines/notebook3D.js'; // Notebook 3D (Three.js)[cite: 2]

// Instancia o motor do notebook globalmente
window.Notebook3DEngine = new Notebook3D();


document.addEventListener("DOMContentLoaded", async () => {
    console.log("[Main] Inicializando ecossistema do portfólio...");

    try {
        // 1. Garante que o armazenamento local está atualizado
        await CacheSystem.init();

        // 2. Mapeia e injeta os fundos de tela diretamente nas variáveis CSS do ecossistema
        await injectCachedStyles();

        // 3. CORREÇÃO: Inicializa o motor chamando o método .start() da sua classe instanciada
        // ATENÇÃO: Substitua 'seu-container-canvas-id' pelo ID real da sua div HTML do canvas
        if (window.Notebook3DEngine) {
            window.Notebook3DEngine.start('seu-container-canvas-id', {
                modelPath: './assets/models/notebook.glb',
                // Se você tiver uma função de callback para mudar os estados dos cards na UI, passe aqui:
                // onPageChange: (index) => { seuMetodoDeMudarCard(index); }
            });
        }

    } catch (error) {
        console.error("[Main Crítico] Erro ao carregar o ecossistema do portfólio:", error);
    }
});

/**
 * Converte imagens do cache em Blobs e as disponibiliza nativamente para os arquivos CSS
 */
async function injectCachedStyles() {
    const bg_pg_hero = await CacheSystem.getBlobUrl("./assets/images/Bg_hero.webp");
    const bg_pg_about = await CacheSystem.getBlobUrl("./assets/images/Bg_about.webp");
    const bg_pg_projects = await CacheSystem.getBlobUrl("./assets/images/Bg_projects.webp");
    const bg_pg_skills = await CacheSystem.getBlobUrl("./assets/images/Bg_skills.webp");
    const bg_pg_services = await CacheSystem.getBlobUrl("./assets/images/Bg_services.webp");
    const bg_pg_contact = await CacheSystem.getBlobUrl("./assets/images/Bg_contact.webp");
    const img_profile = await CacheSystem.getBlobUrl("./assets/images/Ares.webp");

    // Injeção no :root CSS
    document.documentElement.style.setProperty('--bg-page-hero', `url(${bg_pg_hero})`);
    document.documentElement.style.setProperty('--bg-page-about', `url(${bg_pg_about})`);
    document.documentElement.style.setProperty('--bg-page-projects', `url(${bg_pg_projects})`);
    document.documentElement.style.setProperty('--bg-page-skills', `url(${bg_pg_skills})`);
    document.documentElement.style.setProperty('--bg-page-services', `url(${bg_pg_services})`);
    document.documentElement.style.setProperty('--bg-page-contact', `url(${bg_pg_contact})`);
    document.documentElement.style.setProperty('--img-profile', `url(${img_profile})`);

    console.log("[Main] Variáveis de estilização injetadas via cache mapeado.");
}
