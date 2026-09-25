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

            const planta = maquina.toUpperCase().startsWith("J.")
                ? 'MJN'
                : 'MLB';

            const response = await fetch(
                `/api/apontamentos/operadores/${planta}/${encodeURIComponent(maquina)}`
            );

            if (!response.ok) {

                let erroBackend = '';

                try {
                    const erroJson = await response.json();
                    erroBackend = erroJson.error || JSON.stringify(erroJson);
                } catch {
                    erroBackend = await response.text();
                }

                throw new Error(
                    `Erro ao carregar operadores da máquina ${maquina}. ` +
                    `HTTP ${response.status}. ` +
                    `Backend: ${erroBackend}`
                );
            }

            const dadosArray = await response.json();

            // resto do código...
        }

    } catch (err) {
        console.error("ERRO EM carregarOperadores:", err);
    }
}