// Dentro de gestao/public/js/indicadores.js

const carregarDadosDashboard = async () => {
    const params = new URLSearchParams(window.location.search);
    const plantaId = params.get('planta');
    const dataInicio = filtroDataInicio.value;
    const dataFim = filtroDataFim.value;

    if (!plantaId || !dataInicio || !dataFim) return;

    loadingSpinner.style.display = 'block';
    setoresContainer.innerHTML = '';
    setoresContainer.appendChild(loadingSpinner);

    try {
        // ====================== URL DA API CORRIGIDA ======================
        const apiUrl = `/api/gestao/indicadores/${plantaId}?dataInicio=${dataInicio}&dataFim=${dataFim}`;
        // ================================================================
        
        const response = await fetch(apiUrl);
        
        if (!response.ok) throw new Error('Falha ao buscar dados da API');
        
        const eventos = await response.json();
        
        // O resto do código (calcularHoras, estruturar, renderizar) permanece o mesmo,
        // pois ele já espera receber a lista de eventos brutos.
        
        const horasPorMaquina = calcularHorasPorMaquina(eventos);
        const dadosEstruturados = estruturarDadosParaRenderizacao(horasPorMaquina);
        renderizarSetores(dadosEstruturados);

    } catch (error) {
        console.error('Erro ao carregar e processar dados do dashboard:', error);
        loadingSpinner.style.display = 'none';
        setoresContainer.innerHTML = `<p class="text-red-400 text-center text-lg">Não foi possível carregar os dados.</p>`;
    }
};