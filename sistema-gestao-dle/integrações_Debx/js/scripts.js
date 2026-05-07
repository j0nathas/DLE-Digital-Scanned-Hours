(function() { 
    // 1. --- Constantes e Estado Global ---
    const API_BASE_URL = '/api/debx';
    const DIAS_SEMANA = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'];
    const FERIADOS_COMPARE = ['01-01', '04-18', '04-21', '05-01', '09-07', '10-12', '11-02', '11-15', '12-25'];
    const MESES_ABREVIADOS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
    const META_DIARIA_VALOR_REFUGO = 30000;
    const META_PERCENTUAL_REFUGO = 2.1;

    const METAS_BP_FATURAMENTO = {
        olsa: [ 22690589.85, 26935472.84, 30521715.42, 34842287.04, 29089648.24, 26768725.52, 34106928.87, 28323195.52, 26149698.22, 33122275.71, 24838439.52, 20436545.50 ],
        jarinu: [ 11187940.17, 13425209.01, 15204226.52, 17484006.16, 14443110.23, 18486632.92, 26416807.62, 20930640.81, 20843379.51, 26329546.33, 19748675.21, 23987887.84 ]
    };

    const MAPA_REFUGO_ESPECIAL = { 
        engenharia: ['REFUGO DE ENGENHARIA'],
        qualidade: ['PEÇA REFUGADA QUALIDADE/DEVOLUÇÃO'], 
        obsoleto: ['OBSOLETO'] 
    };
    const TODOS_MOTIVOS_ESPECIAIS = Object.values(MAPA_REFUGO_ESPECIAL).flat();
    
    const estado = {
        planta: 'olsa', 
        dados: { refugo: [], refugoSumarioAno: [], faturamento: [], faturamentoAno: [] },
        filtros: {}, anoAtual: new Date().getFullYear(), filtroCategoriaAtivo: 'todos',
        viewRefugoMensal: 'mensal', mesDrilldownRefugo: null,
        viewFaturamentoMensal: 'mensal', mesDrilldownFat: null
    };

    // ===================================================================
    // 2. --- MÓDULO DE UTILITÁRIOS ---
    // ===================================================================
    function debounce(func, delay = 250) {
        let timeout;
        return (...args) => { clearTimeout(timeout); timeout = setTimeout(() => func.apply(this, args), delay); };
    }

    function mostrarLoading(mostrar) { document.getElementById('loading-overlay').style.display = mostrar ? 'flex' : 'none'; }
    
    function abreviarNumero(num) {
        if (num == null) return '0';
        if (Math.abs(num) < 1000) return num.toFixed(0);
        const s = ['', 'k', 'M', 'B', 'T'];
        const i = Math.floor(Math.log10(Math.abs(num)) / 3);
        const v = num / Math.pow(1000, i);
        return `${v.toFixed(v < 10 && v > -10 ? 1 : 0)}${s[i]}`;
    }

    // Função crucial: trata "1.234,56" para "1234.56"
    function formatarValorParaFloat(valor) {
        if (valor == null) return 0;
        if (typeof valor === 'number') return valor;
        let str = String(valor).replace(/\s/g, ''); 
        if (str.includes(',') && str.includes('.')) {
            str = str.replace(/\./g, '').replace(',', '.');
        } else {
            str = str.replace(',', '.');
        }
        return parseFloat(str) || 0;
    }

    function parseSafeDate(dateStr) {
        if (!dateStr) return null;
        let d;
        if (dateStr.includes('/')) {
            const parts = dateStr.split(' ')[0].split('/');
            d = new Date(`${parts[2]}-${parts[1]}-${parts[0]}T12:00:00`);
        } else {
            d = new Date(dateStr.slice(0, 10) + "T12:00:00");
        }
        return isNaN(d.getTime()) ? null : d;
    }

    function getWeekNumber(d) {
        let target = new Date(d.valueOf());
        let dayNr = (d.getDay() + 6) % 7;
        target.setDate(target.getDate() - dayNr + 3);
        let firstThursday = target.valueOf();
        target.setMonth(0, 1);
        if (target.getDay() !== 4) { target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7); }
        return 1 + Math.ceil((firstThursday - target) / 604800000);
    }

    function getWeekOfMonth(d) {
        let firstDay = new Date(d.getFullYear(), d.getMonth(), 1);
        let dayOffset = firstDay.getDay(); 
        return Math.ceil((d.getDate() + dayOffset) / 7);
    }

    function getDiasPeriodo() {
        const dias = []; 
        const sStr = document.getElementById('startDate').value;
        const eStr = document.getElementById('endDate').value;
        const s = new Date(sStr + "T12:00:00"); 
        const e = new Date(eStr + "T12:00:00");
        if(isNaN(s.getTime()) || isNaN(e.getTime())) return [];
        for (let dt = new Date(s); dt <= e; dt.setDate(dt.getDate() + 1)) dias.push(dt.toISOString().slice(0, 10));
        return dias;
    }

    function _calculateLinearRegression(data) {
        const n = data.length; if (n < 2) return [];
        let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
        for (let i = 0; i < n; i++) { sumX += i; sumY += data[i] || 0; sumXY += i * (data[i] || 0); sumX2 += i * i; }
        const slope = (n * sumX2 - sumX * sumX) === 0 ? 0 : (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;
        return data.map((_, i) => parseFloat((slope * i + intercept).toFixed(2)));
    }

    // ===================================================================
    // 3. --- LÓGICA DE GRÁFICOS E INTERFACE ---
    // ===================================================================
    function _renderizarGraficoECharts(elementId, options, onClickCallback = null) {
        const el = document.getElementById(elementId); if (!el) return;
        const chart = echarts.getInstanceByDom(el) || echarts.init(el);
        chart.clear(); chart.setOption(options, true);
        if (onClickCallback) { chart.off('click'); chart.on('click', onClickCallback); }
        if (!el.dataset.observed) {
            const ro = new ResizeObserver(() => chart.resize());
            ro.observe(el);
            el.dataset.observed = "true";
        }
    }

    function _obterOpcoesGraficoPrincipal(labels, dataSets, keys, metas, barColor, mainSeriesName, isDrilldown = false) {
        const series = [];
        const [seriesName, seriesData] = Object.entries(dataSets).find(([key]) => key.includes('(R$)')) || [mainSeriesName, []];
        const yAxis = [
            { type: 'value', nameTextStyle: { color: '#fff' }, axisLabel: { formatter: abreviarNumero, fontSize: 10, color: '#fff' }, splitLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } } },
            { type: 'value', position: 'right', nameTextStyle: { color: '#fff' }, axisLabel: { formatter: abreviarNumero, fontSize: 10, color: '#fff' }, splitLine: { show: false } }
        ];
        if (metas.metaBar) {
            series.push({ name: 'Meta (BP)', type: 'bar', data: metas.metaBar, barMaxWidth: 60, itemStyle: { color: 'rgba(255,255,255,0.2)', opacity: 0.6 }, label: { show: false }, barGap: '-100%' });
        }
        series.push({ name: seriesName, type: 'bar', data: seriesData, barMaxWidth: 60, itemStyle: { color: barColor }, label: { show: true, position: 'top', formatter: (p) => p.value > 0 ? abreviarNumero(p.value) : '', color: '#fff', fontSize: 9 } });
        series.push({ name: 'Acumulado', type: 'line', yAxisIndex: 1, data: dataSets.Acumulado, smooth: true, symbol: 'none', itemStyle: { color: '#a855f7' } });
        if(dataSets.Tendência) series.push({ name: 'Tendência', type: 'line', data: dataSets.Tendência, smooth: true, symbol: 'none', lineStyle: { type: 'dashed', color: '#3b82f6', width: 2 }, tooltip: { show: false } });
        if (metas.metaLine) {
            const dataMeta = Array.isArray(metas.metaLine) ? metas.metaLine : Array(labels.length).fill(metas.metaLine);
            series.push({ name: 'Meta Valor', type: 'line', data: dataMeta, symbol: 'none', lineStyle: { type: 'dashed', color: '#ef4444' } });
        }
        let finalLabels = labels, xAxisFormatter = null;
        if (keys && keys.length > 0 && !isDrilldown) {
            finalLabels = keys.map(dateStr => `${dateStr.slice(8, 10)}\n${DIAS_SEMANA[new Date(dateStr + "T12:00:00").getDay()]}`);
            xAxisFormatter = (value, index) => { 
                const dateKey = keys[index];
                const date = new Date(dateKey + "T12:00:00"); 
                const mmDd = dateKey.slice(5);
                if (FERIADOS_COMPARE.includes(mmDd)) return `{f|${value}}`; 
                if (date.getDay() === 0 || date.getDay() === 6) return `{w|${value}}`; 
                return value; 
            };
        }
        return {
            title: isDrilldown ? { text: 'Clique para voltar ao mensal', left: 'center', top: 5, textStyle: { fontSize: 10, color: '#3b82f6' } } : null,
            tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, backgroundColor: 'rgba(15, 23, 42, 0.9)', borderColor: '#4b5563', textStyle: { color: '#fff' },
                formatter: (params) => {
                    if (!params || params.length === 0) return '';
                    const title = params[0].axisValueLabel.replace('\n',' ');
                    let html = `<b>${title}</b>`;
                    params.forEach(p => {
                        const val = p.value;
                        const formattedVal = (typeof val === 'number') ? val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : val;
                        html += `<br/>${p.marker} ${p.seriesName}: <b>${formattedVal}</b>`;
                    });
                    return html;
                }
            },
            legend: { data: series.map(s => s.name), top: 25, type: 'scroll', textStyle: { color: '#fff' } },
            grid: { top: 70, left: '8%', right: '8%', bottom: '15%', containLabel: true },
            xAxis: { type: 'category', data: finalLabels, axisLabel: { interval: 0, fontSize: 10, formatter: xAxisFormatter, color: '#fff', rich: { f: { color: '#ef4444', fontWeight: 'bold' }, w: { color: '#0ea5e9' } } } },
            yAxis, series
        };
    }

    function _obterOpcoesGraficoPercentual(labels, data, tendencia, meta, seriesName, seriesColor) {
        return {
            tooltip: { trigger: 'axis', backgroundColor: 'rgba(15, 23, 42, 0.9)', borderColor: '#4b5563', textStyle: { color: '#fff' }, formatter: (p) => `<b>${p[0].name}</b><br/>${p[0].marker} ${p[0].seriesName}: <b>${p[0].value.toFixed(2)}%</b>` },
            legend: { data: [seriesName, 'Tendência', 'Meta %'], top: 20, left: 'center', textStyle: { color: '#fff' } },
            grid: { top: 60, left: '12%', right: '8%', bottom: 35 },
            xAxis: { type: 'category', data: labels, axisLabel: { fontSize: 10, color: '#fff' } },
            yAxis: { type: 'value', axisLabel: { formatter: '{value}%', fontSize: 10, color: '#fff' }, splitLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } } },
            series: [
                { name: seriesName, type: 'line', data: data.map(v => parseFloat(v.toFixed(2))), smooth: true, symbol: 'circle', symbolSize: 6, itemStyle: { color: seriesColor }, label: { show: true, position: 'top', formatter: p => `${p.value.toFixed(1)}%`, color: '#fff', fontSize: 9 } },
                { name: 'Tendência', type: 'line', data: tendencia, smooth: true, symbol: 'none', lineStyle: { type: 'dashed', color: '#a855f7' } },
                { name: 'Meta %', type: 'line', data: Array(labels.length).fill(meta), symbol: 'none', lineStyle: { type: 'dashed', color: '#ef4444' } }
            ]
        };
    }

    function _obterOpcoesGraficoPizza(titulo, data) {
        return {
            title: { text: titulo, left: 'center', top: '5%', textStyle: { fontSize: 14, fontWeight: 'normal', color: '#fff' } },
            tooltip: { trigger: 'item', backgroundColor: 'rgba(15, 23, 42, 0.9)', textStyle: { color: '#fff' }, formatter: p => `<b>${p.name}</b><br/>${p.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (${p.percent.toFixed(1)}%)` },
            legend: { orient: 'vertical', left: 'right', top: 'center', type: 'scroll', textStyle: { fontSize: 10, color: '#fff' } },
            series: [{ type: 'pie', radius: ['45%', '65%'], center: ['35%', '55%'], data: data, label: { show: false }, emphasis: { focus: 'self' } }]
        };
    }

    document.addEventListener('DOMContentLoaded', inicializarDashboard);

    async function inicializarDashboard() {
        definirDatasIniciais();
        inicializarFiltrosEventos();
        configurarEventos();
        criarBotoesEstaticos();
        await carregarEProcessarDados();
        renderizarTodosGraficos();
    }

    async function carregarEProcessarDados() {
        mostrarLoading(true);
        try {
            const start = document.getElementById('startDate').value;
            const end = document.getElementById('endDate').value;
            const ano = estado.anoAtual;
            const getEndpoint = (endpoint) => estado.planta === 'jarinu' ? `/jarinu${endpoint}` : endpoint;
            
            const paramsFiltros = { ...Object.fromEntries(Object.entries(estado.filtros).filter(([, v]) => v && v.length > 0)) };
            if (estado.filtroCategoriaAtivo !== 'todos') paramsFiltros.motivo = MAPA_REFUGO_ESPECIAL[estado.filtroCategoriaAtivo];
            const { motivo, ...outrosFiltros } = paramsFiltros;
            
            const [refugoResult, refSumResult, fatResult, fatAnoResult] = await Promise.allSettled([
                fetchDadosAPI(getEndpoint('/scrap'), { start, end, ...outrosFiltros }),
                fetchDadosAPI(getEndpoint('/scrap/summary/monthly'), { year: ano, ...paramsFiltros }),
                fetchDadosAPI(getEndpoint('/faturamento'), { start, end }),
                fetchDadosAPI(getEndpoint('/faturamento'), { start: `${ano}-01-01`, end: `${ano}-12-31` }),
            ]);

            const obterValor = (r) => (r.status === 'fulfilled' ? r.value : []);
            
            // TRATAMENTO DE VALORES COM FORMATAÇÃO BRASILEIRA (Ponto de milhar e vírgula)
            estado.dados.refugo = obterValor(refugoResult).map(item => ({ 
                ...item, 
                "Valor Ref.": formatarValorParaFloat(item.Valor_Total || 0) 
            }));

            estado.dados.refugoSumarioAno = obterValor(refSumResult);
            estado.dados.faturamento = obterValor(fatResult).map(i => ({...i, 'VALLIQ': formatarValorParaFloat(i.VALLIQ)}));
            estado.dados.faturamentoAno = obterValor(fatAnoResult).map(i => ({...i, 'VALLIQ': formatarValorParaFloat(i.VALLIQ)}));

            popularFiltrosComDados();
        } catch (error) { console.error(error); } finally { mostrarLoading(false); }
    }

    function definirDatasIniciais() {
        const hoje = new Date();
        document.getElementById('startDate').value = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().slice(0, 10);
        document.getElementById('endDate').value = hoje.toISOString().slice(0, 10);
    }

    function configurarEventos() {
        document.getElementById('btn-update').addEventListener('click', async () => { await carregarEProcessarDados(); renderizarTodosGraficos(); });
        document.getElementById('btn-group-planta').addEventListener('click', handleFiltroPlanta);
        document.getElementById('btn-group-ano').addEventListener('click', handleFiltroGrupo);
        document.getElementById('btn-group-mes').addEventListener('click', handleFiltroGrupo);
        document.getElementById('btn-group-ff').addEventListener('click', handleFiltroGrupo);
        document.getElementById('btn-group-setor').addEventListener('click', handleFiltroGrupo);
        document.getElementById('btn-group-categoria').addEventListener('click', handleFiltroCategoria);
        document.addEventListener('click', handleToggleChartExpand);
        window.addEventListener('resize', debounce(() => redimensionarTodosGraficos(), 200));
    }

    async function handleFiltroPlanta(e) {
        if (e.target.tagName !== 'BUTTON') return;
        const btn = e.target; btn.parentElement.querySelectorAll('button').forEach(b => b.classList.remove('ativo')); btn.classList.add('ativo');
        estado.planta = btn.dataset.planta;
        document.getElementById('dashboard-title').innerText = `Dashboard Refugo & Faturamento - ${estado.planta.toUpperCase()}`;
        await carregarEProcessarDados(); renderizarTodosGraficos();
    }

    async function fetchDadosAPI(endpoint, params) {
        const url = new URL(`${API_BASE_URL}${endpoint}`);
        if (params) {
            const searchParams = new URLSearchParams();
            for (const key in params) { if (Array.isArray(params[key])) params[key].forEach(v => searchParams.append(key, v)); else searchParams.append(key, params[key]); }
            url.search = searchParams.toString();
        }
        const resp = await fetch(url); if (!resp.ok) throw new Error("API Error"); return resp.json();
    }

    function renderizarTodosGraficos() {
        const refugoFiltrado = filtrarDados(estado.dados.refugo, estado.filtros);
        const fatFiltrado = estado.dados.faturamento;

        atualizarKpiRefugo(refugoFiltrado, fatFiltrado);
        renderizarGraficoRefugoPrincipal('chart-daily-container', 'diario', refugoFiltrado);
        renderizarGraficoRefugoDinamico('chart-monthly-container'); 
        renderizarGraficoRefugoPercentual('chart-monthly-pct-container', estado.dados.refugoSumarioAno, estado.dados.faturamentoAno);
        renderizarGraficoFaturamentoPrincipal('chart-faturamento-diario', 'diario', fatFiltrado);
        renderizarGraficoFaturamentoDinamico('chart-faturamento-mensal');
        renderizarGraficoFaturamentoPercentual('chart-faturamento-mensal-pct', estado.dados.faturamentoAno);
        renderizarGraficoPizza('chart-pie-ff', 'Refugo por FF', refugoFiltrado, 'FF');
        renderizarGraficoPizza('chart-pie-setor', 'Refugo por Setor', refugoFiltrado, 'Setor');
        renderizarGraficoPizza('chart-pie-turno', 'Refugo por Turno', refugoFiltrado, 'Tur.');
        renderizarGraficoPizza('chart-pie-negocio', 'Refugo por Negócio', refugoFiltrado, 'Negocio');
        renderizarGraficoProjetoMotivo('chart-projeto-motivo', refugoFiltrado);
    }

    function renderizarGraficoRefugoDinamico(elementId) {
        if (estado.viewRefugoMensal === 'mensal') {
            const dadosAgrupados = agruparDadosRefugoMensal(estado.dados.refugoSumarioAno, estado.dados.faturamentoAno);
            
            // SINCRONIZAÇÃO: Se o período filtrado for o mês atual, forçamos o valor correto baseado no filtro detalhado
            const startStr = document.getElementById('startDate').value;
            const dataInicio = new Date(startStr + "T12:00:00");
            const mesIndex = dataInicio.getMonth();
            const refugoFiltrado = filtrarDados(estado.dados.refugo, estado.filtros);
            const totalFiltradoJS = refugoFiltrado.reduce((s, i) => s + Number(i["Valor Ref."] || 0), 0);
            
            dadosAgrupados.valores[mesIndex] = totalFiltradoJS;
            dadosAgrupados.acumulado = dadosAgrupados.valores.reduce((acc, v) => [...acc, (acc.slice(-1)[0] || 0) + v], []);

            document.getElementById('monthly-chart-title').innerText = `Refugo ${estado.anoAtual} (Valor)`;
            const dataSets = { 'Refugo Real (R$)': dadosAgrupados.valores, 'Acumulado': dadosAgrupados.acumulado };
            const options = _obterOpcoesGraficoPrincipal(MESES_ABREVIADOS, dataSets, null, { metaLine: dadosAgrupados.meta }, '#ef4444', 'Refugo Real');
            _renderizarGraficoECharts(elementId, options, (params) => {
                estado.viewRefugoMensal = 'semanal';
                estado.mesDrilldownRefugo = params.dataIndex;
                renderizarGraficoRefugoDinamico(elementId);
            });
        } else {
            const refugoFiltradoTotal = filtrarDados(estado.dados.refugo, estado.filtros);
            const dadosSemanais = agruparDadosRefugoSemanal(refugoFiltradoTotal, estado.mesDrilldownRefugo);
            document.getElementById('monthly-chart-title').innerText = `Refugo Sem. - ${MESES_ABREVIADOS[estado.mesDrilldownRefugo].toUpperCase()} ${estado.anoAtual}`;
            const dataSets = { 'Refugo Real (R$)': dadosSemanais.valores, 'Acumulado': dadosSemanais.acumulado };
            const options = _obterOpcoesGraficoPrincipal(dadosSemanais.labels, dataSets, null, { metaLine: dadosSemanais.metaMedia }, '#ef4444', 'Refugo Sem.', true);
            _renderizarGraficoECharts(elementId, options, () => {
                estado.viewRefugoMensal = 'mensal';
                estado.mesDrilldownRefugo = null;
                renderizarGraficoRefugoDinamico(elementId);
            });
        }
    }

    function agruparDadosRefugoSemanal(dadosRefugo, mesIndex) {
        const refPorSemana = dadosRefugo.reduce((acc, item) => {
            const d = parseSafeDate(item.Data);
            if (!d || d.getMonth() !== mesIndex || d.getFullYear() !== estado.anoAtual) return acc;
            const key = `Sem. ${getWeekOfMonth(d)} - Mês\nSem. ${getWeekNumber(d)} - Ano`;
            acc[key] = (acc[key] || 0) + Number(item['Valor Ref.'] || 0); return acc;
        }, {});
        const labels = Object.keys(refPorSemana).sort((a,b) => {
            const wA = parseInt(a.match(/Sem. (\d+) - Ano/)[1]);
            const wB = parseInt(b.match(/Sem. (\d+) - Ano/)[1]);
            return wA - wB;
        });
        const valores = labels.map(l => refPorSemana[l]);
        const acumulado = valores.reduce((acc, v) => [...acc, (acc.slice(-1)[0] || 0) + v], []);
        const metaMedia = (META_DIARIA_VALOR_REFUGO * 21) / (labels.length || 4);
        return { labels, valores, acumulado, metaMedia };
    }

    function renderizarGraficoFaturamentoDinamico(elementId) {
        if (estado.viewFaturamentoMensal === 'mensal') {
            const dadosAgrupados = agruparDadosFaturamentoMensal(estado.dados.faturamentoAno);
            document.getElementById('faturamento-mensal-titulo').innerText = `Faturamento ${estado.anoAtual} (Valor)`;
            const dataSets = { 'Faturamento Real (R$)': dadosAgrupados.valores, 'Acumulado': dadosAgrupados.acumulado };
            const options = _obterOpcoesGraficoPrincipal(MESES_ABREVIADOS, dataSets, null, { metaBar: dadosAgrupados.meta }, '#22c55e', 'Faturamento Real');
            _renderizarGraficoECharts(elementId, options, (params) => {
                estado.viewFaturamentoMensal = 'semanal';
                estado.mesDrilldownFat = params.dataIndex;
                renderizarGraficoFaturamentoDinamico(elementId);
            });
        } else {
            const dadosSemanais = agruparDadosFaturamentoSemanal(estado.dados.faturamentoAno, estado.mesDrilldownFat);
            document.getElementById('faturamento-mensal-titulo').innerText = `Faturamento Sem. - ${MESES_ABREVIADOS[estado.mesDrilldownFat].toUpperCase()} ${estado.anoAtual}`;
            const dataSets = { 'Faturamento Real (R$)': dadosSemanais.valores, 'Acumulado': dadosSemanais.acumulado };
            const options = _obterOpcoesGraficoPrincipal(dadosSemanais.labels, dataSets, null, { metaLine: dadosSemanais.metaMedia }, '#22c55e', 'Faturamento Sem.', true);
            _renderizarGraficoECharts(elementId, options, () => {
                estado.viewFaturamentoMensal = 'mensal';
                estado.mesDrilldownFat = null;
                renderizarGraficoFaturamentoDinamico(elementId);
            });
        }
    }

    function agruparDadosFaturamentoSemanal(faturamentoAno, mesIndex) {
        const fatPorSemana = faturamentoAno.reduce((acc, item) => {
            const d = parseSafeDate(item.MOV_DATMOV);
            if (!d || d.getMonth() !== mesIndex || d.getFullYear() !== estado.anoAtual) return acc;
            const key = `Sem. ${getWeekOfMonth(d)} - Mês\nSem. ${getWeekNumber(d)} - Ano`;
            acc[key] = (acc[key] || 0) + Number(item['VALLIQ'] || 0); return acc;
        }, {});
        const labels = Object.keys(fatPorSemana).sort((a,b) => {
            const wA = parseInt(a.match(/Sem. (\d+) - Ano/)[1]);
            const wB = parseInt(b.match(/Sem. (\d+) - Ano/)[1]);
            return wA - wB;
        });
        const valores = labels.map(l => fatPorSemana[l]);
        const acumulado = valores.reduce((acc, v) => [...acc, (acc.slice(-1)[0] || 0) + v], []);
        const metaMedia = METAS_BP_FATURAMENTO[estado.planta][mesIndex] / (labels.length || 4);
        return { labels, valores, acumulado, metaMedia };
    }

    function renderizarGraficoRefugoPrincipal(elementId, tipo, dadosRefugo) {
        if (tipo === 'mensal') return;
        const dadosAgrupados = agruparDadosRefugoDiario(dadosRefugo);
        const labels = dadosAgrupados.periodos.map(d => d.slice(8));
        const dataSets = { 'Refugo Real (R$)': dadosAgrupados.valores, 'Acumulado': dadosAgrupados.acumulado, 'Tendência': _calculateLinearRegression(dadosAgrupados.valores) };
        _renderizarGraficoECharts(elementId, _obterOpcoesGraficoPrincipal(labels, dataSets, dadosAgrupados.periodos, { metaLine: dadosAgrupados.meta }, '#ef4444', 'Refugo Real'));
    }

    function renderizarGraficoRefugoPercentual(elementId, sumarioRefugo, faturamentoAno) {
        const dadosAgrupados = agruparDadosRefugoMensal(sumarioRefugo, faturamentoAno);
        _renderizarGraficoECharts(elementId, _obterOpcoesGraficoPercentual(MESES_ABREVIADOS, dadosAgrupados.percentuais, _calculateLinearRegression(dadosAgrupados.percentuais), META_PERCENTUAL_REFUGO, 'Refugo %', '#ef4444'));
    }

    function renderizarGraficoFaturamentoPrincipal(elementId, tipo, faturamento) {
        if (tipo === 'mensal') return;
        const dadosAgrupados = agruparDadosFaturamentoDiario(faturamento);
        const labels = dadosAgrupados.periodos.map(d => d.slice(8));
        const dataSets = { 'Faturamento Real (R$)': dadosAgrupados.valores, 'Acumulado': dadosAgrupados.acumulado, 'Tendência': _calculateLinearRegression(dadosAgrupados.valores) };
        _renderizarGraficoECharts(elementId, _obterOpcoesGraficoPrincipal(labels, dataSets, dadosAgrupados.periodos, { metaLine: dadosAgrupados.meta }, '#22c55e', 'Faturamento Real'));
    }

    function renderizarGraficoFaturamentoPercentual(elementId, faturamentoAno) {
        const dadosAgrupados = agruparDadosFaturamentoMensal(faturamentoAno);
        const percentuais = dadosAgrupados.valores.map((v, i) => (v / (METAS_BP_FATURAMENTO[estado.planta][i] || 1)) * 100);
        _renderizarGraficoECharts(elementId, _obterOpcoesGraficoPercentual(MESES_ABREVIADOS, percentuais, _calculateLinearRegression(percentuais), 100, '% Meta BP', '#22c55e'));
    }

    function renderizarGraficoPizza(elementId, titulo, dados, campo) {
        const grouped = dados.reduce((acc, i) => { const k = i[campo] || 'N/A'; acc[k] = (acc[k] || 0) + Number(i["Valor Ref."] || 0); return acc; }, {});
        const data = Object.entries(grouped).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value).filter(i => i.value > 0);
        _renderizarGraficoECharts(elementId, _obterOpcoesGraficoPizza(titulo, data));
    }

    function renderizarGraficoProjetoMotivo(elementId, dados) {
        const filtered = dados.filter(i => i['Projeto']);
        const byProject = filtered.reduce((acc, i) => { acc[i['Projeto']] = (acc[i['Projeto']] || 0) + Number(i["Valor Ref."] || 0); return acc; }, {});
        const top5 = Object.entries(byProject).sort(([,a],[,b]) => b - a).slice(0, 5).map(([n]) => n);
        const motivos = [...new Set(filtered.map(i => i['Motivo Refugo'] || 'N/A'))].sort();
        const series = motivos.map(m => ({ name: m, type: 'bar', stack: 'total', data: top5.map(p => filtered.filter(i => i['Projeto'] === p && (i['Motivo Refugo'] || 'N/A') === m).reduce((s, i) => s + Number(i["Valor Ref."] || 0), 0)) }));
        _renderizarGraficoECharts(elementId, { tooltip: { trigger: 'axis', backgroundColor: 'rgba(15, 23, 42, 0.9)', textStyle: { color: '#fff' } }, legend: { type: 'scroll', top: 25, textStyle: { color: '#fff' } }, xAxis: { type: 'category', data: top5, axisLabel: { color: '#fff' } }, yAxis: { type: 'value', axisLabel: { color: '#fff' }, splitLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } } }, series });
    }

    function criarBotoesEstaticos() {
        const containerAno = document.getElementById('btn-group-ano'); containerAno.innerHTML = '';
        [2024, 2025, 2026].forEach(ano => { const btn = document.createElement('button'); btn.textContent = ano; btn.dataset.ano = ano; if (ano === estado.anoAtual) btn.classList.add('ativo'); containerAno.appendChild(btn); });
        MESES_ABREVIADOS.forEach((m, i) => { const btn = document.createElement('button'); btn.textContent = m; btn.dataset.mes = i + 1; document.getElementById('btn-group-mes').appendChild(btn); });
        ['FF1','FF2','FF3','FF4'].forEach(ff => { const btn = document.createElement('button'); btn.textContent = ff; btn.dataset.ff = ff; document.getElementById('btn-group-ff').appendChild(btn); });
        ['Injecao','Montagem','Pintura','Metalizacao','Retrabalho'].forEach(s => { const btn = document.createElement('button'); btn.textContent = s.replace('Montagem','Mont.'); btn.dataset.setor = s; document.getElementById('btn-group-setor').appendChild(btn); });
    }

    function inicializarFiltrosEventos() {
        document.querySelector('.sidebar-content').addEventListener('change', (e) => {
            if (e.target.type === 'checkbox') { handleFilterChange(); }
        });
    }

    window.toggleFilterCheckboxes = function(containerId, status) {
        const checkboxes = document.querySelectorAll(`#${containerId} input[type="checkbox"]`);
        checkboxes.forEach(cb => cb.checked = status);
        handleFilterChange();
    };

    function popularFiltrosComDados() {
        const campos = { 'filtro-maquina': 'Maquina', 'filtro-motivo': 'Motivo Refugo', 'filtro-material': 'Desc. Material', 'filtro-turno': 'Tur.', 'filtro-projeto': 'Projeto', 'filtro-tipoprod': 'Tipo Prod.', 'filtro-negocio': 'Negocio' };
        Object.entries(campos).forEach(([id, field]) => {
            const container = document.getElementById(id); if (!container) return;
            const selecionados = Array.from(container.querySelectorAll('input:checked')).map(i => i.value);
            const vals = [...new Set(estado.dados.refugo.map(i => i[field]))].filter(Boolean).sort();
            container.innerHTML = vals.map(v => `<label class="checkbox-item"><input type="checkbox" value="${v}" ${selecionados.includes(v) ? 'checked' : ''}><span>${v}</span></label>`).join('');
        });
    }

    async function handleFilterChange() {
        const ids = ['maquina', 'motivo', 'material', 'turno', 'projeto', 'tipoprod', 'negocio'];
        ids.forEach(id => {
            const container = document.getElementById(`filtro-${id}`);
            if (container) { estado.filtros[id] = Array.from(container.querySelectorAll('input:checked')).map(i => i.value); }
        });
        renderizarTodosGraficos();
    }

    async function handleFiltroGrupo(e) {
        if (e.target.tagName !== 'BUTTON') return;
        const btn = e.target; btn.parentElement.querySelectorAll('button').forEach(b => b.classList.remove('ativo')); btn.classList.add('ativo');
        const tipo = Object.keys(btn.dataset)[0]; const val = btn.dataset[tipo];
        if (tipo === 'ano') { 
            estado.anoAtual = parseInt(val, 10); 
            estado.viewRefugoMensal = 'mensal'; 
            estado.viewFaturamentoMensal = 'mensal'; 
            document.getElementById('startDate').value = `${estado.anoAtual}-01-01`;
            document.getElementById('endDate').value = `${estado.anoAtual}-12-31`;
        }
        else if (tipo === 'mes') { const mes = parseInt(val, 10); document.getElementById('startDate').value = `${estado.anoAtual}-${String(mes).padStart(2,'0')}-01`; document.getElementById('endDate').value = new Date(estado.anoAtual, mes, 0).toISOString().slice(0, 10); }
        else { estado.filtros[tipo] = [val]; }
        await carregarEProcessarDados(); renderizarTodosGraficos();
    }

    async function handleFiltroCategoria(e) {
        const btn = e.target.closest('button.btn-filtro-categoria'); if (!btn) return;
        estado.filtroCategoriaAtivo = btn.dataset.tipo;
        document.querySelectorAll('.btn-filtro-categoria').forEach(b => b.classList.remove('ativo')); btn.classList.add('ativo');
        renderizarTodosGraficos();
    }

    function redimensionarTodosGraficos() {
        const ids = ['chart-daily-container','chart-monthly-container','chart-monthly-pct-container','chart-faturamento-diario','chart-faturamento-mensal','chart-faturamento-mensal-pct','chart-pie-ff','chart-pie-setor','chart-pie-turno','chart-pie-negocio','chart-projeto-motivo'];
        ids.forEach(id => { const el = document.getElementById(id); if (el) { const c = echarts.getInstanceByDom(el); if (c) c.resize(); } });
    }

    function handleToggleChartExpand(event) {
        const btn = event.target.closest('.btn-expand-chart'); if (!btn) return;
        const card = btn.closest('.card');
        const isExpanding = !card.classList.contains('expanded-chart');
        card.classList.toggle('expanded-chart'); document.body.classList.toggle('chart-focus-mode');
        const textSpan = btn.querySelector('.text-expand'); if (textSpan) textSpan.innerText = isExpanding ? 'recolher' : 'expandir';
        let ticks = 0; const resizeInterval = setInterval(() => { redimensionarTodosGraficos(); ticks++; if (ticks > 25) { clearInterval(resizeInterval); } }, 30);
    }

    function filtrarDados(dados, filtros) {
        // CORREÇÃO: Não excluímos nada na aba "Geral" para bater com o mensal
        let result = dados;
        if (estado.filtroCategoriaAtivo !== 'todos') {
            const motivosEspeciais = MAPA_REFUGO_ESPECIAL[estado.filtroCategoriaAtivo] || [];
            result = result.filter(i => motivosEspeciais.includes(i['Motivo Refugo']));
        }
        if (!Object.values(filtros).some(v => v && v.length)) return result;
        return result.filter(item => Object.entries(filtros).every(([k, v]) => {
            if (!v || !v.length) return true;
            const fieldMap = { ff: 'FF', setor: 'Setor', maquina: 'Maquina', motivo: 'Motivo Refugo', material: 'Desc. Material', turno: 'Tur.', projeto: 'Projeto', tipoprod: 'Tipo Prod.', negocio: 'Negocio' };
            return v.includes(item[fieldMap[k]]);
        }));
    }

    function agruparDadosRefugoDiario(refugo) {
        const map = refugo.reduce((acc, i) => { if (i.Data) acc[i.Data.slice(0, 10)] = (acc[i.Data.slice(0, 10)] || 0) + Number(i["Valor Ref."]); return acc; }, {});
        const periodos = getDiasPeriodo(); const valores = periodos.map(p => map[p] || 0);
        return { valores, acumulado: valores.reduce((acc, v) => [...acc, (acc.slice(-1)[0] || 0) + v], []), periodos, meta: META_DIARIA_VALOR_REFUGO };
    }

    function agruparDadosRefugoMensal(sumario, faturamentoAno) {
        const refMap = sumario.reduce((acc, i) => { if (i.mes) { const mesKey = i.mes.slice(5, 7); acc[mesKey] = (acc[mesKey] || 0) + formatarValorParaFloat(i.Valor_Total || 0); } return acc; }, {});
        const fatMap = faturamentoAno.reduce((acc, i) => { if (i.MOV_DATMOV) { const mesKey = i.MOV_DATMOV.slice(5, 7); acc[mesKey] = (acc[mesKey] || 0) + Number(i['VALLIQ'] || 0); } return acc; }, {});
        const valores = Array.from({ length: 12 }, (_, i) => refMap[String(i+1).padStart(2,'0')] || 0);
        const faturamentos = Array.from({ length: 12 }, (_, i) => fatMap[String(i+1).padStart(2,'0')] || 0);
        const percentuais = valores.map((v, i) => (faturamentos[i] > 0 ? (v / faturamentos[i]) * 100 : 0));
        return { valores, acumulado: valores.reduce((acc, v) => [...acc, (acc.slice(-1)[0] || 0) + v], []), percentuais, meta: META_DIARIA_VALOR_REFUGO * 21 };
    }

    function agruparDadosFaturamentoDiario(faturamento) {
        const map = faturamento.reduce((acc, i) => { if (i.MOV_DATMOV) acc[i.MOV_DATMOV.slice(0, 10)] = (acc[i.MOV_DATMOV.slice(0, 10)] || 0) + Number(i['VALLIQ'] || 0); return acc; }, {});
        const periodos = getDiasPeriodo(); const valores = periodos.map(p => map[p] || 0);
        const mesAtual = new Date(document.getElementById('startDate').value + "T12:00:00").getMonth();
        return { valores, acumulado: valores.reduce((acc, v) => [...acc, (acc.slice(-1)[0] || 0) + v], []), periodos, meta: METAS_BP_FATURAMENTO[estado.planta][mesAtual] / 21 };
    }

    function agruparDadosFaturamentoMensal(faturamentoAno) {
        const map = faturamentoAno.reduce((acc, i) => { if (i.MOV_DATMOV) { const mesKey = i.MOV_DATMOV.slice(5, 7); acc[mesKey] = (acc[mesKey] || 0) + Number(i['VALLIQ'] || 0); } return acc; }, {});
        const valores = Array.from({ length: 12 }, (_, i) => map[String(i+1).padStart(2, '0')] || 0);
        return { valores, acumulado: valores.reduce((acc, v) => [...acc, (acc.slice(-1)[0] || 0) + v], []), meta: METAS_BP_FATURAMENTO[estado.planta] };
    }

    function atualizarKpiRefugo(dadosRefugo, dadosFaturamento) {
        const totalRefugo = dadosRefugo.reduce((s, i) => s + (Number(i["Valor Ref."]) || 0), 0);
        const totalFat = dadosFaturamento.reduce((s, i) => s + (Number(i['VALLIQ']) || 0), 0);
        const pct = totalFat > 0 ? (totalRefugo / totalFat) * 100 : 0;
        const diff = pct - META_PERCENTUAL_REFUGO;
        const el = document.getElementById('kpi-current-percent'); if(el) el.textContent = `${pct.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
        const el2 = document.getElementById('kpi-details-text'); if(el2) el2.textContent = `T: ${META_PERCENTUAL_REFUGO}% (${diff >= 0 ? '+' : ''}${diff.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%)`;
        const c = document.getElementById('kpi-refugo-container'); if (c) { c.classList.remove('estado-dentro', 'estado-fora'); c.classList.add(pct <= META_PERCENTUAL_REFUGO ? 'estado-dentro' : 'estado-fora'); }
    }
})();