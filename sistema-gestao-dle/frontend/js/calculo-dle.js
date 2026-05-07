(function() {
    // =================================================================
    // 0. ESTILOS
    // =================================================================
    const css = `
        .dle-plant-card { background: #1a1d27; margin-bottom: 20px; border-radius: 8px; border: 1px solid #2d3241; overflow: hidden; }
        .dle-card-header { padding: 15px; background: #242936; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #2d3241; color: #fff; }
        .dle-btn-expand { background: #3b4252; border: none; color: #fff; padding: 6px 14px; border-radius: 4px; cursor: pointer; font-size: 0.85rem; font-weight: 600; transition: background 0.2s; display: inline-flex; align-items: center; gap: 6px; }
        .dle-btn-expand:hover { background: #4c566a; }
        .dle-btn-level { background: #434c5e; border: none; color: #eceff4; padding: 2px 8px; border-radius: 3px; font-size: 0.7rem; margin-left: 10px; cursor: pointer; border: 1px solid #4c566a; }
        .dle-btn-level:hover { background: #5e81ac; border-color: #81a1c1; }
        .dle-is-full { position: fixed !important; top: 0 !important; left: 0 !important; width: 100vw !important; height: 100vh !important; z-index: 9999 !important; background: #1a1d27 !important; overflow-y: auto !important; border-radius: 0 !important; }
        .table-dle { width: 100%; border-collapse: collapse; color: #d8dee9; font-size: 0.85rem; }
        .table-dle th { background: #2e3440; padding: 10px 12px; text-align: left; border-bottom: 2px solid #3b4252; color: #81a1c1; text-transform: uppercase; font-size: 0.7rem; position: sticky; top: 0; z-index: 20; }
        .table-dle td { padding: 7px 12px; border-bottom: 1px solid #2e3440; }
        .text-end { text-align: right; }
        .dle-tree-row:hover { background: rgba(129,161,193,0.08) !important; cursor: pointer; }
        .dle-node-hidden { display: none !important; }
        .dle-chevron { display: inline-block; transition: transform 0.2s; margin-right: 6px; color: #88c0d0; font-size: 0.75rem; }
        .dle-open { transform: rotate(90deg); }
        .dle-lvl-0 { background: #242936; font-weight: bold; }
        .dle-lvl-1 { background: rgba(129,161,193,0.03); }
        .dle-lvl-4 { color: #a3be8c; font-weight: 600; }
        .dle-lvl-5 { color: #ebcb8b; font-weight: 600; }
        .dle-lvl-6 { color: #88c0d0; }
        .dle-lvl-7 { background: rgba(0,212,255,0.03); color: #00d4ff; font-style: italic; }
        .text-success { color: #a3be8c !important; }
        .text-warning { color: #ebcb8b !important; }
        .text-danger  { color: #bf616a !important; }
    `;
    if (!document.getElementById('dle-dynamic-style')) {
        const s = document.createElement('style');
        s.id = 'dle-dynamic-style';
        s.innerHTML = css;
        document.head.appendChild(s);
    }

    // =================================================================
    // 1. CONFIG
    // =================================================================
    const DLE_CONFIG = {
        fin_oracle:  '/api/producao/merge/all',
        fin_sql:     '/api/financeiro/indicadores',
        fabrica_dle: '/api/apontamentos/dle',
        rh_ops:      '/api/rh/operadores'
    };

    let DLE_RAW_FABRICA    = [];
    let DLE_RAW_FINANCEIRO = [];
    let DLE_RAW_RH_OPS     = [];

    // =================================================================
    // 2. UTILITÁRIOS
    // =================================================================
    async function dleFetch(url) {
        const res = await fetch(url);
        if (!res.ok) {
            let msg = `HTTP ${res.status} — ${url}`;
            try { const b = await res.json(); msg = `[${res.status}] ${b.error || b.message || JSON.stringify(b)}`; } catch (_) {}
            throw new Error(msg);
        }
        return res.json();
    }

    const dleCleanRE = (v) => String(v || '').replace(/[^0-9]/g, '').replace(/^0+/, '') || '';
    const dleParseNum = (v) => {
        if (v === null || v === undefined || v === '') return 0;
        if (typeof v === 'number') return v;
        const s = String(v).trim();
        if (s.includes(',')) return parseFloat(s.replace(/\./g, '').replace(',', '.')) || 0;
        return parseFloat(s) || 0;
    };
    const dleNormData = (v) => {
        if (!v) return '';
        if (/^\d{4}-\d{2}-\d{2}$/.test(String(v))) return String(v);
        const d = new Date(v);
        if (isNaN(d)) return '';
        d.setMinutes(d.getMinutes() + d.getTimezoneOffset());
        return d.toISOString().split('T')[0];
    };
    const dleGetSemana = (ds) => {
        const d = new Date(ds + 'T12:00:00');
        d.setDate(d.getDate() + 4 - (d.getDay() || 7));
        const st = new Date(d.getFullYear(), 0, 1);
        return `Semana ${Math.ceil((((d - st) / 86400000) + 1) / 7).toString().padStart(2, '0')}`;
    };
    const dleGetMesAno = (ds) => {
        const m = ["JANEIRO","FEVEREIRO","MARÇO","ABRIL","MAIO","JUNHO","JULHO","AGOSTO","SETEMBRO","OUTUBRO","NOVEMBRO","DEZEMBRO"];
        const p = ds.split('-');
        return `${m[parseInt(p[1]) - 1]} / ${p[0].substring(2)}`;
    };
    const dleSetorDaLinha = (l) => {
        if (!l) return 'OUTROS';
        const m = l.toUpperCase().trim();
        if (m.startsWith('S.MT') || m.startsWith('J.MT') || /^MT0[0-9]$/.test(m)) return 'METALIZAÇÃO';
        if (m.includes('INJ') || m.startsWith('S.I') || m.startsWith('J.I')) return 'INJEÇÃO';
        if (m.startsWith('S.HC') || m.includes('PINT')) return 'PINTURA';
        if (m.startsWith('S.F') || m.startsWith('J.F') || (m.includes('FA') && !m.startsWith('V.'))) return 'MONTAGEM FAROL';
        if ((m.startsWith('S.L') || m.startsWith('J.L')) && !m.includes('FA')) return 'MONTAGEM LANTERNAS';
        if (m.includes('SMALL') || m.includes('2035') || m.startsWith('S.S') || m.startsWith('J.S')) return 'MONTAGEM SMALL';
        if (m.includes('SUB') || m.includes('ASSEMB')) return 'MONTAGEM SUB';
        if (m.includes('TERC')) return 'TERCEIRIZAÇÃO';
        if (m.startsWith('V.RE') || m.startsWith('V.EM') || m.startsWith('E.GM')) return 'MONTAGEM RETROVISORES';
        if (m.startsWith('V.FE') || m.startsWith('V.FS') || m.startsWith('V.AT') || m.startsWith('V.BA') || m.startsWith('V.PA') || m.startsWith('P.FT')) return 'MONTAGEM FECHADURAS';
        if (m.startsWith('V.SC') || m.startsWith('V.CA')) return 'MONTAGEM SUBCONJUNTOS';
        if (m === 'INJETORA' || m.startsWith('V.L') || m.startsWith('V.I') || m.startsWith('V.J')) return 'INJEÇÃO';
        return 'OUTROS';
    };
    const dleNormMaq = (n) => n ? n.toUpperCase().trim() : 'GERAL';

    // =================================================================
    // 3. INICIALIZAÇÃO
    // =================================================================
    window.iniciarCalculoDle = function() {
        flatpickr("#dle-start-date", { dateFormat:"Y-m-d", altInput:true, altFormat:"d/M/y", theme:"dark", locale:"pt" });
        flatpickr("#dle-end-date",   { dateFormat:"Y-m-d", altInput:true, altFormat:"d/M/y", theme:"dark", locale:"pt" });
        const btn = document.getElementById('btn-calcular-dle');
        if (btn) btn.onclick = dleCarregarDados;
    };

    // =================================================================
    // 4. CARREGAMENTO DINÂMICO
    // =================================================================
    async function dleCarregarDados() {
        const start = document.getElementById('dle-start-date').value;
        const end   = document.getElementById('dle-end-date').value;
        const plantaSel = document.getElementById('dle-plant-select').value;

        if (!start || !end) return alert("Selecione o período!");
        
        const main = document.getElementById('dle-main-tables-container');
        main.innerHTML = `<div style="padding:1rem;color:#81a1c1;">⏳ Carregando dados para ${plantaSel}...</div>`;

        try {
            const promises = [];
            const plantasAlvo = plantaSel === 'TODAS' ? ['MLB', 'MJN', 'MMB'] : [plantaSel];

            plantasAlvo.forEach(p => {
                promises.push(dleFetch(`${DLE_CONFIG.fabrica_dle}/${p}?startDate=${start}&endDate=${end}`).then(d => ({ tipo: 'FAB', planta: p, data: d })));
            });

            if (plantasAlvo.includes('MLB') || plantasAlvo.includes('MJN')) {
                promises.push(dleFetch(`${DLE_CONFIG.fin_oracle}?start=${start}&end=${end}`).then(d => ({ tipo: 'FIN_ORA', data: d })));
            }

            if (plantasAlvo.includes('MMB')) {
                promises.push(dleFetch(`${DLE_CONFIG.fin_sql}?startDate=${start}&endDate=${end}`).then(d => ({ tipo: 'FIN_SQL', data: d })));
            }

            promises.push(dleFetch(`${DLE_CONFIG.rh_ops}?startDate=${start}&endDate=${end}`).then(d => ({ tipo: 'RH', data: d })));

            const resRaw = await Promise.all(promises);
            let rawFab = [], rawFin = [], rawRH = [];

            resRaw.forEach(r => {
                if (r.tipo === 'FAB') {
                    const d = Array.isArray(r.data) ? r.data : [];
                    rawFab.push(...d.map(item => ({ ...item, _planta: r.planta })));
                } else if (r.tipo === 'FIN_ORA') {
                    const d = Array.isArray(r.data) ? r.data : [];
                    rawFin.push(...d.filter(f => plantasAlvo.includes(f.Planta?.toUpperCase())));
                } else if (r.tipo === 'FIN_SQL') {
                    const d = Array.isArray(r.data) ? r.data : [];
                    rawFin.push(...d.map(f => ({ ...f, Planta: 'MMB' })));
                } else if (r.tipo === 'RH') {
                    rawRH = Array.isArray(r.data) ? r.data : [];
                }
            });

            DLE_RAW_FABRICA = rawFab.map(p => ({
                data: p.Data || '', planta: p._planta, 
                turno: (!p.Turno || p.Turno === 'S/T') ? '0ºTurno' : p.Turno,
                setor: dleSetorDaLinha(p.Linha || ''), maquina: dleNormMaq(p.Linha || ''),
                re: dleCleanRE(p.RE ?? p.Cracha ?? ''), nome: p.Nome || p.NomeOperador || 'OPERADOR',
                horas: (p.DuracaoSegundos || 0) / 3600
            }));

            DLE_RAW_FINANCEIRO = rawFin.map(p => ({
                data: dleNormData(p.Data), planta: (p.Planta || 'MMB').toUpperCase(),
                turno: (!p.Turno || p.Turno === 'S/T') ? '0ºTurno' : p.Turno, 
                maquina: dleNormMaq(p.Maquina || p.Desc_Maquina || ''),
                horas: dleParseNum(p["HH GERADA"] ?? p.HH_Gerada ?? 0)
            }));

            // --- FILTRO DE MÃO DE OBRA DIRETA (M.O.D) ---
            DLE_RAW_RH_OPS = rawRH
                .filter(p => {
                    // Usamos a coluna TipoMaoObra que o backend passou a enviar
                    const tipo = String(p.TipoMaoObra || '').toUpperCase().trim();
                    return tipo === 'D'; // Filtra apenas DIRETA
                })
                .map(p => ({
                    data: dleNormData(p.DataRef), 
                    re: dleCleanRE(p.RE), 
                    horas: dleParseNum(p.TotalHoras)
                }));

            dleBuildTables(main, plantasAlvo);

        } catch (err) {
            console.error('❌ ERRO DLE:', err);
            main.innerHTML = `<div style="padding:1.5rem;color:#bf616a;">❌ Erro: ${err.message}</div>`;
        }
    }

    // =================================================================
    // 5. CONSTRUÇÃO DA ÁRVORE
    // =================================================================
    function _no(nome, level, type) {
        return { nome, level, type, earned:0, scanned:0, paid:0, children:{}, opChildren:{} };
    }

    function registrarOp(noAlvo, turno, setor, maquina, opLabel, earned, scanned, paid, earnedOp = 0) {
        noAlvo.earned += earned; 
        noAlvo.scanned += scanned; 
        noAlvo.paid += paid;
        
        if (!turno) return;
        if (!noAlvo.opChildren[turno]) noAlvo.opChildren[turno] = _no(turno, 4, 'turno');
        const t = noAlvo.opChildren[turno];
        t.earned += earned; t.scanned += scanned; t.paid += paid;
        
        if (!setor) return;
        if (!t.opChildren[setor]) t.opChildren[setor] = _no(setor, 5, 'cc');
        const s = t.opChildren[setor];
        s.earned += earned; s.scanned += scanned; s.paid += paid;
        
        if (!maquina) return;
        if (!s.opChildren[maquina]) s.opChildren[maquina] = _no(maquina, 6, 'maq');
        const mq = s.opChildren[maquina];
        mq.earned += earned; mq.scanned += scanned; mq.paid += paid;
        
        if (!opLabel) return;
        if (!mq.opChildren[opLabel]) mq.opChildren[opLabel] = _no(opLabel, 7, 'op');
        const o = mq.opChildren[opLabel];
        o.earned += earnedOp; 
        o.scanned += scanned; 
        o.paid += paid;
    }

    function dleBuildTables(mainContainer, plantasParaRenderizar) {
        mainContainer.innerHTML = `<div id="dle-tables-wrapper"></div>`;
        const wrapper = document.getElementById('dle-tables-wrapper');

        plantasParaRenderizar.forEach(planta => {
            const root = _no(planta, 0, 'plant');
            
            const mapEarnedMaqTurno = {}; const mapEarnedMaq = {};
            DLE_RAW_FINANCEIRO.filter(f => f.planta === planta).forEach(f => {
                const kmt = `${f.data}|${f.maquina}|${f.turno}`, km = `${f.data}|${f.maquina}`;
                mapEarnedMaqTurno[kmt] = (mapEarnedMaqTurno[kmt] || 0) + f.horas;
                mapEarnedMaq[km] = (mapEarnedMaq[km] || 0) + f.horas;
            });

            const mapScannedMaq = {}; const mapScannedMaqTur = {}; const mapScannedRE = {};
            DLE_RAW_FABRICA.filter(f => f.planta === planta).forEach(f => {
                const km = `${f.data}|${f.maquina}`, kmt = `${f.data}|${f.maquina}|${f.turno}`, kr = `${f.data}|${f.re}`;
                mapScannedMaq[km] = (mapScannedMaq[km] || 0) + f.horas;
                mapScannedMaqTur[kmt] = (mapScannedMaqTur[kmt] || 0) + f.horas;
                if (f.re) mapScannedRE[kr] = (mapScannedRE[kr] || 0) + f.horas;
            });

            const mapPaidRE = {}; const nomePorRE = {};
            DLE_RAW_RH_OPS.forEach(r => { if (r.re) mapPaidRE[`${r.data}|${r.re}`] = (mapPaidRE[`${r.data}|${r.re}`] || 0) + r.horas; });
            DLE_RAW_FABRICA.filter(f => f.planta === planta).forEach(f => { if (f.re && !nomePorRE[f.re]) nomePorRE[f.re] = f.nome; });

            const registrar = (data, turno, setor, maquina, opLabel, earned, scanned, paid, earnedOp = 0) => {
                const mes = dleGetMesAno(data); const sem = dleGetSemana(data);
                registrarOp(root, turno, setor, maquina, opLabel, earned, scanned, paid, earnedOp);
                if (!root.children[mes]) root.children[mes] = _no(mes, 1, 'month');
                registrarOp(root.children[mes], turno, setor, maquina, opLabel, earned, scanned, paid, earnedOp);
                const mn = root.children[mes];
                if (!mn.children[sem]) mn.children[sem] = _no(sem, 2, 'week');
                registrarOp(mn.children[sem], turno, setor, maquina, opLabel, earned, scanned, paid, earnedOp);
                const sn = mn.children[sem];
                if (!sn.children[data]) sn.children[data] = _no(data, 3, 'day');
                registrarOp(sn.children[data], turno, setor, maquina, opLabel, earned, scanned, paid, earnedOp);
            };

            // 1. FINANCEIRO
            DLE_RAW_FINANCEIRO.filter(f => f.planta === planta).forEach(f => {
                registrar(f.data, f.turno, dleSetorDaLinha(f.maquina), f.maquina, null, f.horas, 0, 0, 0);
            });

            // 2. FÁBRICA
            DLE_RAW_FABRICA.filter(f => f.planta === planta).forEach(f => {
                const km = `${f.data}|${f.maquina}`, kmt = `${f.data}|${f.maquina}|${f.turno}`, kr = `${f.data}|${f.re}`;
                const earnedTurno = mapEarnedMaqTurno[kmt] || 0, scannedTurno = mapScannedMaqTur[kmt] || 0;
                const earnedTotal = mapEarnedMaq[km] || 0, scannedTotal = mapScannedMaq[km] || 0;
                let eSessao = (earnedTurno > 0 && scannedTurno > 0) ? earnedTurno * (f.horas / scannedTurno) : (earnedTotal > 0 && scannedTotal > 0) ? earnedTotal * (f.horas / scannedTotal) : 0;
                const pSessao = f.re && mapPaidRE[kr] ? mapPaidRE[kr] * (f.horas / (mapScannedRE[kr] || 1)) : 0;
                const label = f.re ? `${f.re} - ${nomePorRE[f.re] || f.nome}` : `S/ID - ${f.nome}`;
                registrar(f.data, f.turno, f.setor, f.maquina, label, 0, f.horas, pSessao, eSessao);
            });

            // 3. AUDITORIA RH (M.O.D. QUE NÃO BIPOU)
            const bipados = new Set(DLE_RAW_FABRICA.filter(f => f.planta === planta && f.re).map(f => `${f.data}|${f.re}`));
            DLE_RAW_RH_OPS.forEach(r => {
                if (!r.re || bipados.has(`${r.data}|${r.re}`)) return;
                registrar(r.data, '0ºTurno', 'AUDITORIA RH', 'AUDITORIA RH', `${r.re} - ${nomePorRE[r.re] || r.re} (S/ APONT.)`, 0, 0, r.horas, 0);
            });

            if (root.scanned > 0 || root.earned > 0 || root.paid > 0) {
                const card = document.createElement('div');
                card.className = 'dle-plant-card';
                card.innerHTML = `
                    <div class="dle-card-header">
                        <span>Planta: <strong>${planta}</strong></span>
                        <button class="dle-btn-expand" onclick="dleFull(this.parentElement.parentElement)"><i class="bi bi-arrows-fullscreen"></i> Expandir</button>
                    </div>
                    <div style="overflow-x:auto;"><table class="table-dle"><thead><tr><th>Hierarquia</th><th class="text-end">Earned</th><th class="text-end">Scanned</th><th class="text-end">Paid</th><th class="text-end">Earned%</th><th class="text-end">Acc%</th><th class="text-end">Final%</th></tr></thead><tbody id="tbody-${planta}"></tbody></table></div>`;
                wrapper.appendChild(card);
                dleRenderTree([root], document.getElementById(`tbody-${planta}`), `root-${planta}`);
            }
        });
        dleUpdateKPIs();
    }

    // =================================================================
    // 6. RENDERIZAÇÃO E CONTROLES
    // =================================================================
    function dleRenderTree(nodes, tbody, parentId) {
        nodes.forEach((node, idx) => {
            const nodeId = `${parentId}-${idx}`.replace(/[^a-zA-Z0-9-]/g, '');
            const stats = dleCalc(node); const hasOp = Object.keys(node.opChildren || {}).length > 0; const hasTemp = Object.keys(node.children || {}).length > 0;
            const tr = document.createElement('tr');
            tr.className = `dle-tree-row dle-lvl-${node.level} ${node.level > 0 ? 'dle-node-hidden' : ''}`;
            tr.dataset.id = nodeId; tr.dataset.parent = parentId;
            if (hasOp) tr.onclick = () => dleToggle(nodeId, 'op');
            let btnTemporal = hasTemp ? `<button class="dle-btn-level" onclick="event.stopPropagation();dleToggle('${nodeId}', 'temp')">${node.level === 0 ? 'MESES' : node.level === 1 ? 'SEMANAS' : 'DIAS'}</button>` : '';
            const icon = (hasOp || hasTemp) ? `<span class="dle-chevron bi bi-chevron-right"></span>` : node.level === 7 ? `<i class="bi bi-person-fill" style="color:#00d4ff;margin-right:6px"></i>` : `<i class="bi bi-dot"></i>`;
            tr.innerHTML = `<td style="padding-left:${node.level * 22 + 12}px; white-space:nowrap;">${icon} <strong>${node.level === 4 ? '🕐 ' + node.nome : node.nome}</strong> ${btnTemporal}</td><td class="text-end">${node.earned.toFixed(2)}</td><td class="text-end">${node.scanned.toFixed(2)}</td><td class="text-end">${node.paid.toFixed(2)}</td><td class="text-end">${stats.e}%</td><td class="text-end">${stats.a}%</td><td class="text-end ${stats.color}"><strong>${stats.f}%</strong></td>`;
            tbody.appendChild(tr);
            if (hasOp) {
                const ordemT = { '1º Turno':0, '2º Turno':1, '3º Turno':2, '0ºTurno':3 };
                const sortedOp = Object.values(node.opChildren).sort((a, b) => node.level <= 3 ? (ordemT[a.nome] ?? 99) - (ordemT[b.nome] ?? 99) : b.scanned - a.scanned);
                dleRenderTree(sortedOp, tbody, nodeId + '-op');
            }
            if (hasTemp) dleRenderTree(Object.values(node.children), tbody, nodeId + '-temp');
        });
    }

    window.dleToggle = function(parentId, type) {
        const targetParentId = parentId + (type === 'op' ? '-op' : '-temp');
        const rows = document.querySelectorAll(`tr[data-parent="${targetParentId}"]`);
        if (!rows.length) return;
        const opening = rows[0].classList.contains('dle-node-hidden');
        const pai = document.querySelector(`tr[data-id="${parentId}"]`);
        const chevron = pai ? pai.querySelector('.dle-chevron') : null;
        if (opening) {
            if (chevron) chevron.classList.add('dle-open');
            rows.forEach(r => r.classList.remove('dle-node-hidden'));
        } else {
            if (chevron) chevron.classList.remove('dle-open');
            const fechar = (pId) => {
                ['-op', '-temp'].forEach(sfx => {
                    document.querySelectorAll(`tr[data-parent="${pId}${sfx}"]`).forEach(r => {
                        r.classList.add('dle-node-hidden');
                        const ch = r.querySelector('.dle-chevron'); if (ch) ch.classList.remove('dle-open');
                        fechar(r.dataset.id);
                    });
                });
            };
            fechar(parentId);
        }
    };

    window.dleFull = function(card) {
        if (card.classList.contains('dle-is-full')) { card.classList.remove('dle-is-full'); document.body.style.overflow = ''; }
        else { card.classList.add('dle-is-full'); document.body.style.overflow = 'hidden'; }
    };

    function dleCalc(d) {
        const e = d.scanned > 0 ? d.earned / d.scanned : 0; const a = d.paid > 0 ? d.scanned / d.paid : 0; const f = e * a;
        return { e: (e*100).toFixed(2), a: (a*100).toFixed(2), f: (f*100).toFixed(2), color: f > 0.85 ? 'text-success' : f > 0.6 ? 'text-warning' : 'text-danger' };
    }

    function dleUpdateKPIs() {
        const tE = DLE_RAW_FINANCEIRO.reduce((a,b) => a + b.horas, 0); const tS = DLE_RAW_FABRICA.reduce((a,b) => a + b.horas, 0); const tP = DLE_RAW_RH_OPS.reduce((a,b) => a + b.horas, 0);
        const res = dleCalc({ earned:tE, scanned:tS, paid:tP });
        const el = (id, v) => { const e = document.getElementById(id); if (e) e.innerText = v; };
        el('val-earned', tE.toFixed(2) + ' h'); el('val-scanned', tS.toFixed(2) + ' h'); el('val-paid', tP.toFixed(2) + ' h');
        el('kpi-dle-earned', res.e + ' %'); el('kpi-dle-accuracy', res.a + ' %'); el('res-dle-final', res.f + ' %');
    }
})();