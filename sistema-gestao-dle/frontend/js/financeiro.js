// ─────────────────────────────────────────────────────────────────────────────
// financeiro.js — Indicador Horas (Financeiro)
// ─────────────────────────────────────────────────────────────────────────────

let _dadosAuditoria             = [];
let financeiroRefreshIntervalId = null;
let plantaFinanceiroSelecionada = null;
let _chartResumoGlobal          = null;
let _chartDetalhadoGlobal       = null;
let _loadingSpinnerGlobal       = null;
let _dadosHierarquia            = [];

function limparFinanceiro() {
    if (financeiroRefreshIntervalId) {
        clearInterval(financeiroRefreshIntervalId);
        financeiroRefreshIntervalId = null;
    }
}

function resolverSetorPorMaquina(codigoMaquina, planta) {
    if (!codigoMaquina) return 'NÃO MAPEADO';
    const cod = String(codigoMaquina).toUpperCase().trim();
    if (planta === 'MLB' || cod.startsWith('S.')) {
        if (cod.startsWith('S.MT') || cod.startsWith('MT0'))   return 'METALIZAÇÃO';
        if (cod.startsWith('S.HC') || cod === 'HC01')          return 'PINTURA';
        if (cod.startsWith('S.I'))                             return 'INJEÇÃO';
        if (cod.startsWith('S.LA'))                            return 'MONTAGEM LANTERNAS';
        if (cod.startsWith('S.SM') || cod.startsWith('S.SC')) return 'MONTAGEM SMALL';
        if (cod === 'MONTAGEM MANUAL' || cod === 'MANUAL')     return 'MONTAGEM MANUAL';
        if (cod === '2001' || cod.includes('TERCEIR'))         return 'TERCEIRIZAÇÃO';
    }
    if (planta === 'MJN' || cod.startsWith('J.')) {
        if (cod.startsWith('J.FA'))  return 'MONTAGEM FAROL';
        if (cod.startsWith('J.LA'))  return 'MONTAGEM LANTERNA';
        if (cod.startsWith('J.I'))   return 'INJEÇÃO';
        if (cod === 'J.MT01')        return 'METALIZAÇÃO';
        if (cod.startsWith('J.SC')) return 'MONTAGEM SUBCONJUNTO';
    }
    if (planta === 'MMB' || cod.startsWith('V.')) {
        if (cod.startsWith('V.RE') || cod.startsWith('V.EM'))              return 'MONTAGEM RETROVISORES';
        if (cod.startsWith('V.FE') || cod.startsWith('V.BA') ||
            cod.startsWith('V.PA') || cod.startsWith('V.AT') ||
            cod.startsWith('V.FS'))                                        return 'MONTAGEM FECHADURAS';
        if (cod.startsWith('V.CA') || cod.startsWith('V.SC'))             return 'MONTAGEM SUBCONJUNTOS';
        if (cod.startsWith('V.L')  || cod.startsWith('V.I') ||
            cod.startsWith('V.J')  || cod === 'INJETORA')                 return 'INJEÇÃO';
        return cod;
    }
    if (cod.startsWith('J.')) return resolverSetorPorMaquina(cod, 'MJN');
    if (cod.startsWith('S.')) return resolverSetorPorMaquina(cod, 'MLB');
    if (cod.startsWith('V.')) return resolverSetorPorMaquina(cod, 'MMB');
    return 'NÃO MAPEADO';
}

function resolverPlanta(row) {
    const direto = String(row.Planta || row.planta || row.PLANTA || '').toUpperCase().trim();
    if (direto && ['MLB', 'MMB', 'MJN'].includes(direto)) return direto;
    const maq = String(row.Maquina || row.CodMaquina || row.Desc_Maquina || '').toUpperCase().trim();
    if (maq.startsWith('J.')) return 'MJN';
    if (maq.startsWith('S.')) return 'MLB';
    if (maq.startsWith('V.')) return 'MMB';
    return row._origem || 'MLB';
}

