
class ParticleBackgroundEngine {
    constructor() {
        // Estado interno do Canvas e Contexto
        this.container = null;
        this.canvas = null;
        this.ctx = null;
        this.animationFrameId = null;
        this.running = false;

        // Dimensões e Tempo
        this.width = 0;
        this.height = 0;
        this.lastTime = performance.now();

        // Arrays de Elementos Visuais
        this.shapes = [];
        this.dots = [];
        this.explosion = null;

        // Estado do Mouse
        this.mouse = { x: -1000, y: -1000 };

        // Configurações Constantes do Motor
        this.NUM_SHAPES = 20;
        this.MAX_SPEED_SHAPES = 0.4;
        this.MOUSE_RADIUS = 300;
        this.EXPLOSION_RADIUS = 250;
        this.EXPLOSION_FORCE = 20;
        this.BLUR_DURATION = 500;

        this.NUM_DOTS = window.innerWidth < 768 ? 22 : 42;
        this.MAX_SPEED_DOTS = 0.32;
        this.LINK_DIST = 130;

        this.COLORS = [
            "rgba(255, 0, 51, 0.65)",
            "rgba(255, 0, 51, 0.55)",
            "rgba(255, 0, 51, 0.45)",
            "rgba(255, 0, 51, 0.35)",
            "rgba(255, 0, 51, 0.25)"
        ];

        // Bind de métodos que usam listeners de eventos para garantir o escopo do `this` correto
        this.resize = this.resize.bind(this);
        this.handleMouseMove = this.handleMouseMove.bind(this);
        this.handleMouseLeave = this.handleMouseLeave.bind(this);
        this.handleContainerClick = this.handleContainerClick.bind(this);
        this.loop = this.loop.bind(this);
    }

    /**
     * Fábrica: Cria e retorna uma nova forma geométrica estruturada.
     */
    createShape() {
        const types = ["circle", "triangle", "square"];
        return {
            x: Math.random() * this.width,
            y: Math.random() * this.height,
            vx: (Math.random() - 0.5) * this.MAX_SPEED_SHAPES,
            vy: (Math.random() - 0.5) * this.MAX_SPEED_SHAPES,
            size: 20 + Math.random() * ((this.width / 15 + this.height / 15) / 2),
            angle: Math.random() * Math.PI * 2,
            angleSpeed: (Math.random() - 0.5) * 0.0015,
            type: types[Math.floor(Math.random() * types.length)],
            color: this.COLORS[Math.floor(Math.random() * this.COLORS.length)],
        };
    }

    /**
     * Fábrica: Cria e retorna um ponto da malha conectada.
     */
    createDot() {
        return {
            x: Math.random() * this.width,
            y: Math.random() * this.height,
            vx: (Math.random() - 0.5) * this.MAX_SPEED_DOTS,
            vy: (Math.random() - 0.5) * this.MAX_SPEED_DOTS,
        };
    }

    /**
     * Inicializa as listas internas preenchendo os arrays de elementos visuais.
     */
    initElements() {
        this.shapes = [];
        this.dots = [];
        for (let i = 0; i < this.NUM_SHAPES; i++) this.shapes.push(this.createShape());
        for (let i = 0; i < this.NUM_DOTS; i++) this.dots.push(this.createDot());
    }

    /**
     * Trata o redimensionamento do Canvas de acordo com o container ativo e a densidade de pixels.
     */
    resize() {
        if (!this.container || !this.canvas) return;
        this.width = this.container.clientWidth;
        this.height = this.container.clientHeight;

        this.canvas.width = this.width * devicePixelRatio;
        this.canvas.height = this.height * devicePixelRatio;
        this.canvas.style.width = this.width + "px";
        this.canvas.style.height = this.height + "px";

        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.scale(devicePixelRatio, devicePixelRatio);
    }

    // --- Captura de Interações Físicas ---
    handleMouseMove(e) {
        const rect = this.container.getBoundingClientRect();
        this.mouse.x = e.clientX - rect.left;
        this.mouse.y = e.clientY - rect.top;
    }

    handleMouseLeave() {
        this.mouse.x = -1000;
        this.mouse.y = -1000;
    }

