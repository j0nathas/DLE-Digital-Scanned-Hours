// Arquivo: gestao/public/js/login.js
// VERSÃO CORRIGIDA

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const loginInput = document.getElementById('login-input');
    const senhaInput = document.getElementById('senha-input');
    const errorMessage = document.getElementById('error-message');

    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault(); // Impede o recarregamento da página

        const login = loginInput.value;
        const senha = senhaInput.value;
        errorMessage.textContent = ''; // Limpa mensagens de erro antigas

        try {
            const response = await fetch('/api/gestao/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ login, senha })
            });

            if (response.ok) {
                // SUCESSO! Redireciona para a NOVA tela de seleção de plantas
                window.location.href = '/gestao/selecao';
            } else {
                // Se a resposta não for 'ok', tenta ler a mensagem de erro da API
                const result = await response.json();
                errorMessage.textContent = result.message || 'Usuário ou senha inválidos.'; // Usa a mensagem da API
            }

        } catch (error) {
            console.error('Erro ao tentar fazer login:', error);
            errorMessage.textContent = 'Falha de comunicação com o servidor.';
        }
    });
});