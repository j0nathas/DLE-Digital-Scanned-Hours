import { apontamentoTeamLeader, verificarStatusDaLinha } from '/js/funcoes.js';
import { IpMonitor } from '/js/leituraCartoTemp.js';

document.addEventListener('DOMContentLoaded', () => {

    const maquinas = ['s.SM01vw', 's.SM02vw', 's.SM03vw', 's.SM04m', 's.SM05mt', 's.SM06ty', 's.SM07st', 's.SM08st', 's.SM09st', 's.SM10st'];

    for (const linha of maquinas) {
        verificarStatusDaLinha(linha).then(status => {
            if (status === 'Produzindo') {
                console.log(`A linha ${linha} já está produzindo! Redirecionando...`);
                window.location.href = '/Small/html/telaPrincipal.html';
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
    const nomeUsuarioModalEl = document.getElementById('nome-usuario-modal');

    // Elementos do Modal
    const numeroEl = document.getElementById('numero');
    const diminuirBtn = document.getElementById('diminuir');
    const aumentarBtn = document.getElementById('aumentar');
    const asideTeamleader = document.getElementById('aside-teamleader');
    // --- ESTADO DA APLICAÇÃO ---
    let quantidadeOperadores = 1;
    let produtoSelecionado = null;
    let nomeTLIdentificado = null;
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
        botoesProduto.forEach(b => b.classList.remove('botao-uaps-selecionado'));
        btnConfirmar.style.display = 'none';
    }

    const API_BASE_URL = '/api';
    const IP_ALVO_MONITORADO = '10.109.140.47';

    const monitorTL = new IpMonitor(IP_ALVO_MONITORADO, API_BASE_URL, ["TL"], 1000);
    monitorTL.startMonitoring();

    document.addEventListener('newAccessDetected', (event) => {
        const { nome, RE, cargo } = event.detail;

        if (cargo.toUpperCase() === "TL") {
            if (typeof abrirModalTL === 'function') {
                abrirModalTL(nome);
                nomeTLIdentificado = nome;
                RETLIdentificado = RE;
                console.log(`Modal de TL aberto para ${nome}!`);
            } else {
                console.warn('Função abrirModalTL não definida ou não acessível.');
            }
        } else {
            console.log(`Novo acesso detectado de cargo ${cargo} (${nome}), mas nenhuma ação específica configurada.`);
        }
    });


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

    let primeiroSelecionadoBtn = null;

    let produtosPorLinhaMap = new Map();

    async function carregarProdutosPorMaquina() {
        try {


            const respostaProdutosLinha = await fetch('/api/apontamentos/getProdutosPorLinha');
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

            const resposta = await fetch('/api/apontamentos/getProdutos');
            if (!resposta.ok) {
                throw new Error(`HTTP error! status: ${resposta.status}`);
            }
            const dados = await resposta.json();
            const maquinasFiltradas = dados.filter(item => maquinas.includes(item.maquina));

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


    const saidaListaProdutos = document.querySelectorAll('.botoes-uaps-tl-divlista-pesquisa-sair');
    const overlayLista = document.querySelector('.overlay-lista');
    const TodosBotoesProdutosIniciar = document.querySelectorAll('.botoes-uaps-tl-botao');
    const btnConfirmarProd = document.querySelector('.contador-confirmar-botao');

    saidaListaProdutos.forEach(x => {
        x.addEventListener('click', () => {
            const div = x.closest('.botoes-uaps-tl-divlista');
            div.style.display = 'none';
            overlayLista.style.display = 'none';
            const containerPai = x.closest('.botoes-uaps-tl-nav');
            const guiaProduto = containerPai.querySelector('.botoes-uaps-tl-guia');
            const botaoLinha = containerPai.querySelector('.botoes-uaps-tl-botao');
            guiaProduto.style.display = 'none';
            botaoLinha.style.borderRadius = '10px';
            botaoLinha.classList.remove('botao-uaps-tl-selecionado');
            const algumSelecionado = Array.from(TodosBotoesProdutosIniciar).some(botao => botao.classList.contains('botao-uaps-tl-selecionado'));
            btnConfirmarProd.style.display = algumSelecionado ? 'block' : 'none';
        });
    });

    const btnConfirmar = document.getElementById('btn-confirmar');
    const sairBtn = document.getElementById('btn-sair-modal');


    function abrirModalTeamLeader(nomeUsuario) {
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

        const turno = turnoAtualEl.textContent;
        let algumApontamentoFeito = false;

        for (const botao of selecionados) {
            const container = botao.closest('.botoes-uaps-tl-nav');
            const nomeUAP = botao.dataset.produto;
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

            const respostaApontamento = await apontamentoTeamLeader(
                turno,
                RETLIdentificado,
                nomeTLIdentificado,
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
            toastr.success('Apontamentos realizados com sucesso!');
            setTimeout(() => {
                window.location.href = '/Small/html/telaPrincipal.html';
            }, 1000);
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