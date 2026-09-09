if (!window.gestaoState) { window.gestaoState = { intervalId: null, isLoading: false }; }

function estaNoTurnoCorreto(turnoCadastrado) {
    if (!turnoCadastrado) return true;
    const agora = new Date();
    const min = agora.getHours() * 60 + agora.getMinutes();
    const turnos = { '1º Turno': { ini: 375, fim: 855 }, '2º Turno': { ini: 855, fim: 1335 }, '3º Turno': { ini: 1335, fim: 375 } };
    const f = turnos[turnoCadastrado.trim()];
    if (!f) return true;
    return f.ini < f.fim ? (min >= f.ini && min < f.fim) : (min >= f.ini || min < f.fim);
}

function limparGestao() { if (window.gestaoState.intervalId) clearInterval(window.gestaoState.intervalId); window.gestaoState.isLoading = false; }

document.addEventListener('click', (e) => {
    if (e.target.id === 'modal-close-btn' || e.target.id === 'operator-modal-overlay' || e.target.classList.contains('close-modal')) {
        document.getElementById('operator-modal-overlay').classList.remove('visible');
    }
});

async function iniciarGestao() {
    const container = document.getElementById('dashboard-container');
    if (!container || window.gestaoState.isLoading) return;
    window.gestaoState.isLoading = true; limparGestao();
    const PLANTA = localStorage.getItem('plantaSelecionada') || 'MLB';
    const API = '/api/gestao';

    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.tab-btn, .tab-content').forEach(el => el.classList.remove('active'));
            btn.classList.add('active'); document.getElementById(btn.dataset.tab).classList.add('active');
        };
    });

    const getValor = (cardName, datasource, extractor) => {
        const partes = cardName.split(/[&_]/).filter(Boolean).map(s => s.trim().toLowerCase());
        const alvos = new Set([cardName.toLowerCase(), cardName.replace(/_/g, ' & ').toLowerCase(), ...partes]);
        let valores = [];
        for (const [key, val] of Object.entries(datasource)) { if (alvos.has(key.toLowerCase())) valores.push(extractor(val) || 0); }
        if (valores.length === 0) return null;
        return (cardName.includes('_') || cardName.includes('&')) ? Math.max(...valores) : valores.reduce((a, b) => a + b, 0);
    };

    const fetchAndUpdate = async () => {
        if (!document.getElementById('dashboard-container')) { limparGestao(); return; }
        const hoje = new Date().toISOString().slice(0, 10);
        try {
            const [rDle, rEga, rCad] = await Promise.allSettled([fetch(`${API}/contagem/${PLANTA}?date=${hoje}`), fetch(`${API}/contagem-ega`), fetch(`${API}/cadastro-operadores`)]);
            const dDle = rDle.status === 'fulfilled' ? await rDle.value.json() : {};
            const dEga = rEga.status === 'fulfilled' ? await rEga.value.json() : {};
            const dCad = rCad.status === 'fulfilled' ? await rCad.value.json() : {};

            document.querySelectorAll('.card[data-machine]').forEach(card => {
                const mId = card.dataset.machine;
                const x = getValor(mId, dEga, v => v); const y = getValor(mId, dDle, v => v.atual); const z = getValor(mId, dCad, v => v);
                card.querySelector('.numero').innerHTML = `<span>${x??'—'}</span> <small>x</small> <span>${y??'—'}</span> <span class="z-menor"> x ${z??'—'}</span>`;
                card.classList.remove('card-ok', 'card-attention', 'card-info', 'card-error', 'card-neutral');
                if (x === null && y === null) card.classList.add('card-neutral');
                else if (x === null || y === null) card.classList.add('card-error');
                else if (x === y) card.classList.add('card-ok');
                else if (x < y) card.classList.add('card-attention');
                else card.classList.add('card-info');
            });
            document.querySelectorAll('.machine-group').forEach(group => {
                let sEga = 0, sDle = 0, sCad = 0;
                group.querySelectorAll('.card').forEach(c => {
                    const m = c.dataset.machine;
                    sEga += getValor(m, dEga, v => v) || 0; sDle += getValor(m, dDle, v => v.atual) || 0; sCad += getValor(m, dCad, v => v) || 0;
                });
                const total = group.querySelector('.numero-total'); if (total) total.innerHTML = `${sEga} x ${sDle} <small>x ${sCad}</small>`;
            });
            document.getElementById('last-update').textContent = `Sincronizado: ${new Date().toLocaleTimeString('pt-BR')}`;
        } catch (err) { console.error(err); }
    };

    container.onclick = async (e) => {
        const card = e.target.closest('.card'); if (!card) return;
        const overlay = document.getElementById('operator-modal-overlay');
        const tabDle = document.getElementById('tab-dle'); const tabEga = document.getElementById('tab-ega');
        document.getElementById('modal-title').textContent = `Máquina: ${card.dataset.machine}`;
        tabDle.innerHTML = '<div class="spinner"></div>'; tabEga.innerHTML = '<div class="spinner"></div>';
        overlay.classList.add('visible');
        try {
            const mId = encodeURIComponent(card.dataset.machine);
            const res = await fetch(`${API}/detalhes/${PLANTA}/${mId}`);
            const data = await res.json();
            // --- DATA BRASILEIRA AQUI ---
            tabDle.innerHTML = data.dle.length ? `<table><thead><tr><th>Operador</th><th>Turnos</th><th>Entrada / Última Saída</th><th>Status</th></tr></thead><tbody>${data.dle.map(o => `<tr><td><strong>${o.Pessoa}</strong><br><small>RE: ${o.RE || 'N/D'}</small></td><td><small>CAD: ${o.TurnoCadastro || 'S/T'}</small><br><small>APONT: ${o.TurnoApontado}</small></td><td>${new Date(o.DataHoraEntrada).toLocaleTimeString('pt-BR')}<br><small style="color:#8b949e">Saída Ant: ${o.UltimaSaida ? new Date(o.UltimaSaida).toLocaleString('pt-BR') : 'N/D'}</small></td><td><span class="badge-turno ${estaNoTurnoCorreto(o.TurnoCadastro) ? 'turno-ok' : 'turno-err'}">${estaNoTurnoCorreto(o.TurnoCadastro) ? 'NO TURNO' : 'FORA TURNO'}</span></td></tr>`).join('')}</tbody></table>` : '<p style="text-align:center; padding:20px;">Nenhum operador logado via DLE.</p>';
            tabEga.innerHTML = data.ega.length ? `<table><thead><tr><th>Operador (Hardware)</th><th>Início EGA</th></tr></thead><tbody>${data.ega.map(o => `<tr><td><strong>${o.Pessoa}</strong></td><td>${new Date(o.DataHoraEntrada).toLocaleString('pt-BR')}</td></tr>`).join('')}</tbody></table>` : `<div style="text-align:center; padding:40px;"><p>Sensores detectados:</p><h2 style="font-size:3rem; color:#58a6ff">${card.querySelector('.numero span:first-child').textContent}</h2></div>`;
        } catch (err) { tabDle.innerHTML = 'Erro ao carregar.'; }
    };

    const initLayout = async () => {
        try {
            const resp = await fetch(`${API}/layout/${PLANTA}`);
            const layout = await resp.json();
            container.innerHTML = ''; const fragment = document.createDocumentFragment();
            Object.entries(layout).forEach(([setor, maquinas]) => {
                const sec = document.createElement('section'); sec.className = 'machine-group';
                sec.innerHTML = `<div class="group-title"><span class="sector-name">${setor}</span><div class="sector-total"><span class="numero-total">0 x 0 x 0</span></div></div><div class="card-grid">${maquinas.map(n => `<div class="card" data-machine="${n}"><h3>${n.replace(/_/g, ' &<br>')}</h3><div class="op-count-box"><span class="numero">— x — x —</span><span class="texto">EGA x DLE x Cadastro</span></div></div>`).join('')}</div>`;
                fragment.appendChild(sec);
            });
            container.appendChild(fragment); await fetchAndUpdate();
            window.gestaoState.intervalId = setInterval(fetchAndUpdate, 10000);
        } catch (err) { console.error(err); } finally { window.gestaoState.isLoading = false; }
    };
    initLayout();
}
iniciarGestao();