    handleContainerClick(e) {
        const rect = this.container.getBoundingClientRect();
        this.explosion = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
            startTime: performance.now()
        };
    }

    /**
     * Processa a física e posições de todos os elementos.
     */
    update(deltaTime) {
        // 1. Atualizar Formas Geométricas Grandes
        this.shapes.forEach(shape => {
            shape.x += shape.vx;
            shape.y += shape.vy;
            shape.angle += shape.angleSpeed;

            // Colisão interna e cálculo elástico entre formas geométricas
            for (let i = 0; i < this.shapes.length; i++) {
                for (let j = i + 1; j < this.shapes.length; j++) {
                    const s1 = this.shapes[i];
                    const s2 = this.shapes[j];
                    const dx = s2.x - s1.x;
                    const dy = s2.y - s1.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    const minDist = s1.size + s2.size;

                    if (dist < minDist && dist > 0) {
                        const nx = dx / dist;
                        const ny = dy / dist;
                        const tx = -ny;
                        const ty = nx;

                        const dpTan1 = s1.vx * tx + s1.vy * ty;
                        const dpTan2 = s2.vx * tx + s2.vy * ty;
                        const dpNorm1 = s1.vx * nx + s1.vy * ny;
                        const dpNorm2 = s2.vx * nx + s2.vy * ny;

                        const m1 = dpNorm2;
                        const m2 = dpNorm1;

                        s1.vx = tx * dpTan1 + nx * m1;
                        s1.vy = ty * dpTan1 + ny * m1;
                        s2.vx = tx * dpTan2 + nx * m2;
                        s2.vy = ty * dpTan2 + ny * m2;

                        const overlap = 0.5 * (minDist - dist + 0.1);
                        s1.x -= nx * overlap;
                        s1.y -= ny * overlap;
                        s2.x += nx * overlap;
                        s2.y += ny * overlap;
                    }
                }
            }

            // Fronteiras do Canvas (Formas)
            if (shape.x < 0 || shape.x > this.width) shape.vx *= -1;
            if (shape.y < 0 || shape.y > this.height) shape.vy *= -1;

            // Atração / Repulsão do cursor do mouse
            const dx = shape.x - this.mouse.x;
            const dy = shape.y - this.mouse.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < this.MOUSE_RADIUS && dist > 0) {
                const force = ((this.MOUSE_RADIUS - dist) / this.MOUSE_RADIUS) * 0.3;
                const angle = Math.atan2(dy, dx);
                shape.vx += Math.cos(angle) * force;
                shape.vy += Math.sin(angle) * force;
            }

            // Mecânica de Impacto por Ondas de Explosão (Clique)
            if (this.explosion) {
                const elapsed = performance.now() - this.explosion.startTime;
                if (elapsed > this.BLUR_DURATION) {
                    this.explosion = null;
                    this.canvas.style.filter = "none";
                } else {
                    const dxE = shape.x - this.explosion.x;
                    const dyE = shape.y - this.explosion.y;
                    const distE = Math.sqrt(dxE * dxE + dyE * dyE);
                    if (distE < this.EXPLOSION_RADIUS && distE > 0) {
                        const force = ((this.EXPLOSION_RADIUS - distE) / this.EXPLOSION_RADIUS) * this.EXPLOSION_FORCE;
                        const angle = Math.atan2(dyE, dxE);
                        shape.vx += Math.cos(angle) * force;
                        shape.vy += Math.sin(angle) * force;
                    }
                    const blurAmt = (1 - elapsed / this.BLUR_DURATION) * 6;
                    this.canvas.style.filter = `blur(${blurAmt}px)`;
                }
            }

            // Coeficiente de Fricção (Arrasto Natural)
            shape.vx *= 0.98;
            shape.vy *= 0.98;
        });

        // 2. Atualizar Malha de Conexão Estelar (Dots)
        this.dots.forEach(d => {
            d.x += d.vx;
            d.y += d.vy;
            if (d.x < 0 || d.x > this.width) d.vx *= -1;
            if (d.y < 0 || d.y > this.height) d.vy *= -1;
        });
    }

    /**
     * Gerencia a renderização gráfica de uma forma individual.
     */
    drawShape(shape) {
        this.ctx.save();
        this.ctx.translate(shape.x, shape.y);
        this.ctx.rotate(shape.angle);
        this.ctx.fillStyle = shape.color;
        this.ctx.shadowColor = "rgba(0, 0, 0, 0.2)";
        this.ctx.shadowBlur = 10;
        this.ctx.shadowOffsetX = 0;
        this.ctx.shadowOffsetY = 15;

        switch (shape.type) {
            case "circle":
                this.ctx.beginPath();
                this.ctx.arc(0, 0, shape.size, 0, Math.PI * 2);
                this.ctx.fill();
                break;
            case "triangle":
                this.ctx.beginPath();
                this.ctx.moveTo(0, -shape.size);
                this.ctx.lineTo(shape.size * 1.5, shape.size);
                this.ctx.lineTo(-shape.size * 1.5, shape.size);
                this.ctx.closePath();
                this.ctx.fill();
                break;
            case "square":
                this.ctx.fillRect(-shape.size, -shape.size, shape.size * 2, shape.size * 2);
                break;
        }
        this.ctx.restore();
    }

    /**
     * Limpa e renderiza o quadro completo (Buffer e Canvas).
     */
    draw() {
        this.ctx.clearRect(0, 0, this.width, this.height);

        // 1. Degradê de Fundo Escuro Futurista
        const centerX = this.width / 2;
        const centerY = this.height / 2;
        const maxRadius = Math.max(this.width, this.height) / 1.5;

        const gradient = this.ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, maxRadius);
        gradient.addColorStop(0, "rgba(16, 18, 31, 0.3)");
        gradient.addColorStop(1, "rgb(6, 6, 7)");
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.width, this.height);

        // 2. Traçar as Linhas Dinâmicas de Conexão (Malha Espacial)
        for (let i = 0; i < this.dots.length; i++) {
            for (let j = i + 1; j < this.dots.length; j++) {
                const dx = this.dots[i].x - this.dots[j].x;
                const dy = this.dots[i].y - this.dots[j].y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < this.LINK_DIST) {
                    this.ctx.strokeStyle = `rgba(255, 0, 55, ${0.12 * (1 - dist / this.LINK_DIST)})`;
                    this.ctx.lineWidth = 1;
                    this.ctx.beginPath();
                    this.ctx.moveTo(this.dots[i].x, this.dots[i].y);
                    this.ctx.lineTo(this.dots[j].x, this.dots[j].y);
                    this.ctx.stroke();
                }
            }
        }

        // 3. Desenhar Formas Sólidas
        this.shapes.forEach(shape => this.drawShape(shape));

        // 4. Desenhar Nós de Luz da Rede
        this.dots.forEach(d => {
            this.ctx.beginPath();
            this.ctx.arc(d.x, d.y, 1.6, 0, Math.PI * 2);
            this.ctx.fillStyle = "rgba(255, 0, 55, 0.55)";
            this.ctx.fill();
        });
    }

    /**
     * Loop principal acionado via RequestAnimationFrame.
     */
    loop(time) {
        if (!this.running) return;
        const deltaTime = time - this.lastTime;
        this.lastTime = time;

        this.update(deltaTime);
        this.draw();

        this.animationFrameId = requestAnimationFrame(this.loop);
    }

    /**
     * Método Público: Inicializa a Engine atrelando-a a um container HTML específico.
     * @param {string} targetElementId - ID do elemento HTML que receberá o fundo animado.
     */
    start(targetElementId) {
        // Ignora chamadas redundantes para o mesmo container que já está ativo
        if (this.running && this.container && this.container.id === targetElementId) return;

        // Limpa instâncias anteriores se houver troca direta de página
        if (this.running) this.stop();

        // Verificação de Acessibilidade
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

        this.container = document.getElementById(targetElementId);
        if (!this.container) {
            console.warn(`ParticleEngine: Container #${targetElementId} não existe no DOM.`);
            return;
        }

        // Cria o elemento Canvas dinamicamente
        this.canvas = document.createElement("canvas");
        this.canvas.id = "hero-particles";

        // Gerencia inserção correta seguindo a árvore estrutural (.section-inner)
        const innerElement = this.container.querySelector(".section-inner");
        if (innerElement) {
            innerElement.after(this.canvas);
        } else {
            this.container.prepend(this.canvas);
        }

        this.ctx = this.canvas.getContext("2d");
        this.running = true;

        // Configuração inicial de escala de display e população
        this.resize();
        this.initElements();

        // Adiciona Listeners de Evento Vinculados
        window.addEventListener("resize", this.resize);
        window.addEventListener("mousemove", this.handleMouseMove);
        window.addEventListener("mouseleave", this.handleMouseLeave);
        this.container.addEventListener("click", this.handleContainerClick);

        // Dispara o ciclo de renderização
        this.lastTime = performance.now();
        this.animationFrameId = requestAnimationFrame(this.loop);
    }

    /**
     * Método Público: Para a Engine, limpa listeners e desaloca objetos da árvore do DOM.
     */
    stop() {
        this.running = false;
        if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);

        // Desassocia os manipuladores globais evitando vazamentos de memória (Memory Leaks)
        window.removeEventListener("resize", this.resize);
        window.removeEventListener("mousemove", this.handleMouseMove);
        window.removeEventListener("mouseleave", this.handleMouseLeave);

        if (this.container) {
            this.container.removeEventListener("click", this.handleContainerClick);
        }

        // Remove o elemento do documento de forma limpa
        if (this.canvas && this.canvas.parentNode) {
            this.canvas.parentNode.removeChild(this.canvas);
        }

        // Reseta referências de memória
        this.container = null;
        this.canvas = null;
        this.ctx = null;
        this.shapes = [];
        this.dots = [];
        this.explosion = null;
    }
}

// Expõe a instância única (Singleton pattern) globalmente para acesso simplificado nas suas páginas
window.ParticleEngine = new ParticleBackgroundEngine();
