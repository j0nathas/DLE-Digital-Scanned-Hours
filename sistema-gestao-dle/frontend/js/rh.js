let rhCharts = { MLB: {}, MJN: {}, MMB: {} };
let rhRawData = [];
let rhTimeState = { level: 'mes', selectedMonth: null, selectedWeek: null };

const rhPalette = ['#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de', '#3ba272', '#fc8452', '#9a60b4', '#ea7ccc'];

// --- UTILITÁRIOS ---

const parseDataLocal = (dateStr) => {
    if(!dateStr) return new Date();
    const parts = dateStr.split('T')[0].split('-');
    return new Date(parts[0], parts[1] - 1, parts[2]);
};

const getIsoWeek = (date) => {
    const d = new Date(date.getTime());
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
    const week1 = new Date(d.getFullYear(), 0, 4);
    return 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
};

// Função para calcular Linha de Tendência Linear
const calcularLinhaTendenciaRH = (data) => {
    const n = data.length;
    if (n < 2) return data;
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    data.forEach((y, x) => { sumX += x; sumY += y; sumXY += x * y; sumXX += x * x; });
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    return data.map((_, x) => parseFloat((slope * x + intercept).toFixed(2)));
};

function normalizarSetorRH(nome) {
    if (!nome || nome === 'null') return 'OUTROS';
    const n = nome.toUpperCase().trim();
    if (n.includes('INJE')) return 'INJEÇÃO';
    if (n.includes('METAL')) return 'METALIZAÇÃO';
    if (n.includes('PINT')) return 'PINTURA';
    if (n.includes('SMALL')) return 'MONTAGEM SMALL';
    if (n.includes('LANTERNA')) return 'MONTAGEM LANTERNAS';
    if (n.includes('FAROL')) return 'MONTAGEM FAROL';
    if (n.includes('SUB') || n.includes('ASSEMB')) return 'MONTAGEM SUB';
    return n;
}

