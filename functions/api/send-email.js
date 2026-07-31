export async function onRequestPost(context) {
    const { request, env } = context;

    try {
        const { name, email, message } = await request.json();

        const firstName = name ? name.trim().split(' ')[0] : 'Cliente';

        // Disparo direto via REST API do Resend
        const resendResponse = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${env.RESEND_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                from: 'Formulário Portfolio <suporte@zero1-tech.com>',
                to: ['contato-servicos@zero1-tech.com'],
                reply_to: email, // Nota: na API REST usa-se reply_to com underline
                subject: `📥 Novo Lead: ${name} quer conversar sobre um projeto`,
                html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #0f0f12; color: #ffffff; border-radius: 8px; padding: 24px; border: 1px solid #222;">
            <h2 style="color: #ff0055; margin-top: 0; font-size: 20px;">🚀 Novo Contato do Site</h2>
            <p style="font-size: 14px; color: #aaa; margin-bottom: 20px;">
              Você recebeu uma nova mensagem através do formulário do seu portfólio.
            </p>

            <div style="background-color: #18181c; padding: 16px; border-radius: 6px; margin-bottom: 16px;">
              <p style="margin: 0 0 8px 0; font-size: 14px;">
                <strong style="color: #888;">Cliente:</strong> <span style="color: #fff;">${name}</span>
              </p>
              <p style="margin: 0; font-size: 14px;">
                <strong style="color: #888;">E-mail:</strong> <a href="mailto:${email}" style="color: #ff0055; text-decoration: none;">${email}</a>
              </p>
            </div>

            <div style="background-color: #18181c; padding: 16px; border-radius: 6px; border-left: 4px solid #ff0055;">
              <p style="margin: 0 0 6px 0; font-size: 12px; color: #888; text-transform: uppercase; letter-spacing: 1px;">
                Mensagem / Projeto:
              </p>
              <p style="margin: 0; font-size: 15px; line-height: 1.5; color: #ddd; white-space: pre-wrap;">${message}</p>
            </div>

            <hr style="border: none; border-top: 1px solid #222; margin: 24px 0;" />

            <p style="font-size: 12px; color: #666; text-align: center; margin: 0;">
              Dica: Basta clicar em <strong>"Responder"</strong> neste e-mail para falar diretamente com <strong>${firstName}</strong>.
            </p>
          </div>
        `,
            }),
        });

        const data = await resendResponse.json();

        if (!resendResponse.ok) {
            throw new Error(data.message || 'Erro ao enviar e-mail pelo Resend');
        }

        return new Response(JSON.stringify({ success: true, id: data.id }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}