function resolverSetor(row) {
    const setorBackend = row.Setor || row.Desc_C_Custo || '';
    if (setorBackend && setorBackend.toUpperCase() !== 'NÃO MAPEADO' && setorBackend.trim() !== '') return setorBackend;
    return resolverSetorPorMaquina(row.Maquina || row.CodMaquina || '', resolverPlanta(row));
}

function getGroupClass(setor) {
    if (!setor) return 'group-others';
    const s = String(setor).toUpperCase();
    if (s.includes('INJE')) return 'group-injection';
    if (s.includes('META') || s.includes('PINT')) return 'group-coating';
    if (s.includes('SMALL') || s.includes('FECHADURA')) return 'group-assembly-small';
    if (s.includes('LAMP') || s.includes('FAROL') || s.includes('LANTERNA') || s.includes('RETROVISOR')) return 'group-assembly-lamp';
    return 'group-others';
}

function formatDateBR(isoDate) {
    if (!isoDate) return '';
    const date = new Date(isoDate);
    date.setMinutes(date.getMinutes() + date.getTimezoneOffset());
    return date.toLocaleDateString('pt-BR');
}

const COR_PLANTA = {
    'MLB':   { bg: '#1d4ed8', border: '#3b82f6', label: '#93c5fd' },
    'MMB':   { bg: '#15803d', border: '#22c55e', label: '#86efac' },
    'MJN':   { bg: '#9333ea', border: '#a855f7', label: '#d8b4fe' },
    'TODAS': { bg: '#334155', border: '#64748b', label: '#94a3b8' }
};

window.toggleFinBlock = (id) => {
    const el = document.getElementById(id);
    if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
};

function _atualizarIndicadorPlanta(planta) {
    const p   = planta || 'TODAS';
    const cor = COR_PLANTA[p];
    const el  = document.getElementById('indicador-planta-fin');
    if (el) el.innerHTML = `<span style="font-weight:700;color:${cor.label};">${p === 'TODAS' ? '🏭 Todas as Plantas' : '📍 Planta: ' + p}</span> — Calculando...`;
}

