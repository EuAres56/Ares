export class CacheSystem {
    // Configurações e caminhos fixos (Hard-coded) do projeto
    static CONFIG = {
        VERSION: "1.0.7", // Mude a versão aqui para forçar o esvaziamento e re-download geral
        CACHE_NAME: "ares-portfolio-assets-v1",
        MANIFEST: [
            // Apontando a partir da raiz do index.html
            { id: "notebook_model", url: "./assets/models/notebook.glb" },
            { id: "bg_hero", url: "./assets/images/Bg_hero.webp" },
            { id: "bg_about", url: "./assets/images/Bg_about.webp" },
            { id: "bg_projects", url: "./assets/images/Bg_projects.webp" },
            { id: "bg_skills", url: "./assets/images/Bg_skills.webp" },
            { id: "bg_services", url: "./assets/images/Bg_services.webp" },
            { id: "bg_contact", url: "./assets/images/Bg_contact.webp" },
            { id: "ares", url: "./assets/images/Ares.webp" }
        ]
    };

    /**
     * Getter dinâmico para verificar se a Cache API está disponível no contexto atual
     */
    static get isSupported() {
        return typeof window !== 'undefined' && 'caches' in window;
    }

    /**
     * Inicializa e valida o cache local contra a versão atual do sistema.
     */
    static async init() {
        // Se não houver suporte (ex: HTTP em IP de rede local), aborta graciosamente
        if (!this.isSupported) {
            console.warn("[CacheSystem] Cache API indisponível neste contexto (Requer HTTPS ou localhost). Rodando com fallbacks ativos.");
            return false;
        }

        try {
            const localVersion = localStorage.getItem("ares_portfolio_version");
            const cache = await caches.open(this.CONFIG.CACHE_NAME);

            // Se as versões baterem, o cache está pronto e saudável
            if (localVersion === this.CONFIG.VERSION) {
                console.log(`[CacheSystem] v${this.CONFIG.VERSION} ativa. Assets validados.`);
                return true;
            }

            console.warn(`[CacheSystem] Nova versão detectada (Local: v${localVersion} -> Atual: v${this.CONFIG.VERSION}). Limpando cache antigo...`);

            // Elimina qualquer registro de cache antigo para evitar lixo em disco
            const cacheNames = await caches.keys();
            await Promise.all(
                cacheNames.map(name => caches.delete(name))
            );

            // Pré-carrega de forma síncrona/ordenada todos os assets mandatórios do manifesto
            for (const asset of this.CONFIG.MANIFEST) {
                console.log(`[CacheSystem] Armazenando em cache offline: ${asset.url}`);
                try {
                    await cache.add(asset.url);
                } catch (downloadError) {
                    console.error(`[CacheSystem] Falha ao indexar recurso crítico: ${asset.url}`, downloadError);
                }
            }

            // Grava a nova versão para travar novas requisições de rede nas próximas sessões
            localStorage.setItem("ares_portfolio_version", this.CONFIG.VERSION);
            console.log(`[CacheSystem] Sincronização concluída. Portfólio atualizado para v${this.CONFIG.VERSION}`);
            return true;

        } catch (error) {
            console.error("[CacheSystem] Erro crítico no fluxo de inicialização:", error);
            return false;
        }
    }

    /**
     * Retorna uma URL convertida em Blob local ou a string original caso a API não seja suportada
     */
    static async getBlobUrl(url) {
        // Fallback imediato: Se não suportar a API de cache, retorna o link estático direto da rede
        if (!this.isSupported) {
            return url;
        }

        try {
            const cache = await caches.open(this.CONFIG.CACHE_NAME);
            let response = await cache.match(url);

            // Fallback de segurança: Se o arquivo não estiver em cache, faz o fetch e o salva
            if (!response) {
                console.warn(`[CacheSystem] Cache miss para ${url}. Buscando via rede.`);
                response = await fetch(url);
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                await cache.put(url, response.clone());
            }

            const blob = await response.blob();
            return URL.createObjectURL(blob);
        } catch (error) {
            console.error(`[CacheSystem] Falha ao instanciar ObjectURL para: ${url}`, error);
            return url; // Retorna a string original caso haja falha crítica na conversão do Blob
        }
    }
}

// Vincula ao escopo global da janela
window.CacheSystem = CacheSystem;
