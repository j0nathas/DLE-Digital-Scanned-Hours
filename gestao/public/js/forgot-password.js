document.getElementById('forgot-password-form').addEventListener('submit', async (event) => {
    event.preventDefault();

    const email = document.getElementById('email-input').value;
    const messageEl = document.getElementById('message');
    const formContainer = document.getElementById('form-container');
    const successContainer = document.getElementById('success-container');
    
    try {
        await fetch('/api/gestao/forgot-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });

        // Por segurança, sempre mostramos sucesso para não revelar se um email existe.
        formContainer.style.display = 'none';
        successContainer.style.display = 'block';

    } catch (error) {
        messageEl.textContent = 'Falha de comunicação com o servidor.';
        messageEl.className = 'message error';
    }
});