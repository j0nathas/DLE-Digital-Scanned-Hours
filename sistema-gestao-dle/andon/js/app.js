Chart.register(ChartDataLabels);
let charts = {}; let dadosBrutos = []; let niveis = [];
const meses = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
document.addEventListener('DOMContentLoaded', () => {
    const ano = new Date().getFullYear();
    document.getElementById('dataDe').value = `${ano}-01-01`;
    document.getElementById('dataAte').value = `${ano}-12-31`;
    document.getElementById('btnAtualizar').addEventListener('click', carregar);
    document.getElementById('btnVoltar').addEventListener('click', voltar);
    carregar();
});
function formatTime(min) {
    if (!min || min <= 0) return "00:00:00";
    const sec = Math.floor(min * 60);
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}
function calcTrend(data) {
    const n = data.length; if (n < 2) return data;
    let sX=0, sY=0, sXY=0, sX2=0;
    data.forEach((y,x) => { sX+=x; sY+=y; sXY+=x*y; sX2+=x*x; });
    const m = (n*sXY - sX*sY) / (n*sX2 - sX*sX);
    const b = (sY - m*sX) / n;
    return data.map((_,x) => Math.max(0, m*x + b));
}
async function carregar() {
    const ano = document.getElementById('dataDe').value.split('-')[0];
    document.getElementById('btnAtualizar').textContent = "...";
    dadosBrutos = await api.getDados(ano);
    const maqs = [...new Set(dadosBrutos.map(d => d.NOME_DA_MAQUINA))].sort();
    const sel = document.getElementById('filterMaquina');
    sel.innerHTML = '<option value="TODOS">Todas</option>';
    maqs.forEach(m => sel.innerHTML += `<option value="${m}">${m}</option>`);
    document.getElementById('btnAtualizar').textContent = "Atualizar";
    niveis = [{ tipo: 'MES', label: 'Ano Inteiro' }];
    filtrar();
}
function filtrar() {
    const de = new Date(document.getElementById('dataDe').value);
    const ate = new Date(document.getElementById('dataAte').value);
    const fMaq = document.getElementById('filterMaquina').value;
    const fMes = document.getElementById('filterMes').value;
    const fTur = document.getElementById('filterTurno').value;
    const fTip = document.getElementById('filterTipoMov').value;
    const fPre = document.getElementById('filterPrevista').value;
    const filtrados = dadosBrutos.filter(d => {
        const dt = new Date(d.DATAI);
        return dt >= de && dt <= ate &&
               (fMaq === "TODOS" || d.NOME_DA_MAQUINA === fMaq) &&
               (fMes === "TODOS" || dt.getUTCMonth() == fMes) &&
               (fTur === "TODOS" || d.TURNO == fTur) &&
               (fTip === "TODOS" || d.TIPO_MOV === fTip) &&
               (fPre === "TODOS" || d.PARADA_PREVISTA === fPre);
    });
    niveis[0].dados = filtrados;
    processar();
}
function processar() {
    const atual = niveis[niveis.length - 1];
    document.getElementById('btnVoltar').style.display = niveis.length > 1 ? 'block' : 'none';
    document.getElementById('mainTitle').textContent = `Performance: ${atual.label}`;
    let tMin = 0;
    atual.dados.forEach(d => tMin += (new Date(d.HORAF) - new Date(d.HORAI)) / 60000);
    document.getElementById('totalQtd').textContent = atual.dados.length.toLocaleString();
    document.getElementById('totalTempo').textContent = formatTime(tMin);
    document.getElementById('totalMedia').textContent = formatTime(tMin / (atual.dados.length || 1));
    const dUniq = [...new Set(atual.dados.map(d => d.DATAI.split('T')[0]))].length;
    document.getElementById('mediaDia').textContent = (atual.dados.length / (dUniq || 1)).toFixed(1);
    renderMain();
    renderPareto(atual.dados);
}
function renderMain() {
    const atual = niveis[niveis.length - 1];
    let qM = {}; let tM = {};
    if (atual.tipo === 'MES') {
        meses.forEach((_, i) => { qM[i] = 0; tM[i] = 0; });
        atual.dados.forEach(d => { const m = new Date(d.DATAI).getUTCMonth(); qM[m]++; tM[m] += (new Date(d.HORAF) - new Date(d.HORAI)) / 60000; });
        draw(meses, meses.map((_, i) => qM[i]), meses.map((_, i) => tM[i]), 'bar');
    } else if (atual.tipo === 'DIA') {
        atual.dados.forEach(d => { const dia = new Date(d.DATAI).getUTCDate(); qM[dia] = (qM[dia] || 0) + 1; });
        const labels = Object.keys(qM).sort((a,b)=>a-b);
        draw(labels.map(l => `Dia ${l}`), labels.map(l => qM[l]), [], 'line');
    }
}
function draw(labels, dataQ, dataT, type) {
    if (charts.main) charts.main.destroy();
    let qAcum = []; dataQ.reduce((a, b, i) => qAcum[i] = a + b, 0);
    const datasets = [
        { label: 'Qtd', data: dataQ, backgroundColor: '#00d4ff', yAxisID: 'y', order: 3 },
        { label: 'Acumulado', data: qAcum, type: 'line', borderColor: '#00d4ff', borderWidth: 2, pointRadius: 2, yAxisID: 'y', order: 2, datalabels: { display: false } },
        { label: 'Tendência', data: calcTrend(dataQ), type: 'line', borderColor: 'rgba(255,255,255,0.3)', borderDash: [5,5], pointRadius: 0, yAxisID: 'y', order: 1, datalabels: { display: false } }
    ];
    if (dataT.length > 0) datasets.push({ label: 'Tempo', data: dataT, type: 'line', borderColor: '#e74c3c', yAxisID: 'y1', order: 0 });
    charts.main = new Chart(document.getElementById('chartMain'), {
        type: type, data: { labels, datasets },
        options: {
            responsive: true, maintainAspectRatio: false,
            onClick: (e, el) => { if(el.length > 0 && type === 'bar') drill(el[0].index, labels[el[0].index]); },
            scales: { y: { beginAtZero: true, min: 0, title: { display: true, text: 'Qtd' } }, y1: { beginAtZero: true, min: 0, position: 'right', grid: { drawOnChartArea: false }, title: { display: true, text: 'Tempo' } } },
            plugins: { 
                tooltip: { callbacks: { label: (ctx) => { let l = ctx.dataset.label || ''; if (l.includes('Tempo')) return l + ': ' + formatTime(ctx.parsed.y); return l + ': ' + ctx.parsed.y.toLocaleString(); } } },
                datalabels: { color: '#fff', anchor: 'end', align: 'top', formatter: (v, ctx) => ctx.dataset.label.includes('Tempo') ? formatTime(v) : v.toLocaleString() } 
            }
        }
    });
}
function drill(idx, label) {
    const atual = niveis[niveis.length - 1];
    const filtered = atual.dados.filter(d => new Date(d.DATAI).getUTCMonth() === idx);
    niveis.push({ tipo: 'DIA', dados: filtered, label });
    processar();
}
function voltar() { niveis.pop(); processar(); }
function renderPareto(dados) {
    let q = {}; let t = {};
    dados.forEach(d => { const m = d.DESCRICAO || "OUTROS"; q[m] = (q[m] || 0) + 1; t[m] = (t[m] || 0) + (new Date(d.HORAF) - new Date(d.HORAI)) / 60000; });
    const l = Object.keys(q).sort((a,b) => q[b] - q[a]).slice(0, 10);
    if(charts.q) charts.q.destroy();
    charts.q = new Chart(document.getElementById('chartParetoQtd'), { type: 'bar', data: { labels: l, datasets: [{ label: 'Qtd', data: l.map(x=>q[x]), backgroundColor: '#3498db' }] }, options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, scales: { x: { beginAtZero: true } }, plugins: { datalabels: { color: '#fff', align:'right', anchor:'end' } } } });
    if(charts.t) charts.t.destroy();
    charts.t = new Chart(document.getElementById('chartParetoTempo'), { type: 'bar', data: { labels: l, datasets: [{ label: 'Tempo', data: l.map(x=>t[x]), backgroundColor: '#e74c3c' }] }, options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, scales: { x: { beginAtZero: true } }, plugins: { tooltip: { callbacks: { label: (ctx) => 'Tempo: ' + formatTime(ctx.parsed.x) } }, datalabels: { color: '#fff', align:'right', anchor:'end', formatter: formatTime } } } });
}