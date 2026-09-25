// agendador.js
const HORARIOS_PADRAO = ["06:15", "08:00", "14:15", "16:00", "22:15", "00:00"];

const TURNOS = {
    "1T": { inicio: "06:00", fim: "14:15" },
    "2T": { inicio: "14:00", fim: "22:15" },
    "3T": { inicio: "22:00", fim: "06:15" },
};

const TOLERANCIA_HORAS = 2;
const PREFIXO_PLANTA_MJN = "J.";

function horaParaMinutos(horaStr) {
    const [h, m] = horaStr.split(":").map(Number);
    return h * 60 + m;
}

function calcularProximoAgendamento(agora = new Date()) {
    const minutosAgora = agora.getHours() * 60 + agora.getMinutes();
    const jaPassouEsteMinuto = agora.getSeconds() > 0;

    const horariosOrdenados = [...HORARIOS_PADRAO].map(horaParaMinutos).sort((a, b) => a - b);

    let proximoMin = horariosOrdenados.find((m) =>
        jaPassouEsteMinuto ? m > minutosAgora : m >= minutosAgora
    );

    let somarDias = 0;
    if (proximoMin === undefined) {
        proximoMin = horariosOrdenados[0];
        somarDias = 1;
    }

    const alvo = new Date(agora);
    alvo.setDate(alvo.getDate() + somarDias);
    alvo.setHours(Math.floor(proximoMin / 60), proximoMin % 60, 0, 0);

    return alvo;
}

export function agendarOperadores(fn, maquinas) {
    console.log("Executando imediatamente ao carregar a tela");
    fn(maquinas);

    function agendarProxima() {
        const agora = new Date();
        const alvo = calcularProximoAgendamento(agora);
        const delay = alvo.getTime() - agora.getTime();

        setTimeout(() => {
            console.log(`Executando carregarOperadores às ${alvo.toTimeString().slice(0, 5)}`);
            fn(maquinas);
            agendarProxima();
        }, delay);
    }

    agendarProxima();
}

function determinarPlanta(maquina) {
    return maquina.toUpperCase().startsWith(PREFIXO_PLANTA_MJN) ? "MJN" : "MLB";
}

function agruparMaquinasPorPlanta(maquinas) {
    const grupos = new Map(); // planta -> [maquinas]
    maquinas.forEach((maquina) => {
        const planta = determinarPlanta(maquina);
        if (!grupos.has(planta)) grupos.set(planta, []);
        grupos.get(planta).push(maquina);
    });
    return grupos;
}

function horaParaHorasMinutos(horaStr) {
    const [h, m] = horaStr.split(":").map(Number);
    return { h, m };
}

function calcularClasseStatus(item) {
    let dataLimpa = item.DataHoraEntrada;
    // Remove o 'Z' final para o JS não converter para o fuso local subtraindo horas
    if (dataLimpa && dataLimpa.endsWith("Z")) {
        dataLimpa = dataLimpa.slice(0, -1);
    }
    const horaEntrada = new Date(dataLimpa);
    const agora = new Date();

    const turnoCadastro = (item.TurnoCadastro?.trim()?.slice(0, 1) ?? "") + "T";
    const turnoApontado = (item.TurnoApontado?.trim()?.slice(0, 1) ?? "") + "T";

    const turno = TURNOS[turnoApontado];
    if (!turno) {
        console.error("Turno desconhecido:", turnoApontado);
        return "status-pessoa-vermelho";
    }

    const { h: inicioH, m: inicioM } = horaParaHorasMinutos(turno.inicio);
    const { h: fimH, m: fimM } = horaParaHorasMinutos(turno.fim);

    const inicioTurno = new Date(horaEntrada);
    inicioTurno.setHours(inicioH, inicioM, 0, 0);

    const fimTurno = new Date(inicioTurno);
    fimTurno.setHours(fimH, fimM, 0, 0);

    // Virada de dia (ex: entra 22h, sai 06h)
    if (fimTurno <= inicioTurno) {
        fimTurno.setDate(fimTurno.getDate() + 1);
    }

    // Entrada na madrugada (ex: entrou 00:30 no turno das 22h)
    if (horaEntrada < inicioTurno) {
        inicioTurno.setDate(inicioTurno.getDate() - 1);
        fimTurno.setDate(fimTurno.getDate() - 1);
    }

    const limiteAmarelo = new Date(fimTurno);
    limiteAmarelo.setHours(limiteAmarelo.getHours() + TOLERANCIA_HORAS);

    if (turnoApontado !== turnoCadastro) return "status-pessoa-vermelho"; // Turno errado
    if (agora <= fimTurno) return ""; // Dentro do expediente (verde)
    if (agora <= limiteAmarelo) return "status-pessoa-amarelo"; // Tolerância
    return "status-pessoa-vermelho"; // Passou da tolerância
}

function criarItemOperador(item) {
    const li = document.createElement("li");
    li.className = "lista-operadores-linha-container-pessoa";

    const statusDiv = document.createElement("div");
    statusDiv.className = "status-pessoa";
    const classeStatus = calcularClasseStatus(item);
    if (classeStatus) statusDiv.classList.add(classeStatus);

    const pNome = document.createElement("p");
    pNome.className = "nome-pessoa";
    pNome.textContent = item.Pessoa;

    li.append(statusDiv, pNome);
    return li;
}

async function buscarOperadoresPorPlanta(planta, maquinasDaPlanta) {
    const listaCodificada = encodeURIComponent(maquinasDaPlanta.join(","));
    const response = await fetch(`/api/apontamentos/operadores/${planta}/${listaCodificada}`);
    if (!response.ok) {
        throw new Error(`Erro ao carregar operadores da planta ${planta}`);
    }
    return response.json();
}

function renderizarMaquina(maquina, dadosArray) {
    const selector = `.lista-operadores-linha[data-lista="${maquina}"] ul.lista-operadores-linha-container`;
    const container = document.querySelector(selector);
    if (!container) return; // Máquina sem elemento na tela atual

    const fragment = document.createDocumentFragment();
    dadosArray.forEach((item) => fragment.appendChild(criarItemOperador(item)));

    container.replaceChildren(fragment);
}

export async function carregarOperadores(maquinas) {
    const grupos = agruparMaquinasPorPlanta(maquinas);
    const plantas = [...grupos.keys()];

    const resultados = await Promise.allSettled(
        plantas.map(async (planta) => {
            const maquinasDaPlanta = grupos.get(planta);
            const dadosPorMaquina = await buscarOperadoresPorPlanta(planta, maquinasDaPlanta);
            maquinasDaPlanta.forEach((maquina) => {
                renderizarMaquina(maquina, dadosPorMaquina[maquina] ?? []);
            });
        })
    );

    resultados.forEach((resultado, i) => {
        if (resultado.status === "rejected") {
            console.error(`ERRO EM carregarOperadores (planta ${plantas[i]}):`, resultado.reason);
        }
    });
}