import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

/**
 * ===============================================================================================
 * ===================================== THREE.JS NOTEBOOK 3D ====================================
 * ===============================================================================================
 */
export class Notebook3D {
    constructor() {
        this.container = null;
        this.running = false;
        this.animationId = null;

        // Estado do WebGL / Three
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.currentModel = null;
        this.screenViewMesh = null;

        // Bindings de contexto
        this.handleWheel = this.handleWheel.bind(this);
        this.handleResize = this.handleResize.bind(this);
        this.animate = this.animate.bind(this);
        this.lastTextureUpdate = 0;
    }

    initThree() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(45, this.container.clientWidth / this.container.clientHeight, 0.1, 1000);
        this.camera.position.set(0, 0, 50);

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.container.appendChild(this.renderer.domElement);

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 2.5);
        directionalLight.position.set(10, 20, 15);
        this.scene.add(directionalLight);

        const redRimLight = new THREE.DirectionalLight('#ff003c', 3.0);
        redRimLight.position.set(-15, 8, -15);
        this.scene.add(redRimLight);

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.enablePan = false;
        this.controls.enableZoom = false;
        this.controls.minPolarAngle = Math.PI / 2;
        this.controls.maxPolarAngle = Math.PI / 2;
        this.controls.enabled = false;
    }

    initScreenTexture() {
        this.screenCanvas = document.createElement('canvas');
        this.screenCanvas.width = this.config.textureWidth;
        this.screenCanvas.height = this.config.textureHeight;
        this.ctx = this.screenCanvas.getContext('2d');

        this.screenTexture = new THREE.CanvasTexture(this.screenCanvas);
        this.screenTexture.colorSpace = THREE.SRGBColorSpace;
        this.screenTexture.flipY = false;
        this.screenTexture.wrapS = THREE.RepeatWrapping;
        this.screenTexture.repeat.x = -1;
        this.screenTexture.offset.x = 1;
    }

    drawTextLine(ctx, x, y, width, time) {
        ctx.beginPath(); ctx.moveTo(x, y);
        for (let i = 0; i < width; i += 15) {
            let wave = Math.sin(i * 0.15 + (x * 0.05)) * 1.5;
            ctx.lineTo(x + i, y + wave);
        }
        ctx.stroke();
    }

    drawIndustrialGear(ctx, x, y, radius, angle, color) {
        ctx.save(); ctx.translate(x, y); ctx.rotate(angle); ctx.fillStyle = color;
        ctx.beginPath(); ctx.arc(0, 0, radius, 0, Math.PI * 2); ctx.fill();
        for (let i = 0; i < 10; i++) {
            ctx.rotate((Math.PI * 2) / 10); ctx.fillRect(-radius * 0.18, -radius * 1.18, radius * 0.36, radius * 0.35);
        }
        ctx.fillStyle = '#070a12'; ctx.beginPath(); ctx.arc(0, 0, radius * 0.35, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }

    drawPage1(ctx, time) {
        ctx.fillStyle = '#0a0a0f'; ctx.fillRect(0, 0, 1024, 340);
        ctx.strokeStyle = 'rgba(255, 0, 60, 0.03)'; ctx.lineWidth = 1;
        for (let i = 0; i < 1024; i += 20) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 340); ctx.stroke(); }
        ctx.fillStyle = '#ff003c'; ctx.fillRect(80, 25, 60, 14);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)'; ctx.fillRect(830, 28, 110, 8);
        ctx.fillStyle = '#ffffff'; ctx.fillRect(80, 85, 340, 24); ctx.fillRect(80, 117, 210, 24);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)'; ctx.lineWidth = 2;
        this.drawTextLine(ctx, 80, 165, 390, time); this.drawTextLine(ctx, 80, 182, 300, time + 300);
        ctx.fillStyle = '#ff003c'; ctx.fillRect(80, 220, 160, 40);
        ctx.fillStyle = '#ffffff'; ctx.fillRect(120, 236, 80, 8);
        for (let i = 0; i < 3; i++) {
            let cardX = 550 + (i * 150); let cardY = 85 + Math.sin(time * 0.0015 + i) * 3;
            ctx.fillStyle = '#111116'; ctx.fillRect(cardX, cardY, 130, 150);
            ctx.strokeStyle = i === 0 ? '#ff003c' : 'rgba(255, 255, 255, 0.05)'; ctx.strokeRect(cardX, cardY, 130, 150);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)'; ctx.fillRect(cardX + 15, cardY + 70, 90, 6);
        }
    }

    drawPage2(ctx, time) {
        ctx.fillStyle = '#07070a'; ctx.fillRect(0, 0, 1024, 340);
        ctx.strokeStyle = 'rgba(255, 0, 60, 0.02)'; ctx.lineWidth = 1;
        for (let i = 0; i < 1024; i += 40) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 340); ctx.stroke(); }
        const beltY = 210;
        this.drawIndustrialGear(ctx, 250, beltY + 50, 36, time * 0.001, '#22222b');
        this.drawIndustrialGear(ctx, 330, beltY + 55, 22, -time * 0.0016, '#3e3e4a');
        this.drawIndustrialGear(ctx, 680, beltY + 55, 44, -time * 0.0008, '#22222b');
        this.drawIndustrialGear(ctx, 760, beltY + 50, 28, time * 0.0012, '#16161c');
        ctx.fillStyle = '#16161c'; ctx.fillRect(60, beltY, 904, 16);
        ctx.strokeStyle = '#3e3e4a'; ctx.lineWidth = 4; ctx.setLineDash([8, 6]); ctx.lineDashOffset = -time * 0.07;
        ctx.beginPath(); ctx.moveTo(85, beltY + 8); ctx.lineTo(940, beltY + 8); ctx.stroke(); ctx.setLineDash([]);
        const pressX = 350; let pistonExt = 45 + Math.sin(time * 0.005) * 45;
        ctx.fillStyle = '#16161c'; ctx.fillRect(pressX - 20, 0, 40, 60);
        ctx.fillStyle = '#ff003c'; ctx.fillRect(pressX - 6, 65, 12, 40 + pistonExt);
        let currentFootY = 105 + pistonExt;
        ctx.fillStyle = '#22222b'; ctx.fillRect(pressX - 30, currentFootY, 60, 16);

        const laserX = 680;
        ctx.fillStyle = '#16161c'; ctx.fillRect(laserX - 8, 0, 16, 40);
        ctx.strokeStyle = 'rgba(255, 0, 60, 0.4)';
        ctx.lineWidth = 6;
        ctx.beginPath(); ctx.moveTo(laserX, 40); ctx.lineTo(laserX, beltY); ctx.stroke();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(laserX, 40); ctx.lineTo(laserX, beltY); ctx.stroke();
        const speed = 0.07; const spacing = 220;
        for (let i = 0; i < 5; i++) {
            let boxX = 75 + ((time * speed + i * spacing) % 860); let boxY = beltY - 24;
            if (boxX < pressX) { ctx.fillStyle = '#22222b'; ctx.fillRect(boxX, boxY, 24, 24); }
            else if (boxX >= pressX && boxX < laserX) {
                ctx.fillStyle = '#4a0e17'; ctx.fillRect(boxX, boxY, 24, 24);
                ctx.fillStyle = '#ff003c'; ctx.fillRect(boxX + 9, boxY, 6, 24);
            } else {
                ctx.fillStyle = '#ff003c'; ctx.fillRect(boxX, boxY, 24, 24);
                ctx.strokeStyle = '#ffffff'; ctx.strokeRect(boxX, boxY, 24, 24);
            }
        }
    }

    drawPage3(ctx, time) {
        ctx.fillStyle = '#050508'; ctx.fillRect(0, 0, 1024, 340);
        ctx.strokeStyle = 'rgba(255, 0, 60, 0.04)'; ctx.lineWidth = 1;
        for (let x = 0; x < 1024; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 340); ctx.stroke(); }
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = 'rgba(255, 0, 60, 0.4)'; ctx.lineWidth = 3; ctx.beginPath();
        for (let i = 0; i < 1024; i += 10) {
            let y = 200 + Math.sin(time * 0.002 + i * 0.005) * 35;
            if (i === 0) ctx.moveTo(i, y); else ctx.lineTo(i, y);
        }
        ctx.stroke(); ctx.restore();
        let cardY = 50 + Math.sin(time * 0.002) * 5;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.02)'; ctx.fillRect(80, cardY, 480, 240);
        ctx.strokeStyle = 'rgba(255, 0, 60, 0.3)'; ctx.strokeRect(80, cardY, 480, 240);
        ctx.fillStyle = '#ff003c'; ctx.fillRect(120, cardY + 40, 160, 18);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)'; ctx.fillRect(120, cardY + 80, 280, 6);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'; ctx.strokeRect(650, 70, 290, 200);
        for (let i = 0; i < 7; i++) {
            let barHeight = 100 + Math.sin(time * 0.003 + i) * 55;
            ctx.fillStyle = 'rgba(255, 0, 60, 0.7)'; ctx.fillRect(685 + (i * 32), 240 - barHeight, 20, barHeight);
        }
    }

    updateScreenTexture() {
        const now = performance.now();

        if (!this.screenState.isTransitioning && (now - this.lastTextureUpdate < 33)) {
            return;
        }
        this.lastTextureUpdate = now;

        this.ctx.clearRect(0, 0, this.screenCanvas.width, this.screenCanvas.height);

        if (this.screenState.isTransitioning) {
            this.screenState.scrollY += (this.screenState.targetScrollY - this.screenState.scrollY) * 0.1;
            if (Math.abs(this.screenState.scrollY - this.screenState.targetScrollY) < 0.5) {
                this.screenState.scrollY = this.screenState.targetScrollY;
                this.screenState.isTransitioning = false;
            }
        }

        this.ctx.save(); this.ctx.translate(0, 0 - this.screenState.scrollY); this.drawPage1(this.ctx, this.screenState.time); this.ctx.restore();
        this.ctx.save(); this.ctx.translate(0, this.config.pageSpacing - this.screenState.scrollY); this.drawPage2(this.ctx, this.screenState.time); this.ctx.restore();
        this.ctx.save(); this.ctx.translate(0, (this.config.pageSpacing * 2) - this.screenState.scrollY); this.drawPage3(this.ctx, this.screenState.time); this.ctx.restore();

        this.screenTexture.needsUpdate = true;
    }

    /**
     * AJUSTADO: Método de carregamento assíncrono integrado ao CacheSystem global.
     */
    async loadModel() {
        const loader = new GLTFLoader();

        try {
            // Solicita a URL convertida em Blob diretamente do sistema de cache
            const cachedModelUrl = await window.CacheSystem.getBlobUrl(this.config.modelPath);

            loader.load(cachedModelUrl, (gltf) => {
                if (!this.running) return; // Se parou o loop enquanto carregava, aborta
                this.currentModel = gltf.scene;

                const box = new THREE.Box3().setFromObject(this.currentModel);
                const center = box.getCenter(new THREE.Vector3());
                this.currentModel.position.sub(center);
                this.currentModel.position.x = this.introState.startX;
                this.currentModel.rotation.y = Math.PI;

                this.currentModel.traverse((child) => {
                    if (child.isMesh) {
                        if (child.name === 'ScreenView') {
                            this.screenViewMesh = child;
                            child.material = new THREE.MeshStandardMaterial({
                                map: this.screenTexture,
                                roughness: 0.45,
                                metalness: 0.05,
                                emissive: new THREE.Color('#ffffff'),
                                emissiveMap: this.screenTexture,
                                emissiveIntensity: 0.95,
                                toneMapped: false,
                                side: THREE.DoubleSide
                            });
                        } else {
                            const originalColor = child.material.color ? child.material.color.clone() : new THREE.Color('#1a1a22');
                            child.material = new THREE.MeshStandardMaterial({
                                color: originalColor,
                                metalness: 0.90,
                                roughness: 0.25,
                                envMapIntensity: 1.5
                            });
                        }
                    }
                });

                this.scene.add(this.currentModel);
                this.introState.loaded = true;
                console.log("[Notebook3D] Malha 3D renderizada com sucesso a partir do blob local.");
            },
                undefined,
                (error) => {
                    console.error("[Notebook3D] Erro interno do GLTFLoader ao processar o arquivo:", error);
                });

        } catch (cacheError) {
            console.error("[Notebook3D] Falha crítica ao recuperar modelo do CacheSystem:", cacheError);
        }
    }

    handleWheel(event) {
        event.preventDefault();

        if (this.introState.phase !== 'ready' || this.screenState.isTransitioning) return;

        const direction = Math.sign(event.deltaY);
        let currentPage = Math.round(this.screenState.scrollY / this.config.pageSpacing);
        let targetPage = currentPage + direction;

        targetPage = Math.max(0, Math.min(targetPage, 2));

        if (targetPage !== currentPage) {
            this.setPage(targetPage);
        }
    }

    setPage(pageIndex) {
        if (!this.running) return;
        this.screenState.targetScrollY = pageIndex * this.config.pageSpacing;
        this.screenState.isTransitioning = true;

        if (this.config.onPageChange) {
            this.config.onPageChange(pageIndex);
        }
    }

    handleResize() {
        if (!this.container) return;
        this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    }

    animate() {
        if (!this.running) return;
        this.animationId = requestAnimationFrame(this.animate);

        const time = performance.now();
        this.screenState.time = time;
        this.updateScreenTexture();

        if (this.introState.loaded && this.currentModel) {
            if (this.introState.phase === 'sliding') {
                this.introState.progress += 0.015;
                this.currentModel.position.x = THREE.MathUtils.lerp(this.introState.startX, this.introState.targetX, this.introState.progress);
                if (this.introState.progress >= 1.0) {
                    this.introState.progress = 0;
                    this.introState.phase = 'rotating';
                }
            }
            else if (this.introState.phase === 'rotating') {
                this.introState.progress += 0.02;
                this.currentModel.rotation.y = THREE.MathUtils.lerp(Math.PI, 0, this.introState.progress);
                if (this.introState.progress >= 1.0) {
                    this.currentModel.rotation.y = 0;
                    this.introState.progress = 0;
                    this.introState.phase = 'zooming';
                }
            }
            else if (this.introState.phase === 'zooming') {
                this.introState.progress += 0.025;
                const cam_dist = 40;

                this.camera.position.z = THREE.MathUtils.lerp(50, cam_dist, this.introState.progress);

                if (this.introState.progress >= 1.0) {
                    this.camera.position.z = cam_dist;
                    this.introState.phase = 'ready';

                    this.controls.enabled = true;
                    this.controls.minAzimuthAngle = -THREE.MathUtils.degToRad(this.config.rotationLimitDegrees);
                    this.controls.maxAzimuthAngle = THREE.MathUtils.degToRad(this.config.rotationLimitDegrees);
                }
            }
        }

        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }

    /**
     * Configura o ecossistema, dispara a montagem do Three.js e delega a busca assíncrona do modelo.
     */
    start(containerId, options = {}) {
        this.stop();
        this.container = document.getElementById(containerId);
        if (!this.container) return;

        this.config = {
            modelPath: options.modelPath || './assets/models/notebook.glb', // Caminho padrão ajustado
            textureWidth: options.textureWidth || 1024,
            textureHeight: options.textureHeight || 640,
            pageSpacing: options.pageSpacing || 340,
            rotationLimitDegrees: options.rotationLimitDegrees || 85,
            onPageChange: options.onPageChange || null
        };

        this.screenState = {
            scrollY: 0,
            targetScrollY: 0,
            maxScroll: this.config.pageSpacing * 2,
            time: 0,
            isTransitioning: false
        };

        this.introState = { loaded: false, phase: 'sliding', progress: 0, startX: 35, targetX: 0 };
        this.running = true;

        this.initThree();
        this.initScreenTexture();

        // Dispara o carregamento desacoplado (Roda em background sem travar o loop principal)
        this.loadModel();

        this.container.addEventListener('wheel', this.handleWheel, { passive: false });
        window.addEventListener('resize', this.handleResize);

        if (this.config.onPageChange) {
            this.config.onPageChange(0);
        }

        this.animate();
    }

    stop() {
        this.running = false;
        if (this.animationId) cancelAnimationFrame(this.animationId);

        window.removeEventListener('resize', this.handleResize);
        if (this.container) {
            this.container.removeEventListener('wheel', this.handleWheel);
            if (this.renderer && this.renderer.domElement) {
                this.container.removeChild(this.renderer.domElement);
            }
        }

        if (this.controls) this.controls.dispose();
        if (this.renderer) this.renderer.dispose();

        this.container = null;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.currentModel = null;
        this.screenViewMesh = null;
    }
}
