import { apontamentoConfirmarBtn, fecharModal, maquinas, gruposInjetorasDupla, encontrarOriginais, gruposInjetoras } from '/injecao_small/js/asideTeamLeader.js';



const maquinasAgrupadas = ['s.I03h1k100_s.I09h1k86', 's.I05h1k65_s.I08h1k65', 's.I11h1k120_s.I12h1k120'];
const maquinasDesagrupadas = ['s.I03h1k100', 's.I05h1k65', 's.I08h1k65', 's.I09h1k86', 's.I11h1k120', 's.I12h1k120'];
const todasMaquinas = [...maquinasAgrupadas, ...maquinasDesagrupadas];
const divBotoesTL = document.getElementById('container-botoes');
const divBotoesTLFinalizacao = document.querySelector('.finalizacao-injetoras-botoes');
let botoesOperacao = Array.from(document.querySelectorAll('.botoesOp-injetoras-botao'));

function adicionarClickBtn(botao) {
    botao.addEventListener('click', () => {
        botoesOperacao.forEach(b => b.classList.add('botao-nao-selecionado'));
        elementosguia.forEach(el => el.style.opacity = '0.3');
        botao.classList.remove('botao-nao-selecionado');
        if (botaoConfirmarOperacao) botaoConfirmarOperacao.style.display = 'block';
    });
}


export function formatarNome(maquina, classe = "") {
    const strong = classe ? `<strong class="${classe}">$1</strong>` : "<strong>$1</strong>";
    return maquina.replace(/I(\d+)/g, `I${strong}`);
}

export function preencherCardMaquina(maquina, injetora1 = null) {

    let nav = document.querySelector(`nav[data-card="${maquina}"]`);
    if (injetora1) nav = document.querySelector(`nav[data-card="${injetora1}"]`);

    if (!nav) return;

    nav.innerHTML = `
        <div class="linha-setor">
            <p class="linhaProducao">${formatarNome(maquina)}</p>
        </div>
        <div class="cards-Operadores">
            <li class="Operadores">
                <p id="real-${maquina}" class="OperadoresNaLinha">0</p>
                <p class="barra-quantidadeOperadores">/</p>
                <p id="esperado-${maquina}" class="quantidadeOperadores">0</p>
            </li>
            <p class="text-operadores">Operadores</p>
        </div>
    `;
}

export function criarBotoesDeAgrupamento(maquina) {

    const html = `
        <div class="div-botoes-conjunto" data-div="${maquina}">
                <button class="botoes-injetoras-botao-conjunto" data-produto="${maquina}">
                    <p>${formatarNome(maquina, "destaque-injetora")}</p>
            </button>   
            <section class="botoes-maquinas-conjunto">
                <p class="botoes-maquinas-conjunto-text">Produzirá com o mesmo operador na ${gruposInjetorasDupla[maquina]}?</p>
                <div>
                    <button class="botoes-maquinas-conjunto-botao btn-sim">SIM</button>
                    <button class="botoes-maquinas-conjunto-botao btn-nao">NÃO</button>
                </div>
            </section>
        </div>`;


    divBotoesTL.insertAdjacentHTML('beforeend', html);
}

export function criarBotaoEncerrar(maquina) {
    const button = document.createElement("button");
    button.className = "finalizacao-injetoras-botoes-botao";
    button.dataset.finalizar = maquina;
    button.innerHTML = formatarNome(maquina, "destaque-injetora-encerrar");

    button.addEventListener('click', () => {
        button.classList.toggle('finalizacao-injetoras-botoes-botao-selecionado');
        verificarSelecaoTotalEncerramento();
    });

    divBotoesTLFinalizacao.appendChild(button);
}

export function deletarBtnFinalizar(maquina) {
    const btnFinalizar = divBotoesTLFinalizacao.querySelector(`button[data-finalizar="${maquina}"]`);
    console.log(maquina + ": Está entrando na função de deletar")
    if (btnFinalizar) {
        console.log(maquina + ": Deletou o botão de finalizar!");
        btnFinalizar.remove();
    }
}

