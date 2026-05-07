const API_BASE_URL = 'http://10.109.132.135:3000'; // Use o IP do seu servidor

document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname; 
    const planta = path.replace('.html', '').replace('/', '').toUpperCase();
    carregarSetoresComoLinks(planta);
});

async function carregarSetoresComoLinks(planta) {
    const tituloEl = document.getElementById('titulo-planta');
    const gridEl = document.getElementById('dashboard-grid'); // O grid na página da planta

    tituloEl.textContent = `Selecione o Setor - Planta ${planta}`;
    gridEl.innerHTML = '<p>Buscando dados dos setores...</p>';

    try {
        const response = await fetch(`${API_BASE_URL}/api/maquinassetores/${planta}`);
        if (!response.ok) throw new Error(`Erro na API: ${response.statusText}`);
        
        const setores = await response.json();

        gridEl.innerHTML = '';

        if (setores.length === 0) {
            gridEl.innerHTML = '<p>Nenhum setor encontrado para esta planta.</p>';
            return;
        }

        // Para cada setor, cria um CARD QUE É UM LINK para a página de setor
        setores.forEach(setor => {
            const cardLink = document.createElement('a');
            cardLink.className = 'dashboard-card setor-link';
            cardLink.href = `/setor.html?planta=${planta}&setor=${encodeURIComponent(setor.nome)}`;

            // Garante que o ícone correto está sendo chamado
            cardLink.innerHTML = `
                <img src="/images/card-icon.svg" alt="Ícone do Setor">
                <div class="card-content">
                    <h2>${setor.nome}</h2>
                    <p>${setor.maquinas.length} máquinas</p>
                </div>
            `;
            
            gridEl.appendChild(cardLink);
        });

    } catch (error) {
        console.error('Falha ao carregar dados dos setores:', error);
        gridEl.innerHTML = `<p class="erro">Não foi possível carregar os dados.</p>`;
    }
}