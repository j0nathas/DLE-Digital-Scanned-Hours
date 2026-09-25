import { apontamentoOperador, apontamentoTeamLeader, registrarSaidaAutomaticaParaLinha } from '/js/funcoes.js';
import { agendarOperadores, carregarOperadores } from '/js/statusOp.js';
import { apontamentoConfirmarBtn, fecharModal, maquinas, gruposInjetorasDupla, encontrarOriginais, gruposInjetoras } from '/injecao_small/js/asideTeamLeader.js';
import { IpMonitor } from '/js/leituraCartao.js';


document.addEventListener('DOMContentLoaded', () => {

    window.addEventListener('DOMContentLoaded', async () => {

        const overlay = document.getElementById('loadingOverlay');

        await carregarDadosIniciais();

        setTimeout(() => {
            overlay.classList.add('fade-out');

            setTimeout(() => {
                overlay.style.display = 'none';
            }, 500);

        }, 1000);

    });

    toastr.options = {
        "closeButton": true,
        "progressBar": true,
        "positionClass": "toast-top-right",
        "timeOut": "7000",
        "extendedTimeOut": "1000",
        "showMethod": "fadeIn",
        "hideMethod": "fadeOut",
        "showDuration": "500",
        "hideDuration": "500",
        "toastClass": "toast fadeIn fadeOut"
    };





    // --- ELEMENTOS PRINCIPAIS DA TELA ---
    const produto = localStorage.getItem('produtoProduzir');
    const asideOperador = document.querySelector('.aside-operador');
    // --- SELETORES GLOBAIS DENTRO DO ESCOPO ---
    const OperadoresEsperadosEl = document.querySelectorAll('.quantidadeOperadores');
    const produtoEmProducaoEl = document.querySelector('.emProducaoProduto');
    const dataAtualEl = document.getElementById('data-atual');
    const horaAtualEl = document.getElementById('hora-atual');
    const turnoAtualEl = document.getElementById('turno-atual');
    const operadoresNaLinhaEl = document.querySelector('.OperadoresNaLinha');
    const cardMetalizadoras = document.querySelectorAll('.card-Operadores');
    let produtoSelecionado = null;


    //Aside Team Leader
    const numeroEl = document.getElementById('numero');
    const btnConfirmar = document.getElementById('btn-confirmar');
    const botoesMaquinasTl = document.querySelectorAll(".botoes-injetoras-botao-tl");
    const botoesMaquinasTlConjunto = Array.from(document.querySelectorAll('.botoes-injetoras-botao'));
    const sairBtn = document.getElementById('btn-sair-modal');
    const asideTeamleader = document.getElementById('aside-teamleader');
    const overlayTeamLeader = document.querySelector('.overlay-teamleader');
    const nomeUsuarioModalEl = document.getElementById('nome-usuario-modal');
    const asideTeamLeader = document.querySelector('.aside-teamleader');


    // --- ELEMENTOS DO MODAL DINÂMICO ---
    const overlayOp = document.querySelector('.overlay');
    const sairOperadorBtn = document.querySelector('.sair-operador');

    const elementosguia = document.querySelectorAll('.corredor-guia, .area-gaiolas, .area-moldes, .area-estufa, .area-lideres, .area-mezanino, .area-sucata');

    const botaoConfirmarOperacao = document.querySelector('.bloco-confirmar-botao');
    const nomeOperadorModalEl = document.querySelector('.bloco-boasvindas .texto-boasvindas-aside');

    // --- DADOS DA SESSÃO E ESTADO ---
    const nomeDaLinha = document.querySelector('.setor').textContent;
    let ultimoAcessoMODVerificado = null;
    let pollingInterval;
    let modalAberto = false;
    let nomeOperadorCartao = "";
    let REOperadorCartao = "";
    let nomeDoTLIdentificado = null;
    let RETLIdentificado = null;

    const cardEncerrarMetalizadoras = document.querySelector('.finalizacao-injetoras');
    const overlayEncerrarMetalizadoras = document.querySelector('.overlay-finalizacao');
    const textOlaEncerrarMetalizadoras = document.querySelector('.texto-Ola-encerramento');
    let botoesEncerrarMetalizadoras = Array.from(document.querySelectorAll('.finalizacao-injetoras-botoes-botao'));
    let validacaoSelecaoTotal = false;
    const botaoSelecionarEncerrar = document.querySelector('.finalizacao-injetoras-confirmacao-select');
    const botaoFinalizarEncerrar = document.querySelector('.finalizacao-injetoras-confirmacao-finalizar');
    const fecharCardEncerrarMetalizadoras = document.querySelector('.finalizacao-injetoras-header-close');

    let produtoSelecionadoEncerrar = null;

    const maquinasAgrupadas = ['s.I03h1k100_s.I09h1k86', 's.I05h1k65_s.I08h1k65', 's.I11h1k120_s.I12h1k120'];
    const maquinasDesagrupadas = ['s.I03h1k100', 's.I05h1k65', 's.I08h1k65', 's.I09h1k86', 's.I11h1k120', 's.I12h1k120'];
    const todasMaquinas = [...maquinasAgrupadas, ...maquinasDesagrupadas];
    const divBotoesTL = document.getElementById('container-botoes');
    const divBotoesTLFinalizacao = document.querySelector('.finalizacao-injetoras-botoes');
    const navListaOperadores = document.querySelector('.lista-operadores');

    let botoesOperacao = Array.from(document.querySelectorAll('.botoesOp-injetoras-botao'));

    function adicionarClickBtn(botao) {
        botao.addEventListener('click', () => {
            botoesOperacao.forEach(b => b.classList.add('botao-nao-selecionado'));
            elementosguia.forEach(el => el.style.opacity = '0.3');
            botao.classList.remove('botao-nao-selecionado');
            if (botaoConfirmarOperacao) botaoConfirmarOperacao.style.display = 'block';
        });
    }

    function formatarNome(maquina, classe = "") {
        const strong = classe ? `<strong class="${classe}">$1</strong>` : "<strong>$1</strong>";
        return maquina.replace(/I(\d+)/g, `I${strong}`);
    }

    function criarBlocoLista(maquina) {

        if (document.querySelector(`[data-lista="${maquina}"]`)) return;

        const html = `
         <div class="lista-operadores-linha" data-lista="${maquina}">

            <p class="lista-operadores-linha-nome">${maquina}</p>

            <ul class="lista-operadores-linha-container">

            </ul>

        </div>
        `;

        navListaOperadores.insertAdjacentHTML('beforeend', html);
    }

    function preencherCardMaquina(maquina, injetora1 = null) {

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

    function criarBotoesDeAgrupamento(maquina) {

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

    function criarBotaoEncerrar(maquina) {
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

    function deletarBtnFinalizar(maquina) {
        const btnFinalizar = divBotoesTLFinalizacao.querySelector(`button[data-finalizar="${maquina}"]`);
        if (btnFinalizar) {
            btnFinalizar.remove();
        }
    }

    async function criarBotoesTL(maquina, dados) {
        const esperadoObj = dados[`esperado${maquina}`];
        const esperadoObjdupla = dados[`esperado${gruposInjetorasDupla[maquina]}`];
        const conjuntoRelacionado = dados[`esperado${gruposInjetoras[maquina]}`];

        if ((conjuntoRelacionado?.esperado === null || !conjuntoRelacionado) && !maquinasAgrupadas.includes(maquina)) {
            const conjunto = document.querySelector(`[data-lista="${gruposInjetoras[maquina]}"]`);
            if (conjunto) conjunto.remove();
            criarBlocoLista(maquina);
        } else if (maquinasAgrupadas.includes(maquina)) {
            const maquinasOriginais = encontrarOriginais(maquina);
            const [maq1, maq2] = maquinasOriginais;
            const esperadomaq1 = dados[`esperado${maq1}`]?.esperado;
            const esperadomaq2 = dados[`esperado${maq2}`]?.esperado;
            if (esperadomaq1 == null && esperadomaq2 == null && esperadoObj?.esperado >= 1) {
                document.querySelector(`[data-lista="${maq1}"]`)?.remove();
                document.querySelector(`[data-lista="${maq2}"]`)?.remove();
                criarBlocoLista(maquina);

            };
        }

        const existeDesagrupada = maquinasDesagrupadas?.includes(maquina);
        const existeAgrupada = maquinasAgrupadas?.includes(maquina);
        const btnMaquina = divBotoesTL.querySelector(`[data-produto="${maquina}"]`);
        const btnConjuntoMaquina = divBotoesTL.querySelector(`[data-div="${maquina}"]`);
        const maquinaOriginal = encontrarOriginais(maquina);
        let [maq1, maq2] = maquinaOriginal;
        const html = `<button class="botoes-injetoras-botao" data-produto="${maquina}"><p>${formatarNome(maquina, "destaque-injetora")}</p></button>`;

        const esperadoValido = !esperadoObj || esperadoObj.esperado === null;
        if (esperadoValido && !existeAgrupada && (esperadoObjdupla?.esperado >= 1 || !existeDesagrupada)) {
            if (!btnMaquina) {
                const html = `<button class="botoes-injetoras-botao" data-produto="${maquina}"><p>${formatarNome(maquina, "destaque-injetora")}</p></button>`;
                divBotoesTL.insertAdjacentHTML('beforeend', html);
            }
        } else if (
            (!esperadoObj || esperadoObj.esperado === null) &&
            (!esperadoObjdupla || esperadoObjdupla.esperado === null) &&
            (!conjuntoRelacionado || conjuntoRelacionado.esperado === null) &&
            (existeDesagrupada || existeAgrupada)
        ) {
            if (!btnMaquina || !btnConjuntoMaquina) {
                divBotoesTL.querySelectorAll(`.botoes-injetoras-botao[data-produto="${maquina}"]`).forEach(botao => botao.remove());

                if (!existeAgrupada) {
                    criarBotoesDeAgrupamento(maquina);
                    if (!esperadoObjdupla || esperadoObjdupla?.esperado === null) {
                        const divMaquinaDuplaAnterior = divBotoesTL.querySelector(`.botoes-injetoras-botao[data-produto="${gruposInjetorasDupla[maquina]}"]`);
                        if (divMaquinaDuplaAnterior) divMaquinaDuplaAnterior.remove();
                        criarBotoesDeAgrupamento(gruposInjetorasDupla[maquina]);
                    }
                } else if (!divBotoesTL.querySelector(`button[data-produto="${maq1}"]`) &&
                    !divBotoesTL.querySelector(`button[data-produto="${maq2}"]`) &&
                    (!esperadoObj || esperadoObj.esperado === null) &&
                    !existeDesagrupada
                ) {
                    criarBotoesDeAgrupamento(maq1);
                    criarBotoesDeAgrupamento(maq2);
                    document.querySelector(`[data-lista="${maquina}"]`)?.remove();
                    if (maq1) criarBlocoLista(maq1);
                    if (maq2) criarBlocoLista(maq2);
                }

            }
        } else {
            const valorEsperado = esperadoObj?.esperado;
            const esperadoConjunto = conjuntoRelacionado?.esperado;
            const btnConjuntoMaquinaDupla = divBotoesTL?.querySelector(`[data-div="${gruposInjetorasDupla[maq1]}"]`);
            const btnConjuntoMaquinaDuplaSeg = divBotoesTL?.querySelector(`[data-div="${gruposInjetorasDupla[maq2]}"]`);
            const deveExistir = (valorEsperado >= 1) && (!conjuntoRelacionado || esperadoConjunto === null);
            const btnAtivarMaquina = divBotoesTL.querySelector(`[data-produto="${maquina}"]`);
            const divBtnAtivarMaquina = btnAtivarMaquina?.closest('.div-botoes-conjunto');

            const btnFinalizar = divBotoesTLFinalizacao.querySelector(`button[data-finalizar="${maquina}"]`);
            if (deveExistir) {
                if (!btnFinalizar) {
                    criarBotaoEncerrar(maquina);
                    if (btnAtivarMaquina) btnAtivarMaquina.remove();
                    if (divBtnAtivarMaquina) divBtnAtivarMaquina.remove();
                    if (btnConjuntoMaquina) btnConjuntoMaquina.remove();
                    if (btnConjuntoMaquinaDupla) btnConjuntoMaquinaDupla.remove();
                    if (btnConjuntoMaquinaDuplaSeg) btnConjuntoMaquinaDuplaSeg.remove();
                }
            } else {
                if (btnFinalizar) {
                    const html = `<button class="botoes-injetoras-botao" data-produto="${maquina}"><p>${formatarNome(maquina, "destaque-injetora")}</p></button>`;
                    divBotoesTL.insertAdjacentHTML('beforeend', html);
                    btnFinalizar.remove();

                }
            }
        }

    }

    function criarConjuntoOperacao(maquina, dados) {
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


    function abrirModalEncerrar() {
        textOlaEncerrarMetalizadoras.textContent = nomeDoTLIdentificado;
        cardEncerrarMetalizadoras.style.display = 'block';
        overlayEncerrarMetalizadoras.style.display = 'block';
    }

    function resetarModalEncerrar() {
        validacaoSelecaoTotal = false;
        validacaoEncerrarProd = false;

        botoesEncerrarMetalizadoras.forEach(met => {
            met.classList.remove('finalizacao-injetoras-botoes-botao-selecionado');
        });

        botaoSelecionarEncerrar.innerHTML = 'SELECIONAR TODAS <img src="/images/selecionar-todos.svg" width="25" alt="">';
        cardEncerrarMetalizadoras.style.display = 'none';
        overlayEncerrarMetalizadoras.style.display = 'none';
        encerrarPopup.style.display = 'none';
        document.querySelector('.overlay-saida').style.display = 'none';
        botaoFinalizarEncerrar.style.display = 'none';
    }

    fecharCardEncerrarMetalizadoras.addEventListener('click', () => {
        resetarModalEncerrar();
    });

    function verificarSelecaoTotalEncerramento() {
        const botoesAtuais = divBotoesTLFinalizacao.querySelectorAll('.finalizacao-injetoras-botoes-botao');

        const listaBotoes = Array.from(botoesAtuais);

        const todosSelecionados = listaBotoes
            .filter(botao => window.getComputedStyle(botao).display !== 'none')
            .every(botao => botao.classList.contains('finalizacao-injetoras-botoes-botao-selecionado'));

        if (todosSelecionados && listaBotoes.length > 0) {
            botaoSelecionarEncerrar.innerHTML = 'REMOVER SELEÇÕES <img src="/images/remover-selecoes.svg" width="25" alt="">';
            validacaoSelecaoTotal = true;
            produtoSelecionadoEncerrar = "selecionado todos";
        } else {
            botaoSelecionarEncerrar.innerHTML = 'SELECIONAR TODAS <img src="/images/selecionar-todos.svg" width="25" alt="">';
            validacaoSelecaoTotal = false;
        }

        const algumSelecionado = listaBotoes.some(botao => botao.classList.contains('finalizacao-injetoras-botoes-botao-selecionado'));

        botaoFinalizarEncerrar.style.display = algumSelecionado ? 'block' : 'none';
    }

    botaoSelecionarEncerrar.addEventListener('click', () => {
        const todosSelecionados = Array.from(botoesEncerrarMetalizadoras)
            .filter(botao => window.getComputedStyle(botao).display !== 'none')
            .every(botao => botao.classList.contains('finalizacao-injetoras-botoes-botao-selecionado'));

        if (todosSelecionados) {
            botoesEncerrarMetalizadoras.forEach(botao => { botao.classList.remove('finalizacao-injetoras-botoes-botao-selecionado'); });
            botaoSelecionarEncerrar.innerHTML = 'SELECIONAR TODAS <img src="/images/selecionar-todos.svg" width="25" alt="">';
            validacaoSelecaoTotal = false;
            botaoFinalizarEncerrar.style.display = 'none';
        } else {
            botoesEncerrarMetalizadoras.forEach(botao => {
                if (!botao.classList.contains('finalizacao-injetoras-botoes-botao-selecionado') && botao.style.display !== 'none') {
                    botao.classList.add('finalizacao-injetoras-botoes-botao-selecionado');
                    botaoFinalizarEncerrar.style.display = 'block';
                }
            });
            botaoSelecionarEncerrar.innerHTML = 'REMOVER SELEÇÕES <img src="/images/remover-selecoes.svg" width="25" alt="">';
            validacaoSelecaoTotal = true;
        }
        verificarSelecaoTotalEncerramento();
    });

    botaoFinalizarEncerrar.addEventListener('click', async () => {
        botaoFinalizarEncerrar.disabled = true;
        botaoFinalizarEncerrar.innerHTML = 'Processando...';

        const respostaEsperado = await fetch('/api/apontamentos/getesperados');
        const dados = await respostaEsperado.json();

        try {
            const botoesSelecionados = Array.from(document.querySelectorAll('.finalizacao-injetoras-botoes-botao-selecionado'))
                .filter(el => getComputedStyle(el).display !== 'none');

            if (botoesSelecionados.length === 0) {
                toastr.warning("Selecione ao menos uma máquina.");
                return;
            }

            const nomesMaquinas = botoesSelecionados.map(botao => botao.getAttribute('data-finalizar'));

            await Promise.all(nomesMaquinas.map(nome => enviarFinalizacaoParaBanco(nome, dados)));

            const response = await fetch('/api/apontamentos/getesperados');
            if (!response.ok) throw new Error('Falha ao buscar dados atualizados.');
            const novosDados = await response.json();
            await Promise.all([
                maquinasEncerradasGrupo.map(maquina => carregarCardsMaquinas(maquina, novosDados)),
                maquinasEncerradas.map(maquina => criarBotoesTL(maquina, novosDados))
            ]
            );

            maquinasEncerradas.length = 0;
        } catch (error) {
            console.error("Erro ao processar finalizações:", error);
            toastr.error("Houve um erro ao processar algumas finalizações.");
        } finally {
            await carregarContagemOperadores();
            toastr.success("Máquinas encerradas com sucesso!");
            resetarModalEncerrar();

            botaoFinalizarEncerrar.disabled = false;
            botaoFinalizarEncerrar.innerHTML = 'FINALIZAR';
        }
    });


    async function carregarCardsMaquinas(maquina, dados) {

        if (maquinasAgrupadas.includes(maquina)) {
            const esperadoGrupo = dados[`esperado${maquina}`];
            const originais = encontrarOriginais(maquina);
            const [inj1, inj2] = originais;
            const nav1 = document.querySelector(`nav[data-card="${inj1}"]`);
            const nav2 = document.querySelector(`nav[data-card="${inj2}"]`);


            if (esperadoGrupo?.esperado >= 1) {

                nav1.innerHTML = '';
                nav2.innerHTML = '';
                preencherCardMaquina(maquina, inj1);

            } else {
                nav1.innerHTML = '';
                nav2.innerHTML = '';
                preencherCardMaquina(inj1);
                preencherCardMaquina(inj2);
            }
        };

        await Promise.all([
            criarBotoesTL(maquina, dados),
            (maquinasAgrupadas.includes(maquina) || maquinasDesagrupadas.includes(maquina)) ? criarConjuntoOperacao(maquina, dados) : Promise.resolve()
        ]);

        botoesEncerrarMetalizadoras = Array.from(document.querySelectorAll('.finalizacao-injetoras-botoes-botao'));

    }

    let atEsperadoCor = 0;


    async function atualizarEsperadoEColorirLinhas() {
        try {
            const response = await fetch('/api/apontamentos/getesperados');
            if (!response.ok) throw new Error('Falha ao buscar operadores esperados');

            const dados = await response.json();

            maquinas.forEach(maquina => {
                const valorEsperado = parseInt(dados[`esperado${maquina}`]?.esperado ?? '0', 10);

                const elemento = document.getElementById(`esperado-${maquina}`);
                if (elemento) elemento.textContent = valorEsperado;

                const botaoOperador = document.querySelector(`[data-injetora="${maquina}"]`);
                if (botaoOperador) {
                    botaoOperador.classList.toggle('botao-desabilitado', valorEsperado === 0);
                }
            });

            const statusConfig = {
                cinza: { card: 'card-cinza', txt: 'texto-cinza', lista: '' },
                verde: { card: 'card-verde', txt: 'texto-verde', lista: 'lista-operadores-linha-nome-verde' },
                vermelho: { card: 'card-vermelho', txt: 'texto-vermelho', lista: 'lista-operadores-linha-nome-vermelho' },
                amarelo: { card: 'card-amarelo', txt: 'texto-amarelo', lista: 'lista-operadores-linha-nome-amarelo' }
            };

            const todasClassesCard = Object.values(statusConfig).map(s => s.card);
            const todasClassesTexto = Object.values(statusConfig).map(s => s.txt);
            const todasClassesLista = Object.values(statusConfig).map(s => s.lista).filter(Boolean);

            document.querySelectorAll('.cards-injetoras').forEach(card => {
                const reaisEl = card.querySelector('.OperadoresNaLinha');
                const esperadoEl = card.querySelector('.quantidadeOperadores');
                const cardOperadoresEl = card.querySelector('.cards-Operadores');

                if (!reaisEl || !esperadoEl || !cardOperadoresEl) return;

                const reais = parseInt(reaisEl.textContent, 10) || 0;
                const esperados = parseInt(esperadoEl.textContent, 10) || 0;

                let status = 'amarelo';
                if (esperados === 0) status = 'cinza';
                else if (reais === esperados) status = 'verde';
                else if (reais > esperados) status = 'vermelho';

                const config = statusConfig[status];

                cardOperadoresEl.classList.remove(...todasClassesCard);
                cardOperadoresEl.classList.add(config.card);

                card.classList.remove(...todasClassesTexto);
                card.classList.add(config.txt);
                card.style.color = '';

                const nomeLinha = reaisEl.id?.replace('real-', '');
                const listaNome = document.querySelector(`[data-lista="${nomeLinha}"] .lista-operadores-linha-nome`);

                if (listaNome) {
                    listaNome.classList.remove(...todasClassesLista);
                    if (config.lista) listaNome.classList.add(config.lista);
                }
            });

        } catch (error) {
            console.error('Erro no ciclo de atualização:', error);
        }
    }
    // --- FUNÇÕES DE INICIALIZAÇÃO E MODAL ---
    function exibirHorarioAtual() {
        const agora = new Date();
        if (horaAtualEl) horaAtualEl.textContent = agora.toLocaleTimeString('pt-BR');
        if (turnoAtualEl) {
            const hora = agora.getHours();
            if (hora >= 6 && hora < 14) turnoAtualEl.textContent = "1º Turno";
            else if (hora >= 14 && hora < 22) turnoAtualEl.textContent = "2º Turno";
            else turnoAtualEl.textContent = "3º Turno";
        }
        if (dataAtualEl) dataAtualEl.textContent = agora.toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'numeric', day: 'numeric' });
    }

    async function abrirModalOperador(nomeOperador) {
        if (modalAberto) return;
        modalAberto = true;
        if (nomeOperadorModalEl) nomeOperadorModalEl.textContent = `Bem-vindo, ${nomeOperador}!`;
        if (asideOperador) asideOperador.style.display = 'flex';
        if (overlayOp) overlayOp.style.display = 'block';
        clearInterval(pollingInterval);
        await carregarContagemOperadores();
    }


    const listaOperadoresTela = document.querySelector('.lista-operadores');

    document.querySelector('.abrir-lista-operadores').addEventListener('click', () => {
        listaOperadoresTela.style.display = 'flex';
    })

    document.querySelector('.lista-operadores-sair').addEventListener('click', () => {
        listaOperadoresTela.style.display = 'none';
    })


    async function carregarContagemOperadores() {
        try {
            const responseInj = await fetch('/api/apontamentos/getOperadoresApontados');

            if (!responseInj.ok) throw new Error('Erro ao buscar operadores da metalização');

            const dados = await responseInj.json();

            dados.forEach(({ Maquina, Qntd_Real }) => {
                if (!maquinas.includes(Maquina)) return;

                const elemento = document.getElementById(`real-${Maquina}`);
                if (elemento) {
                    elemento.textContent = Qntd_Real;
                } else {
                    return;
                }

                const botaoOperador = document.querySelector(`[data-injetora="${Maquina}"]`);
                if (botaoOperador) {
                    const valorRealBtn = botaoOperador.querySelector('.text-qntOperadores-injetora:first-of-type');
                    if (valorRealBtn) {
                        valorRealBtn.textContent = Qntd_Real;
                    }
                }
            });

        } catch (error) {
            console.error('Erro ao buscar dados da metalização:', error);
        }

        atualizarCorOperacoes();
        atualizarEsperadoEColorirLinhas();
        carregarOperadores(maquinas);
    };


    const API_BASE_URL = '/api';
    const IP_ALVO_MONITORADO = '10.109.133.242'; //241

    const monitor = new IpMonitor(IP_ALVO_MONITORADO, API_BASE_URL, ["TL", "MOD"], 1000);
    monitor.startMonitoring();

    const cooldownSaida = new Map();

    const bloqueioSaida = new Set();

    document.addEventListener('newAccessDetected', async (event) => {
        const { nome, RE, cargo } = event.detail;

        if (cargo.toUpperCase() === "TL") {
            if (typeof abrirModalTL === 'function') {
                nomeDoTLIdentificado = nome;
                RETLIdentificado = RE;
                if (validacaoEncerrarProd) {
                    abrirModalEncerrar();
                } else {
                    abrirModalTL(nome);
                }
                console.log(`Modal de TL aberto para ${nome}!`);
            } else {
                console.warn('Função abrirModalTL não definida ou não acessível.');
            }

        } else if (cargo.toUpperCase() === "MOD") {

            const RE_normalizado = String(RE).trim();
            const agora = Date.now();

            if (cooldownSaida.has(RE_normalizado)) {
                const ultimo = cooldownSaida.get(RE_normalizado);
                if (agora - ultimo < 300) {
                    console.warn(`Evento duplicado em milissegundos para ${RE_normalizado}. Ignorando.`);
                    return;
                }
            }
            cooldownSaida.set(RE_normalizado, agora);

            if (bloqueioSaida.has(RE_normalizado)) {
                console.warn(`Saída já em processamento para ${nome} (${RE_normalizado}), ignorando novo evento.`);
                return;
            }

            bloqueioSaida.add(RE_normalizado);
            console.log(`Bloqueio ativado para RE ${RE_normalizado}`);

            try {
                const verificarResponse = await fetch(`/api/apontamentos/verificarEntradaRecente?Planta=MLB&RE=${encodeURIComponent(RE)}`);
                const verificarDados = await verificarResponse.json();

                console.log('Resposta da API verificarEntradaRecente:', verificarDados);

                if (verificarDados.podeSair) {
                    const response = await apontamentoOperador(
                        turnoAtualEl.textContent,
                        RE,
                        nome.toUpperCase(),
                        'MOD',
                        verificarDados.linha,
                        verificarDados.esperado,
                        verificarDados.operacao,
                        'Saida',
                        verificarDados.prod_LE,
                        verificarDados.prod_LD,
                        verificarDados.prod_Unico
                    );

                    if (response.sucesso) {
                        setTimeout(DesaparecerPopUp, 3000);
                        await carregarContagemOperadores();
                        document.querySelector('.popup-saida').style.display = 'flex';
                        document.querySelector('.overlay-popup').style.display = 'block';
                        document.querySelector('.popup-saida-nome').textContent = nome;
                    } else {
                        toastr.error(`Erro ao registrar saída: ${response.mensagem}`);
                    }

                } else {
                    abrirModalOperador(nome);
                    nomeOperadorCartao = nome;
                    REOperadorCartao = RE;
                }

            } catch (err) {
                console.error(`Erro no processamento de saída de ${nome}:`, err);
            } finally {
                setTimeout(() => bloqueioSaida.delete(RE_normalizado), 2000);
                console.log(`Bloqueio removido para RE ${RE_normalizado}`);
            }
        } else {
            console.log(`Novo acesso detectado de cargo ${cargo} (${nome}), mas nenhuma ação específica configurada.`);
        }
    });


    function fecharModalOperador() {
        if (asideOperador) asideOperador.style.display = 'none';
        if (overlayOp) overlayOp.style.display = 'none';
        botoesOperacao.forEach(b => b.classList.remove('botao-nao-selecionado'));
        elementosguia.forEach(el => el.style.opacity = '1');

        if (botaoConfirmarOperacao) botaoConfirmarOperacao.style.display = 'none';
        modalAberto = false;
        if (pollingInterval) clearInterval(pollingInterval);
    }
    // --- EVENT LISTENERS ---
    if (sairOperadorBtn) sairOperadorBtn.addEventListener('click', fecharModalOperador);



    botoesOperacao.forEach(botao => {
        adicionarClickBtn(botao);
    });

    if (botaoConfirmarOperacao) botaoConfirmarOperacao.addEventListener('click', async () => {
        const botaoSelecionado = botoesOperacao.find(b => !b.classList.contains('botao-nao-selecionado'));
        if (!botaoSelecionado) return;
        if (botaoConfirmarOperacao.disabled) return;

        botaoConfirmarOperacao.disabled = true;

        const pEsperadoEl = botaoSelecionado.querySelector('.text-qntOperadores-injetora:last-of-type');
        const qntdEsperada = pEsperadoEl ? parseInt(pEsperadoEl.textContent, 10) : 1;
        let produto = "";
        const operacao = botaoSelecionado.dataset.injetora;

        if (!operacao) {
            alert('Erro: Operação inválida.');
            botaoConfirmarOperacao.disabled = false;
            return;
        }

        botaoConfirmarOperacao.textContent = 'Processando...';

        const response = await apontamentoOperador(
            turnoAtualEl.textContent,
            REOperadorCartao,
            nomeOperadorCartao.toUpperCase(),
            'MOD',
            operacao,
            qntdEsperada,
            operacao,
            'Entrada',
            null,
            null,
            null
        )

        if (response.sucesso) {
            document.querySelector('.popup-entrada').style.display = 'flex';
            document.querySelector('.overlay-popup').style.display = 'block';
            document.querySelector('.popup-entrada-nome').textContent = nomeOperadorCartao;
            setTimeout(DesaparecerPopUp, 3000);
            botaoConfirmarOperacao.textContent = 'Confirmar';
            botaoConfirmarOperacao.disabled = false;
            await carregarContagemOperadores();
            fecharModalOperador();
        } else {
            botaoConfirmarOperacao.textContent = 'Confirmar';
            botaoConfirmarOperacao.disabled = false;
            alert(`Erro: ${response.mensagem}`);
        }

    });

    // --- LÓGICA DOS POP-UPS ---
    function DesaparecerPopUp() {
        const popEntrada = document.querySelector('.popup-entrada');
        const popSaida = document.querySelector('.popup-saida');
        const overlayPopup = document.querySelector('.overlay-popup');
        if (popEntrada) popEntrada.style.display = 'none';
        if (popSaida) popSaida.style.display = 'none';
        if (overlayPopup) overlayPopup.style.display = 'none';
    }

    document.querySelector('.popup-entrada')?.addEventListener('click', DesaparecerPopUp);
    document.querySelector('.overlay-popup')?.addEventListener('click', DesaparecerPopUp);
    document.querySelector('.popup-saida')?.addEventListener('click', DesaparecerPopUp);



    const btnTerminarProducao = document.querySelector('.terminarProducao');

    function atualizarCorOperacoes() {
        botoesOperacao = Array.from(document.querySelectorAll('.botoesOp-injetoras-botao'));
        botoesOperacao.forEach(botao => {
            const pElements = botao.querySelectorAll('.text-qntOperadores-injetora');
            if (pElements.length >= 3) {
                const [opAtuaisEl, , opEsperadosEl] = pElements;
                const valAtual = parseInt(opAtuaisEl.textContent, 10);
                const valEsperado = parseInt(opEsperadosEl.textContent, 10);
                botao.classList.remove('injetora-verde', 'injetora-vermelho');
                if (!isNaN(valAtual) && !isNaN(valEsperado)) {
                    if (valAtual === valEsperado) {
                        botao.classList.add('injetora-verde');
                    } else if (valAtual > valEsperado) {
                        botao.classList.add('injetora-vermelho');
                    }
                }
            }
        });
    }

    const encerrarPopup = document.querySelector('.encerrar');
    let validacaoEncerrarProd = false;

    btnTerminarProducao.addEventListener('click', () => {
        encerrarPopup.style.display = 'flex';
        document.querySelector('.overlay-saida').style.display = 'block';
        validacaoEncerrarProd = true;
    });

    document.querySelector('.encerrar-sair').addEventListener('click', () => {
        encerrarPopup.style.display = 'none';
        document.querySelector('.overlay-saida').style.display = 'none'
        validacaoEncerrarProd = false;
    });

    // --- EVENTOS DO MODAL DE CONFIRMAÇÃO DE SAÍDA ---

    async function carregarDadosIniciais() {
        const response = await fetch('/api/apontamentos/getesperados');
        const dados = await response.json();

        for (const maquina of maquinas) {
            await carregarCardsMaquinas(maquina, dados);
        }

        carregarContagemOperadores();
    }


    async function registrarSaidaAutomaticaParaLinha(nomeMaquina) {
        try {
            const response = await fetch(`/api/apontamentos/operadoresSemSaida?maquina=${encodeURIComponent(nomeMaquina)}`, {
                method: 'GET'
            });

            console.log(`Registrando saída para ${nomeMaquina}. Status da resposta:`, response.status);

            if (response.ok) {
                const data = await response.json();
                console.log(`${data.message}`)
            } else {
                const errData = await response.json().catch(() => ({}));
                toastr.error(`Erro ao registrar saídas pendentes para ${nomeMaquina}: ` + (errData.error || response.statusText));
            }
        } catch (err) {
            alert(`Erro na requisição para ${nomeMaquina}: ` + err.message);
        }
    };

    const maquinasEncerradas = [];
    const maquinasEncerradasGrupo = [];

    async function enviarFinalizacaoParaBanco(nomeMaquina, dados) {


        const esperadoMaquina = dados[`esperado${nomeMaquina}`];

        if (esperadoMaquina.esperado === null || !esperadoMaquina) {
            toastr.error(nomeMaquina + ' não está habilitada!');
            return;
        }

        if (!nomeDoTLIdentificado) {
            alert("Erro crítico: Nome do Team Leader não encontrado. Tente novamente.");
            return;
        }

        try {
            const response = await apontamentoTeamLeader(
                turnoAtualEl.textContent,
                RETLIdentificado,
                nomeDoTLIdentificado.toUpperCase(),
                "TL",
                nomeMaquina,
                1,
                "Finalizado",
                null,
                null,
                null
            )

            if (response.sucesso) {
                deletarBtnFinalizar(nomeMaquina);
                registrarSaidaAutomaticaParaLinha(nomeMaquina);
            } else {
                alert(`Erro ao finalizar produção: ${response.mensagem}`);
            }
        } catch (err) {
            console.log(err);
        } finally {
            (maquinasAgrupadas.includes(nomeMaquina)) ? maquinasEncerradasGrupo.push(nomeMaquina) : maquinasEncerradas.push(nomeMaquina);
            resetarModalEncerrar();
        }



    }

    // --- INICIALIZAÇÃO DA PÁGINA ---
    exibirHorarioAtual();
    setInterval(exibirHorarioAtual, 1000);
    /* carregarContagemOperadores(); */





    /*******************************************************/
    /*****************ASIDE TEAMLEADER**********************/
    /*******************************************************/


    function abrirModalTL(nomeUsuario) {
        asideTeamLeader.style.display = 'flex';
        nomeUsuarioModalEl.textContent = `Bem-vindo, ${nomeUsuario}!`;
        overlayTeamLeader.style.display = 'block';
    }

    btnConfirmar.addEventListener('click', async () => {
        const selecionados = document.querySelectorAll('.botao-injetoras-selecionado');
        const conjuntoSemSelecao = document.querySelectorAll('.botao-injetoras-selecionado-conjunto');
        const maquinasAtivadas = [];

        if (selecionados.length === 0) {
            toastr.warning('Selecione pelo menos uma máquina.');
            return;
        }

        if (conjuntoSemSelecao.length > 0) {
            toastr.warning('Há um conjunto de máquinas não selecionado.');
            return
        }

        try {
            for (const botao of selecionados) {
                const nomeInjetora = botao.dataset.produto;
                maquinasAtivadas.push(nomeInjetora);
                let dedicado = null;

                const response = await apontamentoTeamLeader(
                    turnoAtualEl.textContent, RETLIdentificado, nomeDoTLIdentificado.toUpperCase(), "TL", nomeInjetora, 1, "Produzindo", null, null, null
                )

                if (!response.sucesso) {
                    toastr.error(`Erro no apontamento de ${nomeInjetora}: ${response.mensagem}`);
                }
            }
        } catch (err) {
            console.log(err);
        } finally {
            const response = await fetch('/api/apontamentos/getesperados');
            const dados = await response.json();

            for (const maquina of maquinasAtivadas) {
                carregarCardsMaquinas(maquina, dados)
            }
            toastr.success("Apontamentos realizados")
            carregarContagemOperadores();
            fecharModal();
        }

    });


    /*******************************************************/
    /*****************ASIDE TEAMLEADER**********************/
    /*******************************************************/

    agendarOperadores(carregarOperadores, maquinas);
});