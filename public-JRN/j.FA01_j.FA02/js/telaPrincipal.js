import { apontamentoOperador, apontamentoTeamLeader, registrarSaidaAutomaticaParaLinha } from '/JS_JARINU/funcoes.js';
import { agendarOperadores, carregarOperadores } from '/js/statusOp.js';
import { IpMonitor } from '/JS_JARINU/leituraCartao.js';

document.addEventListener('DOMContentLoaded', () => {

    window.addEventListener('DOMContentLoaded', async () => {

        const overlay = document.getElementById('loadingOverlay');

        await carregarDadosIniciais();


        overlay.classList.add('fade-out');

        setTimeout(() => {
            overlay.style.display = 'none';
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

    // --- ELEMENTOS DO MODAL DINÂMICO ---
    const overlay = document.querySelector('.overlay');
    const sairOperadorBtn = document.querySelector('.sair-operador');
    const corredorGuia = document.querySelector('.corredor-guia');
    const botaoConfirmarOperacao = document.querySelector('.bloco-confirmar-botao');
    const nomeOperadorModalEl = document.querySelector('.bloco-boasvindas .texto-boasvindas-aside');

    const nomeUsuarioModalEl = document.getElementById('nome-usuario-modal');

    // Elementos do Modal
    const numeroEl = document.getElementById('numero');
    const diminuirBtn = document.getElementById('diminuir');
    const aumentarBtn = document.getElementById('aumentar');
    const asideTeamleader = document.getElementById('aside-teamleader');
    // --- ESTADO DA APLICAÇÃO ---
    let quantidadeOperadores = 1;

    // --- DADOS DA SESSÃO E ESTADO ---
    let ultimoAcessoMODVerificado = null;
    let pollingInterval;
    let modalAberto = false;
    let nomeOperadorCartao = "";
    let REOperadorCartao = null;
    let produtoSelecionado = null;
    let valorEsperado = 0;
    let produtoLE = null;
    let produtoLD = null;
    let produtoUnico = null;

    //POP-UPs ENTRADA - SAIDA

    const PopUpSaida = document.querySelector('.popup-saida');
    const PopUpSaidaNome = document.querySelector('.popup-saida-nome');
    const PopUpEntrada = document.querySelector('.popup-entrada');
    const PopUpEntradaNome = document.querySelector('.popup-entrada-nome');
    const overlayPopup = document.querySelector('.overlay-popup');

    const maquinas = ['J.FA01_J.FA02'];
    const maquinasApontamento = ['J.FA01', 'J.FA02'];
    const plantaEndPoint = '_JARINU';
    const getProdutoLinha = `getProdutosPorLinha${plantaEndPoint}`;
    const getProdutos = `getProdutos${plantaEndPoint}`;

    async function atualizarEsperadoEColorirLinhas() {
        const API_URL = '/api/apontamentos/getesperados';

        try {
            const response = await fetch(API_URL);

            if (!response.ok) {
                console.warn(`Falha ao buscar dados. Status: ${response.status}`);
                return;
            }

            const dados = await response.json();

            for (const maquina of maquinas) {
                const esperadoObj = dados[`esperado${maquina}`] || {};
                valorEsperado = Number(esperadoObj.esperado) || 0;
                const esperadosZero = valorEsperado === 0;

                const formatadoApontamentoTL = maquina.split("_")[0];

                const btnOperadores = document.querySelector(`[data-uap="${maquina}"]`);
                const botaoProduto = document.querySelector(`[data-produto="${formatadoApontamentoTL}"]`);
                const navBotao = botaoProduto?.closest('.botoes-uaps-tl-nav');
                const maquinaEncerrar = document.querySelector(`[data-finalizar="${maquina}"]`);
                const cardReal = document.getElementById(`real-${maquina}`);
                const card = cardReal?.closest('.cards-uaps');
                const listaProduto = card?.querySelector('.bloco-emProducao');

                if (listaProduto) {
                    listaProduto.innerHTML = '';

                    const produtosParaExibir = [];

                    if (esperadoObj.prod_LE !== null) {
                        produtoLE = esperadoObj.prod_LE;
                        produtosParaExibir.push({ text: produtoLE, idSuffix: "-le" });
                    }
                    if (esperadoObj.prod_LD !== null) {
                        produtoLD = esperadoObj.prod_LD;
                        produtosParaExibir.push({ text: produtoLD, idSuffix: "-ld" });
                    }
                    if (esperadoObj.prod_Unico !== null && produtosParaExibir.length === 0) {
                        produtoUnico = esperadoObj.prod_Unico;
                        produtosParaExibir.push({ text: produtoUnico, idSuffix: "-unico" });
                    }

                    if (produtosParaExibir.length > 0) {
                        produtosParaExibir.forEach(p => {
                            const produtoEmproducao = document.createElement('p');
                            produtoEmproducao.textContent = p.text;
                            produtoEmproducao.className = "emProducao";
                            produtoEmproducao.id = `produto-${maquina}${p.idSuffix}`;
                            listaProduto.appendChild(produtoEmproducao);
                        });
                    }
                }

                const elEsperado = document.getElementById(`esperado-${maquina}`);

                if (elEsperado) elEsperado.textContent = valorEsperado;

                if (btnOperadores) {
                    const esperadoEl = btnOperadores.querySelector('.text-qntOperadores-uap:last-of-type');
                    if (esperadoEl) esperadoEl.textContent = valorEsperado;
                    btnOperadores.classList.toggle('botao-desabilitado', esperadosZero);
                }

                if (navBotao) navBotao.style.display = esperadosZero ? 'flex' : 'none';
                if (maquinaEncerrar) maquinaEncerrar.style.display = esperadosZero ? 'none' : 'flex';
            }

            document.querySelectorAll('.cards-uaps').forEach(card => {
                const reaisEl = card.querySelector('.OperadoresNaLinha');
                const idReal = reaisEl?.id;
                if (!idReal) return;

                const nomeLinha = idReal.replace('real-', '');

                const esperadoEl = card.querySelector('.quantidadeOperadores');
                const cardOpEl = card.querySelector('.cards-Operadores');

                const listaOperadores = document.querySelector(`[data-lista="${nomeLinha}"]`);
                if (!listaOperadores) return;

                const listaOperadoresLinha = listaOperadores.querySelector('.lista-operadores-linha-nome');
                if (!listaOperadoresLinha) return;

                if (!reaisEl || !esperadoEl || !cardOpEl) return;

                const reais = Number(reaisEl.textContent.trim()) || 0;
                const esperados = Number(esperadoEl.textContent.trim()) || 0;

                cardOpEl.classList.remove('card-cinza', 'card-verde', 'card-vermelho', 'card-amarelo');
                listaOperadoresLinha.classList.remove(
                    'lista-operadores-linha-nome-amarelo',
                    'lista-operadores-linha-nome-verde',
                    'lista-operadores-linha-nome-vermelho'
                );

                let novaClasse = '';
                let novaCor = '';
                let novaClasseOperador = '';

                if (esperados === 0) {
                    novaClasse = 'card-cinza';
                    novaCor = 'gray';
                } else if (reais === esperados) {
                    novaClasseOperador = 'lista-operadores-linha-nome-verde';
                    novaClasse = 'card-verde';
                    novaCor = 'green';
                } else if (reais > esperados) {
                    novaClasseOperador = 'lista-operadores-linha-nome-vermelho';
                    novaClasse = 'card-vermelho';
                    novaCor = 'red';
                } else {
                    novaClasseOperador = 'lista-operadores-linha-nome-amarelo';
                    novaClasse = 'card-amarelo';
                    novaCor = 'rgb(209, 171, 0)';
                }

                if (novaClasseOperador) {
                    listaOperadoresLinha.classList.add(novaClasseOperador);
                }

                if (novaClasse) {
                    cardOpEl.classList.add(novaClasse);
                }

                card.style.color = novaCor;
            });


        } catch (error) {
            console.error('Erro no ciclo de atualização (rede ou DOM):', error);
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
        if (overlay) overlay.style.display = 'block';
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
            const response = await fetch('/api/apontamentos/getOperadoresApontados');
            if (!response.ok) throw new Error('Erro ao buscar operadores da metalização');

            const dados = await response.json();

            dados.forEach(({ Maquina, Qntd_Real }) => {
                if (!maquinas.includes(Maquina)) return;

                // Atualiza o valor no card
                const elReal = document.getElementById(`real-${Maquina}`);
                if (elReal) {
                    elReal.textContent = Qntd_Real;
                } else {
                    console.warn(`Elemento real-${Maquina} não encontrado no DOM`);
                }

                // Atualiza valor no botão com data-uap
                const btnOperador = document.querySelector(`[data-uap="${Maquina}"]`);
                const realBtnText = btnOperador?.querySelector('.text-qntOperadores-uap:first-of-type');
                if (realBtnText) {
                    realBtnText.textContent = Qntd_Real;
                }
            });

        } catch (error) {
            console.error('Erro ao buscar dados da metalização:', error);
        }

        // Atualizações visuais pós-fetch
        atualizarEsperadoEColorirLinhas();
        carregarOperadores(maquinas);
    }

    // --- LÓGICA DOS POP-UPS ---
    function DesaparecerPopUp() {
        if (PopUpEntrada) PopUpEntrada.style.display = 'none';
        if (PopUpSaida) PopUpSaida.style.display = 'none';
        if (overlayPopup) overlayPopup.style.display = 'none';
    }

    PopUpEntrada?.addEventListener('click', DesaparecerPopUp);
    overlayPopup?.addEventListener('click', DesaparecerPopUp);
    PopUpSaida?.addEventListener('click', DesaparecerPopUp);

    let nomeDoTLIdentificado = null;
    let REDoTLIdentificado = null;


    const btnTerminarProducao = document.querySelector('.terminarProducao');

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

    const API_BASE_URL = '/api';
    const IP_ALVO_MONITORADO = '10.109.139.30'; //227

    const monitor = new IpMonitor(IP_ALVO_MONITORADO, API_BASE_URL, ["TL", "MOD"], 1000);
    monitor.startMonitoring();

    const cooldownSaida = new Map();

    const bloqueioSaida = new Set();

    document.addEventListener('newAccessDetected', async (event) => {
        const { nome, RE, cargo } = event.detail;
        if (cargo.toUpperCase() === "TL") {
            if (typeof abrirModalTL === 'function') {
                nomeDoTLIdentificado = nome;
                REDoTLIdentificado = RE;
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
                if (agora - ultimo < 1000) {
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
                const verificarResponse = await fetch(`/api/apontamentos/verificarEntradaRecente?Planta=MJN&RE=${encodeURIComponent(RE)}`);
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
                        await carregarContagemOperadores();
                        atualizarEsperadoEColorirLinhas();
                        PopUpSaida.style.display = 'flex';
                        overlayPopup.style.display = 'block';
                        PopUpSaidaNome.textContent = nome;
                        setTimeout(DesaparecerPopUp, 3000);
                    } else {
                        alert(`Erro ao registrar saída: ${response.mensagem}`);
                    }

                } else if (valorEsperado > 0) {
                    const response = await apontamentoOperador(
                        turnoAtualEl.textContent,
                        RE,
                        nome.toUpperCase(),
                        'MOD',
                        maquinas[0],
                        valorEsperado,
                        maquinas[0],
                        'Entrada',
                        produtoLE,
                        produtoLD,
                        produtoUnico
                    );
                    if (response.sucesso) {
                        setTimeout(DesaparecerPopUp, 3000);
                        await carregarContagemOperadores();
                        atualizarEsperadoEColorirLinhas();
                        PopUpEntrada.style.display = 'flex';
                        overlayPopup.style.display = 'block';
                        PopUpEntradaNome.textContent = nome;
                    } else {
                        alert(`Erro ao registrar entrada: ${response.mensagem}`);
                    }
                } else {
                    toastr.warning('Esta linha não está em produção!')
                }
            }
            catch (err) {
                console.error(`Erro no processamento de saída de ${nome}:`, err);
            } finally {
                setTimeout(() => bloqueioSaida.delete(RE_normalizado), 2000);
                console.log(`Bloqueio removido para RE ${RE_normalizado}`);
            }
        } else {
            console.log(`Novo acesso detectado de cargo ${cargo} (${nome}), mas nenhuma ação específica configurada.`);
        }
    });

    // --- EVENTOS DO MODAL DE CONFIRMAÇÃO DE SAÍDA ---

    async function carregarDadosIniciais() {
        await carregarProdutosPorMaquina();
        atualizarEsperadoEColorirLinhas();
        carregarContagemOperadores();
    }

    async function enviarFinalizacaoParaBanco(nomeMaquina) {
        if (!nomeDoTLIdentificado) {
            alert("Erro crítico: Nome do Team Leader não encontrado. Tente novamente.");
            return;
        }

        const API_URL = '/api/apontamentos/getesperados';

        try {
            const response = await fetch(API_URL);

            if (!response.ok) {
                console.warn(`Falha ao buscar dados. Status: ${response.status}`);
                return;
            }

            const dados = await response.json();

            const esperadoObj = dados[`esperado${nomeMaquina}`] || {};



            const resposta = await apontamentoTeamLeader(
                turnoAtualEl.textContent,
                REDoTLIdentificado,
                nomeDoTLIdentificado.toUpperCase(), // Usa o nome que pegamos na validação
                "TL",
                nomeMaquina,
                esperadoObj.esperado,
                "Finalizado",
                esperadoObj.prod_LE,
                esperadoObj.prod_LD,
                esperadoObj.prod_Unico // Novo status
            );

            if (resposta.sucesso) {
                toastr.success(`${nomeMaquina} finalizada com sucesso!`);
                registrarSaidaAutomaticaParaLinha(nomeMaquina);
                await atualizarEsperadoEColorirLinhas();
                carregarContagemOperadores();
                produto.textContent = "...";
                valorEsperado = 0;
            } else {
                alert(`Erro ao finalizar produção: ${resposta.mensagem}`);
            }
        } catch {

        }

    }

    const cardEncerrarMetalizadoras = document.querySelector('.finalizacao-uaps');
    const overlayEncerrarMetalizadoras = document.querySelector('.overlay-finalizacao');
    const textOlaEncerrarMetalizadoras = document.querySelector('.texto-Ola-encerramento');
    const botoesEncerrarMetalizadoras = Array.from(document.querySelectorAll('.finalizacao-uaps-botoes-botao'));
    let validacaoSelecaoTotal = false;
    const botaoSelecionarEncerrar = document.querySelector('.finalizacao-uaps-confirmacao-select');
    const botaoFinalizarEncerrar = document.querySelector('.finalizacao-uaps-confirmacao-finalizar');
    const fecharCardEncerrar = document.querySelector('.finalizacao-uaps-header-close');



    let produtoSelecionadoEncerrar = null;

    function abrirModalEncerrar() {
        textOlaEncerrarMetalizadoras.textContent = nomeDoTLIdentificado;
        cardEncerrarMetalizadoras.style.display = 'block';
        overlayEncerrarMetalizadoras.style.display = 'block';
    }

    function resetarModalEncerrar() {
        botoesEncerrarMetalizadoras.forEach(met => {
            validacaoSelecaoTotal = false;
            met.classList.remove('finalizacao-uaps-botoes-botao-selecionado');
            botaoSelecionarEncerrar.innerHTML = 'SELECIONAR TODAS <img src="/images/selecionar-todos.svg" width="25" alt="">';
            cardEncerrarMetalizadoras.style.display = 'none';
            overlayEncerrarMetalizadoras.style.display = 'none';
            encerrarPopup.style.display = 'none';
            document.querySelector('.overlay-saida').style.display = 'none'
            validacaoEncerrarProd = false;
            botaoFinalizarEncerrar.style.display = 'none';
        })
    }


    fecharCardEncerrar.addEventListener('click', resetarModalEncerrar);


    function verificarSelecaoTotalEncerramento() {
        const botoesArray = Array.from(botoesEncerrarMetalizadoras);
        const todosSelecionados = Array.from(botoesEncerrarMetalizadoras)
            .filter(botao => window.getComputedStyle(botao).display !== 'none')
            .every(botao => botao.classList.contains('finalizacao-uaps-botoes-botao-selecionado'));

        if (todosSelecionados) {
            botaoSelecionarEncerrar.innerHTML = 'REMOVER SELEÇÕES <img src="/images/remover-selecoes.svg" width="25" alt="">';
            validacaoSelecaoTotal = true;
            produtoSelecionadoEncerrar = "selecionado todos";
        } else {
            botaoSelecionarEncerrar.innerHTML = 'SELECIONAR TODAS <img src="/images/selecionar-todos.svg" width="25" alt="">';
            validacaoSelecaoTotal = false;
        }


        const algumSelecionado = Array.from(botoesEncerrarMetalizadoras).some(botao => botao.classList.contains('finalizacao-uaps-botoes-botao-selecionado'));
        botaoFinalizarEncerrar.style.display = algumSelecionado ? 'block' : 'none';
    }


    botoesEncerrarMetalizadoras.forEach((botao) => {
        botao.addEventListener('click', () => {
            if (botao.classList.contains('finalizacao-uaps-botoes-botao-selecionado')) {
                botao.classList.remove('finalizacao-uaps-botoes-botao-selecionado');
            } else {
                botao.classList.add('finalizacao-uaps-botoes-botao-selecionado');
            }
            verificarSelecaoTotalEncerramento();
        });
    });


    botaoSelecionarEncerrar.addEventListener('click', () => {
        const todosSelecionados = Array.from(botoesEncerrarMetalizadoras)
            .filter(botao => window.getComputedStyle(botao).display !== 'none')
            .every(botao => botao.classList.contains('finalizacao-uaps-botoes-botao-selecionado'));

        if (todosSelecionados) {
            botoesEncerrarMetalizadoras.forEach(botao => { botao.classList.remove('finalizacao-uaps-botoes-botao-selecionado'); });
            botaoSelecionarEncerrar.innerHTML = 'SELECIONAR TODAS <img src="/images/selecionar-todos.svg" width="25" alt="">';
            validacaoSelecaoTotal = false;
            botaoFinalizarEncerrar.style.display = 'none';
        } else {
            botoesEncerrarMetalizadoras.forEach(botao => {
                if (!botao.classList.contains('finalizacao-uaps-botoes-botao-selecionado') && botao.style.display !== 'none') {
                    botao.classList.add('finalizacao-uaps-botoes-botao-selecionado');
                    botaoFinalizarEncerrar.style.display = 'block';
                }
            });
            botaoSelecionarEncerrar.innerHTML = 'REMOVER SELEÇÕES <img src="/images/remover-selecoes.svg" width="25" alt="">';
            validacaoSelecaoTotal = true;
        }
        verificarSelecaoTotalEncerramento();
    });

    botaoFinalizarEncerrar.addEventListener('click', () => {
        const botoesSelecionadosEncerrar = Array.from(document.querySelectorAll('.finalizacao-uaps-botoes-botao-selecionado')).filter(el => getComputedStyle(el).display !== 'none');
        botoesSelecionadosEncerrar.forEach(maquina => {
            const nomeMaquina = maquina.getAttribute('data-finalizar');
            enviarFinalizacaoParaBanco(nomeMaquina);
        });
        resetarModalEncerrar();

    })

    // --- INICIALIZAÇÃO DA PÁGINA ---
    exibirHorarioAtual();
    setInterval(exibirHorarioAtual, 1000);
    /* carregarContagemOperadores(); */





    /*******************************************************/
    /*****************ASIDE TEAMLEADER**********************/
    /*******************************************************/

    function fecharModal() {
        overlay.style.display = 'none';
        asideTeamleader.style.display = 'none';
        resetarModal();
    }

    function resetarModal() {
        produtoSelecionado = null;
        quantidadeOperadores = 1;
        numeroEl.textContent = '1';
        botoesProduto.forEach(b => b.classList.remove('botao-uaps-selecionado'));
        btnConfirmar.style.display = 'none';
    }

    const saidaListaProdutos = document.querySelectorAll('.botoes-uaps-tl-divlista-pesquisa-sair');
    const overlayLista = document.querySelector('.overlay-lista');
    const TodosBotoesProdutosIniciar = document.querySelectorAll('.botoes-uaps-tl-botao');
    const btnConfirmarProd = document.querySelector('.contador-confirmar-botao');

    let primeiroSelecionadoBtn = null;

    let produtosPorLinhaMap = new Map();

    const inputPesquisa = document.querySelectorAll('.pesquisa-produtos');

    function reiniciarInput() {
        inputPesquisa.forEach(input => {
            input.value = "";

            const botoesProdutos = document.querySelectorAll('.botoes-uaps-tl-produtos-lista');
            const textoDigitado = input.value.toUpperCase();

            botoesProdutos.forEach(botao => {
                const texto = botao.textContent.toUpperCase();
                const cod_LE = (botao.getAttribute('data-cod-le') || '').toUpperCase();
                const cod_LD = (botao.getAttribute('data-cod-ld') || '').toUpperCase();
                const cod_Unico = (botao.getAttribute('data-cod-unico') || '').toUpperCase();

                botao.style.display = texto.includes(textoDigitado) || cod_LE.includes(textoDigitado) || cod_LD.includes(textoDigitado) || cod_Unico.includes(textoDigitado)
                    ? 'block'
                    : 'none';
            });
        })


    }

    async function carregarProdutosPorMaquina() {
        try {


            const respostaProdutosLinha = await fetch(`/api/apontamentos/${getProdutoLinha}`);
            if (!respostaProdutosLinha.ok) {
                throw new Error(`HTTP error! status: ${respostaProdutosLinha.status}`);
            }
            const produtosLinhaData = await respostaProdutosLinha.json();

            produtosLinhaData.forEach(item => {
                if (item.produtos && Array.isArray(item.produtos)) {
                    item.produtos.forEach(({ codigo, descricao }) => {
                        produtosPorLinhaMap.set(codigo, descricao);
                    });
                }
            });

            const resposta = await fetch(`/api/apontamentos/${getProdutos}`);
            if (!resposta.ok) {
                throw new Error(`HTTP error! status: ${resposta.status}`);
            }
            const dados = await resposta.json();
            const maquinasFiltradas = dados.filter(item => maquinasApontamento.includes(item.maquina));

            maquinasFiltradas.forEach(({ maquina, produtos }) => {
                const containerMaquina = document.querySelector(`[data-produto="${maquina}"]`)?.closest('.botoes-uaps-tl-nav');
                if (!containerMaquina) return;

                const listaProdutos = containerMaquina.querySelector('.botoes-uaps-tl-produtos');
                if (!listaProdutos) return;

                listaProdutos.innerHTML = '';

                produtos.forEach(produto => {
                    const { produto: nome, cod_le, cod_ld, cod_unico } = produto;

                    const divProduto = document.createElement('div');
                    divProduto.className = 'botoes-uaps-tl-produtos-lista';
                    divProduto.dataset.codLe = cod_le || '';
                    divProduto.dataset.codLd = cod_ld || '';
                    divProduto.dataset.codUnico = cod_unico || '';

                    const nomeProduto = document.createElement('p');
                    nomeProduto.textContent = nome;
                    nomeProduto.className = "nome-produto-selecao";
                    divProduto.appendChild(nomeProduto);

                    divProduto.addEventListener('click', () => {
                        document.querySelectorAll('.lista-lados').forEach(el => el.remove());

                        document.querySelectorAll('.botoes-uaps-tl-produtos-lista').forEach(btn => {
                            const paragrafo = btn.querySelector('.nome-produto-selecao')
                            paragrafo.classList.remove('selecionado');
                        });

                        nomeProduto.classList.add('selecionado');

                        const temAmbosLados = cod_le && cod_ld;

                        delete containerMaquina.dataset.tipoSelecao;
                        const guiaSelecionadoSecundario = containerMaquina.querySelector('.botoes-uaps-tl-guia-selecionado-segundo');
                        if (guiaSelecionadoSecundario) guiaSelecionadoSecundario.remove();


                        if (temAmbosLados) {
                            const divLados = document.createElement('div');
                            divLados.className = 'lista-lados';

                            const botaoLE = document.createElement('button');
                            botaoLE.textContent = 'LE';
                            botaoLE.className = 'botao-lado';
                            botaoLE.addEventListener('click', (e) => {
                                e.stopPropagation();
                                const desc = produtosPorLinhaMap.get(cod_le) || nome;
                                selecionarProduto(desc, cod_le, containerMaquina);
                                containerMaquina.dataset.tipoSelecao = 'LE';
                                divLados.remove();
                                nomeProduto.classList.remove('selecionado');
                                reiniciarInput();
                            });

                            const botaoLD = document.createElement('button');
                            botaoLD.textContent = 'LD';
                            botaoLD.className = 'botao-lado';
                            botaoLD.addEventListener('click', (e) => {
                                e.stopPropagation();
                                const desc = produtosPorLinhaMap.get(cod_ld) || nome;
                                selecionarProduto(desc, cod_ld, containerMaquina);
                                containerMaquina.dataset.tipoSelecao = 'LD';
                                divLados.remove();
                                nomeProduto.classList.remove('selecionado');
                                reiniciarInput();
                            });

                            const botaoAmbos = document.createElement('button');
                            botaoAmbos.textContent = 'AMBOS';
                            botaoAmbos.className = 'botao-lado';
                            botaoAmbos.addEventListener('click', (e) => {
                                e.stopPropagation();
                                const descLE = produtosPorLinhaMap.get(cod_le) || nome;
                                const descLD = produtosPorLinhaMap.get(cod_ld) || nome;

                                selecionarProduto(descLE, cod_le, containerMaquina);

                                const containerSelecionados = containerMaquina.querySelector('.botoes-uaps-tl-guia-selecionados');
                                if (containerSelecionados) {
                                    const paragrafoLD = document.createElement('p');
                                    paragrafoLD.className = 'botoes-uaps-tl-guia-selecionado-segundo';
                                    paragrafoLD.textContent = descLD;
                                    paragrafoLD.dataset.codigo = cod_ld;
                                    containerSelecionados.appendChild(paragrafoLD);
                                }
                                containerMaquina.dataset.tipoSelecao = 'AMBOS';
                                divLados.remove();
                                nomeProduto.classList.remove('selecionado');
                                reiniciarInput();
                            });

                            divLados.appendChild(botaoLE);
                            divLados.appendChild(botaoLD);
                            divLados.appendChild(botaoAmbos);
                            divProduto.appendChild(divLados);

                        } else {
                            const codigo = cod_le || cod_ld || cod_unico;
                            const descricao = produtosPorLinhaMap.get(codigo) || nome;
                            selecionarProduto(descricao, codigo, containerMaquina);
                            containerMaquina.dataset.tipoSelecao = 'UNICO';
                            nomeProduto.classList.remove('selecionado');
                            reiniciarInput();
                        }
                    });

                    listaProdutos.appendChild(divProduto);
                });
            });

            const btnProdutos = document.querySelectorAll('.nome-produto-selecao');


            saidaListaProdutos.forEach(x => {
                x.addEventListener('click', () => {
                    const div = x.closest('.botoes-uaps-tl-divlista');
                    div.style.display = 'none';
                    overlayLista.style.display = 'none';
                    const containerPai = x.closest('.botoes-uaps-tl-nav');
                    const guiaProduto = containerPai.querySelector('.botoes-uaps-tl-guia');
                    const botaoLinha = containerPai.querySelector('.botoes-uaps-tl-botao');
                    const listaLados = containerPai.querySelector('.lista-lados');
                    inputPesquisa.forEach(input => {
                        input.addEventListener('input', () => { input.value = ""; })
                    })
                    if (listaLados) listaLados.remove();
                    guiaProduto.style.display = 'none';
                    botaoLinha.style.borderRadius = '10px';
                    btnProdutos.forEach(produto => {
                        produto.classList.remove('selecionado');
                    })

                    botaoLinha.classList.remove('botao-uaps-tl-selecionado');
                    const algumSelecionado = Array.from(TodosBotoesProdutosIniciar).some(botao => botao.classList.contains('botao-uaps-tl-selecionado'));
                    btnConfirmarProd.style.display = algumSelecionado ? 'block' : 'none';
                });
            });

            inputPesquisa.forEach(input => {
                input.addEventListener('input', () => {
                    const textoDigitado = input.value.toUpperCase();

                    const botoesProdutos = document.querySelectorAll('.botoes-uaps-tl-produtos-lista');

                    botoesProdutos.forEach(botao => {
                        const texto = botao.textContent.toUpperCase();
                        const cod_LE = (botao.getAttribute('data-cod-le') || '').toUpperCase();
                        const cod_LD = (botao.getAttribute('data-cod-ld') || '').toUpperCase();
                        const cod_Unico = (botao.getAttribute('data-cod-unico') || '').toUpperCase();

                        botao.style.display = texto.includes(textoDigitado) || cod_LE.includes(textoDigitado) || cod_LD.includes(textoDigitado) || cod_Unico.includes(textoDigitado)
                            ? 'block'
                            : 'none';
                    });
                });
            });

        } catch (err) {
            console.error('[API ERRO] carregarProdutosPorMaquina:', err);
            toastr.error('Erro ao carregar produtos. Verifique o console.');
        }
    }



    function selecionarProduto(nome, codigo, container) {
        const guiaSelecionado = container.querySelector('.botoes-uaps-tl-guia-selecionado');
        const listaProdutosDiv = container.querySelector('.botoes-uaps-tl-divlista');
        const guiaProduto = container.querySelector('.botoes-uaps-tl-guia');
        const editarProduto = container.querySelector('.botoes-uaps-tl-guia-editar');
        const contador = container.querySelector('.contador-confirmar-operadores');

        if (guiaSelecionado) {
            guiaSelecionado.classList.remove('produto-unico');
            if (container.dataset.tipoSelecao === 'UNICO') {
                guiaSelecionado.classList.add('produto-unico');
            }
        }

        if (guiaSelecionado) guiaSelecionado.textContent = nome;
        if (guiaSelecionado) guiaSelecionado.dataset.codigo = codigo;

        if (listaProdutosDiv) listaProdutosDiv.style.display = 'none';
        if (guiaProduto) {
            guiaProduto.style.color = 'var(--cor-verde-escuro)';
            guiaProduto.style.boxShadow = 'none';
        }
        if (editarProduto) editarProduto.style.display = 'block';
        if (contador) contador.style.display = 'flex';

        if (typeof overlayLista !== 'undefined' && overlayLista) {
            overlayLista.style.display = 'none';
        }

        console.log(`Produto selecionado: ${nome}, Código: ${codigo}, Tipo: ${container.dataset.tipoSelecao || 'N/A'}`);
    }

    carregarProdutosPorMaquina();




    const botoesPares = document.querySelectorAll('.botao-pares');
    let validacaoProdutosPares = false;

    botoesPares.forEach(btnPar => {
        btnPar.addEventListener('click', () => {

            if (btnPar.classList.contains('botao-pares-selecionado')) {
                btnPar.classList.remove('botao-pares-selecionado');
                validacaoProdutosPares = false;

            } else {
                btnPar.classList.add('botao-pares-selecionado');
                validacaoProdutosPares = true;
            }
        });

    });

    const btnConfirmar = document.getElementById('btn-confirmar');
    const sairBtn = document.getElementById('btn-sair-modal');


    function abrirModalTL(nomeUsuario) {
        nomeUsuarioModalEl.textContent = `Bem-vindo, ${nomeDoTLIdentificado}!`;
        overlay.style.display = 'block';
        asideTeamleader.style.display = 'flex';
    }

    function fecharModal() {
        overlay.style.display = 'none';
        asideTeamleader.style.display = 'none';
        resetarModal();
    }

    function resetarModal() {
        produtoSelecionado = null;
        quantidadeOperadores = 1;
        botoesProduto.forEach(botao => {
            const containerPai = botao.closest('.botoes-uaps-tl-nav');
            const contador = containerPai.querySelector('.contador-confirmar-operadores');
            const guiaProduto = containerPai.querySelector('.botoes-uaps-tl-guia');
            const listaProduto = containerPai.querySelector('.botoes-uaps-tl-divlista');
            const editarProduto = containerPai.querySelector('.botoes-uaps-tl-guia-editar');
            botao.classList.remove('botao-uaps-tl-selecionado');
            contador.style.display = 'none';
            guiaProduto.style.display = 'none';
            listaProduto.style.display = 'none';
            botao.style.borderRadius = '10px 10px 10px 10px';
            containerPai.querySelector('.botoes-uaps-tl-guia-selecionado').textContent = "---";
            guiaProduto.style.color = 'black';
            editarProduto.style.display = 'none';
            guiaProduto.style.boxShadow = '0px 5px 10px 1px rgb(231, 231, 231)';
        });
        btnConfirmar.style.display = 'none';

    }

    // --- LÓGICA DE VERIFICAÇÃO (CHAMADA PELA AÇÃO DO USUÁRIO) ---
    document.querySelectorAll('.contador-confirmar-scroll-diminuir').forEach((btn) => {
        btn.addEventListener('click', () => {
            // Encontra o container pai do contador
            const container = btn.closest('.contador-confirmar-operadores');
            const numeroEl = container.querySelector('.contador-confirmar-numero');

            let quantidade = parseInt(numeroEl.textContent, 10) || 1;
            if (quantidade > 1) {
                quantidade--;
                numeroEl.textContent = quantidade;
            }
        });
    });

    document.querySelectorAll('.contador-confirmar-scroll-aumentar').forEach((btn) => {
        btn.addEventListener('click', () => {
            const container = btn.closest('.contador-confirmar-operadores');
            const numeroEl = container.querySelector('.contador-confirmar-numero');

            let quantidade = parseInt(numeroEl.textContent, 10) || 1;
            quantidade++;
            numeroEl.textContent = quantidade;
        });
    });

    function verificarProdutoSelecionado() {
        if (produtoSelecionado !== null) {
            btnConfirmar.style.display = 'block';
        }
        else {
            btnConfirmar.style.display = 'none';
        }
    }

    const botoesProduto = document.querySelectorAll('.botoes-uaps-tl-botao');

    botoesProduto.forEach((botao) => {

        const containerPai = botao.closest('.botoes-uaps-tl-nav');
        const contador = containerPai.querySelector('.contador-confirmar-operadores');
        const guiaProduto = containerPai.querySelector('.botoes-uaps-tl-guia');
        const listaProduto = containerPai.querySelector('.botoes-uaps-tl-divlista');
        const editarProduto = containerPai.querySelector('.botoes-uaps-tl-guia-editar');

        botao.addEventListener('click', () => {
            if (botao.classList.contains('botao-uaps-tl-selecionado')) {
                botao.classList.remove('botao-uaps-tl-selecionado');
                contador.style.display = 'none';
                guiaProduto.style.display = 'none';
                listaProduto.style.display = 'none';
                botao.style.borderRadius = '10px 10px 10px 10px';
                containerPai.querySelector('.botoes-uaps-tl-guia-selecionado').textContent = "---";
                guiaProduto.style.color = 'black';
                editarProduto.style.display = 'none';
                guiaProduto.style.boxShadow = '0px 5px 10px 1px rgb(231, 231, 231)';
                const paragrafoSegundoLado = containerPai.querySelector('.botoes-uaps-tl-guia-selecionado-segundo');
                if (paragrafoSegundoLado) paragrafoSegundoLado.remove();
            }
            else {
                botao.classList.add('botao-uaps-tl-selecionado');
                botao.style.borderRadius = '10px 10px 0px 0px';
                guiaProduto.style.display = 'inline-flex';
                listaProduto.style.display = 'flex';
                overlayLista.style.display = 'block';

            }
            const algumSelecionado = Array.from(botoesProduto).some(botao =>
                botao.classList.contains('botao-uaps-tl-selecionado')
            );

            if (algumSelecionado) {
                produtoSelecionado = botao.dataset.produto;
            }
            else {
                produtoSelecionado = null;
            }

            verificarProdutoSelecionado();
        });

        editarProduto.addEventListener('click', () => {
            containerPai.querySelector('.botoes-uaps-tl-guia-selecionado').textContent = "---";
            const paragrafoSegundoLado = containerPai.querySelector('.botoes-uaps-tl-guia-selecionado-segundo');
            if (paragrafoSegundoLado) paragrafoSegundoLado.remove();
            guiaProduto.style.color = 'black';
            editarProduto.style.display = 'none';
            guiaProduto.style.display = 'inline-flex';
            listaProduto.style.display = 'flex';
            overlayLista.style.display = 'block';
            contador.style.display = 'none';

            guiaProduto.style.boxShadow = '0px 5px 10px 1px rgb(231, 231, 231)';
        })
    });



    sairBtn.addEventListener('click', fecharModal);
    overlay.addEventListener('click', fecharModal);

    let forExecutado = false;

    btnConfirmar.addEventListener('click', async () => {
        const selecionados = document.querySelectorAll('.botao-uaps-tl-selecionado');
        if (selecionados.length === 0) {
            toastr.error('Selecione pelo menos uma máquina.');
            return;
        }

        const dataAtual = new Date().toISOString().slice(0, 10);
        const turno = turnoAtualEl.textContent;
        const usuario = nomeUsuarioModalEl.textContent.replace('Bem-vindo, ', '').replace('!', '');
        let algumApontamentoFeito = false;

        for (const botao of selecionados) {
            const container = botao.closest('.botoes-uaps-tl-nav');
            const nomeUAP = botao.id;
            const produtoSelecionadoEl = container.querySelector('.botoes-uaps-tl-guia-selecionado');
            const produtoSelecionadoElSegundo = container.querySelector('.botoes-uaps-tl-guia-selecionado-segundo');

            const produtoPrincipalTexto = produtoSelecionadoEl?.textContent.trim() || null;

            if (!produtoPrincipalTexto || produtoPrincipalTexto === '---') {
                toastr.error(`${nomeUAP} sem produto selecionado!`);
                return;
            }

            const tipoSelecao = container.dataset.tipoSelecao;

            let produtoUnico = null;
            let produtoLE = null;
            let produtoLD = null;

            switch (tipoSelecao) {
                case 'LE':
                    produtoLE = produtoPrincipalTexto;
                    break;
                case 'LD':
                    produtoLD = produtoPrincipalTexto;
                    break;
                case 'AMBOS':
                    produtoLE = produtoPrincipalTexto;
                    produtoLD = produtoSelecionadoElSegundo?.textContent.trim() || null;
                    if (!produtoLD) {
                        toastr.error(`Erro: Segundo produto não encontrado para ${nomeUAP} (Ambos os Lados).`);
                        return;
                    }
                    break;
                case 'UNICO':
                    produtoUnico = produtoPrincipalTexto;
                    break;
                default:
                    toastr.error(`Tipo de seleção indefinido para ${nomeUAP}. Por favor, selecione novamente o produto.`);
                    return;
            }

            const contadorEl = container.querySelector('.contador-confirmar-numero');
            const quantidadeEsperada = contadorEl ? parseInt(contadorEl.textContent.trim(), 10) : 0;

            console.log(REDoTLIdentificado)

            const respostaApontamento = await apontamentoTeamLeader(
                turno,
                REDoTLIdentificado,
                nomeDoTLIdentificado.toUpperCase(),
                'TL',
                nomeUAP,
                quantidadeEsperada,
                "Produzindo",
                produtoLE,
                produtoLD,
                produtoUnico
            );

            if (!respostaApontamento.sucesso) {
                toastr.error(`Erro no apontamento de ${nomeUAP}: ${respostaApontamento.mensagem}`);
                return;
            }

            console.log(`Apontamento para ${nomeUAP} realizado.`);
            algumApontamentoFeito = true;
        }

        if (algumApontamentoFeito) {
            carregarContagemOperadores();
            atualizarEsperadoEColorirLinhas()
            toastr.success('Apontamentos realizados com sucesso!');
            fecharModal();
        }
    });


    /*******************************************************/
    /*****************ASIDE TEAMLEADER**********************/
    /*******************************************************/
    agendarOperadores(carregarOperadores, maquinas);

    window.onload = () => {
        atualizarEsperadoEColorirLinhas();
    }
});