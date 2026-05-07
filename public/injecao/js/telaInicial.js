import { apontamentoTeamLeader, verificarStatusDaLinha } from '/js/funcoes.js';
import { IpMonitor } from '/js/leituraCartao.js';

document.addEventListener('DOMContentLoaded', () => {

    const maquinas = ['s.I21h1k530', 's.I22h1k1300', 's.I23h3k1000', 's.I24h1k1300', 's.I25h3k1000',
        's.I26h1k530', 's.I27h2k1000', 's.I29h1k1300', 's.I30h2k1700', 's.I31h2k1000', 's.I32h1k1000', 's.I33h2k1000', 's.I34h1k1300'];

    for (const linha of maquinas) {
        verificarStatusDaLinha(linha).then(status => {
            if (status === 'Produzindo') {
                console.log(`A linha ${linha} já está produzindo! Redirecionando...`);
                window.location.href = '/Injecao/html/telaPrincipal.html';
            } else {
                console.log(`A linha ${linha} já está produzindo! Redirecionando...`);
            }
        });
    }


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

    // --- ELEMENTOS DO DOM ---
    const dataAtualEl = document.getElementById('data-atual');
    const horaAtualEl = document.getElementById('hora-atual');
    const turnoAtualEl = document.getElementById('turno-atual');
    const linhaProducaoEl = document.getElementById('linha-producao');

    // Elementos do Modal
    const numeroEl = document.getElementById('numero');
    const btnConfirmar = document.getElementById('btn-confirmar');
    const botoesProduto = document.querySelectorAll(".botoes-injetoras-botao");
    const sairBtn = document.getElementById('btn-sair-modal');
    const asideTeamleader = document.getElementById('aside-teamleader');
    const overlay = document.getElementById('overlay');
    const nomeUsuarioModalEl = document.getElementById('nome-usuario-modal');


    // --- ESTADO DA APLICAÇÃO ---
    let quantidadeOperadores = 1;
    let produtoSelecionado = null;
    let nomeDoTLIdentificado = '';
    let RETLIdentificado = null;

    const carrosselInner = document.getElementById('carrosselInner');
    const totalFrases = carrosselInner.children.length;
    let indice = 0;

    function mostrarProximaFrase() {
        indice = (indice + 1) % totalFrases;
        const offset = -indice * 60;
        carrosselInner.style.transform = `translateY(${offset}px)`;
    }

    setInterval(mostrarProximaFrase, 5000);

    // --- FUNÇÕES DE INTERFACE DO MODAL ---
    function abrirModalTL(nomeUsuario) {
        nomeUsuarioModalEl.textContent = `Bem-vindo, ${nomeUsuario}!`;
        overlay.style.display = 'block';
        asideTeamleader.style.display = 'flex';
    }

    function fecharModal() {
        overlay.style.display = 'none';
        asideTeamleader.style.display = 'none';
        resetarModal();
    }

    //abrirModal('Jonathas');


    function resetarModal() {
        produtoSelecionado = null;
        quantidadeOperadores = 1;
        botoesProduto.forEach(b => b.classList.remove('botao-injetoras-selecionado'));
        btnConfirmar.style.display = 'none';
    }


    // --- LÓGICA DE VERIFICAÇÃO (CHAMADA PELA AÇÃO DO USUÁRIO) ---
    const API_BASE_URL = '/api';
    const IP_ALVO_MONITORADO = '10.109.140.50';

    const monitorTL = new IpMonitor(IP_ALVO_MONITORADO, API_BASE_URL, ["TL"], 1000);
    monitorTL.startMonitoring();

    document.addEventListener('newAccessDetected', async (event) => {
        const { nome, RE, cargo } = event.detail;

        if (cargo.toUpperCase() === "TL") {
            if (typeof abrirModalTL === 'function') {
                nomeDoTLIdentificado = nome;
                RETLIdentificado = RE
                abrirModalTL(nome);
                console.log(`Modal de TL aberto para ${nome}!`);
            } else {
                console.warn('Função abrirModalTL não definida ou não acessível.');
            }
        } else {
            console.log(`Novo acesso detectado de cargo ${cargo} (${nome}), mas nenhuma ação específica configurada.`);
        }
    });



    function verificarProdutoSelecionado() {
        if (produtoSelecionado !== null) {
            btnConfirmar.style.display = 'block';
        }
        else {
            btnConfirmar.style.display = 'none';
        }
    }

    let validacaoSelecaoTotal = false;
    const botaoSelecionar = document.querySelector('.selecionar-todas');

    function verificarSelecaoTotal() {
        const todosSelecionados = Array.from(botoesProduto).every(botao =>
            botao.classList.contains('botao-injetoras-selecionado')
        );

        if (todosSelecionados) {
            botaoSelecionar.innerHTML = 'REMOVER SELEÇÕES <img src="/images/remover-selecoes.svg" width="25" alt="">';
            validacaoSelecaoTotal = true;
        } else {
            botaoSelecionar.innerHTML = 'SELECIONAR TODAS <img src="/images/selecionar-todos.svg" width="25" alt="">';
            validacaoSelecaoTotal = false;
        }
    }

    botoesProduto.forEach((botao) => {

        botao.addEventListener('click', () => {
            if (botao.classList.contains('botao-injetoras-selecionado')) {
                botao.classList.remove('botao-injetoras-selecionado');
            }
            else {
                botao.classList.add('botao-injetoras-selecionado');
            }
            const algumSelecionado = Array.from(botoesProduto).some(botao =>
                botao.classList.contains('botao-injetoras-selecionado')
            );

            if (algumSelecionado) {
                produtoSelecionado = botao.dataset.produto;
            }
            else {
                produtoSelecionado = null;
            }

            verificarProdutoSelecionado();
            verificarSelecaoTotal();
        });
    });

    botaoSelecionar.addEventListener('click', () => {
        const todosSelecionados = Array.from(botoesProduto).every(botao =>
            botao.classList.contains('botao-injetoras-selecionado')
        );

        if (todosSelecionados) {
            botoesProduto.forEach(botao => {
                botao.classList.remove('botao-injetoras-selecionado');
            });
            botaoSelecionar.innerHTML = 'SELECIONAR TODAS <img src="/images/selecionar-todos.svg" width="25" alt="">';
            validacaoSelecaoTotal = false;

        } else {
            botoesProduto.forEach(botao => {
                if (!botao.classList.contains('botao-injetoras-selecionado')) {
                    botao.classList.add('botao-injetoras-selecionado');
                    btnConfirmar.style.display = 'flex';
                }
            });
            botaoSelecionar.innerHTML = 'REMOVER SELEÇÕES <img src="/images/remover-selecoes.svg" width="25" alt="">';
            validacaoSelecaoTotal = true;
        }
    });



    sairBtn.addEventListener('click', fecharModal);
    overlay.addEventListener('click', fecharModal);

    // 3. Botão de confirmação que envia os dados para o backend
    btnConfirmar.addEventListener('click', async () => {
        const selecionados = document.querySelectorAll('.botao-injetoras-selecionado');

        if (selecionados.length === 0) {
            alert('Selecione pelo menos uma máquina.');
            return;
        }

        for (const botao of selecionados) {
            const nomeInjetora = botao.dataset.produto;
            let dedicado = null;

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
            )

            if (response.sucesso) {
                toastr.success(`Apontamento para ${nomeInjetora} realizado.`);
            } else {
                toastr.error(`Erro no apontamento de ${nomeInjetora}: ${response.mensagem}`);
                return;
            }
        }

        window.location.href = '/Injecao/html/telaPrincipal.html';
    });


    // --- INICIALIZAÇÃO DO RELÓGIO E DATA ---
    function exibirHorarioAtual() {
        const agora = new Date();
        horaAtualEl.textContent = agora.toLocaleTimeString('pt-BR');
        const hora = agora.getHours();
        if (hora >= 6 && hora < 14) turnoAtualEl.textContent = "1º Turno";
        else if (hora >= 14 && hora < 22) turnoAtualEl.textContent = "2º Turno";
        else turnoAtualEl.textContent = "3º Turno";
        dataAtualEl.textContent = agora.toLocaleDateString('pt-BR', {
            weekday: 'long', year: 'numeric', month: 'numeric', day: 'numeric'
        });
    }

    // Inicia o relógio assim que a página carrega
    exibirHorarioAtual();
    setInterval(exibirHorarioAtual, 1000);
});