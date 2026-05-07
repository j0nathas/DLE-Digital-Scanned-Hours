document.getElementById('reset-password-form').addEventListener('submit', async (event) => {
    event.preventDefault();

    const token = document.getElementById('reset-token').value;
    const senha = document.getElementById('senha-input').value;
    const confirmSenha = document.getElementById('confirm-senha-input').value;
    const messageEl = document.getElementById('message');

    messageEl.textContent = '';
    messageEl.className = 'message';

    if (senha !== confirmSenha) {
        messageEl.textContent = 'As senhas não coincidem.';
        messageEl.classList.add('error');
        return;
    }

    if (!token) {
        messageEl.textContent = 'Token de recuperação inválido ou ausente.';
        messageEl.classList.add('error');
        return;
    }

    try {
        const response = await fetch('/api/gestao/reset-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, senha })
        });
        
        const result = await response.json();

        if (response.ok) {
            messageEl.textContent = 'Senha redefinida com sucesso! Redirecionando...';
            messageEl.classList.add('success');
            setTimeout(() => { window.location.href = '/gestao/login'; }, 2000);
        } else {
            messageEl.textContent = result.error;
            messageEl.classList.add('error');
        }
    } catch (error) {
        messageEl.textContent = 'Falha de comunicação com o servidor.';
        messageEl.classList.add('error');
    }
});