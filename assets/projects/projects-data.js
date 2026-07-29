export const PROJECTS = [
    {
        id: "zero1-ativador",
        title: "Zero 1 — Ativador do Sistema",
        desc: "Interface gráfica leve e portátil para ativação rápida do Windows e Microsoft Office sem dependências externas.",
        thumb: "./assets/images/Ativador_Windows.png",
        tags: ["Python", "Tkinter", "Windows API"],
        status: "live",
        mdFile: "zero1-ativador.md",
        links: [
            {
                name: "Baixar Executável (.exe)",
                type: "download",
                link: "https://github.com/EuAres56/Ativador-Windows/releases/download/v1.0.0/Zero1_Ativador.exe"
            },
            {
                name: "Ver no GitHub",
                type: "redirect",
                link: "https://github.com/EuAres56/Ativador-Windows"
            }
        ]
    }
];

export const STATUS_LABELS = {
    live: "Ao vivo",
    dev: "Em desenvolvimento",
    concept: "Estudo de caso",
    archived: "Arquivado"
};
