import { apontamentoOperador, apontamentoTeamLeader, registrarSaidaAutomaticaParaLinha } from '/js/funcoes.js';
import { agendarOperadores, carregarOperadores } from '/js/statusOp.js';
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
    const botoesMaquinasTl = document.querySelectorAll(".botoes-metalizadoras-botao-tl");
    const sairBtn = document.getElementById('btn-sair-modal');
    const asideTeamleader = document.getElementById('aside-teamleader');
    const overlayTeamLeader = document.getElementById('overlay-teamleader');
    const nomeUsuarioModalEl = document.getElementById('nome-usuario-modal');
    const asideTeamLeader = document.querySelector('.aside-teamleader');


    // --- ELEMENTOS DO MODAL DINÂMICO ---
    const overlay = document.querySelector('.overlay');
    const sairOperadorBtn = document.querySelector('.sair-operador');
    const botoesOperacao = Array.from(document.querySelectorAll('.botoes-metalizadoras-botao, .solda-maquina'));
    const botaoConfirmarOperacao = document.querySelector('.bloco-confirmar-botao');
    const nomeOperadorModalEl = document.querySelector('.bloco-boasvindas .texto-boasvindas-aside');

    // --- DADOS DA SESSÃO E ESTADO ---
    const nomeDaLinha = document.querySelector('.setor').textContent;
    let ultimoAcessoMODVerificado = null;
    let pollingInterval;
    let modalAberto = false;
    let nomeOperadorCartao = "";
    let REOperadorCartao = null;

    const realKolzer1 = document.getElementById('real-s.MT02');
    const realKolzer2 = document.getElementById('real-s.MT03');
    const realPV = document.getElementById('real-s.MT01');
    const realBuhler = document.getElementById('real-s.MT04');

    const maquinas = ['s.MT02', 's.MT03', 's.MT01', 's.MT04'];


    const listaOperadoresTela = document.querySelector('.lista-operadores');

    document.querySelector('.abrir-lista-operadores').addEventListener('click', () => {
        listaOperadoresTela.style.display = 'flex';
    })

    document.querySelector('.lista-operadores-sair').addEventListener('click', () => {
        listaOperadoresTela.style.display = 'none';
    })

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
                    const btnMet = document.querySelector(`[data-metalizadora="${maquina}"]`);
                    const esperadoOp = btnMet.querySelector('.text-qntOperadores-metalizadora:last-of-type');
                    esperadoOp.textContent = esperadoObj?.esperado ?? '0';
                }
                const botao = document.querySelector(`[data-produto="${maquina}"]`);
                const chave = 'esperado' + maquina;

                const esperadoObj = dados[chave];
                const valorEsperado = parseInt(esperadoObj?.esperado ?? '0', 10);
                const maquinaEncerrar = document.querySelector(`[data-finalizar="${maquina}"]`);
                botao.style.display = valorEsperado === 0 ? 'flex' : 'none';
                maquinaEncerrar.style.display = valorEsperado === 0 ? 'none' : 'flex';
            });

            const cards = document.querySelectorAll('.cards-metalizadoras');

            cards.forEach(card => {
                const ReaisEl = card.querySelector('.OperadoresNaLinha');
                const EsperadoEl = card.querySelector('.quantidadeOperadores');
                const cardOperadoresEl = card.querySelector('.cards-Operadores');
                const alertIcon = card.querySelector('.alert-icon');

                if (!ReaisEl || !EsperadoEl || !cardOperadoresEl) return;

                const operadoresReais = parseInt(ReaisEl.textContent.trim(), 10) || 0;
                const operadoresEsperados = parseInt(EsperadoEl.textContent.trim(), 10) || 0;

                // Limpa classes anteriores
                cardOperadoresEl.classList.remove('card-verde', 'card-vermelho', 'card-cinza', 'card-amarelo');
                cardOperadoresEl.style.backgroundColor = '';
                card.style.color = '';

                const idReal = ReaisEl?.id;
                if (!idReal) return;

                const nomeLinha = idReal.replace('real-', '');

                const listaOperadores = document.querySelector(`[data-lista="${nomeLinha}"]`);
                if (!listaOperadores) return;

                const listaOperadoresLinha = listaOperadores.querySelector('.lista-operadores-linha-nome');
                if (!listaOperadoresLinha) return;

                const btnLinha = document.querySelector(`[data-metalizadora="${nomeLinha}"]`);
                btnLinha.classList.remove('operacao-verde', 'operacao-vermelho', 'botao-desabilitado');

                listaOperadoresLinha.classList.remove(
                    'lista-operadores-linha-nome-amarelo',
                    'lista-operadores-linha-nome-verde',
                    'lista-operadores-linha-nome-vermelho'
                );

                // Lógica de cor
                if (operadoresEsperados === 0) {
                    btnLinha.classList.add('botao-desabilitado');
                    cardOperadoresEl.classList.add('card-cinza');
                    card.style.color = 'gray';
                }
                else if (operadoresReais === operadoresEsperados) {
                    btnLinha.classList.add('operacao-verde');
                    listaOperadoresLinha.classList.add('lista-operadores-linha-nome-verde');
                    cardOperadoresEl.classList.add('card-verde');
                    card.style.color = 'green';
                }
                else if (operadoresReais > operadoresEsperados) {
                    btnLinha.classList.add('operacao-vermelho');
                    listaOperadoresLinha.classList.add('lista-operadores-linha-nome-vermelho');
                    cardOperadoresEl.classList.add('card-vermelho');
                    card.style.color = 'red';
                }
                else {
                    listaOperadoresLinha.classList.add('lista-operadores-linha-nome-amarelo');
                    cardOperadoresEl.classList.add('card-amarelo');
                    card.style.color = 'rgb(209, 171, 0)';
                }

                // Exibe ou oculta alerta
                if (operadoresEsperados > 2) {
                    alertIcon.style.display = 'block';
                } else {
                    alertIcon.style.display = 'none';
                }
            });
            carregarOperadores(maquinas);
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

    async function atualizarOperadoresPorLinha(contagemMap) {
        const mapaElementos = {
            's.MT02': document.querySelector('.cards-metalizadoras:nth-of-type(1) .OperadoresNaLinha'),
            's.MT03': document.querySelector('.cards-metalizadoras:nth-of-type(2) .OperadoresNaLinha'),
            's.MT01': document.querySelector('.cards-metalizadoras:nth-of-type(3) .OperadoresNaLinha'),
            's.MT04': document.querySelector('.cards-metalizadoras:nth-of-type(4) .OperadoresNaLinha'),
        };

        Object.entries(mapaElementos).forEach(([nome, el]) => {
            const total = contagemMap[nome] || 0;
            if (el) el.textContent = total;
        });
    }

    async function carregarContagemOperadores() {
        if (!nomeDaLinha) return; // Usa a variável ao invés do elemento do DOM

        try {
            // Primeiro fetch - pegar contagem operadores por máquina
            const response = await fetch(`/api/apontamentos/operador/hoje?linha=${encodeURIComponent(nomeDaLinha)}`);
            if (!response.ok) {
                console.error("Falha ao buscar contagem de operadores. Status:", response.status);
                return;
            }

            const apontamentos = await response.json();

            const contagemMap = apontamentos.reduce((map, item) => {
                map[item.Operacao] = item.Qntd_Real;
                return map;
            }, {});

            let totalOperadoresNaLinha = 0;
            botoesOperacao.forEach(botao => {
                const operacaoNome = botao.dataset.metalizadora; // verificar se metalizadora é o certo
                const contagem = contagemMap[operacaoNome] || 0;
                totalOperadoresNaLinha += contagem;
                const [opAtuaisEl] = botao.querySelectorAll('.text-qntOperadores-metalizadora');
                if (opAtuaisEl) opAtuaisEl.textContent = contagem;
            });

            if (operadoresNaLinhaEl) {
                operadoresNaLinhaEl.textContent = totalOperadoresNaLinha;
            }
            await atualizarOperadoresPorLinha(contagemMap);
            atualizarEsperadoEColorirLinhas();

        } catch (error) {
            console.error("Erro ao carregar contagem de operadores:", error);
        }

        try {
            const response = await fetch('/api/apontamentos/getOperadoresApontados');

            if (!response.ok) {
                throw new Error('Erro ao buscar último registro');
            }

            const dados = await response.json();

            console.log('Último registro:', dados);
            const realKolzer1Select = document.getElementById('realSelect-s.MT02');
            const realKolzer2Select = document.getElementById('realSelect-s.MT03');
            const realPVSelect = document.getElementById('realSelect-s.MT01');
            const realBuhlerSelect = document.getElementById('realSelect-s.MT04');

            dados.forEach(({ Maquina, Qntd_Real }) => {
                switch (Maquina) {
                    case 's.MT02':
                        realKolzer1.textContent = Qntd_Real;
                        realKolzer1Select.textContent = Qntd_Real;
                        break;
                    case 's.MT03':
                        realKolzer2.textContent = Qntd_Real;
                        realKolzer2Select.textContent = Qntd_Real;
                        break;
                    case 's.MT01':
                        realPV.textContent = Qntd_Real;
                        realPVSelect.textContent = Qntd_Real;
                        break;
                    case 's.MT04':
                        realBuhler.textContent = Qntd_Real;
                        realBuhlerSelect.textContent = Qntd_Real;
                        break;
                    default:
                    // opcional: console.warn('Máquina não reconhecida:', Maquina);
                }
            });

        } catch (error) {
            console.error('Erro ao buscar dados do log:', error);
        }
        atualizarEsperadoEColorirLinhas();
    };

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
            botao.classList.remove('botao-nao-selecionado');
            if (botaoConfirmarOperacao) botaoConfirmarOperacao.style.display = 'block';
        });
    });

    if (botaoConfirmarOperacao) botaoConfirmarOperacao.addEventListener('click', async () => {
        const botaoSelecionado = botoesOperacao.find(b => !b.classList.contains('botao-nao-selecionado'));
        if (!botaoSelecionado) return;
        if (botaoConfirmarOperacao.disabled) return;

        botaoConfirmarOperacao.disabled = true;

        const pEsperadoEl = botaoSelecionado.querySelector('.text-qntOperadores-metalizadora:last-of-type');
        let produto = "";
        const operacao = botaoSelecionado.dataset.metalizadora;

        const resposta = await fetch('/api/apontamentos/getesperados');

        if (!resposta.ok) {
            console.warn('Falha ao buscar operadores esperados.');
            botaoConfirmarOperacao.disabled = false;
            return;
        }

        const dados = await resposta.json();


        const esperadoObj = dados[`esperado${operacao}`];

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
            esperadoObj.esperado, // Usa a variável ao invés do elemento do DOM
            operacao,
            'Entrada',
            null,
            null,
            null
        );

        if (response.mensagem) {
            document.querySelector('.popup-entrada').style.display = 'flex';
            document.querySelector('.overlay-popup').style.display = 'block';
            document.querySelector('.popup-entrada-nome').textContent = nomeOperadorCartao;
            setTimeout(DesaparecerPopUp, 3000);
            carregarDadosIniciais();
            fecharModalOperador();
            botaoConfirmarOperacao.textContent = 'Confirmar';
            botaoConfirmarOperacao.disabled = false;
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

    let nomeDoTLIdentificado = null;
    let RETLIdentificado = null;


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
    const IP_ALVO_MONITORADO = '10.109.140.49'; //226

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

    // abrirModalOperador("Jonathas");

    // --- EVENTOS DO MODAL DE CONFIRMAÇÃO DE SAÍDA ---

    async function carregarDadosIniciais() {
        await carregarContagemOperadores();
        atualizarEsperadoEColorirLinhas();
        atualizarEsperadoEColorirLinhas();
    }

    async function enviarFinalizacaoParaBanco(nomeMaquina) {
        if (!nomeDoTLIdentificado) {
            toastr.error("Erro crítico: Nome do Team Leader não encontrado. Tente novamente.");
            return;
        }

        const maquina = nomeMaquina;
        /* const idMaquinaSelecionada = document.getElementById(nomeMaquina);
        idMaquinaSelecionada.style.display = 'none'; */
        console.log("Esse é o resultado de nomeMaquina: " + nomeMaquina);

        const resposta = await fetch('/api/apontamentos/getesperados');

        if (!resposta.ok) {
            console.warn('Falha ao buscar operadores esperados.');
            return;
        }

        const dados = await resposta.json();

        const esperadoObj = dados[`esperado${nomeMaquina}`];

        // Cria o payload para a NOVA linha de finalização
        const response = await apontamentoTeamLeader(
            turnoAtualEl.textContent,
            RETLIdentificado,
            nomeDoTLIdentificado.toUpperCase(),
            "TL",
            maquina,
            esperadoObj.esperado,
            "Finalizado",
            null,
            null,
            null

        )
        if (response.sucesso) {
            toastr.success(maquina + ' finalizada com sucesso!');
            await atualizarEsperadoEColorirLinhas();
            registrarSaidaAutomaticaParaLinha(maquina);
            carregarContagemOperadores();
        } else {
            alert(`Erro ao finalizar produção: ${response.mensagem}`);
        }
    }

    const cardEncerrarMetalizadoras = document.querySelector('.finalizacao-metalizadoras');
    const overlayEncerrarMetalizadoras = document.querySelector('.overlay-finalizacao');
    const textOlaEncerrarMetalizadoras = document.querySelector('.texto-Ola-encerramento');
    const botoesEncerrarMetalizadoras = document.querySelectorAll('.finalizacao-metalizadoras-botoes-botao');
    let validacaoSelecaoTotal = false;
    const botaoSelecionarEncerrar = document.querySelector('.finalizacao-metalizadoras-confirmacao-select');
    const botaoFinalizarEncerrar = document.querySelector('.finalizacao-metalizadoras-confirmacao-finalizar');
    const fecharCardEncerrarMetalizadoras = document.querySelector('.finalizacao-metalizadoras-header-close');

    function verificarSelecaoTotal() {
        const todosSelecionados = Array.from(botoesEncerrarMetalizadoras).every(botao =>
            botao.classList.contains('finalizacao-metalizadoras-botoes-botao-selecionado')
        );

        if (todosSelecionados) {
            botaoSelecionarEncerrar.innerHTML = 'REMOVER SELEÇÕES <img src="/images/remover-selecoes.svg" width="25" alt="">';
            validacaoSelecaoTotal = true;
        } else {
            botaoSelecionarEncerrar.innerHTML = 'SELECIONAR TODAS <img src="/images/selecionar-todos.svg" width="25" alt="">';
            validacaoSelecaoTotal = false;
        }
    }

    function abrirModalEncerrar() {
        textOlaEncerrarMetalizadoras.textContent = nomeDoTLIdentificado;
        cardEncerrarMetalizadoras.style.display = 'block';
        overlayEncerrarMetalizadoras.style.display = 'block';
    }

    function resetarModalEncerrar() {
        botoesEncerrarMetalizadoras.forEach(met => {
            validacaoSelecaoTotal = false;
            met.classList.remove('finalizacao-metalizadoras-botoes-botao-selecionado');
            botaoSelecionarEncerrar.innerHTML = 'SELECIONAR TODAS <img src="/images/selecionar-todos.svg" width="25" alt="">';
            cardEncerrarMetalizadoras.style.display = 'none';
            overlayEncerrarMetalizadoras.style.display = 'none';
            encerrarPopup.style.display = 'none';
            document.querySelector('.overlay-saida').style.display = 'none'
            validacaoEncerrarProd = false;
        })
    }

    fecharCardEncerrarMetalizadoras.addEventListener('click', resetarModalEncerrar);

    botoesEncerrarMetalizadoras.forEach(botao => {
        botao.addEventListener('click', () => {
            botao.classList.toggle('finalizacao-metalizadoras-botoes-botao-selecionado');
            verificarSelecaoTotal();
        });
    })


    botaoSelecionarEncerrar.addEventListener('click', () => {
        const todosSelecionados = Array.from(botoesEncerrarMetalizadoras).every(botao =>
            botao.classList.contains('finalizacao-metalizadoras-botoes-botao-selecionado')
        );

        if (todosSelecionados) {
            botoesEncerrarMetalizadoras.forEach(botao => {
                botao.classList.remove('finalizacao-metalizadoras-botoes-botao-selecionado');
            });
            botaoSelecionarEncerrar.innerHTML = 'SELECIONAR TODAS <img src="/images/selecionar-todos.svg" width="25" alt="">';
            validacaoSelecaoTotal = false;
        } else {
            botoesEncerrarMetalizadoras.forEach(botao => {
                if (!botao.classList.contains('finalizacao-metalizadoras-botoes-botao-selecionado')) {
                    botao.classList.add('finalizacao-metalizadoras-botoes-botao-selecionado');
                }
            });
            botaoSelecionarEncerrar.innerHTML = 'REMOVER SELEÇÕES <img src="/images/remover-selecoes.svg" width="25" alt="">';
            validacaoSelecaoTotal = true;
        }
    });

    botaoFinalizarEncerrar.addEventListener('click', () => {
        const botoesSelecionadosEncerrar = document.querySelectorAll('.finalizacao-metalizadoras-botoes-botao-selecionado');
        botoesSelecionadosEncerrar.forEach(maquina => {
            const nomeMaquina = maquina.dataset.finalizar;
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

    // --- FUNÇÕES DE INTERFACE DO MODAL ---

    function fecharModal() {
        overlayTeamLeader.style.display = 'none';
        asideTeamleader.style.display = 'none';
        resetarModal();
    }

    //abrirModal('Jonathas');


    function resetarModal() {
        produtoSelecionado = null;
        quantidadeOperadores = 1;
        botoesMaquinasTl.forEach(b => b.classList.remove('botao-metalizadoras-selecionado-tl'));
        btnConfirmar.style.display = 'none';
    }

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

    botoesMaquinasTl.forEach((botao) => {

        const containerPai = botao.closest('.botoes-metalizadoras-nav');
        const contador = containerPai.querySelector('.contador-confirmar-operadores');

        botao.addEventListener('click', () => {
            if (botao.classList.contains('botao-metalizadoras-selecionado-tl')) {
                botao.classList.remove('botao-metalizadoras-selecionado-tl');
                contador.style.display = 'none';
                botao.style.borderRadius = '10px 10px 10px 10px';
            }
            else {
                botao.classList.add('botao-metalizadoras-selecionado-tl');
                contador.style.display = 'flex';
                botao.style.borderRadius = '10px 10px 0px 0px';

            }
            const algumSelecionado = Array.from(botoesMaquinasTl).some(botao =>
                botao.classList.contains('botao-metalizadoras-selecionado-tl')
            );

            if (algumSelecionado) {
                produtoSelecionado = botao.dataset.produto;
            }
            else {
                produtoSelecionado = null;
            }

            verificarProdutoSelecionado();
        });
    });


    sairBtn.addEventListener('click', fecharModal);
    overlay.addEventListener('click', fecharModal);

    // 3. Botão de confirmação que envia os dados para o backend
    btnConfirmar.addEventListener('click', async () => {
        const selecionados = document.querySelectorAll('.botao-metalizadoras-selecionado-tl');

        if (selecionados.length === 0) {
            toastr.error('Selecione pelo menos uma máquina.');
            return;
        }

        for (const botao of selecionados) {
            const nomeMetalizadora = botao.dataset.produto;
            const containerPai = botao.closest('.botoes-metalizadoras-nav');
            const contadorbloco = containerPai.querySelector('.contador-confirmar-operadores');
            const contadorEl = containerPai.querySelector('.contador-confirmar-numero');
            const contador = contadorEl ? parseInt(contadorEl.textContent.trim(), 10) : 0;

            const response = await apontamentoTeamLeader(
                turnoAtualEl.textContent,
                RETLIdentificado,
                nomeDoTLIdentificado.toUpperCase(),
                "TL",
                nomeMetalizadora,
                contador,
                "Produzindo",
                null,
                null,
                null
            );

            if (response.sucesso) {
                toastr.success('Apontamento da ' + nomeMetalizadora + ' realizado com sucesso!');
                botao.classList.remove('botao-metalizadoras-selecionado-tl');
                contadorbloco.style.display = 'none';
                botao.style.borderRadius = '10px 10px 10px 10px';
                btnConfirmar.style.display = 'none';

            } else {
                toastr.error(`Erro no apontamento de ${nomeMetalizadora}: ${response.mensagem}`);
                return;
            }
        }
        carregarDadosIniciais();
        fecharModal();
        resetarModal();
    })

    /*******************************************************/
    /*****************ASIDE TEAMLEADER**********************/
    /*******************************************************/
    agendarOperadores(carregarOperadores, maquinas);

    window.onload = () => {
        atualizarEsperadoEColorirLinhas();
    }
});