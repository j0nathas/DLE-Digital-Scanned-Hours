import { apontamentoOperador, apontamentoTeamLeader, registrarSaidaAutomaticaParaLinha, verificarStatusDaLinha } from '/js/funcoes.js';
import { agendarOperadores, carregarOperadores } from '/js/statusOp.js';
import { IpMonitor } from '/js/leituraCartao.js';

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
    const dataAtualEl = document.getElementById('data-atual');
    const horaAtualEl = document.getElementById('hora-atual');
    const turnoAtualEl = document.getElementById('turno-atual');

    // --- ELEMENTOS DO MODAL DINÂMICO ---
    const overlay = document.querySelector('.overlay');
    const sairOperadorBtn = document.querySelector('.sair-operador');
    const botoesOperacao = Array.from(document.querySelectorAll('.botoes-uaps-botao'));
    const botaoConfirmarOperacao = document.querySelector('.bloco-confirmar-botao');
    const nomeOperadorModalEl = document.querySelector('.bloco-boasvindas .texto-boasvindas-aside');

    const nomeUsuarioModalEl = document.getElementById('nome-usuario-modal');

    // Elementos do Modal
    const numeroEl = document.getElementById('numero');
    const asideTeamleader = document.getElementById('aside-teamleader');
    // --- ESTADO DA APLICAÇÃO ---
    let quantidadeOperadores = 1;

    // --- DADOS DA SESSÃO E ESTADO ---
    let pollingInterval;
    let modalAberto = false;
    let produtoSelecionado = null;

    const maquinas = ['s.LA010st'];
    const maquinasApontamento = ['s.LA010st'];

    for (const linha of maquinas) {
        verificarStatusDaLinha(linha).then(status => {
            if (status === 'Finalizado') {
                console.log(`A linha ${linha} já está finalizada! Redirecionando...`);
                window.location.assign('/Linha 06/html/telaInicial.html');
            }
        });
    }

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
                const valorEsperado = Number(esperadoObj.esperado) || 0;
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
                        produtosParaExibir.push({ text: esperadoObj.prod_LE, idSuffix: "-le" });
                    }
                    if (esperadoObj.prod_LD !== null) {
                        produtosParaExibir.push({ text: esperadoObj.prod_LD, idSuffix: "-ld" });
                    }
                    if (esperadoObj.prod_Unico !== null && produtosParaExibir.length === 0) {
                        produtosParaExibir.push({ text: esperadoObj.prod_Unico, idSuffix: "-unico" });
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
    const IP_ALVO_MONITORADO = '10.109.133.242'; //227

    const monitor = new IpMonitor(IP_ALVO_MONITORADO, API_BASE_URL, ["TL", "MOD"], 1000);
    monitor.startMonitoring();

    const cooldownSaida = new Map();

    const bloqueioSaida = new Set();

    document.addEventListener('newAccessDetected', async (event) => {
        const { nome, RE, cargo } = event.detail;
        if (cargo.toUpperCase() === "TL") {
            nomeDoTLIdentificado = nome;
            REDoTLIdentificado = RE;
            if (validacaoEncerrarProd) {
                abrirModalEncerrar();
            } else {
                toastr.info(`Clique no botão finalizar no canto superior esquerdo para encerrar a produção!`);
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
                        document.querySelector('.popup-saida').style.display = 'flex';
                        document.querySelector('.overlay-popup').style.display = 'block';
                        document.querySelector('.popup-saida-nome').textContent = nome;
                    } else {
                        alert(`Erro ao registrar saída: ${response.mensagem}`);
                    }

                } else {
                    const API_URL = '/api/apontamentos/getesperados';

                    try {
                        const response = await fetch(API_URL);
                        const dados = await response.json();

                        if (!response.ok) {
                            console.warn(`Falha ao buscar dados. Status: ${response.status}`);
                            return;
                        }
                        const esperadoProduto = dados[`esperado${maquinas[0]}`];

                        const resposta = await apontamentoOperador(
                            turnoAtualEl.textContent,
                            RE,
                            nome.toUpperCase(),
                            'MOD',
                            maquinas[0],
                            esperadoProduto.esperado,
                            maquinas[0],
                            'Entrada',
                            esperadoProduto.prod_LE,
                            esperadoProduto.prod_LD,
                            esperadoProduto.prod_Unico
                        );

                        if (resposta.sucesso) {
                            document.querySelector('.popup-entrada').style.display = 'flex';
                            document.querySelector('.overlay-popup').style.display = 'block';
                            document.querySelector('.popup-entrada-nome').textContent = nome;
                            setTimeout(DesaparecerPopUp, 3000);
                            await carregarContagemOperadores();
                            fecharModalOperador();
                            botaoConfirmarOperacao.textContent = 'Confirmar';
                            botaoConfirmarOperacao.disabled = false;
                        } else {
                            botaoConfirmarOperacao.textContent = 'Confirmar';
                            botaoConfirmarOperacao.disabled = false;
                            alert(`Erro: ${resposta.mensagem}`);
                        }

                    } catch (error) {
                        console.error('Erro na entrada de linha:', error);
                    }
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
        await atualizarEsperadoEColorirLinhas();
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

            await registrarSaidaAutomaticaParaLinha(nomeMaquina);

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
                await atualizarEsperadoEColorirLinhas();
                carregarContagemOperadores();
                produto.textContent = "...";
            } else {
                alert(`Erro ao finalizar produção: ${resposta.mensagem}`);
            }
        } catch {

        }

    }

    /*  const btnFinalizarDoModalConfirmacao = document.querySelectorAll('.encerrarProd-botoes-encerrar');
     
     btnFinalizarDoModalConfirmacao.forEach(maquina => {
         maquina.addEventListener('click', () => {
             const nomeMaquina = maquina.textContent.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
             enviarFinalizacaoParaBanco(nomeMaquina);
         });
     }); */

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

    async function resetarModalEncerrar() {
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

    botaoFinalizarEncerrar.addEventListener('click', async () => {

        const botoesSelecionadosEncerrar = Array.from(
            document.querySelectorAll('.finalizacao-uaps-botoes-botao-selecionado')
        ).filter(el => getComputedStyle(el).display !== 'none');

        for (const maquina of botoesSelecionadosEncerrar) {
            const nomeMaquina = maquina.getAttribute('data-finalizar');

            await enviarFinalizacaoParaBanco(nomeMaquina);
        }

        await resetarModalEncerrar();

        setTimeout(() => {
            window.location.assign("/Linha 06/html/telaInicial.html");
        }, 1500);

    });

    // --- INICIALIZAÇÃO DA PÁGINA ---
    exibirHorarioAtual();
    setInterval(exibirHorarioAtual, 1000);
    agendarOperadores(carregarOperadores, maquinas);

    window.onload = () => {
        atualizarEsperadoEColorirLinhas();
    }
});