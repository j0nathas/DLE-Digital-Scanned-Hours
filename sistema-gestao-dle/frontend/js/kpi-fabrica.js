/**
 * kpi-fabrica.js - Versão Integrada (Refugo & Faturamento)
 */

let kpiCharts = {};
const METAS_BP_FATURAMENTO = {
    olsa: [ 22690589, 26935472, 30521715, 34842287, 29089648, 26768725, 34106928, 28323195, 26149698, 33122275, 24838439, 20436545 ],
    jarinu: [ 11187940, 13425209, 15204226, 17484006, 14443110, 18486632, 26416807, 20930640, 20843379, 26329546, 19748675, 23987887 ]
};

const estadoRF = {
    planta: 'olsa',
    dados: { refugo: [], refSum: [], fat: [], fatAno: [] },
    filtros: {},
    anoAtual: new Date().getFullYear(),
    categoria: 'todos'
};

async function iniciarKpiFabrica() {
    console.log("[KPI] Iniciando Dashboard Refugo & Faturamento...");
    
    // 1. Inicializar Datas
    const hoje = new Date();
    document.getElementById('startDate-rf').value = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().slice(0, 10);
    document.getElementById('endDate-rf').value = hoje.toISOString().slice(0, 10);

    // 2. Configurar Eventos da Sidebar de Filtros
    const sidebar = document.getElementById('sidebar-filtros-rf');
    document.getElementById('btn-open-sidebar-rf').onclick = () => sidebar.classList.add('open');
    document.getElementById('btn-close-sidebar-rf').onclick = () => sidebar.classList.remove('open');

    // 3. Criar Botões de Ano/Mês
    configurarBotoesInterface();

    // 4. Configurar Botão Atualizar
    document.getElementById('btn-update-rf').onclick = carregarDadosRF;

    // 5. Carga Inicial
    await carregarDadosRF();
}

function configurarBotoesInterface() {
    const containerAno = document.getElementById('btn-group-ano-rf');
    containerAno.innerHTML = '';
    [2024, 2025, 2026].forEach(ano => {
        const btn = document.createElement('button');
        btn.textContent = ano;
        if(ano === estadoRF.anoAtual) btn.classList.add('ativo');
        btn.onclick = async () => {
            estadoRF.anoAtual = ano;
            document.querySelectorAll('#btn-group-ano-rf button').forEach(b => b.classList.remove('ativo'));
            btn.classList.add('ativo');
            await carregarDadosRF();
        };
        containerAno.appendChild(btn);
    });
}

async function carregarDadosRF() {
    const loading = document.getElementById('loading-overlay-rf');
    if(loading) loading.style.display = 'flex';

    try {
        const start = document.getElementById('startDate-rf').value;
        const end = document.getElementById('endDate-rf').value;
        const prefix = estadoRF.planta === 'jarinu' ? '/api/debx/jarinu' : '/api/debx';

        // Chamadas em paralelo para o seu backend Node
        const [refRes, sumRes, fatRes] = await Promise.all([
            fetch(`${prefix}/scrap?start=${start}&end=${end}`).then(r => r.json()),
            fetch(`${prefix}/scrap/summary/monthly?year=${estadoRF.anoAtual}`).then(r => r.json()),
            fetch(`${prefix}/faturamento?start=${start}&end=${end}`).then(r => r.json())
        ]);

        estadoRF.dados.refugo = refRes;
        estadoRF.dados.refSum = sumRes;
        estadoRF.dados.fat = fatRes;

        renderizarDashboardRF();
    } catch (err) {
        console.error("Erro ao carregar dados RF:", err);
    } finally {
        if(loading) loading.style.display = 'none';
    }
}

function renderizarDashboardRF() {
    // Aqui entra a lógica do ECharts que você já tem no scripts.js
    // Exemplo para o gráfico diário:
    const el = document.getElementById('chart-daily-container');
    if (!el) return;

    if (kpiCharts.daily) kpiCharts.daily.dispose();
    kpiCharts.daily = echarts.init(el);

    // Lógica de processamento de dados...
    const option = {
        tooltip: { trigger: 'axis' },
        xAxis: { type: 'category', data: ['01', '02', '03'] }, // Exemplo
        yAxis: { type: 'value' },
        series: [{ data: [120, 200, 150], type: 'bar', itemStyle: { color: '#ef4444' } }]
    };
    kpiCharts.daily.setOption(option);
}

function limparKpiFabrica() {
    console.log("[KPI] Destruindo instâncias de gráficos RF...");
    Object.values(kpiCharts).forEach(chart => {
        if (chart) chart.dispose();
    });
    kpiCharts = {};
}