let gestaoRefreshIntervalId = null;

function limparGestao() {
    if (gestaoRefreshIntervalId) {
        clearInterval(gestaoRefreshIntervalId);
        gestaoRefreshIntervalId = null;
    }
}

function iniciarGestao() {
    const dashboardContainer = document.getElementById('dashboard-container');
    if (!dashboardContainer) return;

    const PLANTA_SIGLA = localStorage.getItem('plantaSelecionada');
    if (!PLANTA_SIGLA) {
        window.location.hash = '#selecao';
        return;
    }

    const API_BASE_URL = 'http://10.109.132.135:3001/api/planta';
    const API_GESTAO_URL = 'http://10.109.132.135:3001/api/gestao';
    const LAYOUT_API_URL = `${API_BASE_URL}/maquinas/${PLANTA_SIGLA}`;
    const REFRESH_INTERVAL = 5000;

    const createMachineCardHTML = (machineName) => {
        const displayName = machineName.replace(' & ', ' &<br>');
        return `
            <div class="card" data-machine="${machineName}">
                <h3>${displayName}</h3>
                <div class="op-count-box">
                    <span class="numero">0 / 0</span>
                    <span class="texto">Operadores</span>
                </div>
            </div>`;
    };

    const addModalEvents = () => {
        const modalOverlay = document.getElementById('operator-modal-overlay');
        const modalTitle = document.getElementById('modal-title');
        const modalBody = document.getElementById('modal-body');
        const closeModalBtn = document.getElementById('modal-close-btn');

        if (!modalOverlay || !modalTitle || !modalBody || !closeModalBtn) return;

        let activeCard = null;

        const horariosTurnos = {
            'MLB': {
                'default': { '1º Turno': { inicio: '06:15', fim: '14:15' }, '2º Turno': { inicio: '14:15', fim: '22:15' }, '3º Turno': { inicio: '22:15', fim: '06:15' } }
            },
            'MMB': {
                'injecao': { '1º Turno': { inicio: '05:00', fim: '14:48' }, '2º Turno': { inicio: '14:48', fim: '23:00' }, '3º Turno': { inicio: '23:00', fim: '05:00' } },
                'montagem': { '1º Turno': { inicio: '05:00', fim: '14:48' }, '2º Turno': { inicio: '14:48', fim: '00:13' }, '3º Turno': { inicio: '00:13', fim: '05:00' } },
                'default': { '1º Turno': { inicio: '05:00', fim: '14:48' }, '2º Turno': { inicio: '14:48', fim: '00:13' }, '3º Turno': { inicio: '00:13', fim: '05:00' } }
            },
            'DEFAULT': {
                'default': { '1º Turno': { inicio: '06:00', fim: '15:00' }, '2º Turno': { inicio: '15:00', fim: '23:00' }, '3º Turno': { inicio: '23:00', fim: '06:00' } }
            }
        };

        const getMachineTypeFromSector = (sectorName) => {
            const lowerSector = sectorName.toLowerCase();
            if (lowerSector.includes('injeção')) return 'injecao';
            if (lowerSector.includes('montagem')) return 'montagem';
            return 'default';
        };

        const getOperatorStatus = (operador, planta, sectorName) => {
            if (!operador.TurnoApontado || !operador.DataHoraEntrada) return { class: 'status-gray', title: 'Dados insuficientes.' };
            if (operador.TurnoCadastro && operador.TurnoApontado !== operador.TurnoCadastro) return { class: 'status-red', title: `Fora do turno (Correto: ${operador.TurnoCadastro})` };
            const machineType = getMachineTypeFromSector(sectorName);
            const plantaConfig = horariosTurnos[planta] || horariosTurnos['DEFAULT'];
            const horariosDoSetor = plantaConfig[machineType] || plantaConfig['default'];
            const turnoInfo = horariosDoSetor[operador.TurnoApontado];
            if (!turnoInfo) return { class: 'status-gray', title: 'Horários não configurados.' };
            const agora = new Date();
            const horaAtual = agora.getHours() * 60 + agora.getMinutes();
            const [inicioH, inicioM] = turnoInfo.inicio.split(':').map(Number);
            const [fimH, fimM] = turnoInfo.fim.split(':').map(Number);
            const inicioTurnoMin = inicioH * 60 + inicioM;
            const fimTurnoMin = fimH * 60 + fimM;
            const fimTurnoHEMin = fimTurnoMin + 120;
            const turnoAtravessaMeiaNoite = inicioTurnoMin > fimTurnoMin;
            let dentroDoTurno = false, dentroDaHE = false;
            if (turnoAtravessaMeiaNoite) {
                dentroDoTurno = (horaAtual >= inicioTurnoMin) || (horaAtual < fimTurnoMin);
                const fimHECorrigido = fimTurnoHEMin % 1440;
                if (fimTurnoMin < fimHECorrigido) {
                    dentroDaHE = horaAtual >= fimTurnoMin && horaAtual < fimHECorrigido;
                } else {
                    dentroDaHE = (horaAtual >= fimTurnoMin) || (horaAtual < fimHECorrigido);
                }
            } else {
                dentroDoTurno = horaAtual >= inicioTurnoMin && horaAtual < fimTurnoMin;
                dentroDaHE = horaAtual >= fimTurnoMin && horaAtual < fimTurnoHEMin;
            }
            if (dentroDoTurno) return { class: 'status-green', title: 'Dentro do turno' };
            if (dentroDaHE) return { class: 'status-yellow', title: 'Dentro do limite de HE' };
            return { class: 'status-red', title: 'Fora do turno' };
        };

        const formatDateTime = (dateTimeString) => {
            if (!dateTimeString) return null;
            const date = new Date(dateTimeString.endsWith('Z') ? dateTimeString.slice(0, -1) : dateTimeString);
            const today = new Date();
            const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
            const dia = String(date.getDate()).padStart(2, '0');
            const mes = meses[date.getMonth()];
            const time = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            const isToday = date.toDateString() === today.toDateString();
            return isToday ? time : `${dia}-${mes} ${time}`;
        };

        const showModal = async (card) => {
            if (activeCard === card) { hideModal(); return; }
            activeCard = card;

            const machineIdForDisplay = card.dataset.machine;
            const sectorElement = card.closest('.machine-group')?.querySelector('.sector-name');
            const sectorName = sectorElement ? sectorElement.textContent : '';
            const machineIdForApi = machineIdForDisplay.replace(/ & /g, '_');

            modalTitle.textContent = `Operadores em ${machineIdForDisplay.replace(' & ', ' e ')}`;
            modalBody.innerHTML = 'Carregando...';
            modalOverlay.classList.add('visible');

            try {
                const fetchUrl = `${API_GESTAO_URL}/detalhes/${PLANTA_SIGLA}/${encodeURIComponent(machineIdForApi)}`;

                const response = await fetch(fetchUrl);

                if (!response.ok) {
                    const errText = await response.text();
                    throw new Error(`API Error: ${response.status}`);
                }
                const operadores = await response.json();

                if (activeCard !== card) return;

                if (operadores.length > 0) {
                    let tableHTML = `
                        <div class="modal-legend">
                            <span class="legend-item"><span class="status-indicator status-green"></span> Dentro do turno</span>
                            <span class="legend-item"><span class="status-indicator status-yellow"></span> Limite de HE</span>
                            <span class="legend-item"><span class="status-indicator status-red"></span> Fora do turno</span>
                        </div>
                        <table>
                            <thead>
                                <tr>
                                    <th style="width: 5%;">Status</th>
                                    <th>Nome</th>
                                    <th>Crachá</th>
                                    <th>Turno Apontado</th>
                                    <th>Entrada / Última Saída</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${operadores.map(op => {
                                    const status = getOperatorStatus(op, PLANTA_SIGLA, sectorName);
                                    const entradaFormatada = formatDateTime(op.DataHoraEntrada);
                                    const saidaFormatada = formatDateTime(op.DataHoraSaida);
                                    const textoSaida = saidaFormatada ? ` / <span style="color:var(--text-secondary);">${saidaFormatada}</span>` : '';
                                    return `
                                        <tr>
                                            <td><span class="status-indicator ${status.class}" title="${status.title}"></span></td>
                                            <td>${op.Pessoa}</td>
                                            <td>${op.Cracha || '-'}</td>
                                            <td>${op.TurnoApontado || '-'}</td>
                                            <td>${entradaFormatada || '-'}${textoSaida}</td>
                                        </tr>`;
                                }).join('')}
                            </tbody>
                        </table>`;
                    modalBody.innerHTML = tableHTML;
                } else {
                    modalBody.innerHTML = '<p>Nenhum operador logado.</p>';
                }
            } catch (error) {
                console.error(`Erro no fetch do modal para ${machineIdForDisplay}:`, error);
                if (activeCard === card) {
                    modalBody.innerHTML = '<p>Erro de conexão ao buscar dados.</p>';
                }
            }
        };

        const hideModal = () => {
            modalOverlay.classList.remove('visible');
            activeCard = null;
        };

        document.querySelectorAll('.card[data-machine]').forEach(card => {
            card.addEventListener('click', (event) => {
                event.stopPropagation();
                showModal(card);
            });
        });

        document.addEventListener('click', (event) => {
            if (!event.target.closest('.card') && !event.target.closest('#operator-modal-overlay')) {
                hideModal();
            }
        });

        closeModalBtn.addEventListener('click', hideModal);
        modalOverlay.addEventListener('click', (event) => {
            if (event.target === modalOverlay) {
                hideModal();
            }
        });
    };

    const buildLayout = (layoutData) => {
        dashboardContainer.innerHTML = '';
        Object.keys(layoutData).forEach(sectorName => {
            const machines = layoutData[sectorName];
            const groupSection = document.createElement('section');
            groupSection.className = 'machine-group';
            const cardsHTML = machines.map(createMachineCardHTML).join('');
            groupSection.innerHTML = `<div class="group-title"><span class="sector-name">${sectorName}</span><div class="sector-total"><span class="numero-total">0 / 0</span></div></div><div class="card-grid">${cardsHTML}</div>`;
            dashboardContainer.appendChild(groupSection);
        });
        addModalEvents();
    };

    const fetchAndUpdateCounts = async () => {
        const dataAtualFormatada = new Date().toISOString().slice(0, 10);
        const COUNTS_API_URL = `${API_GESTAO_URL}/contagem/${PLANTA_SIGLA}?date=${dataAtualFormatada}`;
        
        // Função auxiliar para garantir que "Nome & Nome" e "Nome_Nome" sejam lidos como a mesma coisa
        const normalize = (name) => name.toLowerCase().replace(/\s*&\s*/g, '_').trim();

        try {
            const response = await fetch(COUNTS_API_URL);
            if (!response.ok) throw new Error('Falha ao buscar dados dos contadores');
            const activeOperatorsData = await response.json();
            
            // 1. Reseta todos os cards para 0 antes de aplicar os novos dados
            document.querySelectorAll('.card[data-machine]').forEach(card => {
                const numberElement = card.querySelector('.numero');
                if (numberElement) numberElement.innerHTML = `0<span class="meta-display"> / 0</span>`;
                card.classList.remove('card-ok', 'card-attention', 'card-excess');
                card.querySelector('.op-count-box')?.classList.remove('card-ok', 'card-attention', 'card-excess');
            });

            // 2. Monta índice dos cards do DOM usando a chave NORMALIZADA
            const cardMap = {};
            document.querySelectorAll('.card[data-machine]').forEach(card => {
                const normKey = normalize(card.dataset.machine);
                cardMap[normKey] = card;
            });

            // 3. Atualiza cada card usando lookup normalizado
            for (const machineName in activeOperatorsData) {
                const normKey = normalize(machineName);
                const card = cardMap[normKey];

                if (card) {
                    const data = activeOperatorsData[machineName];
                    const countBox = card.querySelector('.op-count-box');
                    const numberElement = countBox.querySelector('.numero');
                    
                    numberElement.innerHTML = `${data.atual}<span class="meta-display"> / ${data.meta}</span>`;
                    
                    if (data.meta > 0) {
                        if (data.atual > data.meta) {
                            countBox.classList.add('card-excess');
                            card.classList.add('card-excess');
                        } else if (data.atual === data.meta) {
                            countBox.classList.add('card-ok');
                            card.classList.add('card-ok');
                        } else {
                            countBox.classList.add('card-attention');
                            card.classList.add('card-attention');
                        }
                    }
                }
            }

            // 4. Atualiza totais por setor usando a mesma lógica de normalização
            document.querySelectorAll('.machine-group').forEach(group => {
                let totalAtual = 0, totalMeta = 0;
                
                group.querySelectorAll('.card').forEach(card => {
                    const normCardKey = normalize(card.dataset.machine);
                    
                    // Procura nos dados do banco se existe uma chave que, normalizada, bate com o card
                    const entry = Object.entries(activeOperatorsData).find(([dbKey]) => normalize(dbKey) === normCardKey);
                    
                    if (entry) {
                        const data = entry[1];
                        totalAtual += data.atual;
                        totalMeta += data.meta;
                    }
                });

                const titleElement = group.querySelector('.group-title');
                const totalElement = titleElement.querySelector('.sector-total .numero-total');
                
                titleElement.classList.remove('card-ok', 'card-attention', 'card-excess');
                totalElement.innerHTML = `${totalAtual} / ${totalMeta}`;
                
                if (totalMeta > 0) {
                    if (totalAtual > totalMeta) titleElement.classList.add('card-excess');
                    else if (totalAtual === totalMeta) titleElement.classList.add('card-ok');
                    else titleElement.classList.add('card-attention');
                }
            });

        } catch (error) {
            console.error("Erro ao atualizar contadores:", error.message);
        }
    };

    const initializeDashboard = async () => {
        try {
            const layoutResponse = await fetch(LAYOUT_API_URL);
            if (!layoutResponse.ok) throw new Error('Falha ao carregar layout');
            const layoutData = await layoutResponse.json();
            buildLayout(layoutData);
            await fetchAndUpdateCounts();
            limparGestao();
            gestaoRefreshIntervalId = setInterval(fetchAndUpdateCounts, REFRESH_INTERVAL);
        } catch (error) {
            dashboardContainer.innerHTML = `<p class="error-message" style="color: #ef4444; text-align: center;">${error.message}</p>`;
        }
    };

    initializeDashboard();
}