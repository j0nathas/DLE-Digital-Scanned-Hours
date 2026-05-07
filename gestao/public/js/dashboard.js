// ARQUIVO: gestao/public/js/dashboard.js

document.addEventListener('DOMContentLoaded', () => {
    // Registra o plugin de rótulos (datalabels) globalmente para todos os gráficos
    Chart.register(ChartDataLabels);

    // Referências aos elementos do HTML
    const elements = {
        filtroMesAno: document.getElementById('filtro-mes-ano'),
        filtroPlanta: document.getElementById('filtro-planta'),
        errorContainer: document.getElementById('error-container'),
        mainContent: document.getElementById('main-content'),
        btnSair: document.getElementById('btn-sair'),
        // Contextos dos <canvas> para cada gráfico
        ctxPorArea: document.getElementById('chartPorArea').getContext('2d'),
        ctxPorDispositivo: document.getElementById('chartPorDispositivo').getContext('2d'),
        ctxTendenciaDiaria: document.getElementById('chartTendenciaDiaria').getContext('2d'),
    };

    // Função principal que busca os dados analíticos já processados pela API
    const buscarDadosAnaliticos = async () => {
        const mesAno = elements.filtroMesAno.value;
        const planta = elements.filtroPlanta.value;

        if (!mesAno) return; // Não faz nada se o mês não estiver selecionado

        // Mostra feedback visual de carregamento nos gráficos
        document.querySelectorAll('.chart-container, .chart-container-full').forEach(el => el.style.opacity = 0.5);
        elements.errorContainer.style.display = 'none';
        elements.mainContent.style.display = 'block';

        // Constrói a URL para o endpoint analítico otimizado
        const url = new URL('/api/gestao/dashboard-analytics', window.location.origin);
        url.searchParams.append('mesAno', mesAno);
        if (planta) {
            url.searchParams.append('planta', planta);
        }

        try {
            const response = await fetch(url);

            if (response.status === 401) {
                window.location.href = '/gestao/login';
                return;
            }
            if (!response.ok) {
                throw new Error(`Erro na API: ${response.statusText}`);
            }
            
            const dados = await response.json();

            // Chama a função para criar/atualizar cada gráfico com seus respectivos dados
            // Os dados já vêm prontos da API, o JS apenas desenha.
            criarOuAtualizarGrafico(dados.porArea, elements.ctxPorArea, 'Horas por Área', 'bar', 'Nome_Area');
            criarOuAtualizarGrafico(dados.porDispositivo, elements.ctxPorDispositivo, 'Horas por Dispositivo', 'bar', 'Nome_Dispositivo');
            criarOuAtualizarGrafico(dados.tendenciaDiaria, elements.ctxTendenciaDiaria, 'Tendência Diária', 'line', 'Dia');
            
            // Restaura a opacidade total após o carregamento
            document.querySelectorAll('.chart-container, .chart-container-full').forEach(el => el.style.opacity = 1);

        } catch (error) {
            console.error('Erro ao buscar dados do dashboard:', error);
            elements.errorContainer.textContent = 'Não foi possível carregar os dados. Verifique a API e a conexão.';
            elements.errorContainer.style.display = 'block';
        }
    };

    // Função genérica e reutilizável para criar ou atualizar qualquer gráfico
    const criarOuAtualizarGrafico = (dados, ctx, titulo, tipo, chaveLabel) => {
        // Formata os labels (rótulos do eixo X)
        const labels = dados.map(d => {
            if (chaveLabel === 'Dia') {
                // Formata a data para o padrão brasileiro (dd/mm)
                return new Date(d.Dia).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'UTC' });
            }
            return d[chaveLabel]; // Usa a chave 'Nome_Area' ou 'Nome_Dispositivo'
        });
        
        // Pega os pontos de dados (valores do eixo Y)
        const dataPoints = dados.map(d => d.TotalHoras);

        // Destrói o gráfico anterior no mesmo canvas para evitar sobreposição
        let chartInstance = Chart.getChart(ctx);
        if (chartInstance) {
            chartInstance.destroy();
        }

        // Cria a nova instância do gráfico
        new Chart(ctx, {
            type: tipo,
            data: {
                labels: labels,
                datasets: [{
                    label: 'Total de Horas',
                    data: dataPoints,
                    backgroundColor: tipo === 'bar' ? 'rgba(54, 162, 235, 0.6)' : 'transparent',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: tipo === 'bar' ? 1 : 2.5,
                    pointBackgroundColor: 'rgba(54, 162, 235, 1)',
                    pointRadius: 4,
                    tension: 0.1 // Para suavizar a linha de tendência
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    // Configuração dos rótulos (datalabels) para mostrar os valores nas barras/pontos
                    datalabels: {
                        anchor: 'end',
                        align: 'end',
                        // Formata o valor para mostrar com uma casa decimal e 'h' no final (ex: "12.5h")
                        formatter: (value) => value > 0 ? parseFloat(value).toFixed(1) + 'h' : '',
                        font: { weight: 'bold' },
                        // Só exibe rótulos nos gráficos de barra para não poluir o de linha
                        display: tipo === 'bar'
                    },
                    title: {
                        display: false // O título já está no H2 do HTML
                    },
                    legend: {
                        display: false // Oculta a legenda pois só temos uma série de dados
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Horas (Decimal)'
                        }
                    }
                }
            }
        });
    };

    // Função de logout
    const logout = async () => {
        try {
            await fetch('/api/gestao/logout'); 
            window.location.href = '/gestao/login';
        } catch (error) {
            console.error('Erro ao fazer logout:', error);
        }
    };

    // --- INICIALIZAÇÃO ---
    // Define o mês e ano atuais como padrão no filtro
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = (hoje.getMonth() + 1).toString().padStart(2, '0');
    elements.filtroMesAno.value = `${ano}-${mes}`;

    // Adiciona os "escutadores" de eventos para os filtros
    elements.filtroMesAno.addEventListener('change', buscarDadosAnaliticos);
    elements.filtroPlanta.addEventListener('change', buscarDadosAnaliticos);
    if (elements.btnSair) {
        elements.btnSair.addEventListener('click', logout);
    }

    // Faz a carga inicial dos dados quando a página carrega
    buscarDadosAnaliticos();
});