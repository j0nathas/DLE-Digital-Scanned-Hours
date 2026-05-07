import { apontamentoOperador, apontamentoTeamLeader, registrarSaidaAutomaticaParaLinha } from '/js/funcoes.js';
import { IpMonitor } from '/js/leituraCartao.js';


document.addEventListener('DOMContentLoaded', () => {
    // --- ELEMENTOS PRINCIPAIS DA TELA ---

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

    let produto = '';
    let switchFuncionou = false;

    const API_URL = '/api/apontamentos/getesperados';

    async function carregarNomeLinha() {
        try {
            const response = await fetch(API_URL);

            if (!response.ok) {
                console.warn(`Falha ao buscar dados. Status: ${response.status}`);
                return '';
            }

            const dados = await response.json();
            const dadosLinha = dados['esperados.LA01st_s.LA02st'];
            const prodLE = dadosLinha.prod_LE;
            const prodLD = dadosLinha.prod_LD;
            const prodUnico = dadosLinha.prod_Unico;

            if (
                (prodLE && prodLE.includes("2810")) ||
                (prodLD && prodLD.includes("2810")) ||
                (prodUnico && prodUnico.includes("2810"))
            ) {
                return 'Fiat 2810';
            } else if (
                (prodLE && prodLE.includes("270/3")) ||
                (prodLD && prodLD.includes("270/3")) ||
                (prodUnico && prodUnico.includes("270/3"))
            ) {
                return 'VW 270 Fixo';
            } else {
                return '';
            }

        } catch (error) {
            alert('Erro ao buscar o produto da linha');
            return '';
        }
    }

    const asideOperador = document.querySelector('.aside-operador');

    async function inicializarInterface() {
        produto = await carregarNomeLinha();


        // O switch agora apenas informa o status, não bloqueia a execução.
        switch (produto) {
            case "VW 270 Fixo":
                const estilo270 = document.createElement("link");
                estilo270.rel = "stylesheet";
                estilo270.href = "/Linha 01/css/Produtos/270.css?v=" + Date.now();
                document.head.appendChild(estilo270);
                asideOperador.innerHTML = `<section class="bloco-boasvindas">
                    <div class="boasvindas-aside">
                        <h2 class="texto-boasvindas-aside" style="font-size: 2rem;">Bem-vindo, Leandro!</h2>
                        <p class="texto-boasvindas-aside" style="font-size: 1.2rem;">Onde você irá trabalhar hoje?</p>
                    </div>

                    <button class="sair-operador"><img src="/images/close.svg" alt="" width="70"></button>

                </section>

                <ul class="layout-270">
                    <li class="botoes-operacoes">
                        <button class="botoes-operacoes-botao" data-operacao="OP.40 LE">OP.40 LE
                            <div class="botao-operacao-info">
                                <img src="/images/operador-real.svg" width="18" alt=""><p class="text-qntOperadores-operacao">0</p><p class="text-qntOperadores-operacao">/</p><p class="text-qntOperadores-operacao">1</p><img src="/images/operador-esperado.svg" width="18" alt="">
                            </div>
                        </button>
                        <button class="botoes-operacoes-botao" data-operacao="OP.40 LD">OP.40 LD
                            <div class="botao-operacao-info">
                                <img src="/images/operador-real.svg" width="18" alt=""><p class="text-qntOperadores-operacao">0</p><p class="text-qntOperadores-operacao">/</p><p class="text-qntOperadores-operacao">1</p><img src="/images/operador-esperado.svg" width="18" alt="">
                            </div>
                        </button>
                    </li>
                    <li class="botoes-operacoes">
                        <button class="botoes-operacoes-botao" data-operacao="OP.60 LE">OP.60 LE
                            <div class="botao-operacao-info">
                                <img src="/images/operador-real.svg" width="18" alt=""><p class="text-qntOperadores-operacao">0</p><p class="text-qntOperadores-operacao">/</p><p class="text-qntOperadores-operacao">1</p><img src="/images/operador-esperado.svg" width="18" alt="">
                            </div>
                        </button>
                        <button class="botoes-operacoes-botao" data-operacao="OP.60 LD">OP.60 LD
                            <div class="botao-operacao-info">
                                <img src="/images/operador-real.svg" width="18" alt=""><p class="text-qntOperadores-operacao">0</p><p class="text-qntOperadores-operacao">/</p><p class="text-qntOperadores-operacao">1</p><img src="/images/operador-esperado.svg" width="18" alt="">
                            </div>
                        </button>
                    </li>
                    <li class="solda">
                        <button class="solda-maquina" data-operacao="OP.70">OP.70
                            <div class="botao-operacao-info">
                                <img src="/images/operador-real.svg" width="18" alt=""><p class="text-qntOperadores-operacao">0</p><p class="text-qntOperadores-operacao">/</p><p class="text-qntOperadores-operacao">2</p><img src="/images/operador-esperado.svg" width="18" alt="">
                            </div>
                        </button>
                    </li>
                    <li class="botoes-operacoes">
                        <p class="estufa-guia">ESTUFA</p>
                    </li>
                    <li class="botoes-operacoes">
                        <button class="botoes-operacoes-botao" data-operacao="OP.90 LE">OP.90 LE
                            <div class="botao-operacao-info">
                                <img src="/images/operador-real.svg" width="18" alt=""><p class="text-qntOperadores-operacao">0</p><p class="text-qntOperadores-operacao">/</p><p class="text-qntOperadores-operacao">1</p><img src="/images/operador-esperado.svg" width="18" alt="">
                            </div>
                        </button>
                        <button class="botoes-operacoes-botao" data-operacao="OP.90 LD">OP.90 LD 
                            <div class="botao-operacao-info">
                                <img src="/images/operador-real.svg" width="18" alt=""><p class="text-qntOperadores-operacao">0</p><p class="text-qntOperadores-operacao">/</p><p class="text-qntOperadores-operacao">1</p><img src="/images/operador-esperado.svg" width="18" alt="">
                            </div>
                        </button>
                    </li>
                    <li class="botoes-operacoes">
                        <button class="botoes-operacoes-botao" data-operacao="OP.110 LE">OP.110 LE 
                            <div class="botao-operacao-info">
                                <img src="/images/operador-real.svg" width="18" alt=""><p class="text-qntOperadores-operacao">0</p><p class="text-qntOperadores-operacao">/</p><p class="text-qntOperadores-operacao">1</p><img src="/images/operador-esperado.svg" width="18" alt="">
                            </div>
                        </button>
                        <button class="botoes-operacoes-botao" data-operacao="OP.110 LD">OP.110 LD 
                            <div class="botao-operacao-info">
                                <img src="/images/operador-real.svg" width="18" alt=""><p class="text-qntOperadores-operacao">0</p><p class="text-qntOperadores-operacao">/</p><p class="text-qntOperadores-operacao">1</p><img src="/images/operador-esperado.svg" width="18" alt="">
                            </div>
                        </button>
                    </li>
                </ul>
                    
                        <button class="bloco-confirmar-botao">Entrar</button>
                        `
                    ;
                break;
            case "Fiat 2810":
                const estilo2810 = document.createElement("link");
                estilo2810.rel = "stylesheet";
                estilo2810.href = "/Linha 01/css/Produtos/2810.css?v=" + Date.now();
                document.head.appendChild(estilo2810);
                asideOperador.innerHTML = `<section class="bloco-boasvindas">
                <div class="boasvindas-aside">
                    <h2 class="texto-boasvindas-aside" style="font-size: 2rem;">Bem-vindo, Leandro!</h2>
                    <p class="texto-boasvindas-aside" style="font-size: 1.2rem;">Onde você irá trabalhar hoje?</p>
                </div>

                <button class="sair-operador"><img src="/images/close.svg" alt="" width="70"></button>

            </section>

            <ul class="layout-2810">
                <li class="botoes-operacoes">
                    <button class="botoes-operacoes-botao" data-operacao="OP.40 LD/LE">OP.40 LD/LE
                        <div class="botao-operacao-info">
                            <img src="/images/operador-real.svg" width="18" alt=""><p class="text-qntOperadores-operacao">0</p><p class="text-qntOperadores-operacao">/</p><p class="text-qntOperadores-operacao">1</p><img src="/images/operador-esperado.svg" width="18" alt="">
                        </div>
                    </button>
                </li>
                <li class="botoes-operacoes">
                    <button class="botoes-operacoes-botao" data-operacao="OP.50 LE">OP.50 LE
                        <div class="botao-operacao-info">
                            <img src="/images/operador-real.svg" width="18" alt=""><p class="text-qntOperadores-operacao">0</p><p class="text-qntOperadores-operacao">/</p><p class="text-qntOperadores-operacao">1</p><img src="/images/operador-esperado.svg" width="18" alt="">
                        </div>
                    </button>
                    <button class="botoes-operacoes-botao" data-operacao="OP.50 LD">OP.50 LD
                        <div class="botao-operacao-info">
                            <img src="/images/operador-real.svg" width="18" alt=""><p class="text-qntOperadores-operacao">0</p><p class="text-qntOperadores-operacao">/</p><p class="text-qntOperadores-operacao">1</p><img src="/images/operador-esperado.svg" width="18" alt="">
                        </div>
                    </button>
                </li>
                <li class="solda">
                    <button class="solda-maquina" data-operacao="OP.60">OP.60
                        <div class="botao-operacao-info">
                            <img src="/images/operador-real.svg" width="18" alt=""><p class="text-qntOperadores-operacao">0</p><p class="text-qntOperadores-operacao">/</p><p class="text-qntOperadores-operacao">1</p><img src="/images/operador-esperado.svg" width="18" alt="">
                        </div>
                    </button>
                </li>
                <li class="botoes-operacoes">
                    <p class="estufa-guia">ESTUFA</p>
                </li>
                <li class="botoes-operacoes">
                    <button class="botoes-operacoes-botao" data-operacao="OP.70/80 LE">OP.80 LE
                        <div class="botao-operacao-info">
                            <img src="/images/operador-real.svg" width="18" alt=""><p class="text-qntOperadores-operacao">0</p><p class="text-qntOperadores-operacao">/</p><p class="text-qntOperadores-operacao">1</p><img src="/images/operador-esperado.svg" width="18" alt="">
                        </div>
                    </button>
                    <button class="botoes-operacoes-botao" data-operacao="OP.70/80 LD">OP.80 LD 
                        <div class="botao-operacao-info">
                            <img src="/images/operador-real.svg" width="18" alt=""><p class="text-qntOperadores-operacao">0</p><p class="text-qntOperadores-operacao">/</p><p class="text-qntOperadores-operacao">1</p><img src="/images/operador-esperado.svg" width="18" alt="">
                        </div>
                    </button>
                </li>
                <li class="botoes-operacoes">
                    <button class="botoes-operacoes-botao" data-operacao="OP.81 LE">OP.81 LE 
                        <div class="botao-operacao-info">
                            <img src="/images/operador-real.svg" width="18" alt=""><p class="text-qntOperadores-operacao">0</p><p class="text-qntOperadores-operacao">/</p><p class="text-qntOperadores-operacao">1</p><img src="/images/operador-esperado.svg" width="18" alt="">
                        </div>
                    </button>
                    <button class="botoes-operacoes-botao" data-operacao="OP.81 LD">OP.81 LD 
                        <div class="botao-operacao-info">
                            <img src="/images/operador-real.svg" width="18" alt=""><p class="text-qntOperadores-operacao">0</p><p class="text-qntOperadores-operacao">/</p><p class="text-qntOperadores-operacao">1</p><img src="/images/operador-esperado.svg" width="18" alt="">
                        </div>
                    </button>
                </li>
                <li class="botoes-operacoes">
                    <button class="botoes-operacoes-botao" data-operacao="OP.100 LE">OP.100 LE 
                        <div class="botao-operacao-info">
                            <img src="/images/operador-real.svg" width="18" alt=""><p class="text-qntOperadores-operacao">0</p><p class="text-qntOperadores-operacao">/</p><p class="text-qntOperadores-operacao">1</p><img src="/images/operador-esperado.svg" width="18" alt="">
                        </div>
                    </button>
                    <button class="botoes-operacoes-botao" data-operacao="OP.100 LD">OP.100 LD 
                        <div class="botao-operacao-info">
                            <img src="/images/operador-real.svg" width="18" alt=""><p class="text-qntOperadores-operacao">0</p><p class="text-qntOperadores-operacao">/</p><p class="text-qntOperadores-operacao">1</p><img src="/images/operador-esperado.svg" width="18" alt="">
                        </div>
                    </button>
                </li>
            </ul>
                
                    <button class="bloco-confirmar-botao">Entrar</button>`;
                switchFuncionou = true;
                break;
                break;
            default:
                alert("Nenhum produto selecionado!");
                break;
        }

        const dataAtualEl = document.getElementById('data-atual');
        const horaAtualEl = document.getElementById('hora-atual');
        const turnoAtualEl = document.getElementById('turno-atual');


        // --- ELEMENTOS DO MODAL DINÂMICO ---
        const overlay = document.querySelector('.overlay');
        const sairOperadorBtn = document.querySelector('.sair-operador');
        const botoesOperacao = Array.from(document.querySelectorAll('.botoes-operacoes-botao, .solda-maquina'));
        const botaoConfirmarOperacao = document.querySelector('.bloco-confirmar-botao');
        const nomeOperadorModalEl = document.querySelector('.bloco-boasvindas .texto-boasvindas-aside');
        const botaoSairOperacao = document.querySelector('.bloco-sair-botao');

        // --- DADOS DA SESSÃO E ESTADO ---
        const card = document.querySelector('.card-Operadores');
        const nomeDaLinha = 's.LA01st_s.LA02st';
        const operadoresReal = document.getElementById(`real-${nomeDaLinha}`);
        const elEsperado = document.getElementById(`esperado-${nomeDaLinha}`);
        const elReal = document.getElementById(`real-${nomeDaLinha}`);
        let pollingInterval;
        let modalAberto = false;
        let nomeOperadorCartao = "";
        let REOperadorCartao = null;
        let esperadoLinha = 0;
        let nomeDoTLIdentificado = null;
        let RETLIdentificado = null;
        let validacaoEncerrarProd = false;

        const API_BASE_URL = '/api';
        const IP_ALVO_MONITORADO = '10.109.133.245';

        const monitor = new IpMonitor(IP_ALVO_MONITORADO, API_BASE_URL, ["TL", "MOD"], 1000);
        monitor.startMonitoring();

        const cooldownSaida = new Map();

        const bloqueioSaida = new Set();

        document.addEventListener('newAccessDetected', async (event) => {
            const { nome, RE, cargo } = event.detail;

            if (cargo.toUpperCase() === "TL") {
                nomeDoTLIdentificado = nome;
                RETLIdentificado = RE;
                abrirModalTL(nome);

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
                    const verificarResponse = await fetch(`/api/apontamentos/verificarEntradaRecente?RE=${encodeURIComponent(RE_normalizado)}`);
                    const verificarDados = await verificarResponse.json();

                    console.log('Resposta da API verificarEntradaRecente:', verificarDados);

                    if (verificarDados.podeSair) {

                        const response = await apontamentoOperador(
                            turnoAtualEl.textContent,
                            RE_normalizado,
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
                        REOperadorCartao = RE_normalizado;
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


        const maquina = ['s.LA01st_s.LA02st'];

        async function atualizarEsperadoEColorirLinhas() {
            const API_URL = '/api/apontamentos/getesperados';

            try {
                const response = await fetch(API_URL);

                if (!response.ok) {
                    console.warn(`Falha ao buscar dados. Status: ${response.status}`);
                    return;
                }

                const dados = await response.json();

                const esperadoObj = dados[`esperado${maquina}`] || {};
                const valorEsperado = Number(esperadoObj.esperado) || 0;
                esperadoLinha = valorEsperado;
                const esperadosZero = valorEsperado === 0;
                const listaProduto = document.querySelector('.bloco-emProducao');

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

                if (elEsperado) elEsperado.textContent = valorEsperado;

                const reaisEl = document.querySelector('.OperadoresNaLinha');
                const esperadoEl = document.querySelector('.quantidadeOperadores');
                const cardOpEl = document.querySelector('.cards-Operadores');

                if (!reaisEl || !esperadoEl || !cardOpEl) return;

                const reais = Number(reaisEl.textContent.trim()) || 0;
                const esperados = Number(esperadoEl.textContent.trim()) || 0;

                cardOpEl.classList.remove('card-cinza', 'card-verde', 'card-vermelho', 'card-amarelo');

                let novaClasse = '';
                let novaCor = '';

                if (esperados === 0) {
                    novaClasse = 'card-cinza';
                    novaCor = 'gray';
                } else if (reais === esperados) {
                    novaClasse = 'card-verde';
                    novaCor = 'green';
                } else if (reais > esperados) {
                    novaClasse = 'card-vermelho';
                    novaCor = 'red';
                } else {
                    novaClasse = 'card-amarelo';
                    novaCor = 'rgb(209, 171, 0)';
                }

                cardOpEl.classList.add(novaClasse);
                card.style.color = novaCor;


                try {
                    const response = await fetch('/api/apontamentos/getOperadoresApontados');
                    if (!response.ok) throw new Error('Erro ao buscar operadores da metalização');

                    const dados = await response.json();

                    dados.forEach(({ Maquina, Qntd_Real }) => {
                        if (!nomeDaLinha.includes(Maquina)) return;

                        if (elReal) {
                            elReal.textContent = Qntd_Real;
                        } else {
                            console.warn(`Elemento real-${Maquina} não encontrado no DOM`);
                        }

                    });

                } catch (error) {
                    console.error('Erro ao buscar dados da metalização:', error);
                }
                carregarContagemOperadores();
            } catch (error) {
                console.error('Erro no ciclo de atualização (rede ou DOM):', error);
            }
        }

        async function carregarContagemOperadores() {
            if (!nomeDaLinha) return;
            try {
                const response = await fetch(`/api/apontamentos/operador/hoje?linha=${encodeURIComponent(nomeDaLinha)}`);
                if (!response.ok) {
                    console.error("Falha ao buscar contagem de operadores. Status:", response.status);
                    botoesOperacao.forEach(botao => {
                        const [opAtuaisEl] = botao.querySelectorAll('.text-qntOperadores-operacao');
                        if (opAtuaisEl) opAtuaisEl.textContent = '0';
                    });
                    return;
                }

                const apontamentos = await response.json();
                const contagemMap = apontamentos.reduce((acumulador, itemAtual) => {
                    acumulador[itemAtual.Operacao] = itemAtual.Qntd_Real;
                    return acumulador;
                }, {});

                let totalOperadoresNaLinha = 0;

                botoesOperacao.forEach(botao => {
                    const operacaoNome = botao.dataset.operacao;
                    const contagem = contagemMap[operacaoNome] || 0;
                    totalOperadoresNaLinha += contagem;
                    const [opAtuaisEl] = botao.querySelectorAll('.text-qntOperadores-operacao');
                    if (opAtuaisEl) opAtuaisEl.textContent = contagem;
                });

                if (operadoresReal) {
                    operadoresReal.textContent = totalOperadoresNaLinha;
                }
            } catch (error) {
                console.error("Erro ao carregar contagem de operadores:", error);
            }
        }

        function atualizarCorOperacoes() {
            botoesOperacao.forEach(botao => {
                const pElements = botao.querySelectorAll('.text-qntOperadores-operacao');

                if (pElements.length >= 3) {

                    const [opAtuaisEl, _, opEsperadosEl] = pElements;

                    const valAtual = parseInt(opAtuaisEl.textContent, 10);
                    const valEsperado = parseInt(opEsperadosEl.textContent, 10);

                    botao.classList.remove('operacao-verde', 'operacao-vermelho', 'operacao-amarelo');

                    if (!isNaN(valAtual) && !isNaN(valEsperado)) {
                        if (valAtual === valEsperado) {
                            botao.classList.add('operacao-verde');
                        } else if (valAtual > valEsperado) {
                            botao.classList.add('operacao-vermelho');
                        } else {
                            botao.classList.add('operacao-amarelo');
                        }
                    }
                } else {
                    console.warn("Estrutura inesperada para botão de operação. Menos de 3 elementos '.text-qntOperadores-operacao' encontrados.", botao);
                    botao.classList.remove('operacao-verde', 'operacao-vermelho', 'operacao-amarelo');
                }
            });
        }

        function atualizarCorLinhaGeral() {
            if (!elReal || !elEsperado || !card) return;

            let totalOperadoresReais = 0;
            botoesOperacao.forEach(botao => {
                const [opAtuaisEl] = botao.querySelectorAll('.text-qntOperadores-operacao');
                if (opAtuaisEl) {
                    totalOperadoresReais += parseInt(opAtuaisEl.textContent, 10) || 0;
                }
            });
            elReal.textContent = totalOperadoresReais;

            const esperados = parseInt(elEsperado.textContent, 10);

            card.classList.remove('card-verde', 'card-vermelho');

            if (!isNaN(totalOperadoresReais) && !isNaN(esperados) && esperados > 0) {
                if (totalOperadoresReais === esperados) {
                    card.classList.add('card-verde');
                } else if (totalOperadoresReais > esperados) {
                    card.classList.add('card-vermelho');
                }
            }
        }

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
        }

        function abrirModalTL(nomeTL) {
            if (!validacaoEncerrarProd) return;

            const modalInstrucao = document.querySelector('.encerrar');
            const overlayInstrucao = document.querySelector('.overlay-saida');
            if (modalInstrucao) modalInstrucao.style.display = 'none';
            if (overlayInstrucao) overlayInstrucao.style.display = 'none';

            const modalConfirmacao = document.querySelector('.encerrarProd');
            const overlayConfirmacao = document.querySelector('.overlay-encerrar');

            if (modalConfirmacao && overlayConfirmacao) {
                modalConfirmacao.style.display = 'flex';
                overlayConfirmacao.style.display = 'block';

                validacaoEncerrarProd = true;
                nomeDoTLIdentificado = nomeTL;
                console.log(`Modal de CONFIRMAÇÃO de encerramento aberto para o TL: ${nomeTL}`);
            } else {
                console.error("Elementos do modal de CONFIRMAÇÃO (.encerrarProd) não encontrados no DOM.");
                modalAberto = false;
            }
        }

        function fecharModalOperador() {
            if (asideOperador) asideOperador.style.display = 'none';
            if (overlay) overlay.style.display = 'none';
            botoesOperacao.forEach(b => b.classList.remove('botao-nao-selecionado'));
            if (botaoSairOperacao) botaoSairOperacao.style.display = 'none';
            if (botaoConfirmarOperacao) botaoConfirmarOperacao.style.display = 'none';
            modalAberto = false;
            if (pollingInterval) clearInterval(pollingInterval);
        }

        if (sairOperadorBtn) sairOperadorBtn.addEventListener('click', fecharModalOperador);


        botoesOperacao.forEach(botao => {
            botao.addEventListener('click', () => {
                botoesOperacao.forEach(b => b.classList.add('botao-nao-selecionado'));
                botao.classList.remove('botao-nao-selecionado');
                if (botaoConfirmarOperacao) botaoConfirmarOperacao.style.display = 'block';
                const btnSelecionado = botoesOperacao.find(b => !b.classList.contains('botao-nao-selecionado'));
            });
        });

        if (botaoConfirmarOperacao) botaoConfirmarOperacao.addEventListener('click', async () => {
            const botaoSelecionado = botoesOperacao.find(b => !b.classList.contains('botao-nao-selecionado'));
            if (!botaoSelecionado) return;
            if (botaoConfirmarOperacao.disabled) return;

            botaoConfirmarOperacao.disabled = true;

            const pEsperadoEl = botaoSelecionado.querySelector('.text-qntOperadores-operacao:last-of-type');
            const qntdEsperada = pEsperadoEl ? parseInt(pEsperadoEl.textContent, 10) : 1;
            const elLE = document.getElementById(`produto-${nomeDaLinha}-le`);
            const elLD = document.getElementById(`produto-${nomeDaLinha}-ld`);
            const elUnico = document.getElementById(`produto-${nomeDaLinha}-unico`);
            const prodLE = elLE ? elLE.textContent : null;
            const prodLD = elLD ? elLD.textContent : null;
            const prodUnico = elUnico ? elUnico.textContent : null;
            const operacao = botaoSelecionado.dataset.operacao;

            if (!operacao) {
                toastr.error('Erro: Operação inválida.');
                botaoConfirmarOperacao.disabled = false;
                return;
            }
            botaoConfirmarOperacao.textContent = 'Processando...';

            const response = await apontamentoOperador(
                turnoAtualEl.textContent,
                REOperadorCartao,
                nomeOperadorCartao.toUpperCase(),
                'MOD',
                nomeDaLinha,
                qntdEsperada,
                operacao,
                'Entrada',
                prodLE,
                prodLD,
                prodUnico
            );
            if (response.sucesso) {
                document.querySelector('.popup-entrada').style.display = 'flex';
                document.querySelector('.overlay-popup').style.display = 'block';
                document.querySelector('.popup-entrada-nome').textContent = nomeOperadorCartao;
                await carregarDadosIniciais();
                setTimeout(DesaparecerPopUp, 3000);

                fecharModalOperador();
                botaoConfirmarOperacao.textContent = 'Confirmar';
                botaoConfirmarOperacao.disabled = false;
            } else {
                botaoConfirmarOperacao.textContent = 'Confirmar';
                botaoConfirmarOperacao.disabled = false;
                alert(`Erro: ${response.mensagem}`);
            }
        });

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

        async function enviarFinalizacaoParaBanco() {
            if (!nomeDoTLIdentificado) {
                toastr.error("Erro crítico: Nome do Team Leader não encontrado. Tente novamente.");
                cancelarEVoltarAoNormal();
                return;
            }

            const elLE = document.getElementById(`produto-${nomeDaLinha}-le`);
            const elLD = document.getElementById(`produto-${nomeDaLinha}-ld`);
            const elUnico = document.getElementById(`produto-${nomeDaLinha}-unico`);
            const prodLE = elLE ? elLE.textContent : null;
            const prodLD = elLD ? elLD.textContent : null;
            const prodUnico = elUnico ? elUnico.textContent : null;


            const response = await apontamentoTeamLeader(
                turnoAtualEl.textContent,
                RETLIdentificado,
                nomeDoTLIdentificado.toUpperCase(),
                "TL",
                nomeDaLinha,
                esperadoLinha,
                "Finalizado",
                prodLE,
                prodLD,
                prodUnico
            );



            if (response.sucesso) {
                toastr.success('Produção finalizada com sucesso!');
                registrarSaidaAutomaticaParaLinha(nomeDaLinha);
                window.location.href = '/Linha 01/html/telaInicial.html';
            } else {
                toastr.error(`Erro ao finalizar produção: ${response.mensagem}`);
                cancelarEVoltarAoNormal();
            }
        }

        const encerrarPopup = document.querySelector('.encerrar');

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

        const navEncerrarProducao = document.querySelector('.encerrarProd');
        const overlayConfirmar = document.querySelector('.overlay-encerrar');
        const btnFinalizarDoModalConfirmacao = document.querySelector('.encerrarProd-botoes-encerrar');
        const btnCancelarDoModalConfirmacao = document.querySelector('.encerrarProd-botoes-cancelar');
        const btnFecharXDoModalConfirmacao = document.querySelector('.encerrarProd-sair');

        async function abrirModalEncerrarProducao() {
            navEncerrarProducao.style.display = 'flex';
            overlayConfirmar.style.display = 'block';
        }

        if (btnFinalizarDoModalConfirmacao) {
            btnFinalizarDoModalConfirmacao.addEventListener('click', enviarFinalizacaoParaBanco);
        }
        if (btnCancelarDoModalConfirmacao) btnCancelarDoModalConfirmacao.addEventListener('click', cancelarEVoltarAoNormal);
        if (btnFecharXDoModalConfirmacao) btnFecharXDoModalConfirmacao.addEventListener('click', cancelarEVoltarAoNormal);

        function cancelarEVoltarAoNormal() {
            navEncerrarProducao.style.display = 'none';
            overlayConfirmar.style.display = 'none';
            encerrarPopup.style.display = 'none';
            document.querySelector('.overlay-saida').style.display = 'none';
            validacaoEncerrarProd = false;
            if (pollingInterval) clearInterval(pollingInterval);
        }

        document.querySelector('.card-saida-fechar')?.addEventListener('click', () => {
            document.querySelector('.card-saida').style.display = 'none';
            document.querySelector('.overlay-saida').style.display = 'none';
        });

        document.querySelector('.card-saida-botoes-cancelar')?.addEventListener('click', () => {
            document.querySelector('.card-saida').style.display = 'none';
            document.querySelector('.overlay-saida').style.display = 'none';
        });

        async function carregarDadosIniciais() {
            await atualizarEsperadoEColorirLinhas();
            await carregarContagemOperadores();
            atualizarCorOperacoes();
            atualizarCorLinhaGeral();
        }

        // --- INICIALIZAÇÃO DA PÁGINA ---
        carregarDadosIniciais();
        exibirHorarioAtual();
        setInterval(exibirHorarioAtual, 1000);
    }

    window.addEventListener('DOMContentLoaded', async () => {

        const overlay = document.getElementById('loadingOverlay');

        await inicializarInterface();

        setTimeout(() => {
            overlay.classList.add('fade-out');
            setTimeout(() => {
                overlay.style.display = 'none';
            }, 500);

        }, 500);
    });


});