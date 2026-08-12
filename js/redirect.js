function handleInstagramRedirect() {
    const urlParams = new URLSearchParams(window.location.search);

    if (urlParams.get('channel') === 'Instagram') {
        try {
            console.log("[Redirect] Redirecionando para o WhatsApp devido ao parâmetro 'channel=Instagram'...");

            const phoneNumber = '5574991035811';
            const message = encodeURIComponent('Olá, vim do insta e estou precisando da ajuda da Zero1');
            const whatsappUrl = `https://wa.me/${phoneNumber}?text=${message}`;

            // Tenta abrir em nova aba
            const newWindow = window.open(whatsappUrl, '_blank');

            // Se o navegador bloquear o pop-up, 'newWindow' será null ou indefinido
            if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
                console.warn("[Redirect] Pop-up bloqueado pelo navegador. Redirecionando na mesma aba como fallback...");
                // Fallback: redireciona na mesma aba para não perder o contato do cliente
                window.location.href = whatsappUrl;
                return; // Retorna para evitar a remoção do parâmetro antes do redirecionamento de página
            }

            // Remove o parâmetro 'channel' sem recarregar a página caso a aba tenha aberto com sucesso
            urlParams.delete('channel');
            const newQuery = urlParams.toString();
            const newUrl = window.location.pathname + (newQuery ? `?${newQuery}` : '') + window.location.hash;

            // Atualiza a barra de endereços do navegador
            window.history.replaceState({}, document.title, newUrl);

        } catch (error) {
            console.error("[Redirect] Erro ao redirecionar para o WhatsApp:", error);
        }
    }
}

window.addEventListener('DOMContentLoaded', () => {
    handleInstagramRedirect();
});