function _indicadorPronto(totalHH) {
    const p   = plantaFinanceiroSelecionada || 'TODAS';
    const cor = COR_PLANTA[p];
    const el  = document.getElementById('indicador-planta-fin');
    if (el) el.innerHTML = `<span style="font-weight:700;color:${cor.label};">${p === 'TODAS' ? '🏭 Todas as Plantas' : '📍 Planta: ' + p}</span> — ${totalHH.toFixed(0)} HH processadas ✓`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Normaliza campos do backend — suporta versão nova (nroOperadores) e legada
// NUNCA usa row.Op: era o roteiro (valor como 999), não o número de operadores
// ─────────────────────────────────────────────────────────────────────────────
function _normalizarRow(row) {
    // Busca em todos os nomes possíveis para não falhar
    const qtd  = parseFloat(row.Quantidade ?? row.QTD ?? row.QUANTIDADE ?? 0);
    const ph   = Math.max(parseFloat(row.prodHora ?? row.PROHOR ?? row.Prod_Hora ?? 1) || 1, 0.0001);
    const oper = Math.max(parseFloat(row.nroOperadores ?? row.N_OPER ?? row.Op ?? 1) || 1, 1);
    
    // Pega o HH Gerada pronto do banco
    const hhB = parseFloat(row['HH GERADA'] ?? row.HH_Gerada ?? NaN);
    const hh  = isNaN(hhB) ? (qtd / ph) * oper : hhB;

    return { qtd, ph, nroOper: oper, hh };
}


// ─────────────────────────────────────────────────────────────────────────────
function iniciarFinanceiro() {
    _chartResumoGlobal    = echarts.init(document.getElementById('chart-resumo-grupo'));
    _chartDetalhadoGlobal = echarts.init(document.getElementById('chart-detalhado-cc'));
    _loadingSpinnerGlobal = document.getElementById('loading-spinner');
    _injetarControles();
    const btn = document.getElementById('btn-filtrar-financeiro');
    if (btn) btn.addEventListener('click', () => { limparFinanceiro(); filtrar(_chartResumoGlobal, _chartDetalhadoGlobal, _loadingSpinnerGlobal, true); });
    window.addEventListener('resize', () => { _chartResumoGlobal.resize(); _chartDetalhadoGlobal.resize(); });
    const hoje = new Date();
    document.getElementById('startDate').value = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().split('T')[0];
    document.getElementById('endDate').value   = hoje.toISOString().split('T')[0];
}

// ─────────────────────────────────────────────────────────────────────────────
function _injetarControles() {
    const dashboard = document.getElementById('dashboard-financeiro');
    const mainGrid  = document.getElementById('main-financeiro-grid');
    if (!dashboard || !mainGrid) return;

    // ── Botões de planta ──────────────────────────────────────────────────
    const plantaWrap = document.createElement('div');
    plantaWrap.style.cssText = 'display:flex;gap:10px;margin-bottom:15px;align-items:center;flex-wrap:wrap;';
    ['TODAS', 'MLB', 'MMB', 'MJN'].forEach(p => {
        const cor = COR_PLANTA[p];
        const btn = document.createElement('button');
        btn.textContent   = p;
        btn.className     = 'btn-filter btn-planta-fin';
        btn.style.cssText = 'padding:6px 15px;border-radius:20px;border:1px solid #334155;background:transparent;color:#94a3b8;cursor:pointer;font-weight:600;transition:all 0.2s;';
        btn.onclick = () => {
            plantaFinanceiroSelecionada = p === 'TODAS' ? null : p;
            document.querySelectorAll('.btn-planta-fin').forEach(b => { b.style.background = 'transparent'; b.style.borderColor = '#334155'; b.style.color = '#94a3b8'; });
            btn.style.background  = cor.bg;
            btn.style.borderColor = cor.border;
            btn.style.color       = '#fff';
            limparFinanceiro();
            filtrar(_chartResumoGlobal, _chartDetalhadoGlobal, _loadingSpinnerGlobal, true);
        };
        plantaWrap.appendChild(btn);
    });
    const barra = document.createElement('div');
    barra.id = 'indicador-planta-fin';
    barra.style.cssText = 'margin-left:auto;font-size:12px;color:#94a3b8;';
    plantaWrap.appendChild(barra);
    dashboard.insertBefore(plantaWrap, mainGrid);

    // ── Abas ──────────────────────────────────────────────────────────────
    const abaWrap  = document.createElement('div');
    abaWrap.style.cssText = 'display:flex;gap:5px;border-bottom:1px solid #334155;margin-bottom:20px;';
    const btnBase  = 'padding:10px 24px;background:transparent;color:#64748b;border:none;cursor:pointer;font-weight:700;border-radius:6px 6px 0 0;font-size:13px;transition:all 0.15s;';
    const btnAtivo = btnBase + 'border-bottom:2px solid #3b82f6;color:#fff;';
    const abaG = document.createElement('button'); abaG.innerHTML = '📊 Gráficos e Tabelas'; abaG.style.cssText = btnAtivo;
    const abaH = document.createElement('button'); abaH.innerHTML = '🏭 Hierarquia';         abaH.style.cssText = btnBase;
    const abaA = document.createElement('button'); abaA.innerHTML = '🔍 Auditoria HH';       abaA.style.cssText = btnBase;
    const hierPanel  = document.createElement('div'); hierPanel.id  = 'fin-hierarquia-panel'; hierPanel.style.display = 'none';
    const auditPanel = document.createElement('div'); auditPanel.id = 'fin-auditoria-panel';  auditPanel.style.display = 'none';

    function trocarAba(ativa, panelID) {
        [abaG, abaH, abaA].forEach(b => { b.style.borderBottom = 'none'; b.style.color = '#64748b'; });
        ativa.style.borderBottom = '2px solid #3b82f6';
        ativa.style.color = '#fff';
        mainGrid.style.display = 'none';
        document.getElementById('fin-hierarquia-panel').style.display = 'none';
        document.getElementById('fin-auditoria-panel').style.display  = 'none';
        if (panelID === 'grid') { mainGrid.style.display = ''; } else { document.getElementById(panelID).style.display = 'block'; }
    }

    abaG.onclick = () => { trocarAba(abaG, 'grid'); _chartResumoGlobal.resize(); _chartDetalhadoGlobal.resize(); };
    abaH.onclick = () => { trocarAba(abaH, 'fin-hierarquia-panel'); _renderizarHierarquia(); };
    abaA.onclick = () => { trocarAba(abaA, 'fin-auditoria-panel');  _renderizarAuditoria(); };
    abaWrap.appendChild(abaG); abaWrap.appendChild(abaH); abaWrap.appendChild(abaA);
    dashboard.insertBefore(abaWrap, mainGrid);
    dashboard.appendChild(hierPanel);
    dashboard.appendChild(auditPanel);
}

// ─────────────────────────────────────────────────────────────────────────────
async function filtrar(chartResumo, chartDetalhado, loadingSpinner, showFullAnimation = true) {
    const start       = document.getElementById('startDate').value;
    const end         = document.getElementById('endDate').value;
    const agrupamento = document.getElementById('select-agrupamento').value;
    if (!start || !end) return;
    if (showFullAnimation) loadingSpinner.classList.remove('hidden');
    chartResumo.showLoading();
    chartDetalhado.showLoading();
    _atualizarIndicadorPlanta(plantaFinanceiroSelecionada);

    try {
        const [resO, resS] = await Promise.all([
            fetch(`/api/producao/merge/all?start=${start}&end=${end}`),
            fetch(`/api/financeiro/indicadores?startDate=${start}&endDate=${end}`)
        ]);
        const rawO = resO.ok ? await resO.json() : [];
        const rawS = resS.ok ? await resS.json() : [];

        // Log de diagnóstico — confirma campos chegando do backend
        if (rawO.length) { console.log('Oracle campos:', Object.keys(rawO[0])); console.log('Oracle 1º reg:', rawO[0]); }
        if (rawS.length) { console.log('SQL campos:', Object.keys(rawS[0])); }

        let data = [
            ...rawO.map(r => ({ ...r, _origem: 'MLB' })),
            ...rawS.map(r => ({ ...r, _origem: 'MMB' }))
        ];

        data = data.map(row => {
            
            const { qtd, ph, nroOper, hh } = _normalizarRow(row);
            return { 
                ...row, 
                _plantaResolvida: resolverPlanta(row), 
                _setorResolvido: resolverSetor(row), 
                _qtdPcs: qtd, 
                _phBase: ph, 
                _nroOp: nroOper,
                _hhFinal: hh 
            };
        }).filter(item => item._setorResolvido && item._setorResolvido !== 'NÃO MAPEADO'); 

        if (plantaFinanceiroSelecionada) data = data.filter(r => r._plantaResolvida === plantaFinanceiroSelecionada);

        _dadosHierarquia = data;
        _dadosAuditoria  = data;

        const totalGeralHH = data.reduce((acc, r) => acc + r._hhFinal, 0);
        _indicadorPronto(totalGeralHH);

        const resumo = {}, detalhado = {};
        data.forEach(r => {
            const s = r._setorResolvido, p = r._plantaResolvida, hh = r._hhFinal;
            const chR = `${p}|${s}`;
            if (!resumo[chR]) resumo[chR] = { planta: p, setor: s, value: 0 };
            resumo[chR].value += hh;
            const keyD = agrupamento === 'planta' ? p : agrupamento === 'dia' ? formatDateBR(r.Data) : s;
            if (!detalhado[keyD]) detalhado[keyD] = { planta: p, hh: 0, setorExibido: s };
            detalhado[keyD].hh += hh;
        });

        chartResumo.setOption({ tooltip: { trigger: 'item', formatter: '{b}: {c}h ({d}%)' }, series: [{ type: 'pie', radius: ['40%', '70%'], itemStyle: { borderRadius: 5, borderColor: '#1e293b', borderWidth: 2 }, data: Object.values(resumo).map(i => ({ name: i.setor, value: i.value.toFixed(2) })) }] }, true);

        const sortedD = Object.entries(detalhado).sort((a, b) => a[1].hh - b[1].hh);
        chartDetalhado.setOption({ xAxis: { type: 'value', axisLabel: { color: '#94a3b8' } }, yAxis: { type: 'category', data: sortedD.map(i => i[0]), axisLabel: { color: '#fff', fontSize: 10 } }, series: [{ type: 'bar', itemStyle: { color: '#6366f1' }, data: sortedD.map(i => i[1].hh.toFixed(2)), label: { show: true, position: 'right', color: '#fff' } }] }, true);

        document.querySelector('#tabelaGrupo tbody').innerHTML = Object.values(resumo).sort((a, b) => a.planta.localeCompare(b.planta) || a.setor.localeCompare(b.setor)).map(i => `<tr class="${getGroupClass(i.setor)}"><td>${i.planta}</td><td>${i.setor}</td><td>${i.value.toFixed(2)}</td></tr>`).join('');
        document.querySelector('#tabelaGrupo tfoot').innerHTML = `<tr><td colspan="2">TOTAL</td><td>${totalGeralHH.toFixed(2)}</td></tr>`;
        document.querySelector('#tabelaFiltrado tbody').innerHTML = Object.entries(detalhado).sort((a, b) => b[1].hh - a[1].hh).map(([k, o]) => `<tr class="${getGroupClass(o.setorExibido)}"><td>${agrupamento === 'setor' ? 'AMBAS' : o.planta}</td><td>${k}</td><td>${o.hh.toFixed(2)}</td><td>${o.setorExibido}</td></tr>`).join('');
        document.querySelector('#tabelaFiltrado tfoot').innerHTML = `<tr><td colspan="3">TOTAL</td><td>${totalGeralHH.toFixed(2)}</td></tr>`;
        document.getElementById('periodoInfo').textContent = `Dados processados: ${totalGeralHH.toFixed(0)} horas geradas.`;

        if (document.getElementById('fin-hierarquia-panel')?.style.display !== 'none') _renderizarHierarquia();
        if (document.getElementById('fin-auditoria-panel')?.style.display  !== 'none') _renderizarAuditoria();

    } catch (e) {
        console.error('🚨 Erro crítico filtrar():', e);
    } finally {
        chartResumo.hideLoading();
        chartDetalhado.hideLoading();
        loadingSpinner.classList.add('hidden');
        limparFinanceiro();
        financeiroRefreshIntervalId = setInterval(() => filtrar(chartResumo, chartDetalhado, loadingSpinner, false), 120000);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
function _renderizarHierarquia() {
    const panel = document.getElementById('fin-hierarquia-panel');
    if (!panel) return;
    if (_dadosHierarquia.length === 0) { panel.innerHTML = '<p style="padding:20px;color:#94a3b8;">Calcule os dados primeiro.</p>'; return; }
    const arvore = {};
    _dadosHierarquia.forEach(r => {
        const pl = r._plantaResolvida, set = r._setorResolvido, maq = r.Maquina || 'SEM MÁQUINA';
        if (!arvore[pl]) arvore[pl] = {};
        if (!arvore[pl][set]) arvore[pl][set] = { hh: 0, mqs: {} };
        if (!arvore[pl][set].mqs[maq]) arvore[pl][set].mqs[maq] = { hh: 0, count: 0 };
        arvore[pl][set].mqs[maq].hh    += r._hhFinal;
        arvore[pl][set].mqs[maq].count += 1;
        arvore[pl][set].hh             += r._hhFinal;
    });
    let html = '<div style="margin-top:10px;">';
    Object.entries(arvore).sort().forEach(([pl, setores]) => {
        const idPl = `h-pl-${pl}`, cor = COR_PLANTA[pl] || COR_PLANTA['TODAS'];
        const totalPl = Object.values(setores).reduce((a, s) => a + s.hh, 0);
        html += `<div style="margin-bottom:8px;border-radius:8px;overflow:hidden;border:1px solid #334155;"><div onclick="toggleFinBlock('${idPl}')" style="background:#1e293b;padding:12px 20px;color:#fff;cursor:pointer;display:flex;justify-content:space-between;border-left:4px solid ${cor.border};"><span><strong>${pl}</strong></span><span style="color:${cor.label};">${totalPl.toFixed(2)} HH</span></div><div id="${idPl}" style="display:none;background:#0f172a;">`;
        Object.entries(setores).sort().forEach(([set, d]) => {
            const idSet = `h-set-${pl}-${set.replace(/\W/g, '-')}`;
            html += `<div style="border-bottom:1px solid #1e293b;"><div onclick="toggleFinBlock('${idSet}')" style="padding:8px 20px;color:#94a3b8;font-size:12px;cursor:pointer;display:flex;justify-content:space-between;"><span>${set}</span><strong style="color:#e2e8f0;">${d.hh.toFixed(2)} HH (${Object.keys(d.mqs).length} máq.)</strong></div><div id="${idSet}" style="display:none;background:#020617;padding:4px 0 8px 20px;"><table style="width:100%;color:#cbd5e1;font-size:11px;border-collapse:collapse;"><thead><tr style="color:#475569;border-bottom:1px solid #1e293b;text-align:left;"><th style="padding:4px 10px;">Máquina</th><th style="padding:4px 10px;text-align:right;">HH Gerada</th><th style="padding:4px 10px;text-align:right;">Registros</th><th style="padding:4px 10px;text-align:right;">% Setor</th></tr></thead><tbody>${Object.entries(d.mqs).sort((a, b) => b[1].hh - a[1].hh).map(([maq, md]) => { const pct = d.hh > 0 ? ((md.hh / d.hh) * 100).toFixed(1) : '0.0'; return `<tr style="border-top:1px solid #1e293b;"><td style="padding:3px 10px;">${maq}</td><td style="padding:3px 10px;text-align:right;color:#a5b4fc;">${md.hh.toFixed(2)}</td><td style="padding:3px 10px;text-align:right;color:#64748b;">${md.count}</td><td style="padding:3px 10px;text-align:right;color:#94a3b8;">${pct}%</td></tr>`; }).join('')}</tbody></table></div></div>`;
        });
        html += `</div></div>`;
    });
    panel.innerHTML = html + '</div>';
}

// ─────────────────────────────────────────────────────────────────────────────
// Auditoria — tabela igual ao modelo da imagem:
// Planta | Data | Turno | Produto | Roteiro | Máquina | Qtd Peças | Prod/Hora | Nº Oper. | Fórmula | HH Gerada | Status
// ─────────────────────────────────────────────────────────────────────────────
function _renderizarAuditoria(filtro) {
    const panel = document.getElementById('fin-auditoria-panel');
    if (!panel) return;
    if (_dadosAuditoria.length === 0) { panel.innerHTML = '<p style="padding:20px;color:#94a3b8;">Calcule os dados primeiro.</p>'; return; }

    const q = (filtro !== undefined ? filtro : (document.getElementById('audit-search-input')?.value || '')).toLowerCase();

    const rows = _dadosAuditoria.filter(r =>
        !q ||
        String(r.Produto          || '').toLowerCase().includes(q) ||
        String(r.Maquina          || '').toLowerCase().includes(q) ||
        String(r._plantaResolvida || r.Planta || '').toLowerCase().includes(q) ||
        String(r.Roteiro          || '').toLowerCase().includes(q)
    );

    const totalHH = rows.reduce((a, r) => a + r._hhFinal, 0);
    const alertas = rows.filter(r => r._phBase <= 1 || r._hhFinal > 200).length;

    // Estilo do cabeçalho — igual à imagem: fundo escuro, texto cinza claro, borda inferior
    const thS = 'padding:10px 12px;font-size:11px;font-weight:600;color:#94a3b8;border-bottom:1px solid #334155;white-space:nowrap;background:#1a2236;text-align:left;';
    const thR = thS + 'text-align:right;';
    const thC = thS + 'text-align:center;';

    const linhas = rows.map(r => {
        const warn   = r._phBase <= 1 || r._hhFinal > 200;
        const planta = r._plantaResolvida || r.Planta || '';
        const corP   = planta === 'MLB' ? '#3b82f6' : planta === 'MJN' ? '#a855f7' : '#22c55e';
        const data   = formatDateBR(r.Data);
        const turno  = r.Turno || '—';
        const prod   = r.Produto || '—';
        const rot    = r.Roteiro || '—';
        const maq    = r.Maquina || '—';
        const qtd    = r._qtdPcs;
        const ph     = r._phBase;
        const op     = r._nroOp;
        const hh     = r._hhFinal;
        // Fórmula colorida igual à imagem: (480 ÷ 120) × 2 = 8.0000
        const formula = `<span style="color:#a78bfa;">(${qtd} ÷ ${ph}) × ${op} = </span><span style="color:#34d399;font-weight:700;">${hh.toFixed(4)}</span>`;
        const statusBadge = warn
            ? `<span style="background:#78350f;color:#fbbf24;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:600;white-space:nowrap;">⚠ Verificar</span>`
            : `<span style="background:#064e3b;color:#6ee7b7;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:600;">✓ OK</span>`;
        const tdS = `padding:9px 12px;font-size:11px;border-bottom:1px solid #1e293b;vertical-align:middle;`;
        return `<tr style="${warn ? 'background:rgba(245,158,11,0.05);' : ''}">
            <td style="${tdS}"><span style="background:${corP}25;color:${corP};padding:2px 10px;border-radius:12px;font-size:10px;font-weight:700;white-space:nowrap;">${planta}</span></td>
            <td style="${tdS}color:#94a3b8;white-space:nowrap;">${data}</td>
            <td style="${tdS}color:#64748b;white-space:nowrap;">${turno}</td>
            <td style="${tdS}font-family:monospace;color:#e2e8f0;">${prod}</td>
            <td style="${tdS}color:#64748b;">${rot}</td>
            <td style="${tdS}color:#cbd5e1;" title="${r.Desc_Maquina || ''}">${maq}</td>
            <td style="${tdS}text-align:right;font-variant-numeric:tabular-nums;">${qtd.toLocaleString('pt-BR')}</td>
            <td style="${tdS}text-align:right;font-variant-numeric:tabular-nums;${ph <= 1 ? 'color:#f59e0b;font-weight:700;' : ''}">${ph}</td>
            <td style="${tdS}text-align:right;font-weight:700;color:#60a5fa;">${op}</td>
            <td style="${tdS}font-family:monospace;white-space:nowrap;">${formula}</td>
            <td style="${tdS}text-align:right;font-weight:700;font-size:12px;color:${warn ? '#f59e0b' : '#34d399'};font-variant-numeric:tabular-nums;">${hh.toFixed(4)}</td>
            <td style="${tdS}text-align:center;">${statusBadge}</td>
        </tr>`;
    }).join('');

    panel.innerHTML = `
<div style="background:#1a2236;padding:12px 16px;border-radius:8px;border:1px solid #334155;margin-top:10px;display:flex;gap:16px;align-items:center;flex-wrap:wrap;">
    <span style="color:#94a3b8;font-size:12px;">Registros: <strong style="color:#fff;">${rows.length}</strong></span>
    <span style="color:#334155;">|</span>
    <span style="color:#94a3b8;font-size:12px;">Total HH: <strong style="color:#34d399;">${totalHH.toFixed(2)}</strong></span>
    <span style="color:#334155;">|</span>
    <span style="color:#94a3b8;font-size:12px;">Alertas: <strong style="color:#f59e0b;">${alertas}</strong></span>
    <div style="margin-left:auto;display:flex;gap:8px;align-items:center;">
        <input id="audit-search-input" type="text" placeholder="Filtrar produto, máquina, roteiro..." value="${q}" oninput="_renderizarAuditoria(this.value)" style="padding:6px 12px;font-size:12px;background:#0f172a;border:1px solid #334155;border-radius:6px;color:#e2e8f0;width:270px;outline:none;font-family:monospace;">
        <button onclick="window._exportarAuditoriaCSV()" style="padding:6px 14px;font-size:11px;background:transparent;border:1px solid #334155;border-radius:6px;color:#94a3b8;cursor:pointer;white-space:nowrap;" onmouseover="this.style.background='#334155'" onmouseout="this.style.background='transparent'">⬇ CSV</button>
    </div>
</div>
<div style="overflow-x:auto;border:1px solid #334155;border-radius:8px;margin-top:10px;">
    <div style="max-height:520px;overflow-y:auto;">
        <table style="width:100%;border-collapse:collapse;font-size:11px;">
            <thead style="position:sticky;top:0;z-index:2;">
                <tr>
                    <th style="${thS}">Planta</th>
                    <th style="${thS}">Data</th>
                    <th style="${thS}">Turno</th>
                    <th style="${thS}">Produto</th>
                    <th style="${thS}">Roteiro</th>
                    <th style="${thS}">Máquina</th>
                    <th style="${thR}">Qtd Peças</th>
                    <th style="${thR}">Prod/Hora</th>
                    <th style="${thR}color:#60a5fa;">Nº Oper.</th>
                    <th style="${thS}">Fórmula</th>
                    <th style="${thR}">HH Gerada</th>
                    <th style="${thC}">Status</th>
                </tr>
            </thead>
            <tbody style="color:#cbd5e1;">
                ${linhas || `<tr><td colspan="12" style="padding:30px;text-align:center;color:#475569;">Nenhum registro encontrado.</td></tr>`}
            </tbody>
            <tfoot>
                <tr style="background:#1a2236;border-top:2px solid #334155;">
                    <td colspan="8" style="padding:9px 12px;color:#64748b;font-size:11px;font-weight:600;">TOTAL — ${rows.length} registros</td>
                    <td colspan="2"></td>
                    <td style="padding:9px 12px;text-align:right;color:#34d399;font-weight:700;font-size:13px;font-variant-numeric:tabular-nums;">${totalHH.toFixed(2)}</td>
                    <td style="padding:9px 12px;text-align:center;color:#64748b;font-size:10px;">${alertas > 0 ? `⚠ ${alertas} alerta(s)` : '✓ Tudo OK'}</td>
                </tr>
            </tfoot>
        </table>
    </div>
</div>`;
}

// ─────────────────────────────────────────────────────────────────────────────
window._exportarAuditoriaCSV = function () {
    const header = ['Planta','Data','Turno','Produto','Roteiro','Maquina','Qtd Pecas','Prod/Hora','Nro Operadores','HH Gerada','Formula'].join(';');
    const lines  = _dadosAuditoria.map(r => [
        r._plantaResolvida || r.Planta || '',
        formatDateBR(r.Data),
        r.Turno   || 'S/T',
        r.Produto || '',
        r.Roteiro || '',
        r.Maquina || '',
        r._qtdPcs,
        r._phBase,
        r._nroOp,
        r._hhFinal.toFixed(4),
        `(${r._qtdPcs}/${r._phBase})*${r._nroOp}`
    ].join(';'));
    const bom  = '\uFEFF';
    const blob = new Blob([bom + [header, ...lines].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const a    = document.createElement('a');
    a.href     = URL.createObjectURL(blob);
    a.download = `auditoria_hh_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
};