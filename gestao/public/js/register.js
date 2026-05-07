document.getElementById('register-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    
    const nome = document.getElementById('nome-input').value;
    const login = document.getElementById('login-input').value;
    const email = document.getElementById('email-input').value;
    const senha = document.getElementById('senha-input').value;
    const idCargo = document.getElementById('cargo-select').value;
    // Pega o valor do novo campo de planta
    const idPlanta = document.getElementById('planta-select').value;
    const messageEl = document.getElementById('message');

    messageEl.textContent = '';
    messageEl.className = 'message';

    try {
        const response = await fetch('/api/gestao/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            // Adiciona o idPlanta ao corpo da requisição
            body: JSON.stringify({ nome, login, email, senha, idCargo, idPlanta })
        });
        
        const result = await response.json();

        if (response.ok) {
            messageEl.textContent = 'Cadastro realizado com sucesso! Redirecionando...';
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