const formatLabelRH = (date, level) => {
    if (level === 'mes') return date.toLocaleDateString('pt-BR', { month: 'short' }).toUpperCase().replace('.', '');
    if (level === 'semana') return `S${getIsoWeek(date)}`;
    return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth()+1).padStart(2, '0')}`;
};

// --- INICIALIZAÇÃO ---

async function iniciarRh() {
    ['MLB', 'MJN', 'MMB'].forEach(p => {
        const barEl = document.getElementById(`chart-bar-${p}`);
        const donutEl = document.getElementById(`chart-donut-${p}`);
        if(!barEl || !donutEl) return;

        rhCharts[p].bar = echarts.init(barEl);
        rhCharts[p].donut = echarts.init(donutEl);
        
        rhCharts[p].bar.on('click', (params) => {
            if (!params.data || !params.data.rawDate) return;
            const clickedDate = new Date(params.data.rawDate);
            if (rhTimeState.level === 'mes') {
                rhTimeState.level = 'semana';
                rhTimeState.selectedMonth = clickedDate.getMonth();
            } else if (rhTimeState.level === 'semana') {
                rhTimeState.level = 'dia';
                rhTimeState.selectedWeek = getIsoWeek(clickedDate);
            }
            document.getElementById('btn-rh-voltar-global').classList.remove('hidden');
            renderizarTudoRH();
        });
    });

    document.getElementById('btn-rh-voltar-global').addEventListener('click', function() {
        if (rhTimeState.level === 'dia') rhTimeState.level = 'semana';
        else if (rhTimeState.level === 'semana') { rhTimeState.level = 'mes'; this.classList.add('hidden'); }
        renderizarTudoRH();
    });

    document.getElementById('btn-filtrar-rh').addEventListener('click', carregarDadosRH);
    
    window.addEventListener('resize', () => ['MLB', 'MJN', 'MMB'].forEach(p => { 
        rhCharts[p].bar?.resize(); rhCharts[p].donut?.resize(); 
    }));

    const hoje = new Date();
    document.getElementById('rh-startDate').value = `${hoje.getFullYear()}-01-01`;
    document.getElementById('rh-endDate').value = hoje.toISOString().split('T')[0];
    await carregarDadosRH();
}

async function carregarDadosRH() {
    const start = document.getElementById('rh-startDate').value;
    const end = document.getElementById('rh-endDate').value;
    try {
        const res = await fetch(`/api/rh/indicadores?startDate=${start}&endDate=${end}`);
        rhRawData = await res.json();
        renderizarTudoRH();
    } catch (e) { console.error(e); }
}

function renderizarTudoRH() {
    ['MLB', 'MJN', 'MMB'].forEach(planta => {
        let data = rhRawData.filter(d => d.Planta === planta);

        if (rhTimeState.level === 'semana') {
            data = data.filter(d => parseDataLocal(d.DataRef).getMonth() === rhTimeState.selectedMonth);
        } else if (rhTimeState.level === 'dia') {
            data = data.filter(d => getIsoWeek(parseDataLocal(d.DataRef)) === rhTimeState.selectedWeek);
        }

        const timeGroups = {};
        const setoresUnicos = new Set();

        data.forEach(d => {
            const dt = parseDataLocal(d.DataRef);
            const setor = normalizarSetorRH(d.SetorOriginal);
            setoresUnicos.add(setor);
            
            let key = rhTimeState.level === 'mes' ? `${dt.getFullYear()}-${dt.getMonth()}` :
                      rhTimeState.level === 'semana' ? `${dt.getFullYear()}-W${getIsoWeek(dt)}` :
                      dt.toISOString().split('T')[0];

            if (!timeGroups[key]) timeGroups[key] = { label: formatLabelRH(dt, rhTimeState.level), rawDate: dt, setores: {}, total: 0 };
            timeGroups[key].setores[setor] = (timeGroups[key].setores[setor] || 0) + d.TotalHoras;
            timeGroups[key].total += d.TotalHoras;
        });

        const sortedKeys = Object.keys(timeGroups).sort();
        
        // Cálculos para Acumulado e Tendência
        let somaAcumulada = 0;
        const periodTotals = sortedKeys.map(k => timeGroups[k].total);
        const acumuladoData = sortedKeys.map(k => {
            somaAcumulada += timeGroups[k].total;
            return somaAcumulada.toFixed(2);
        });
        const tendenciaData = calcularLinhaTendenciaLinearRH(periodTotals);

        // 1. BAR CHART (EVOLUÇÃO)
        rhCharts[planta].bar.setOption({
            tooltip: { 
                trigger: 'axis', 
                axisPointer: { type: 'shadow' },
                formatter: (params) => {
                    let res = `<b>${params[0].name}</b><br/>`;
                    params.forEach(p => {
                        const val = parseFloat(p.value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                        res += `${p.marker} ${p.seriesName}: <b>${val}h</b><br/>`;
                    });
                    return res;
                }
            },
            legend: { show: true, top: 0, textStyle: { color: '#ccc', fontSize: 9 }, type: 'scroll' },
            grid: { top: 60, bottom: 40, left: 50, right: 50 },
            xAxis: { type: 'category', data: sortedKeys.map(k => timeGroups[k].label), axisLabel: { color: '#94a3b8', fontSize: 9 } },
            yAxis: [
                { type: 'value', name: 'Horas', axisLabel: { color: '#94a3b8', fontSize: 9 }, splitLine: { lineStyle: { color: '#334155' } } },
                { type: 'value', name: 'Acumulado', axisLabel: { color: '#a78bfa', fontSize: 9 }, splitLine: { show: false } }
            ],
            series: [
                ...Array.from(setoresUnicos).map((s, i) => ({
                    name: s, type: 'bar', stack: 'total', 
                    itemStyle: { color: rhPalette[i % rhPalette.length] },
                    label: { 
                        show: true, position: 'inside', color: '#fff', fontSize: 8,
                        formatter: (p) => p.value > (somaAcumulada * 0.05) ? parseFloat(p.value).toFixed(0) : '' 
                    },
                    data: sortedKeys.map(k => ({ value: (timeGroups[k].setores[s] || 0).toFixed(2), rawDate: timeGroups[k].rawDate }))
                })),
                { 
                    name: 'Acumulado', type: 'line', yAxisIndex: 1, data: acumuladoData, 
                    lineStyle: { color: '#a78bfa', width: 3 }, symbol: 'circle', z: 10 
                },
                { 
                    name: 'Tendência', type: 'line', data: tendenciaData, 
                    lineStyle: { color: '#fff', type: 'dashed', opacity: 0.6 }, symbol: 'none', z: 5 
                }
            ]
        }, true);

        // 2. DONUT CHART (MIX)
        const mix = {};
        data.forEach(d => { const s = normalizarSetorRH(d.SetorOriginal); mix[s] = (mix[s] || 0) + d.TotalHoras; });
        rhCharts[planta].donut.setOption({
            tooltip: { 
                trigger: 'item',
                formatter: (p) => `${p.name}: <b>${parseFloat(p.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}h</b> (${p.percent}%)`
            },
            legend: { orient: 'horizontal', bottom: 0, textStyle: { color: '#ccc', fontSize: 8 }, type: 'scroll' },
            series: [{
                type: 'pie', radius: ['40%', '65%'], center: ['50%', '42%'],
                label: { show: true, color: '#fff', fontSize: 9, formatter: '{d}%' },
                data: Object.entries(mix).map(([name, value]) => ({ name, value: value.toFixed(2) }))
            }]
        }, true);

        // 3. TABLE
        const tbody = document.querySelector(`#table-${planta} tbody`);
        if (tbody) {
            tbody.innerHTML = "";
            const rowMap = {};
            data.forEach(d => {
                const ag = normalizarSetorRH(d.SetorOriginal);
                const or = d.NomeOriginalSetor || 'GERAL';
                const k = ag + or;
                if(!rowMap[k]) rowMap[k] = { ag, or, hh: 0 };
                rowMap[k].hh += d.TotalHoras;
            });
            Object.values(rowMap).sort((a,b) => b.hh - a.hh).forEach(r => {
                const tr = document.createElement('tr');
                tr.innerHTML = `<td>${r.ag}</td><td style="color:#94a3b8">${r.or}</td><td style="text-align:right"><b>${r.hh.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</b></td>`;
                tbody.appendChild(tr);
            });
        }
    });
}

// Helper local para evitar erros de referência
function calcularLinhaTendenciaLinearRH(data) {
    const n = data.length;
    if (n < 2) return data;
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    data.forEach((y, x) => { sumX += x; sumY += y; sumXY += x * y; sumXX += x * x; });
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    return data.map((_, x) => (slope * x + intercept).toFixed(2));
}