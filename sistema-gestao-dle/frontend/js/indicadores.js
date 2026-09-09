function iniciarIndicadores() {
    if (!document.getElementById('chart-barras')) return;
    const API_BASE_URL = 'http://10.109.132.160:3001/api';
    const fpConfig = { dateFormat: "Y-m-d", altInput: true, altFormat: "d/M/y", theme: "dark", locale: "pt" };
    const startDatePicker = flatpickr("#start-date", fpConfig);
    const endDatePicker = flatpickr("#end-date", fpConfig);
    const applyFilterBtn = document.getElementById('apply-filter');
    const chartBarras = echarts.init(document.getElementById('chart-barras'));
    const chartPizza  = echarts.init(document.getElementById('chart-pizza'));
    const chartDiario = echarts.init(document.getElementById('chart-linha'));

    const btnGraficos   = document.getElementById('btn-visao-graficos');
    const btnOperadores = document.getElementById('btn-visao-operadores');
    const viewCharts    = document.getElementById('view-charts');
    const viewOperators = document.getElementById('view-operators');

    // ─── Filtro de planta (toggle) ────────────────────────────────────────────
    let plantaSelecionada = null;

    const plantaToggleContainer = document.createElement('div');
    plantaToggleContainer.style.cssText = 'display:flex; gap:8px; align-items:center;';

    const labelPlanta = document.createElement('span');
    labelPlanta.textContent = 'Planta:';
    labelPlanta.style.cssText = 'color:#94a3b8; font-size:13px;';
    plantaToggleContainer.appendChild(labelPlanta);

    ['TODAS', 'MLB', 'MMB', 'MJN'].forEach(p => {
        const btn = document.createElement('button');
        btn.textContent = p;
        btn.dataset.planta = p === 'TODAS' ? '' : p;
        btn.className = 'btn-filter btn-planta-toggle' + (p === 'TODAS' ? ' active' : '');
        btn.style.cssText = 'padding:4px 12px; font-size:12px;';
        btn.addEventListener('click', () => {
            document.querySelectorAll('.btn-planta-toggle').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            plantaSelecionada = btn.dataset.planta || null;
            if (btnOperadores.classList.contains('active')) carregarHierarquiaOperadores();
        });
        plantaToggleContainer.appendChild(btn);
    });

    const filterGroup = document.querySelector('.filter-group-main');
    if (filterGroup) filterGroup.appendChild(plantaToggleContainer);

    // ─── Botão Voltar (drilldown) ─────────────────────────────────────────────
    let drilldownState = { nivel: 'planta', filtroPlanta: null, filtroSetor: null, filtroLinha: null, history: [] };
    const backButton = document.createElement('button');
    backButton.innerHTML = '<i class="fas fa-arrow-left"></i> Voltar';
    backButton.className = 'btn-filter btn-back';
    backButton.style.display = 'none';
    if (filterGroup) filterGroup.prepend(backButton);

    // ─── Troca de view ────────────────────────────────────────────────────────
    btnGraficos.addEventListener('click', () => {
        btnGraficos.classList.add('active'); btnOperadores.classList.remove('active');
        viewCharts.style.display = 'grid'; viewOperators.style.display = 'none';
        chartBarras.resize(); chartPizza.resize(); chartDiario.resize();
    });
    btnOperadores.addEventListener('click', () => {
        btnOperadores.classList.add('active'); btnGraficos.classList.remove('active');
        viewCharts.style.display = 'none'; viewOperators.style.display = 'block';
        carregarHierarquiaOperadores();
    });

    // ─── Helpers ──────────────────────────────────────────────────────────────
    const getTitle = (chartType) => {
        const maquinaNome = drilldownState.filtroLinha ? drilldownState.filtroLinha.replace(/_/g, ' & ') : '';
        if (chartType === 'bar') {
            if (drilldownState.nivel === 'planta')  return 'Total Horas por Planta';
            if (drilldownState.nivel === 'setor')   return `Total Horas por Setor (${drilldownState.filtroPlanta})`;
            if (drilldownState.nivel === 'maquina') return `Total Horas por Máquina (${drilldownState.filtroSetor})`;
            if (drilldownState.nivel === 'turno')   return `Total Horas por Turno (${maquinaNome})`;
        }
        if (chartType === 'pie')    return `Top 5 Piores (${drilldownState.nivel}s)`;
        if (chartType === 'diario') return 'Detalhamento por Dia';
        return '';
    };

    const formatarLabelData = (value) => {
        const date = new Date(value + 'T00:00:00');
        const dow = date.getDay();
        const diaSemana = date.toLocaleDateString('pt-BR', { weekday: 'short' }).toUpperCase().replace('.', '');
        const dia = date.toLocaleDateString('pt-BR', { day: '2-digit' });
        const mes = date.toLocaleDateString('pt-BR', { month: 'short' }).toUpperCase().replace('.', '');
        const ano = date.getFullYear();
        const base = `{diaMes|${dia}-${mes}}\n{diaSemana|${diaSemana}}\n{ano|${ano}}`;
        const fds  = `{diaMesFds|${dia}-${mes}}\n{diaSemanaFds|${diaSemana}}\n{anoFds|${ano}}`;
        return (dow === 0 || dow === 6) ? fds : base;
    };

    const calcularLinhaTendenciaLinear = (data) => {
        const n = data.length;
        if (n < 2) return new Array(n).fill(null);
        let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
        data.forEach((y, i) => { sumX += i; sumY += y; sumXY += i * y; sumX2 += i * i; });
        const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;
        return data.map((_, i) => (slope * i + intercept > 0 ? (slope * i + intercept).toFixed(2) : 0));
    };

    const corPorHoras = (horas) => {
        if (horas >= 7.5) return '#4ade80';
        if (horas >= 4)   return '#facc15';
        return '#f87171';
    };

    // Formata "X.XXh / 8h (YY%)" com cor
    const formatarHorasPct = (horas, base = 8) => {
        const pct = Math.min((horas / base) * 100, 999).toFixed(1);
        const cor = corPorHoras(horas);
        return `<span style="color:${cor};">${horas.toFixed(2)}h / ${base}h</span> <span style="color:${cor}; opacity:0.75; font-size:10px;">(${pct}%)</span>`;
    };

    // Formata total do período com média por dia
    const formatarPeriodoPct = (totalHoras, numDias) => {
        const mediaDia = totalHoras / (numDias || 1);
        const pct = Math.min((mediaDia / 8) * 100, 999).toFixed(1);
        const cor = corPorHoras(mediaDia);
        return `<span style="color:${cor};">${totalHoras.toFixed(2)}h no período (${numDias} dia(s))</span> <span style="color:${cor}; opacity:0.75; font-size:10px;">(média ${pct}%/dia)</span>`;
    };

    // ─── Gráficos ─────────────────────────────────────────────────────────────
    const carregarGraficos = async () => {
        const startDate = startDatePicker.selectedDates[0]?.toISOString().split('T')[0];
        const endDate   = endDatePicker.selectedDates[0]?.toISOString().split('T')[0];
        if (!startDate || !endDate) return;
        const params = new URLSearchParams({ startDate, endDate, nivel: drilldownState.nivel });
        if (drilldownState.filtroPlanta) params.append('filtroPlanta', drilldownState.filtroPlanta);
        if (drilldownState.filtroSetor)  params.append('filtroSetor',  drilldownState.filtroSetor);
        if (drilldownState.filtroLinha)  params.append('filtroLinha',  drilldownState.filtroLinha);
        try {
            const loadingOpts = { text: '', showSpinner: true, textColor: '#FFF', maskColor: 'rgba(30,41,59,0.8)' };
            chartBarras.showLoading(loadingOpts); chartPizza.showLoading(loadingOpts); chartDiario.showLoading(loadingOpts);
            const response = await fetch(`${API_BASE_URL}/indicadores/fabrica?${params.toString()}`);
            const data = await response.json();
            chartBarras.hideLoading(); chartPizza.hideLoading(); chartDiario.hideLoading();

            const fontFamily   = 'Segoe UI, Roboto, sans-serif';
            const colorPalette = ['#5470c6','#91cc75','#fac858','#ee6666','#73c0de','#3ba272','#fc8452','#9a60b4','#ea7ccc'];
            const colorMap     = {};
            [...new Set(data.graficoBarras.labels)].forEach((l, i) => colorMap[l] = colorPalette[i % colorPalette.length]);

            chartBarras.setOption({
                title:   { text: getTitle('bar'), left: 'center', textStyle: { color: '#f8fafc', fontFamily, fontWeight: 'normal' } },
                tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, valueFormatter: v => v + ' h' },
                xAxis:   { type: 'category', data: data.graficoBarras.labels, axisLabel: { interval: 0, rotate: 30, color: '#94a3b8', fontFamily } },
                yAxis:   { type: 'value', min: 0, axisLabel: { color: '#94a3b8', formatter: '{value} h', fontFamily } },
                series:  [{ type: 'bar', data: data.graficoBarras.data.map((value, i) => ({ value, sigla: data.graficoBarras.siglas[i] || null, itemStyle: { color: colorMap[data.graficoBarras.labels[i]] || '#ccc' } })), label: { show: true, position: 'top', formatter: '{c}h', color: '#f8fafc', fontFamily, fontSize: 11 } }]
            }, true);

            chartPizza.setOption({
                title:   { text: getTitle('pie'), left: 'center', textStyle: { color: '#f8fafc', fontSize: 16, fontFamily, fontWeight: 'normal' } },
                tooltip: { trigger: 'item', formatter: '{b}<br/>{c}h ({d}%)' },
                legend:  { show: false },
                color:   data.top5Piores.map(item => colorMap[item.name] || '#ccc'),
                series:  [{ name: 'Horas', type: 'pie', radius: ['40%','65%'], roseType: 'radius', data: data.top5Piores, itemStyle: { borderRadius: 8, borderColor: '#1e293b', borderWidth: 2 }, label: { show: true, color: '#f8fafc', fontFamily, formatter: '{b}\n{d}%' } }]
            }, true);

            const dailyTotals   = data.graficoDiario.labels.map((_, i) => data.graficoDiario.series.reduce((sum, s) => sum + parseFloat(s.data[i] || 0), 0));
            const tendenciaData = calcularLinhaTendenciaLinear(dailyTotals);
            const seriesDiarias = data.graficoDiario.series.map(s => ({
                ...s, type: 'bar', stack: 'total',
                label: { show: true, position: 'inside', formatter: p => parseFloat(p.value) > 1 ? parseFloat(p.value).toFixed(1) + 'h' : '', color: '#fff', fontFamily, fontSize: 10, fontWeight: 'bold' }
            }));
            seriesDiarias.push({ name: 'Linha de Tendência (Linear)', type: 'line', data: tendenciaData, smooth: false, symbol: 'none', lineStyle: { color: '#ffffff', width: 2, type: 'dashed' }, z: 10 });

            chartDiario.setOption({
                color:    [...data.graficoDiario.series.map(s => colorMap[s.name] || '#ccc'), '#ffffff'],
                title:    { text: getTitle('diario'), left: 'center', textStyle: { color: '#f8fafc', fontFamily } },
                tooltip:  { trigger: 'axis', axisPointer: { type: 'shadow' } },
                legend:   { show: true, top: '6%', right: '4%', textStyle: { color: '#f8fafc' } },
                grid:     { left: '3%', right: '4%', bottom: '18%', containLabel: true },
                xAxis:    { type: 'category', data: data.graficoDiario.labels, axisLabel: { interval: 0, color: '#94a3b8', fontFamily, formatter: formatarLabelData, rich: { diaMes: { fontSize: 11, fontWeight: 'bold' }, diaSemana: { fontSize: 10, paddingTop: 2 }, ano: { fontSize: 10, paddingTop: 2 }, diaMesFds: { fontSize: 11, fontWeight: 'bold', color: '#ef4444' } } } },
                yAxis:    { type: 'value', axisLabel: { color: '#94a3b8', formatter: '{value} h' } },
                dataZoom: [{ type: 'slider', bottom: '2%', height: 20 }],
                series:   seriesDiarias
            }, true);
        } catch (e) { console.error(e); }
    };

    // ─── Hierarquia: Planta > Operador > Dia > TurnoOperador > Sessões ────────
    const carregarHierarquiaOperadores = async () => {
        const content   = document.getElementById('hierarchy-list-content');
        const startDate = startDatePicker.selectedDates[0]?.toISOString().split('T')[0];
        const endDate   = endDatePicker.selectedDates[0]?.toISOString().split('T')[0];
        if (!startDate || !endDate) {
            content.innerHTML = '<p style="padding:20px;color:#94a3b8;">Selecione o período e clique em Aplicar.</p>';
            return;
        }
        content.innerHTML = '<p style="padding:20px;color:#94a3b8;"><i class="fas fa-spinner fa-spin"></i> Carregando logs...</p>';
        try {
            const params = new URLSearchParams({ startDate, endDate });
            if (plantaSelecionada) params.append('plantaFiltro', plantaSelecionada);
            const res = await fetch(`${API_BASE_URL}/indicadores/operadores-detalhado?${params.toString()}`);
            if (!res.ok) throw new Error(`Erro ${res.status} — Reinicie o servidor`);
            const data = await res.json();

            if (!data.length) {
                content.innerHTML = '<p style="padding:20px;color:#94a3b8;">Sem dados para o período/planta selecionados.</p>';
                return;
            }

            let html = '';

            // ── NÍVEL 1: PLANTA ───────────────────────────────────────────────
            data.forEach(planta => {
                const plantaId = `planta-${planta.nome}`;
                html += `
                <div style="border-bottom:1px solid #334155;">
                    <div style="padding:12px 20px;background:#1e293b;color:#fff;cursor:pointer;display:flex;justify-content:space-between;align-items:center;"
                         onclick="toggleBlock('${plantaId}')">
                        <span><i class="fas fa-industry"></i>&nbsp; PLANTA: ${planta.nome}</span>
                        <span style="font-size:11px;color:#94a3b8;">${planta.operadores.length} Operadores</span>
                    </div>
                    <div id="${plantaId}" style="display:none;padding-left:20px;">`;

                // ── NÍVEL 2: OPERADOR ─────────────────────────────────────────
                planta.operadores.forEach((op, opIdx) => {
                    const opId       = `op-${planta.nome}-${opIdx}`;
                    const totalPer   = op.dias.reduce((s, d) => s + d.totalHorasDia, 0);
                    const numDias    = op.dias.length;
                    html += `
                    <div style="border-bottom:1px solid #1e293b;">
                        <div style="padding:10px 12px;color:#fff;cursor:pointer;display:flex;justify-content:space-between;align-items:center;"
                             onclick="toggleBlock('${opId}')">
                            <span><i class="fas fa-user-circle" style="color:#64748b;"></i>&nbsp; ${op.nome}</span>
                            <span style="font-size:11px;">${formatarPeriodoPct(totalPer, numDias)}</span>
                        </div>
                        <div id="${opId}" style="display:none;background:#0f172a;padding:0 0 8px 16px;">`;

                    // ── NÍVEL 3: DIA ──────────────────────────────────────────
                    op.dias.forEach((dia, diaIdx) => {
                        const diaId = `dia-${planta.nome}-${opIdx}-${diaIdx}`;
                        html += `
                        <div style="border-bottom:1px solid #1e293b;">
                            <div style="padding:8px 10px;color:#cbd5e1;cursor:pointer;display:flex;justify-content:space-between;align-items:center;"
                                 onclick="toggleBlock('${diaId}')">
                                <span><i class="fas fa-calendar-day" style="color:#475569;font-size:11px;"></i>&nbsp; ${dia.data}</span>
                                <span style="font-size:11px;">${formatarHorasPct(dia.totalHorasDia)}</span>
                            </div>
                            <div id="${diaId}" style="display:none;padding-left:12px;">`;

                        // ── NÍVEL 4: TURNO DO OPERADOR ────────────────────────
                        dia.turnos.forEach(turno => {
                            html += `
                            <div style="padding:6px 0;">
                                <div style="padding:5px 8px;color:#94a3b8;font-size:11px;font-weight:bold;text-transform:uppercase;letter-spacing:0.05em;">
                                    <i class="fas fa-clock" style="color:#475569;"></i>&nbsp;
                                    Turno Operador: <span style="color:#e2e8f0;">${turno.turno}</span>
                                    &mdash; ${formatarHorasPct(turno.totalHoras)}
                                </div>
                                <table style="width:100%;color:#cbd5e1;font-size:11px;border-collapse:collapse;margin-bottom:4px;">
                                    <thead>
                                        <tr style="color:#64748b;text-align:left;background:#0a1120;">
                                            <th style="padding:4px 8px;">Entrada</th>
                                            <th style="padding:4px 8px;">Saída</th>
                                            <th style="padding:4px 8px;">Máquina</th>
                                            <th style="padding:4px 8px;">Centro de Custo</th>
                                            <th style="padding:4px 8px;">Turno Operador</th>
                                            <th style="padding:4px 8px;">Turno Máquina</th>
                                            <th style="padding:4px 8px;">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${turno.sessoes.map(s => {
                                            const turnosIguais = s.turnoOperador === s.turnoMaquina;
                                            const corTurnoMaq  = turnosIguais ? '#94a3b8' : '#fb923c';
                                            const pctSessao    = Math.min((s.horas / 8) * 100, 999).toFixed(1);
                                            return `
                                            <tr style="border-top:1px solid #1e293b;">
                                                <td style="padding:3px 8px;">${s.entrada}</td>
                                                <td style="padding:3px 8px;">${s.saida}</td>
                                                <td style="padding:3px 8px;">${s.maquina}</td>
                                                <td style="padding:3px 8px;color:#7dd3fc;">${s.centroCusto}</td>
                                                <td style="padding:3px 8px;">${s.turnoOperador}</td>
                                                <td style="padding:3px 8px;color:${corTurnoMaq};">${s.turnoMaquina}</td>
                                                <td style="padding:3px 8px;color:${corPorHoras(s.horas)};">${s.horas.toFixed(2)}h <span style="opacity:0.65;font-size:10px;">(${pctSessao}%)</span></td>
                                            </tr>`;
                                        }).join('')}
                                    </tbody>
                                </table>
                            </div>`;
                        });

                        html += `</div></div>`; // fecha diaId
                    });

                    html += `</div></div>`; // fecha opId
                });

                html += `</div></div>`; // fecha plantaId
            });

            content.innerHTML = html;
        } catch (e) {
            content.innerHTML = `<p style="padding:20px;color:#f87171;">${e.message}</p>`;
        }
    };

    window.toggleBlock = (id) => {
        const el = document.getElementById(id);
        if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
    };

    // ─── Botão Aplicar ────────────────────────────────────────────────────────
    if (applyFilterBtn) {
        applyFilterBtn.addEventListener('click', () => {
            if (btnGraficos.classList.contains('active')) carregarGraficos();
            else carregarHierarquiaOperadores();
        });
    }

    // ─── Drilldown ────────────────────────────────────────────────────────────
    chartBarras.on('click', (params) => {
        if (drilldownState.nivel === 'turno') return;
        drilldownState.history.push(JSON.parse(JSON.stringify(drilldownState)));
        if (drilldownState.nivel === 'planta')       { drilldownState.nivel = 'setor';   drilldownState.filtroPlanta = params.data.sigla; }
        else if (drilldownState.nivel === 'setor')   { drilldownState.nivel = 'maquina'; drilldownState.filtroSetor  = params.name; }
        else if (drilldownState.nivel === 'maquina') { drilldownState.nivel = 'turno';   drilldownState.filtroLinha  = params.name.replace(/ & /g, '_'); }
        backButton.style.display = 'block';
        carregarGraficos();
    });

    backButton.addEventListener('click', () => {
        if (drilldownState.history.length > 0) {
            drilldownState = drilldownState.history.pop();
            if (drilldownState.history.length === 0) backButton.style.display = 'none';
            carregarGraficos();
        }
    });

    window.addEventListener('resize', () => { chartBarras.resize(); chartPizza.resize(); chartDiario.resize(); });

    const hoje       = new Date();
    const umMesAtras = new Date(new Date().setMonth(hoje.getMonth() - 1));
    startDatePicker.setDate(umMesAtras, false);
    endDatePicker.setDate(hoje, false);
    carregarGraficos();
}