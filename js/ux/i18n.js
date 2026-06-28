/* =============================================================================================== */
/* ============================================= I18N =============================================== */
/* =============================================================================================== */
/* Troca de idioma client-side via data-i18n. Busca a chave (notação "a.b.c") no JSON carregado
   e aplica em textContent ou em atributos via data-i18n-attr="placeholder:chave,title:chave2". */

const I18N = {

    current: "pt",
    fallback: "pt",
    dict: {},
    cache: {},

    async init() {
        const saved = localStorage.getItem("ares_lang");
        const browserLang = (navigator.language || "pt").slice(0, 2);
        const initial = saved || (["pt", "en", "es"].includes(browserLang) ? browserLang : "pt");

        await this.setLanguage(initial, { skipTransition: true });
        this.bindSwitcher();
    },

    async load(lang) {
        if (this.cache[lang]) return this.cache[lang];

        const res = await fetch(`./i18n/${lang}.json`);
        const data = await res.json();
        this.cache[lang] = data;
        return data;
    },

    getValue(obj, path) {
        return path.split(".").reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : null), obj);
    },

    async setLanguage(lang, { skipTransition = false } = {}) {
        if (!["pt", "en", "es"].includes(lang)) lang = this.fallback;

        let dict;
        try {
            dict = await this.load(lang);
        } catch (e) {
            console.warn("i18n: falha ao carregar", lang, "usando fallback", this.fallback);
            dict = await this.load(this.fallback);
            lang = this.fallback;
        }

        this.current = lang;
        this.dict = dict;
        localStorage.setItem("ares_lang", lang);
        document.documentElement.lang = lang === "pt" ? "pt-BR" : lang;

        this.apply(skipTransition);
        this.syncSwitcherUI();

        document.dispatchEvent(new CustomEvent("i18n:changed", { detail: { lang } }));
    },

    apply(skipTransition) {
        const root = document.body;

        if (!skipTransition) {
            root.classList.add("i18n-fading");
        }

        document.querySelectorAll("[data-i18n]").forEach(el => {
            const key = el.getAttribute("data-i18n");
            const value = this.getValue(this.dict, key);
            if (value !== null) el.textContent = value;
        });

        document.querySelectorAll("[data-i18n-attr]").forEach(el => {
            const spec = el.getAttribute("data-i18n-attr");
            spec.split(",").forEach(pair => {
                const [attr, key] = pair.split(":").map(s => s.trim());
                const value = this.getValue(this.dict, key);
                if (value !== null) el.setAttribute(attr, value);
            });
        });

        if (!skipTransition) {
            requestAnimationFrame(() => {
                setTimeout(() => root.classList.remove("i18n-fading"), 180);
            });
        }
    },

    bindSwitcher() {
        document.querySelectorAll(".lang-switch button").forEach(btn => {
            btn.addEventListener("click", () => this.setLanguage(btn.dataset.lang));
        });
    },

    syncSwitcherUI() {
        document.querySelectorAll(".lang-switch button").forEach(btn => {
            btn.classList.toggle("is-active", btn.dataset.lang === this.current);
        });
    }
};

document.addEventListener("DOMContentLoaded", () => I18N.init());
window.I18N = I18N;
