import { apontamentoOperador, apontamentoTeamLeader } from '/JS_JARINU/funcoes.js';
import { verificarStatusDaLinha } from '/js/funcoes.js';
import { IpMonitor } from '/JS_JARINU/leituraCartao.js';

document.addEventListener('DOMContentLoaded', () => {

    const maquina = ['j.FA01_j.FA02'];

    for (const linha of maquina) {
        verificarStatusDaLinha(linha).then(status => {
            if (status === 'Produzindo') {
                console.log(`A linha ${linha} já está produzindo! Redirecionando...`);
                window.location.href = '/j.FA01_j.FA02/html/telaPrincipal.html';
            } else {
                console.log(`A linha ${linha} não está produzindo.`);
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
    let ladosLinha = ['J.FA01', 'J.FA02'];

    // Elementos do Modal
    const numeroEl = document.getElementById('numero');
    const botoesProduto = document.querySelectorAll(".botoes-produtos-botao");
    const containerContador = document.getElementById('container-contador');
    const sairBtn = document.getElementById('btn-sair-modal');
    const asideTeamleader = document.getElementById('aside-teamleader');
    const overlay = document.getElementById('overlay');
    const nomeUsuarioModalEl = document.getElementById('nome-usuario-modal');

    let primeiroSelecionadoBtn = null; // Mantenha esta variável se for usada em outro lugar
    let nomeDoTLIdentificado = null;
    let RETLIdentificado = null;


    // Elementos onde os produtos serão renderizados e selecionados


    const maquinas = ['J.FA01', 'J.FA02'];
    let produtosPorLinhaMap = new Map();

    const containerMaquina = document.getElementById('aside-teamleader');
    if (!containerMaquina) {
        console.error("Elemento '#aside-teamleader' não encontrado. Verifique o HTML.");
        // Saia ou lide com o erro
    }

    const listaProdutosDiv = containerMaquina ? containerMaquina.querySelector('.botoes-produtos') : null;
    const produtosSelecionadosSection = containerMaquina ? containerMaquina.querySelector('.produtos-selecionados') : null;
    const contadorContainer = containerMaquina ? containerMaquina.querySelector('#container-contador') : null;
    const btnConfirmar = containerMaquina ? containerMaquina.querySelector('#btn-confirmar') : null;

    let produtoAbertoParaLados = null;
    // Variável para rastrear o parágrafo do produto que teve o border-radius alterado
    let paragrafoProdutoAnteriormenteSelecionado = null;


    async function carregarProdutosPorMaquina() {
        if (!listaProdutosDiv || !produtosSelecionadosSection || !contadorContainer || !btnConfirmar) {
            console.error("Um ou mais elementos essenciais não foram encontrados. Verifique o HTML e os seletores.");
            return;
        }

        try {
            const respostaProdutosLinha = await fetch('/api/apontamentos/getProdutosPorLinha_JARINU');
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

            const resposta = await fetch('/api/apontamentos/getProdutos_JARINU');
            if (!resposta.ok) {
                throw new Error(`HTTP error! status: ${resposta.status}`);
            }
            const dados = await resposta.json();

            let todosProdutosDaLinha = [];
            dados.forEach(item => {
                if (maquinas.includes(item.maquina) && item.produtos && Array.isArray(item.produtos)) {
                    todosProdutosDaLinha.push(...item.produtos);
                }
            });

            listaProdutosDiv.innerHTML = '';

            todosProdutosDaLinha.forEach(produto => {
                const { produto: nome, cod_le, cod_ld, cod_unico } = produto;

                const divProduto = document.createElement('div');
                divProduto.className = 'botoes-produtos-lista';
                divProduto.dataset.codLe = cod_le || '';
                divProduto.dataset.codLd = cod_ld || '';
                divProduto.dataset.codUnico = cod_unico || '';

                const nomeProduto = document.createElement('p');
                nomeProduto.textContent = nome;
                nomeProduto.className = "nome-produto-selecao";
                nomeProduto.style.borderRadius = '10px';
                divProduto.appendChild(nomeProduto);

                divProduto.addEventListener('click', (e) => {
                    if (paragrafoProdutoAnteriormenteSelecionado) {
                        paragrafoProdutoAnteriormenteSelecionado.style.borderRadius = '10px';
                    }

                    document.querySelectorAll('.botoes-produtos-lista').forEach(btn => {
                        const paragrafo = btn.querySelector('.nome-produto-selecao')
                        paragrafo.classList.remove('selecionado');
                    });
                    document.querySelectorAll('.lista-lados').forEach(el => el.remove());

                    nomeProduto.classList.add('selecionado');

                    const temAmbosLados = cod_le && cod_ld;
                    if (temAmbosLados) {
                        nomeProduto.style.borderRadius = '10px 10px 0px 0px';
                    } else {
                        nomeProduto.style.borderRadius = '10px';
                    }
                    paragrafoProdutoAnteriormenteSelecionado = nomeProduto;


                    contadorContainer.style.display = 'none';
                    btnConfirmar.style.display = 'none';
                    produtosSelecionadosSection.innerHTML = '';

                    if (temAmbosLados) {
                        const divLados = document.createElement('div');
                        divLados.className = 'lista-lados';

                        const botaoLE = document.createElement('button');
                        botaoLE.textContent = 'LE';
                        botaoLE.className = 'botao-lado';
                        botaoLE.addEventListener('click', (e) => {
                            e.stopPropagation();
                            produtosSelecionadosSection.innerHTML = '';
                            const desc = produtosPorLinhaMap.get(cod_le) || nome;
                            adicionarProdutoSelecionado(desc, cod_le, 'LE');
                            containerMaquina.dataset.tipoSelecao = 'LE';
                            divLados.remove();
                            contadorContainer.style.display = 'flex';
                            btnConfirmar.style.display = 'block';
                            if (paragrafoProdutoAnteriormenteSelecionado) {
                                paragrafoProdutoAnteriormenteSelecionado.style.borderRadius = '10px';
                            }
                        });

                        const botaoLD = document.createElement('button');
                        botaoLD.textContent = 'LD';
                        botaoLD.className = 'botao-lado';
                        botaoLD.addEventListener('click', (e) => {
                            e.stopPropagation();
                            produtosSelecionadosSection.innerHTML = '';
                            const desc = produtosPorLinhaMap.get(cod_ld) || nome;
                            adicionarProdutoSelecionado(desc, cod_ld, 'LD');
                            containerMaquina.dataset.tipoSelecao = 'LD';
                            divLados.remove();
                            contadorContainer.style.display = 'flex';
                            btnConfirmar.style.display = 'block';
                            if (paragrafoProdutoAnteriormenteSelecionado) {
                                paragrafoProdutoAnteriormenteSelecionado.style.borderRadius = '10px';
                            }
                        });

                        const botaoAmbos = document.createElement('button');
                        botaoAmbos.textContent = 'AMBOS';
                        botaoAmbos.className = 'botao-lado';
                        botaoAmbos.addEventListener('click', (e) => {
                            e.stopPropagation();
                            produtosSelecionadosSection.innerHTML = '';
                            const descLE = produtosPorLinhaMap.get(cod_le) || nome;
                            const descLD = produtosPorLinhaMap.get(cod_ld) || nome;

                            adicionarProdutoSelecionado(descLE, cod_le, 'LE');
                            adicionarProdutoSelecionado(descLD, cod_ld, 'LD');
                            containerMaquina.dataset.tipoSelecao = 'AMBOS';
                            divLados.remove();
                            contadorContainer.style.display = 'flex';
                            btnConfirmar.style.display = 'block';
                            if (paragrafoProdutoAnteriormenteSelecionado) {
                                paragrafoProdutoAnteriormenteSelecionado.style.borderRadius = '10px';
                            }
                        });

                        divLados.appendChild(botaoLE);
                        divLados.appendChild(botaoLD);
                        divLados.appendChild(botaoAmbos);
                        divProduto.appendChild(divLados);
                        produtoAbertoParaLados = divProduto;

                    } else {
                        const codigo = cod_le || cod_ld || cod_unico;
                        const descricao = produtosPorLinhaMap.get(codigo) || nome;
                        adicionarProdutoSelecionado(descricao, codigo, 'UNICO');
                        containerMaquina.dataset.tipoSelecao = 'UNICO';
                        contadorContainer.style.display = 'flex';
                        btnConfirmar.style.display = 'block';
                        nomeProduto.style.borderRadius = '10px';
                    }
                });

                listaProdutosDiv.appendChild(divProduto);
            });

            const inputPesquisa = document.querySelectorAll('.pesquisa-produtos');
            inputPesquisa.forEach(input => {
                input.addEventListener('input', () => {
                    const textoDigitado = input.value.toUpperCase();
                    const botoesProdutos = document.querySelectorAll('.botoes-produtos-lista');

                    botoesProdutos.forEach(botao => {
                        const texto = botao.querySelector('.nome-produto-selecao').textContent.toUpperCase();
                        const cod_LE = (botao.getAttribute('data-cod-le') || '').toUpperCase();
                        const cod_LD = (botao.getAttribute('data-cod-ld') || '').toUpperCase();
                        const cod_Unico = (botao.getAttribute('data-cod-unico') || '').toUpperCase();

                        if (produtoAbertoParaLados && produtoAbertoParaLados !== botao) {
                            produtoAbertoParaLados.querySelectorAll('.lista-lados').forEach(el => el.remove());
                            if (produtoAbertoParaLados.querySelector('.nome-produto-selecao')) {
                                produtoAbertoParaLados.querySelector('.nome-produto-selecao').style.borderRadius = '10px';
                            }
                            produtoAbertoParaLados = null;
                            paragrafoProdutoAnteriormenteSelecionado = null;
                        }

                        botao.style.display = texto.includes(textoDigitado) || cod_LE.includes(textoDigitado) || cod_LD.includes(textoDigitado) || cod_Unico.includes(textoDigitado)
                            ? 'block'
                            : 'none';
                    });
                });
            });

        } catch (err) {
            console.error('[API ERRO] carregarProdutosPorMaquina:', err);
            if (typeof toastr !== 'undefined') {
                toastr.error('Erro ao carregar produtos. Verifique o console.');
            } else {
                alert('Erro ao carregar produtos. Verifique o console.');
            }
        }
    }

    function adicionarProdutoSelecionado(nome, codigo, tipo) {
        if (!produtosSelecionadosSection) return;

        const pProduto = document.createElement('p');
        pProduto.className = 'produto-selecionado-paragrafo';
        pProduto.textContent = `${nome}`;
        pProduto.dataset.codigo = codigo;
        pProduto.dataset.tipo = tipo;

        produtosSelecionadosSection.appendChild(pProduto);
    }


    // --- Lógica de Contador de Operadores (mantido) ---
    const diminuirBtn = document.getElementById('diminuir');
    const aumentarBtn = document.getElementById('aumentar');
    const numeroSpan = document.getElementById('numero');
    let contadorOperadores = 1;

    if (diminuirBtn && aumentarBtn && numeroSpan) {
        diminuirBtn.addEventListener('click', () => {
            if (contadorOperadores > 1) {
                contadorOperadores--;
                numeroSpan.textContent = contadorOperadores;
            }
        });

        aumentarBtn.addEventListener('click', () => {
            contadorOperadores++;
            numeroSpan.textContent = contadorOperadores;
        });
    } else {
        console.warn("Botões de contador de operadores não encontrados. Verifique IDs 'diminuir', 'aumentar', 'numero'.");
    }

    carregarProdutosPorMaquina();



    // --- ESTADO DA APLICAÇÃO ---
    let quantidadeOperadores = 1;
    let produtoSelecionado = null;

    const carrosselInner = document.getElementById('carrosselInner');
    const totalFrases = carrosselInner.children.length;
    let indice = 0;
    const btnProdutos = document.querySelectorAll('.nome-produto-selecao');

    function mostrarProximaFrase() {
        indice = (indice + 1) % totalFrases;
        const offset = -indice * 60;
        carrosselInner.style.transform = `translateY(${offset}px)`;
    }

    setInterval(mostrarProximaFrase, 5000);

    // --- FUNÇÕES DE INTERFACE DO MODAL ---
    function abrirModalTL(nomeUsuario) {
        console.log('aaaaa')
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
        numeroEl.textContent = '1';
        botoesProduto.forEach(b => b.classList.remove('botao-produtos-selecionado'));
        containerContador.style.display = 'none';
        btnConfirmar.style.display = 'none';
        btnProdutos.forEach(btn => {
            btn.classList.remove('selecionado');
        })
    }

    const API_BASE_URL = '/api';
    const IP_ALVO_MONITORADO = '10.109.139.30';

    const monitorTL = new IpMonitor(IP_ALVO_MONITORADO, API_BASE_URL, ["TL"], 1000);
    monitorTL.startMonitoring();

    const monitorMOD = new IpMonitor(IP_ALVO_MONITORADO, API_BASE_URL, ["MOD"], 1000);
    monitorMOD.startMonitoring();

    document.addEventListener('newAccessDetected', async (event) => {
        const { nome, RE, cargo } = event.detail;

        if (cargo.toUpperCase() === "TL") {
            nomeDoTLIdentificado = nome;
            console.log('AAAA')
            abrirModalTL(nome);
            RETLIdentificado = RE;
        } else {
            console.log(`Novo acesso detectado de cargo ${cargo} (${nome}), mas nenhuma ação específica configurada.`);
        }
    });

    diminuirBtn.addEventListener('click', () => {
        if (quantidadeOperadores > 1) {
            quantidadeOperadores--;
            numeroEl.textContent = quantidadeOperadores;
        }
    });

    aumentarBtn.addEventListener('click', () => {
        quantidadeOperadores++;
        numeroEl.textContent = quantidadeOperadores;
    });

    botoesProduto.forEach((botao) => {
        botao.addEventListener('click', () => {
            botoesProduto.forEach((b) => b.classList.remove('botao-produtos-selecionado'));
            botao.classList.add('botao-produtos-selecionado');
            produtoSelecionado = botao.dataset.produto;
            containerContador.style.display = 'block';
        });
    });

    sairBtn.addEventListener('click', fecharModal);


    btnConfirmar.addEventListener('click', async () => {
        const elLE = document.querySelector('[data-tipo="LE"]');
        const elLD = document.querySelector('[data-tipo="LD"]');
        const elUnico = document.querySelector('[data-tipo="UNICO"]');

        const prodLE = elLE ? elLE.textContent.trim() : null;
        const prodLD = elLD ? elLD.textContent.trim() : null;
        const prodUnico = elUnico ? elUnico.textContent.trim() : null;

        const response = await apontamentoTeamLeader(
            turnoAtualEl.textContent,
            RETLIdentificado,
            nomeDoTLIdentificado,
            "TL",
            'j.FA01_j.FA02',
            quantidadeOperadores,
            "Produzindo",
            prodLE,
            prodLD,
            prodUnico
        );
        if (response.sucesso) {
            toastr.success('Apontamento realizado com sucesso!');
            window.location.href = '/j.FA01_j.FA02/html/telaPrincipal.html';

        } else {
            toastr.error(`Erro: ${response.mensagem}`);
        }

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