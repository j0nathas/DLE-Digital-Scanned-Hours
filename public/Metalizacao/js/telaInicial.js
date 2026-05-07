import { apontamentoTeamLeader, verificarStatusDaLinha } from '/js/funcoes.js';
import { IpMonitor } from '/js/leituraCartao.js';

document.addEventListener('DOMContentLoaded', () => {

    const linhaAtual = ['s.MT01', 's.MT02', 's.MT03', 's.MT04'];

    for (const linha of linhaAtual) {
        verificarStatusDaLinha(linha).then(status => {
            if (status === 'Produzindo') {
                console.log(`A linha ${linha} já está produzindo! Redirecionando...`);
                window.location.href = '/Metalizacao/html/telaPrincipal.html';
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
    const btnEntrarLinha = document.getElementById('btn-entrar-linha');

    // Elementos do Modal
    const numeroEl = document.getElementById('numero');
    const diminuirBtn = document.getElementById('diminuir');
    const aumentarBtn = document.getElementById('aumentar');
    const btnConfirmar = document.getElementById('btn-confirmar');
    const botoesProduto = document.querySelectorAll(".botoes-metalizadoras-botao");
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

    function resetarModal() {
        produtoSelecionado = null;
        quantidadeOperadores = 1;
        numeroEl.textContent = '1';
        botoesProduto.forEach(b => b.classList.remove('botao-metalizadoras-selecionado'));
        btnConfirmar.style.display = 'none';
    }

    // --- LÓGICA DE VERIFICAÇÃO (CHAMADA PELA AÇÃO DO USUÁRIO) ---
    const API_BASE_URL = '/api';
    const IP_ALVO_MONITORADO = '10.109.140.49';

    const monitorTL = new IpMonitor(IP_ALVO_MONITORADO, API_BASE_URL, ["TL"], 1000);
    monitorTL.startMonitoring();

    document.addEventListener('newAccessDetected', async (event) => {
        const { nome, RE, cargo } = event.detail;

        if (cargo.toUpperCase() === "TL") {
            if (typeof abrirModalTL === 'function') {
                nomeDoTLIdentificado = nome;
                RETLIdentificado = RE;
                abrirModalTL(nome);
                console.log(`Modal de TL aberto para ${nome}!`);
            } else {
                console.warn('Função abrirModalTL não definida ou não acessível.');
            }
        } else {
            console.log(`Novo acesso detectado de cargo ${cargo} (${nome}), mas nenhuma ação específica configurada.`);
        }
    });



    //TESTE ***********************


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

    botoesProduto.forEach((botao) => {

        const containerPai = botao.closest('.botoes-metalizadoras-nav');
        const contador = containerPai.querySelector('.contador-confirmar-operadores');

        botao.addEventListener('click', () => {
            if (botao.classList.contains('botao-metalizadoras-selecionado')) {
                botao.classList.remove('botao-metalizadoras-selecionado');
                contador.style.display = 'none';
                botao.style.borderRadius = '10px 10px 10px 10px';
            }
            else {
                botao.classList.add('botao-metalizadoras-selecionado');
                contador.style.display = 'flex';
                botao.style.borderRadius = '10px 10px 0px 0px';

            }
            const algumSelecionado = Array.from(botoesProduto).some(botao =>
                botao.classList.contains('botao-metalizadoras-selecionado')
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
        const selecionados = document.querySelectorAll('.botao-metalizadoras-selecionado');

        if (selecionados.length === 0) {
            alert('Selecione pelo menos uma máquina.');
            return;
        }

        for (const botao of selecionados) {
            const nomeMetalizadora = botao.dataset.produto;
            const containerPai = botao.closest('.botoes-metalizadoras-nav');
            const contadorEl = containerPai.querySelector('.contador-confirmar-numero');
            const contador = contadorEl ? parseInt(contadorEl.textContent.trim(), 10) : 0;
            let dedicado = null;

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
            )

            if (response.sucesso) {
                console.log(`Apontamento para ${nomeMetalizadora} realizado.`);
            } else {
                alert(`Erro no apontamento de ${nomeMetalizadora}: ${response.mensagem}`);
                return;
            }
        }


        toastr.success('Apontamentos realizados com sucesso!');
        window.location.href = '/Metalizacao/html/telaPrincipal.html';
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