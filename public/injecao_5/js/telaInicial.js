import { apontamentoTeamLeader, verificarStatusDaLinha } from '/js/funcoes.js';
import { IpMonitor } from '/js/leituraCartao.js';
import { apontamentoConfirmarBtn, maquinas } from '/injecao_small/js/asideTeamLeader.js';




document.addEventListener('DOMContentLoaded', () => {



    for (const linha of maquinas) {
        verificarStatusDaLinha(linha).then(status => {
            if (status === 'Produzindo') {
                console.log(`A linha ${linha} já está produzindo! Redirecionando...`);
                window.location.href = '/injecao_small/html/telaPrincipal.html';
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


    const asideTeamleader = document.getElementById('aside-teamleader');
    const overlay = document.getElementById('overlay');
    const nomeUsuarioModalEl = document.getElementById('nome-usuario-modal');
    const btnConfirmar = document.getElementById('btn-confirmar');


    // --- ESTADO DA APLICAÇÃO ---
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

    // --- LÓGICA DE VERIFICAÇÃO (CHAMADA PELA AÇÃO DO USUÁRIO) ---
    const API_BASE_URL = '/api';
    const IP_ALVO_MONITORADO = '10.109.133.242';

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

    btnConfirmar.addEventListener('click', async () => {

        await apontamentoConfirmarBtn(
            turnoAtualEl.textContent,
            RETLIdentificado,
            nomeDoTLIdentificado.toUpperCase(),
            1,
            "Produzindo",
            null,
            null,
            null
        );

        window.location.href = '/injecao_small/html/telaPrincipal.html';
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