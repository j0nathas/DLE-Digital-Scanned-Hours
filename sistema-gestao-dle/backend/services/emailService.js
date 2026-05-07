const nodemailer = require('nodemailer');

// Cria o transporter com as configurações do .env
function criarTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true', // true = SSL porta 465, false = TLS porta 587
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: {
      // Aceita certificados auto-assinados (comum em ambientes corporativos)
      rejectUnauthorized: false,
      ciphers: 'SSLv3',
    },
  });
}

// Template HTML do e-mail de recuperação de senha
function templateRecuperacaoSenha(nomeUsuario, linkReset, plantaNome) {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Recuperação de Senha - Sistema DLE</title>
</head>
<body style="margin:0;padding:0;background:#0f1117;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f1117;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#1a1d27;border-radius:12px;overflow:hidden;border:1px solid #2a2d3e;">
          
          <!-- Cabeçalho -->
          <tr>
            <td style="background:linear-gradient(135deg,#6c63ff,#4f46e5);padding:32px;text-align:center;">
              <div style="font-size:28px;font-weight:700;color:#fff;letter-spacing:2px;">⚙️ Sistema DLE</div>
              <div style="color:rgba(255,255,255,0.7);font-size:13px;margin-top:6px;">${plantaNome}</div>
            </td>
          </tr>

          <!-- Corpo -->
          <tr>
            <td style="padding:40px 40px 32px;">
              <p style="color:#9ca3af;font-size:14px;margin:0 0 8px;">Olá,</p>
              <h2 style="color:#fff;font-size:22px;margin:0 0 20px;font-weight:600;">${nomeUsuario || 'Usuário'}</h2>
              
              <p style="color:#9ca3af;font-size:15px;line-height:1.6;margin:0 0 28px;">
                Recebemos uma solicitação para redefinir a senha da sua conta no Sistema DLE.<br>
                Clique no botão abaixo para criar uma nova senha.
              </p>

              <!-- Botão -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:8px 0 32px;">
                    <a href="${linkReset}" 
                       style="display:inline-block;background:#6c63ff;color:#fff;text-decoration:none;
                              padding:14px 40px;border-radius:8px;font-size:15px;font-weight:600;
                              letter-spacing:0.5px;">
                      Redefinir Minha Senha
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Aviso de expiração -->
              <div style="background:#0f1117;border-radius:8px;padding:16px;border-left:3px solid #f59e0b;">
                <p style="color:#f59e0b;font-size:13px;margin:0;font-weight:600;">⚠️ Atenção</p>
                <p style="color:#9ca3af;font-size:13px;margin:6px 0 0;">
                  Este link expira em <strong style="color:#fff;">1 hora</strong>. 
                  Após esse período, será necessário solicitar um novo link.
                </p>
              </div>

              <p style="color:#6b7280;font-size:13px;margin:24px 0 0;line-height:1.6;">
                Se você não solicitou a redefinição de senha, ignore este e-mail. 
                Sua senha permanecerá a mesma.
              </p>
            </td>
          </tr>

          <!-- Link alternativo -->
          <tr>
            <td style="padding:0 40px 32px;">
              <p style="color:#6b7280;font-size:12px;margin:0;">
                Se o botão não funcionar, copie e cole este link no navegador:
              </p>
              <p style="color:#6c63ff;font-size:12px;margin:4px 0 0;word-break:break-all;">${linkReset}</p>
            </td>
          </tr>

          <!-- Rodapé -->
          <tr>
            <td style="background:#0f1117;padding:20px 40px;border-top:1px solid #2a2d3e;">
              <p style="color:#4b5563;font-size:12px;margin:0;text-align:center;">
                Sistema DLE — Magna International | Este é um e-mail automático, não responda.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

async function enviarEmailRecuperacao(destinatario, nomeUsuario, linkReset, plantaNome) {
  const transporter = criarTransporter();

  // Verifica conexão antes de enviar
  await transporter.verify();

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: destinatario,
    subject: `[Sistema DLE] Redefinição de Senha`,
    html: templateRecuperacaoSenha(nomeUsuario, linkReset, plantaNome),
  });
}

module.exports = { enviarEmailRecuperacao };