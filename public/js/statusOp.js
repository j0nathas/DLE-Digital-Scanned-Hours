// agendador.js
const HORARIOS_PADRAO = ["06:15", "08:00", "14:15", "16:00", "22:15", "00:00"];

export function agendarOperadores(fn, maquinas, intervaloSeg = 30) {
    // Executa imediatamente
    console.log("Executando imediatamente ao carregar a tela");
    fn(maquinas);

    function checarHorarios() {
        const agora = new Date();
        const horaAtual = agora.toTimeString().slice(0, 5); // HH:MM

        if (HORARIOS_PADRAO.includes(horaAtual)) {
            console.log(`Executando carregarOperadores às ${horaAtual}`);
            fn(maquinas);
        }
    }

    setInterval(checarHorarios, intervaloSeg * 1000);
}
const turnos = {
    "1T": { inicio: "06:00", fim: "14:15" }, // Exemplo
    "2T": { inicio: "14:00", fim: "22:15" }, // Exemplo (ajuste conforme real)
    "3T": { inicio: "22:00", fim: "06:15" }  // Exemplo seu
};

// Converte HH:MM em objeto {h, m}
function horaParaHorasMinutos(horaStr) {
    const [h, m] = horaStr.split(':').map(Number);
    return { h, m };
}

export async function carregarOperadores(maquinas) {
    try {
        for (const maquina of maquinas) {
            console.log(maquina)
            const planta = (maquina.toUpperCase()).startsWith("J.") ? 'MJN' : 'MLB';
            const response = await fetch(`/api/apontamentos/operadores/${planta}/${maquina}`);
            if (!response.ok) throw new Error('Erro ao carregar operadores da máquina ' + maquina);

            const dadosArray = await response.json();
            const selector = `.lista-operadores-linha[data-lista="${maquina}"] ul.lista-operadores-linha-container`;
            const container = document.querySelector(selector);

            // Se não achar o container, pula para a próxima máquina
            if (!container) continue;

            container.innerHTML = '';
            const fragment = document.createDocumentFragment();

            dadosArray.forEach(item => {
                const li = document.createElement('li');
                li.classList.add('lista-operadores-linha-container-pessoa');

                const statusDiv = document.createElement('div');
                statusDiv.classList.add('status-pessoa');

                const pNome = document.createElement('p');
                pNome.classList.add('nome-pessoa');
                pNome.textContent = item.Pessoa;

                // -----------------------------------------------------------
                // 1. TRATAMENTO DE DATA (FUSO HORÁRIO)
                // -----------------------------------------------------------
                let dataLimpa = item.DataHoraEntrada;
                // Remove o 'Z' final para o JS não converter para o fuso local subtraindo 3h
                if (dataLimpa && dataLimpa.endsWith('Z')) {
                    dataLimpa = dataLimpa.slice(0, -1);
                }
                const horaEntrada = new Date(dataLimpa);
                const agora = new Date(); // Horário atual do sistema

                

                const turnoCadastro = (item.TurnoCadastro?.trim()).slice(0, 1) + 'T';
                const turnoApontado = (item.TurnoApontado?.trim()).slice(0, 1) + 'T';

                // -----------------------------------------------------------
                // 2. DEFINIÇÃO DOS LIMITES DO TURNO
                // -----------------------------------------------------------
                // Usamos o turno APONTADO para calcular se o horário está válido
                if (!turnos[turnoApontado]) {
                    console.error("Turno desconhecido:", turnoApontado);
                    statusDiv.classList.add('status-pessoa-vermelho');
                    li.appendChild(statusDiv);
                    li.appendChild(pNome);
                    fragment.appendChild(li);
                    return;
                }

                const { h: inicioH, m: inicioM } = horaParaHorasMinutos(turnos[turnoApontado].inicio);
                const { h: fimH, m: fimM } = horaParaHorasMinutos(turnos[turnoApontado].fim);

                // Define data inicial baseada na data que a pessoa bateu o ponto
                let inicioTurno = new Date(horaEntrada);
                inicioTurno.setHours(inicioH, inicioM, 0, 0);

                let fimTurno = new Date(inicioTurno);
                fimTurno.setHours(fimH, fimM, 0, 0);

                // AJUSTE 1: Virada de Dia (Ex: entra 22h, sai 06h)
                // Se o horário fim for menor que o início, significa que o fim é no dia seguinte
                if (fimTurno <= inicioTurno) {
                    fimTurno.setDate(fimTurno.getDate() + 1);
                }

                // AJUSTE 2: Entrada na Madrugada (Ex: Entrou 00:30 no turno das 22h)
                // Se a pessoa entrou às 00:30, a variável 'horaEntrada' é maior que a meia-noite.
                // Mas o 'inicioTurno' calculado acima ficou 00:30 -> setHours(22) -> 22:00 (do mesmo dia 00:30).
                // Isso cria uma data futura (22h da noite de hoje). A entrada (00:30) é menor que o início (22h).
                // Logo, recuamos 1 dia nas referências para entender que o turno começou ontem.
                if (horaEntrada < inicioTurno) {
                    inicioTurno.setDate(inicioTurno.getDate() - 1);
                    fimTurno.setDate(fimTurno.getDate() - 1);
                }

                // Define o limite amarelo (Fim + 2 Horas)
                const limiteAmarelo = new Date(fimTurno);
                limiteAmarelo.setHours(limiteAmarelo.getHours() + 2);

                // -----------------------------------------------------------
                // 3. LÓGICA DE CORES (STATUS)
                // -----------------------------------------------------------
                let classeStatus = '';

                // REGRA 1: Se apontou no turno incorreto (Diferente do cadastro) -> VERMELHO
                if (turnoApontado !== turnoCadastro) {
                    classeStatus = 'status-pessoa-vermelho';
                }
                // REGRA 2: Se está dentro do horário de expediente (Verde)
                // Nota: Usamos <= fimTurno. Enquanto não deu a hora exata da saída, é verde.
                else if (agora <= fimTurno) {
                    classeStatus = ''; // Verde (Sem classe ou classe padrão)
                }
                // REGRA 3: Se passou do fim, mas está dentro da tolerância de 2h -> AMARELO
                else if (agora > fimTurno && agora <= limiteAmarelo) {
                    classeStatus = 'status-pessoa-amarelo';
                }
                // REGRA 4: Passou das 2h de tolerância -> VERMELHO
                else {
                    classeStatus = 'status-pessoa-vermelho';
                }

                // Aplica a classe
                if (classeStatus) {
                    statusDiv.classList.add(classeStatus);
                }

                li.appendChild(statusDiv);
                li.appendChild(pNome);
                fragment.appendChild(li);
            });

            container.appendChild(fragment);
        }
    } catch (err) {
        console.error("ERRO EM carregarOperadores:", err);
    }
}
