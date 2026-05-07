function iniciarSelecaoPlanta() {
    const container = document.getElementById('plant-selection-container');
    if (!container) return;

    const API_PLANTAS_URL = 'http://10.109.132.135:3001/api/plantas/listar';

    const plantLocations = {
        'MLB': 'São Bernardo do Campo',
        'MMB': 'Vinhedo',
        'MJN': 'Jarinu'
    };

    const renderPlantCards = (plantas) => {
        const grid = document.getElementById('plant-selection-grid');
        if (!grid) return;
        grid.innerHTML = ''; 

        plantas.forEach(planta => {
            const card = document.createElement('div');
            card.className = 'plant-card';
            card.dataset.plantaSigla = planta.sigla;
            card.tabIndex = 0; 

            const sigla = planta.sigla ? planta.sigla.toUpperCase() : '???';
            const location = plantLocations[sigla] || 'Localização não definida';
            const code = `Cód: BR-${sigla}-DL`;

            card.innerHTML = `
                <h3>${sigla}</h3>
                <p class="location">${location}</p>
                <span class="code">${code}</span>
            `;
            grid.appendChild(card);
        });
    };

    const initializeSelection = async () => {
        try {
            const response = await fetch(API_PLANTAS_URL);
            if (!response.ok) {
                const erroData = await response.json();
                throw new Error(erroData.detalhe || 'Erro ao carregar plantas');
            }
            const plantas = await response.json();
            renderPlantCards(plantas);

            document.getElementById('plant-selection-grid').addEventListener('click', (event) => {
                const card = event.target.closest('.plant-card');
                if (card) {
                    const plantaSigla = card.dataset.plantaSigla;
                    localStorage.setItem('plantaSelecionada', plantaSigla);
                    window.location.hash = '#gestao';
                }
            });

        } catch (error) {
            console.error('Erro no Frontend:', error);
            const grid = document.getElementById('plant-selection-grid');
            if (grid) grid.innerHTML = `<p class="error-message">Erro: ${error.message}</p>`;
        }
    };

    initializeSelection();
}