// Caminho: src/services/emailService.js
const nodemailer = require('nodemailer');
require('dotenv').config();

// Cria o "transportador" de email com as configurações lidas do .env
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST, // Deverá ser smtp.gmail.com
    port: parseInt(process.env.EMAIL_PORT, 10), // Deverá ser 465
    secure: process.env.EMAIL_SECURE === 'true', // true para a porta 465 (SSL)
    auth: {
        user: process.env.EMAIL_USER, // seu_email@gmail.com
        pass: process.env.EMAIL_PASS, // A SENHA DE APP DE 16 LETRAS
    },
});

const sendPasswordResetEmail = async (userEmail, token) => {
    // Garanta que o link aponta para o IP correto do seu servidor
    const resetLink = `http://10.109.132.160:3000/gestao/reset-password?token=${token}`;

    const mailOptions = {
        from: `"Sistema de Gestão" <${process.env.EMAIL_USER}>`,
        to: userEmail, // O email do usuário que solicitou a recuperação
        subject: 'Recuperação de Senha - Sistema de Gestão',
        html: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6;">
                <h2>Recuperação de Senha</h2>
                <p>Olá,</p>
                <p>Recebemos uma solicitação para redefinir a senha da sua conta no Sistema de Gestão de Produção.</p>
                <p>Por favor, clique no botão abaixo para criar uma nova senha. Este link é válido por 1 hora.</p>
                <a href="${resetLink}" style="background-color: #007bff; color: white; padding: 12px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
                    Redefinir Senha
                </a>
                <p>Se você não fez esta solicitação, pode ignorar este email com segurança.</p>
                <p>Atenciosamente,<br>Equipe do Sistema de Gestão</p>
            </div>
        `,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`✅ Email de recuperação enviado com sucesso para ${userEmail}`);
    } catch (error) {
        console.error('❌ Erro ao enviar email de recuperação:', error);
        // Lança o erro para que a função no controller possa capturá-lo
        throw new Error('Não foi possível enviar o email de recuperação.');
    }
};

module.exports = { sendPasswordResetEmail };