import { apontamentoOperador, apontamentoTeamLeader, registrarSaidaAutomaticaParaLinha } from '/js/funcoes.js';
import { agendarOperadores, carregarOperadores } from '/js/statusOp.js';
import { IpMonitor } from '/js/leituraCartao.js';


document.addEventListener('DOMContentLoaded', () => {

    window.addEventListener('DOMContentLoaded', async () => {

        const overlay = document.getElementById('loadingOverlay');

        await carregarDadosIniciais();


        overlay.classList.add('fade-out');

        setTimeout(() => {
            overlay.style.display = 'none';
        }, 500);
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


    //Aside Team Leader
    const numeroEl = document.getElementById('numero');
    const btnConfirmar = document.getElementById('btn-confirmar');
    const botoesMaquinasTl = document.querySelectorAll(".botoes-injetoras-botao-tl");
    const sairBtn = document.getElementById('btn-sair-modal');
    const asideTeamleader = document.getElementById('aside-teamleader');
    const overlayTeamLeader = document.getElementById('overlay-teamleader');
    const nomeUsuarioModalEl = document.getElementById('nome-usuario-modal');
    const asideTeamLeader = document.querySelector('.aside-teamleader');


    // --- ELEMENTOS DO MODAL DINÂMICO ---
    const overlay = document.querySelector('.overlay');
    const sairOperadorBtn = document.querySelector('.sair-operador');
    const botoesOperacao = Array.from(document.querySelectorAll('.botoes-injetoras-botao'));
    const corredorGuia = document.querySelector('.corredor-guia');
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


    const maquinas = ['s.I21h1k530', 's.I22h1k1300', 's.I23h3k1000', 's.I24h1k1300', 's.I25h3k1000', 's.I26h1k530', 's.I27h2k1000', 's.I29h1k1300', 's.I30h2k1700',
        's.I31h2k1000', 's.I32h1k1000', 's.I33h2k1000', 's.I34h1k1300'];



    async function atualizarEsperadoEColorirLinhas() {
        try {
            const response = await fetch('/api/apontamentos/getesperados');

            if (!response.ok) {
                console.warn('Falha ao buscar operadores esperados.');
                return;
            }

            const dados = await response.json();

            // Atualiza os elementos com os valores esperados

            maquinas.forEach(maquina => {
                const elemento = document.getElementById(`esperado-${maquina}`);
                if (elemento) {
                    const esperadoObj = dados[`esperado${maquina}`];
                    elemento.textContent = esperadoObj?.esperado ?? '0';
                }
            });

            maquinas.forEach(maquina => {
                const chave = 'esperado' + maquina;
                const esperadoObj = dados[chave];
                const valorEsperado = parseInt(esperadoObj?.esperado ?? '0', 10);
                const botao = document.querySelector(`[data-produto="${maquina}"]`);
                const botaoOperador = document.querySelector(`[data-injetora="${maquina}"]`);
                const maquinaEncerrar = document.querySelector(`[data-finalizar="${maquina}"]`);

                botaoOperador.classList.toggle('botao-desabilitado', valorEsperado === 0);

                if (botao) {
                    botao.style.display = valorEsperado === 0 ? 'flex' : 'none';
                    botaoOperador.classList.toggle('botao-desabilitado', valorEsperado === 0);
                    maquinaEncerrar.style.display = valorEsperado === 0 ? 'none' : 'flex';
                }
            });



            const cards = document.querySelectorAll('.cards-injetoras');

            cards.forEach(card => {
                const reaisEl = card.querySelector('.OperadoresNaLinha');
                const EsperadoEl = card.querySelector('.quantidadeOperadores');
                const cardOperadoresEl = card.querySelector('.cards-Operadores');

                if (!reaisEl || !EsperadoEl || !cardOperadoresEl) return;

                const operadoresReais = parseInt(reaisEl.textContent.trim(), 10) || 0;
                const operadoresEsperados = parseInt(EsperadoEl.textContent.trim(), 10) || 0;

                const idReal = reaisEl?.id;
                if (!idReal) return;

                const nomeLinha = idReal.replace('real-', '');
                const listaOperadores = document.querySelector(`[data-lista="${nomeLinha}"]`);
                if (!listaOperadores) return;
                const listaOperadoresLinha = listaOperadores.querySelector('.lista-operadores-linha-nome');
                if (!listaOperadoresLinha) return;

                listaOperadoresLinha.classList.remove(
                    'lista-operadores-linha-nome-amarelo',
                    'lista-operadores-linha-nome-verde',
                    'lista-operadores-linha-nome-vermelho'
                );

                let novaClasseOperador = '';

                // Limpa classes anteriores
                cardOperadoresEl.classList.remove('card-verde', 'card-vermelho', 'card-cinza', 'card-amarelo');
                cardOperadoresEl.style.backgroundColor = '';
                card.style.color = '';

                // Lógica de cor
                if (operadoresEsperados === 0) {
                    cardOperadoresEl.classList.add('card-cinza');
                    card.style.color = 'gray';
                } else if (operadoresReais === operadoresEsperados) {
                    novaClasseOperador = 'lista-operadores-linha-nome-verde';
                    cardOperadoresEl.classList.add('card-verde');
                    card.style.color = 'green';
                } else if (operadoresReais > operadoresEsperados) {
                    novaClasseOperador = 'lista-operadores-linha-nome-vermelho';
                    cardOperadoresEl.classList.add('card-vermelho');
                    card.style.color = 'red';
                } else {
                    novaClasseOperador = 'lista-operadores-linha-nome-amarelo';
                    cardOperadoresEl.classList.add('card-amarelo');
                    card.style.color = 'rgb(209, 171, 0)';
                }

                if (novaClasseOperador) {
                    listaOperadoresLinha.classList.add(novaClasseOperador);
                }


            });

        } catch (error) {
            console.error('Erro no ciclo de atualização de esperado e cores:', error);
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
        // --- SEGUNDO FETCH: metalização ---
        try {
            const responseInj = await fetch('/api/apontamentos/getOperadoresApontados');

            if (!responseInj.ok) throw new Error('Erro ao buscar operadores da metalização');

            const dados = await responseInj.json();

            dados.forEach(({ Maquina, Qntd_Real }) => {
                if (!maquinas.includes(Maquina)) return;

                // Atualiza valor nos cards (DOM correto)
                const elemento = document.getElementById(`real-${Maquina}`);
                if (elemento) {
                    elemento.textContent = Qntd_Real;
                } else {
                    console.warn(`Elemento .real-${Maquina} não encontrado no DOM`);
                }

                // Se você tiver algum botão com data-injetora (fora do card), atualize também
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

    carregarDadosIniciais();

    const API_BASE_URL = '/api';
    const IP_ALVO_MONITORADO = '10.109.133.242';

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
                        atualizarEsperadoEColorirLinhas();
                        carregarDadosIniciais();
                        document.querySelector('.popup-saida').style.display = 'flex';
                        document.querySelector('.overlay-popup').style.display = 'block';
                        document.querySelector('.popup-saida-nome').textContent = nome;
                    } else {
                        alert(`Erro ao registrar saída: ${response.mensagem}`);
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
        if (overlay) overlay.style.display = 'none';
        botoesOperacao.forEach(b => b.classList.remove('botao-nao-selecionado'));
        if (botaoConfirmarOperacao) botaoConfirmarOperacao.style.display = 'none';
        modalAberto = false;
        if (pollingInterval) clearInterval(pollingInterval);
    }
    // --- EVENT LISTENERS ---
    if (sairOperadorBtn) sairOperadorBtn.addEventListener('click', fecharModalOperador);


    botoesOperacao.forEach(botao => {
        botao.addEventListener('click', () => {
            botoesOperacao.forEach(b => b.classList.add('botao-nao-selecionado'));
            corredorGuia.style.opacity = '0.3';
            botao.classList.remove('botao-nao-selecionado');
            if (botaoConfirmarOperacao) botaoConfirmarOperacao.style.display = 'block';
        });
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
            atualizarEsperadoEColorirLinhas();
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

    function carregarDadosIniciais() {
        atualizarEsperadoEColorirLinhas();
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
                console.log(`${data.message}`);
                await carregarContagemOperadores();
                atualizarEsperadoEColorirLinhas();
            } else {
                const errData = await response.json().catch(() => ({}));
                toastr.error(`Erro ao registrar saídas pendentes para ${nomeMaquina}: ` + (errData.error || response.statusText));
            }
        } catch (err) {
            alert(`Erro na requisição para ${nomeMaquina}: ` + err.message);
        }
    };

    async function enviarFinalizacaoParaBanco(nomeMaquina) {
        if (!nomeDoTLIdentificado) {
            alert("Erro crítico: Nome do Team Leader não encontrado. Tente novamente.");
            return;
        }

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
            toastr.success(`${nomeMaquina} finalizada com sucesso!`);
            await atualizarEsperadoEColorirLinhas();
            registrarSaidaAutomaticaParaLinha(nomeMaquina);
            carregarContagemOperadores();
        } else {
            alert(`Erro ao finalizar produção: ${response.mensagem}`);
        }

    }

    const cardEncerrarMetalizadoras = document.querySelector('.finalizacao-injetoras');
    const overlayEncerrarMetalizadoras = document.querySelector('.overlay-finalizacao');
    const textOlaEncerrarMetalizadoras = document.querySelector('.texto-Ola-encerramento');
    const botoesEncerrarMetalizadoras = Array.from(document.querySelectorAll('.finalizacao-injetoras-botoes-botao'));
    let validacaoSelecaoTotal = false;
    const botaoSelecionarEncerrar = document.querySelector('.finalizacao-injetoras-confirmacao-select');
    const botaoFinalizarEncerrar = document.querySelector('.finalizacao-injetoras-confirmacao-finalizar');
    const fecharCardEncerrarMetalizadoras = document.querySelector('.finalizacao-injetoras-header-close');

    let produtoSelecionadoEncerrar = null;

    function abrirModalEncerrar() {
        textOlaEncerrarMetalizadoras.textContent = nomeDoTLIdentificado;
        cardEncerrarMetalizadoras.style.display = 'block';
        overlayEncerrarMetalizadoras.style.display = 'block';
    }

    function resetarModalEncerrar() {
        botoesEncerrarMetalizadoras.forEach(met => {
            validacaoSelecaoTotal = false;
            met.classList.remove('finalizacao-injetoras-botoes-botao-selecionado');
            botaoSelecionarEncerrar.innerHTML = 'SELECIONAR TODAS <img src="/images/selecionar-todos.svg" width="25" alt="">';
            cardEncerrarMetalizadoras.style.display = 'none';
            overlayEncerrarMetalizadoras.style.display = 'none';
            encerrarPopup.style.display = 'none';
            document.querySelector('.overlay-saida').style.display = 'none'
            validacaoEncerrarProd = false;
            botaoFinalizarEncerrar.style.display = 'none';
        })
    }

    fecharCardEncerrarMetalizadoras.addEventListener('click', resetarModalEncerrar);

    function verificarSelecaoTotalEncerramento() {
        const botoesArray = Array.from(botoesEncerrarMetalizadoras);
        const todosSelecionados = Array.from(botoesEncerrarMetalizadoras)
            .filter(botao => window.getComputedStyle(botao).display !== 'none')
            .every(botao => botao.classList.contains('finalizacao-injetoras-botoes-botao-selecionado'));

        if (todosSelecionados) {
            botaoSelecionarEncerrar.innerHTML = 'REMOVER SELEÇÕES <img src="/images/remover-selecoes.svg" width="25" alt="">';
            validacaoSelecaoTotal = true;
            produtoSelecionadoEncerrar = "selecionado todos";
        } else {
            botaoSelecionarEncerrar.innerHTML = 'SELECIONAR TODAS <img src="/images/selecionar-todos.svg" width="25" alt="">';
            validacaoSelecaoTotal = false;
        }


        const algumSelecionado = Array.from(botoesEncerrarMetalizadoras).some(botao => botao.classList.contains('finalizacao-injetoras-botoes-botao-selecionado'));
        botaoFinalizarEncerrar.style.display = algumSelecionado ? 'block' : 'none';
    }


    botoesEncerrarMetalizadoras.forEach((botao) => {
        botao.addEventListener('click', () => {
            if (botao.classList.contains('finalizacao-injetoras-botoes-botao-selecionado')) {
                botao.classList.remove('finalizacao-injetoras-botoes-botao-selecionado');
            } else {
                botao.classList.add('finalizacao-injetoras-botoes-botao-selecionado');
            }
            verificarSelecaoTotalEncerramento();
        });
    });


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


    botaoFinalizarEncerrar.addEventListener('click', () => {
        const botoesSelecionadosEncerrar = Array.from(document.querySelectorAll('.finalizacao-injetoras-botoes-botao-selecionado')).filter(el => getComputedStyle(el).display !== 'none');
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


    function abrirModalTL(nomeUsuario) {
        asideTeamLeader.style.display = 'flex';
        nomeUsuarioModalEl.textContent = `Bem-vindo, ${nomeUsuario}!`;
        overlayTeamLeader.style.display = 'block';
    }

    // --- ESTADO DA APLICAÇÃO ---
    let quantidadeOperadores = 1;
    let produtoSelecionado = null;
    const botaoSelecionar = document.querySelector('.selecionar-todas');
    let validacaoSelecaoTotalTL = false;

    // --- FUNÇÕES DE INTERFACE DO MODAL ---
    function verificarSelecaoTotal() {
        const todosSelecionados = Array.from(botoesMaquinasTl).every(botao =>
            botao.classList.contains('botao-injetoras-selecionado-tl')
        );

        if (todosSelecionados) {
            botaoSelecionar.innerHTML = 'REMOVER SELEÇÕES <img src="/images/remover-selecoes.svg" width="25" alt="">';
            validacaoSelecaoTotalTL = true;
        } else {
            botaoSelecionar.innerHTML = 'SELECIONAR TODAS <img src="/images/selecionar-todos.svg" width="25" alt="">';
            validacaoSelecaoTotalTL = false;
        }
    }

    botaoSelecionar.addEventListener('click', () => {
        const todosSelecionados = Array.from(botoesMaquinasTl).every(botao =>
            botao.classList.contains('botao-injetoras-selecionado-tl')
        );

        if (todosSelecionados) {
            botoesMaquinasTl.forEach(botao => {
                botao.classList.remove('botao-injetoras-selecionado-tl');
            });
            botaoSelecionar.innerHTML = 'SELECIONAR TODAS <img src="/images/selecionar-todos.svg" width="25" alt="">';
            validacaoSelecaoTotalTL = false;
            btnConfirmar.style.display = 'none';
        } else {
            botoesMaquinasTl.forEach(botao => {
                if (!botao.classList.contains('botao-injetoras-selecionado-tl')) {
                    botao.classList.add('botao-injetoras-selecionado-tl');
                    btnConfirmar.style.display = 'block';
                }
            });
            botaoSelecionar.innerHTML = 'REMOVER SELEÇÕES <img src="/images/remover-selecoes.svg" width="25" alt="">';
            validacaoSelecaoTotalTL = true;

        }
    });

    function resetarModal() {
        produtoSelecionado = null;
        quantidadeOperadores = 1;
        botoesMaquinasTl.forEach(b => b.classList.remove('botao-injetoras-selecionado-tl'));
        btnConfirmar.style.display = 'none';
        asideTeamLeader.style.display = 'none';
        overlayTeamLeader.style.display = 'none';
    }

    function verificarProdutoSelecionado() {
        if (produtoSelecionado !== null) {
            btnConfirmar.style.display = 'block';
        }
        else {
            btnConfirmar.style.display = 'none';
        }
    }

    botoesMaquinasTl.forEach((botao) => {

        botao.addEventListener('click', () => {
            if (botao.classList.contains('botao-injetoras-selecionado-tl')) {
                botao.classList.remove('botao-injetoras-selecionado-tl');
            }
            else {
                botao.classList.add('botao-injetoras-selecionado-tl');

            }
            const algumSelecionado = Array.from(botoesMaquinasTl).some(botao =>
                botao.classList.contains('botao-injetoras-selecionado-tl')
            );

            if (algumSelecionado) {
                produtoSelecionado = botao.dataset.produto;
            }
            else {
                produtoSelecionado = null;
            }
            verificarSelecaoTotal()
            verificarProdutoSelecionado();
        });
    });

    const btnFecharAsideTL = document.querySelector('.fechar-asideteamleader');

    btnFecharAsideTL.addEventListener('click', resetarModal);

    // 3. Botão de confirmação que envia os dados para o backend
    btnConfirmar.addEventListener('click', async () => {
        const selecionados = Array.from(document.querySelectorAll('.botao-injetoras-selecionado-tl')).filter(el => getComputedStyle(el).display !== 'none');


        if (selecionados.Iength === 0) {
            alert('Selecione pelo menos uma máquina.');
            return;
        }

        for (const botao of selecionados) {
            const nomeInjetora = botao.dataset.produto;

            const response = await apontamentoTeamLeader(
                turnoAtualEl.textContent,
                RETLIdentificado,
                nomeDoTLIdentificado.toUpperCase(),
                "TL",
                nomeInjetora,
                1,
                "Produzindo",
                null,
                null,
                null
            );
            if (response.sucesso) {
                console.log(`Apontamento para ${nomeInjetora} realizado.`);
                toastr.success(`${nomeInjetora} iniciada com sucesso!`);
            } else {
                alert(`Erro no apontamento de ${nomeInjetora}: ${response.mensagem}`);
                return;
            }
        }
        await carregarContagemOperadores();
        atualizarEsperadoEColorirLinhas();
        resetarModal();

    });


    /*******************************************************/
    /*****************ASIDE TEAMLEADER**********************/
    /*******************************************************/

    agendarOperadores(carregarOperadores, maquinas);

    window.onload = () => {
        atualizarEsperadoEColorirLinhas();
    }
});