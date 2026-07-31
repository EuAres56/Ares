const contactForm = document.getElementById('contact-form'); // ou selecione pelo ID do seu form

contactForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const btnSubmit = contactForm.querySelector('button[type="submit"]');
    const originalText = btnSubmit.textContent;

    // Feedback visual de carregamento
    btnSubmit.disabled = true;
    btnSubmit.textContent = 'Enviando...';

    const payload = {
        nome: contactForm.querySelector('input[placeholder="NOME"]').value,
        email: contactForm.querySelector('input[placeholder="E-MAIL"]').value,
        mensagem: contactForm.querySelector('textarea').value,
    };

    try {
        const response = await fetch('/api/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        if (response.ok) {
            alert('Mensagem enviada com sucesso! Em breve entrarei em contato.');
            contactForm.reset();
        } else {
            alert('Ocorreu um erro ao enviar. Tente novamente mais tarde.');
        }
    } catch (err) {
        console.error(err);
        alert('Erro de conexão ao enviar mensagem.');
    } finally {
        btnSubmit.disabled = false;
        btnSubmit.textContent = originalText;
    }
});