export async function criarBotoesTL(maquina, dados) {
    const esperadoObj = dados[`esperado${maquina}`];
    const esperadoObjdupla = dados[`esperado${gruposInjetorasDupla[maquina]}`];
    const conjuntoRelacionado = dados[`esperado${gruposInjetoras[maquina]}`]
    const existeDesagrupada = maquinasDesagrupadas.some(m => maquina?.includes(m));
    const existeAgrupada = maquinasAgrupadas.some(m => maquina.includes(m));
    const html = `<button class="botoes-injetoras-botao" data-produto="${maquina}"><p>${formatarNome(maquina, "destaque-injetora")}</p></button>`;

    const esperadoValido = !esperadoObj || esperadoObj.esperado === null;
    if (esperadoValido && !existeAgrupada && (esperadoObjdupla?.esperado >= 1 || !existeDesagrupada)) {
        console.log(maquina + "| A");

        if (!divBotoesTL.querySelector(`[data-produto="${maquina}"]`)) {
            const html = `<button class="botoes-injetoras-botao" data-produto="${maquina}"><p>${formatarNome(maquina, "destaque-injetora")}</p></button>`;
            divBotoesTL.insertAdjacentHTML('beforeend', html);
            console.log(maquina + ": B");
        }
    } else if (
        (!esperadoObj || esperadoObj.esperado === null) &&
        (!esperadoObjdupla || esperadoObjdupla.esperado === null) &&
        (!conjuntoRelacionado || conjuntoRelacionado.esperado === null) &&
        existeDesagrupada
    ) {
        console.log(maquina + "| C");
        if (!divBotoesTL.querySelector(`[data-produto="${maquina}"]`) || !divBotoesTL.querySelector(`[data-div="${maquina}"]`)) {
            divBotoesTL.querySelectorAll(`.botoes-injetoras-botao[data-produto="${maquina}"]`).forEach(botao => botao.remove());
            const maquinaOriginal = encontrarOriginais(maquina);
            let [maq1, maq2] = maquinaOriginal;
            if (!existeAgrupada) {
                criarBotoesDeAgrupamento(maquina);
                console.log(maquina + ": D");
            } else if (!divBotoesTL.querySelector(`button[data-produto="${maq1}"]`) &&
                !divBotoesTL.querySelector(`button[data-produto="${maq2}"]`) &&
                (!esperadoObj || esperadoObj.esperado === null) &&
                !existeAgrupada
            ) {
                criarBotoesDeAgrupamento(maq1);
                console.log(maquina + ": E");
            }

        }
    } else {
        console.log(maquina + ": F");
        const valorEsperado = esperadoObj?.esperado;
        const esperadoConjunto = conjuntoRelacionado?.esperado;

        const deveExistir = (valorEsperado >= 1) && (!conjuntoRelacionado || esperadoConjunto === null);
        const btnAtivarMaquina = divBotoesTL.querySelector(`[data-produto="${maquina}"]`);
        const divBtnAtivarMaquina = btnAtivarMaquina?.closest('.div-botoes-conjunto');

        const btnFinalizar = divBotoesTLFinalizacao.querySelector(`button[data-finalizar="${maquina}"]`);
        if (deveExistir) {
            if (!btnFinalizar) {
                criarBotaoEncerrar(maquina);
                if (btnAtivarMaquina) btnAtivarMaquina.remove();
                if (divBtnAtivarMaquina) divBtnAtivarMaquina.remove();
                console.log(maquina + ": G");
            }
        } else {
            if (btnFinalizar) {
                const html = `<button class="botoes-injetoras-botao" data-produto="${maquina}"><p>${formatarNome(maquina, "destaque-injetora")}</p></button>`;
                divBotoesTL.insertAdjacentHTML('beforeend', html);
                console.log(maquina + ": H");
                btnFinalizar.remove();
            }
        }
    }

}

export function criarConjuntoOperacao(maquina, dados) {
    const dadosMaquina = dados[`esperado${maquina}`];
    const esperadoMaquina = dadosMaquina?.esperado;
    const botaoOp = document.querySelector(`[data-injetora="${maquina}"]`);
    if (botaoOp) return;

    const isConjunto = maquinasAgrupadas.some(m => maquina.includes(m));


    if (isConjunto && esperadoMaquina >= 1) {

        const divConjunto = document.querySelector(
            `[data-conjunto="${maquina}"]`
        );
        const botaoOp = document.querySelector(`[data-injetora="${maquina}"]`);
        if (!divConjunto) return;
        if (botaoOp) return;

        divConjunto.innerHTML = `
            <button class="botoesOp-injetoras-botao injetora-conjunto"
                    data-injetora="${maquina}">
                <p class="injetora-conjunto-text">
                    ${formatarNome(maquina)}
                </p>
                <div class="botao-injetora-info">
                    <img src="/images/operador-real.svg" width="35">
                    <p class="text-qntOperadores-injetora">0</p>
                    <p class="text-qntOperadores-injetora">/</p>
                    <p class="text-qntOperadores-injetora">1</p>
                    <img src="/images/operador-esperado.svg" width="35">
                </div>
            </button>
        `;

        const btnConjunto = divConjunto.querySelector('.botoesOp-injetoras-botao');
        adicionarClickBtn(btnConjunto);

    } else if (dados[`esperado${gruposInjetoras[maquina]}`]?.esperado === null) {
        const grupo = gruposInjetoras[maquina];
        const dupla = gruposInjetorasDupla[maquina];

        const divConjunto = document.querySelector(
            `[data-conjunto="${grupo}"]`
        );

        if (!divConjunto) return;


        divConjunto.innerHTML = `
            <button class="botoesOp-injetoras-botao injetora-singular"
                    data-injetora="${maquina}">
                ${formatarNome(maquina)}
                <div class="botao-injetora-info">
                    <img src="/images/operador-real.svg" width="35">
                    <p class="text-qntOperadores-injetora">0</p>
                    <p class="text-qntOperadores-injetora">/</p>
                    <p class="text-qntOperadores-injetora">1</p>
                    <img src="/images/operador-esperado.svg" width="35">
                </div>
            </button>

            <button class="botoesOp-injetoras-botao injetora-singular"
                    data-injetora="${dupla}">
                ${formatarNome(dupla)}
                <div class="botao-injetora-info">
                    <img src="/images/operador-real.svg" width="35">
                    <p class="text-qntOperadores-injetora">0</p>
                    <p class="text-qntOperadores-injetora">/</p>
                    <p class="text-qntOperadores-injetora">1</p>
                    <img src="/images/operador-esperado.svg" width="35">
                </div>
            </button>
        `;
        divConjunto.querySelectorAll('.botoesOp-injetoras-botao').forEach(btn => adicionarClickBtn(btn));
    }


}
