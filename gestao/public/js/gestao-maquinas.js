// ARQUIVO: gestao/public/js/gestao-maquinas.js
// VERSÃO FINAL COM ESTILOS TAILWIND E ESTRUTURA CORRETA

document.addEventListener('DOMContentLoaded', () => {
    const navLink = document.getElementById('nav-gestao');
    if (navLink) { navLink.classList.add('active'); }

    const setoresContainer = document.getElementById('setores-container');
    const params = new URLSearchParams(window.location.search);
    const plantaId = params.get('planta');
    const UPDATE_INTERVAL = 10000;

    // Dentro de gestao-maquinas.js

const renderizarSetores = (setores) => {
    setoresContainer.innerHTML = '';
    if (!setores || setores.length === 0) {
        setoresContainer.innerHTML = '<p class="text-center text-gray-400">Nenhuma máquina encontrada.</p>';
        return;
    }

    // Cria o container principal que terá a barra de rolagem interna
    const gridPrincipal = document.createElement('div');
    gridPrincipal.id = 'grid-principal';

    setores.forEach((setor) => {
        const maquinasHtml = setor.maquinas.map(maquina => {
            const corStatus = maquina.operadores_atuais > 0 ? 'bg-yellow-400 text-gray-900' : 'bg-gray-700 text-gray-400';
            const corBorda = maquina.operadores_atuais > 0 ? 'border-yellow-500' : 'border-gray-600';

            return `
                <div class="maquina-card-compacto ${corBorda}" title="${maquina.nome}">
                    <div class="maquina-nome-compacto">${maquina.nome}</div>
                    <div class="maquina-status-compacto ${corStatus}">
                        <div class="numero">${maquina.operadores_atuais}</div>
                        <div class="texto">Operadores</div>
                    </div>
                </div>
            `;
        }).join('');

        const setorHtml = `
            <div class="setor-bloco">
                <div class="setor-titulo">${setor.nome}</div>
                <div class="maquinas-grid">${maquinasHtml}</div>
            </div>
        `;
        gridPrincipal.insertAdjacentHTML('beforeend', setorHtml);
    });

    setoresContainer.appendChild(gridPrincipal);

    const legendaHtml = `
        <div class="legenda-footer">
            <div class="legenda-item"><div class="legenda-cor bg-red-500"></div><span>Operador a Mais</span></div>
            <div class="legenda-item"><div class="legenda-cor bg-green-500"></div><span>Qtd. Correta</span></div>
            <div class="legenda-item"><div class="legenda-cor bg-yellow-400"></div><span>Apontamento Ativo</span></div>
            <div class="legenda-item"><div class="legenda-cor bg-gray-700"></div><span>Máquina Não Iniciada</span></div>
        </div>
    `;
    setoresContainer.insertAdjacentHTML('beforeend', legendaHtml);
};

    const atualizarStatus = async () => {
        if (!plantaId) {
            setoresContainer.innerHTML = '<p class="text-red-400 text-center">ID da planta não encontrado.</p>';
            return;
        }
        try {
            const dataParaTeste = new Date().toISOString().split('T')[0];
            const response = await fetch(`/api/gestao/status-maquinas/${plantaId}?data=${dataParaTeste}`);
            
            if (response.status === 401) { window.location.href = '/gestao/login'; return; }
            if (!response.ok) { throw new Error(`API Error: ${response.status}`); }

            const data = await response.json();
            renderizarSetores(data.dados);

        } catch (error) {
            console.error('Erro no ciclo de atualização de status:', error);
            setoresContainer.innerHTML = `<p class="text-red-400 text-center">Falha ao conectar com a API.</p>`;
        } finally {
            setTimeout(atualizarStatus, UPDATE_INTERVAL);
        }
    };

    atualizarStatus();
});