function handleInstagramRedirect() {
    const urlParams = new URLSearchParams(window.location.search);

    if (urlParams.get('channel') === 'Instagram') {
        const phoneNumber = '5500000000000'; // Substitua pelo seu número com DDD (ex: 5511999999999)
        const message = encodeURIComponent('Olá, vim do insta e estou precisando da ajuda da Zero1');
        const whatsappUrl = `https://wa.me/${phoneNumber}?text=${message}`;

        // Abre o WhatsApp em uma nova aba para manter o portfólio visível
        window.open(whatsappUrl, '_blank');

        // Remove o parâmetro 'channel' sem recarregar a página
        urlParams.delete('channel');
        const newQuery = urlParams.toString();
        const newUrl = window.location.pathname + (newQuery ? `?${newQuery}` : '') + window.location.hash;

        // Atualiza a barra de endereços do navegador
        window.history.replaceState({}, document.title, newUrl);
    }
}

window.addEventListener('DOMContentLoaded', () => {
    handleInstagramRedirect();
});
