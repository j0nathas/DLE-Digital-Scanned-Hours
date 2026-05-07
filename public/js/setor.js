const API_BASE_URL = 'http://10.109.132.135:3000'; // Use o IP do seu servidor

document.addEventListener('DOMContentLoaded', () => {
    // Pega os parâmetros da URL, por exemplo: ?planta=MLB&setor=Injecao
    const params = new URLSearchParams(window.location.search);
    const planta = params.get('planta');
    const setor = params.get('setor');

    if (planta && setor) {
        carregarMaquinasDoSetor(planta, setor);
    } else {
        document.getElementById('titulo-setor').textContent = 'Erro: Planta ou setor não especificado.';
    }
});

async function carregarMaquinasDoSetor(planta, setor) {
    const tituloEl = document.getElementById('titulo-setor');
    const gridEl = document.getElementById('maquinas-grid');
    const linkVoltar = document.getElementById('link-voltar');

    // Atualiza o título e o link de "Voltar"
    tituloEl.textContent = `Setor ${setor} - Planta ${planta}`;
    linkVoltar.href = `/${planta.toLowerCase()}.html`;
    linkVoltar.textContent = `← Voltar para a Planta ${planta}`;

    gridEl.innerHTML = '<p>Buscando dados das máquinas...</p>';

    try {
        // --- ESTA É A CHAMADA CORRETA PARA A NOVA API ---
        const response = await fetch(`${API_BASE_URL}/api/dashboard/setor/${planta}/${encodeURIComponent(setor)}`);
        if (!response.ok) throw new Error(`Erro na API: ${response.statusText}`);
        
        const maquinas = await response.json();

        gridEl.innerHTML = ''; // Limpa a mensagem de carregamento

        if (maquinas.length === 0) {
            gridEl.innerHTML = '<p>Nenhuma máquina encontrada para este setor.</p>';
            return;
        }

        // --- ESTE É O CÓDIGO QUE CONSTRÓI O NOVO CARD DETALHADO ---
        maquinas.forEach(maq => {
            const card = document.createElement('div');
            card.className = 'maquina-card-detalhado';
            
            card.innerHTML = `
                <h4 class="maquina-titulo">${maq.maquina}</h4>
                <div class="operadores-container">
                    <div class="operador-info">
                        <img src="/images/card-icon.svg" alt="Ícone">
                        <p>Esperado. <strong>${String(maq.esperado).padStart(2, '0')}</strong></p>
                    </div>
                    <div class="operador-info">
                        <img src="/images/card-icon.svg" alt="Ícone">
                        <p>Real <strong>${String(maq.real).padStart(2, '0')}</strong></p>
                    </div>
                </div>
            `;
            gridEl.appendChild(card);
        });

    } catch (error) {
        console.error('Falha ao carregar dados das máquinas:', error);
        gridEl.innerHTML = `<p class="erro">Não foi possível carregar os dados.</p>`;
    }
}