/**
 * ===============================================================================================
 * ====================================== DOSSIER LAYER ENGINE ===================================
 * ===============================================================================================
 */
class DossierLayerEngine {
    constructor() {
        this.dossier = null;
        this.sheets = [];
        this.tabs = [];
        this.isAnimating = false;

        this.handleGlobalClick = this.handleGlobalClick.bind(this);
        this.handleTabClick = this.handleTabClick.bind(this);
    }

    rotateDossier() {
        if (this.isAnimating) return;
        this.isAnimating = true;

        const front = this.sheets.find(s => s.classList.contains('pos-front'));
        const middle = this.sheets.find(s => s.classList.contains('pos-middle'));
        const back = this.sheets.find(s => s.classList.contains('pos-back'));

        if (!front || !middle || !back) {
            this.isAnimating = false;
            return;
        }

        front.classList.add('shuffle-out');

        setTimeout(() => {
            front.classList.remove('pos-front');
            front.classList.add('pos-back');

            middle.classList.remove('pos-middle');
            middle.classList.add('pos-front');

            back.classList.remove('pos-back');
            back.classList.add('pos-middle');
        }, 500);

        setTimeout(() => {
            front.classList.remove('shuffle-out');
            this.isAnimating = false;
        }, 1100);
    }

    handleTabClick(e) {
        e.stopPropagation();
        if (this.isAnimating) return;
        const clicked = e.currentTarget.closest('.sheet');
        if (!clicked) return;

        if (clicked.classList.contains('pos-middle')) {
            this.rotateDossier();
        } else if (clicked.classList.contains('pos-back')) {
            this.rotateDossier();
            setTimeout(() => this.rotateDossier(), 1150);
        }
    }

    handleGlobalClick(e) {
        if (e.target.closest('.tab') || e.target.closest('.doc-body')) return;
        this.rotateDossier();
    }

    start(dossierId) {
        this.stop();
        this.dossier = document.getElementById(dossierId);
        if (!this.dossier) return;

        this.sheets = Array.from(this.dossier.querySelectorAll('.sheet'));
        this.tabs = Array.from(this.dossier.querySelectorAll('.tab'));

        this.tabs.forEach(tab => tab.addEventListener('click', this.handleTabClick));
        this.dossier.addEventListener('click', this.handleGlobalClick);
    }

    stop() {
        if (this.tabs.length) {
            this.tabs.forEach(tab => tab.removeEventListener('click', this.handleTabClick));
        }
        if (this.dossier) {
            this.dossier.removeEventListener('click', this.handleGlobalClick);
        }
        this.dossier = null;
        this.sheets = [];
        this.tabs = [];
        this.isAnimating = false;
    }
}
window.DossierEngine = new DossierLayerEngine();
