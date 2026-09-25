import { apontamentoTeamLeader, verificarStatusDaLinha } from '/js/funcoes.js';
/* import { btnConfirmar } from '/injecao_small/js/telaInicial.js'; */

export const maquinas = ['s.I01h1k160', 's.I02h1k200', 's.I03h1k100', 's.I03h1k100_s.I09h1k86', 's.I04h1k120', 's.I05h1k65', 's.I05h1k65_s.I08h1k65',
    's.I06h1k150', 's.I07h1k150', 's.I08h1k65', 's.I09h1k86', 's.I10h1k220', 's.I11h1k120', 's.I11h1k120_s.I12h1k120', 's.I12h1k120', 's.I13h1k320', 's.I14h1k160',
    's.I15h1k140', 's.I16h1k200', 's.I17h1k220', 's.I18h1k220', 's.I19h1k220', 's.I20h1k320', 's.I28h1k320'];

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

let produtoSelecionado = null;
const sairBtn = document.getElementById('btn-sair-modal');

export const gruposInjetoras = {
    "s.I03h1k100": "s.I03h1k100_s.I09h1k86",
    "s.I09h1k86": "s.I03h1k100_s.I09h1k86",

    "s.I11h1k120": "s.I11h1k120_s.I12h1k120",
    "s.I12h1k120": "s.I11h1k120_s.I12h1k120",

    "s.I05h1k65": "s.I05h1k65_s.I08h1k65",
    "s.I08h1k65": "s.I05h1k65_s.I08h1k65",

};

export const gruposInjetorasDupla = {
    "s.I03h1k100": "s.I09h1k86",
    "s.I09h1k86": "s.I03h1k100",

    "s.I11h1k120": "s.I12h1k120",
    "s.I12h1k120": "s.I11h1k120",

    "s.I05h1k65": "s.I08h1k65",
    "s.I08h1k65": "s.I05h1k65",

};

const botaoSelecionarTodas = document.querySelector('.selecionar-todas');

const container = document.querySelector('#container-botoes');
const overlay = document.getElementById('overlay');
const asideTeamleader = document.getElementById('aside-teamleader');
let botoesProduto = null;
let botoesProdutoMaquinas = null;
const btnConfirmar = document.getElementById('btn-confirmar');


export function fecharModal() {
    overlay.style.display = 'none';
    asideTeamleader.style.display = 'none';
    resetarModal();
}

function recarregarFuncao(recarregar) {
    let wrapper = recarregar.closest('.botoes-injetoras-botao');
    let divWrapper = '';
    let injetora1 = null;
    let injetora2 = null;

    if (!wrapper) {
        wrapper = recarregar.parentElement.querySelector('.botoes-injetoras-botao');
        divWrapper = wrapper.closest('.div-botoes-conjunto');

        injetora1 = wrapper.dataset.produto;
        injetora2 = gruposInjetorasDupla[wrapper.dataset.produto];

    } else {
        const originais = encontrarOriginais(wrapper.dataset.produto);

        if (!originais) {
            console.error("encontrarOriginais retornou null");
            return;
        }

        [injetora1, injetora2] = originais;
    }

    const divInj1 = document.querySelector(`[data-div="${injetora1}"]`);
    const divInj2 = document.querySelector(`[data-div="${injetora2}"]`);



    divInj1.innerHTML = '';
    divInj2.innerHTML = '';

    criarBlocoInjetora(divInj1, injetora1, injetora2);
    criarBlocoInjetora(divInj2, injetora2, injetora1);
}

export function resetarModal() {
    produtoSelecionado = null;
    const selecionados = document.querySelectorAll('.botao-injetoras-selecionado');
    selecionados.forEach(selecionado => selecionado.classList.remove('botao-injetoras-selecionado'))
    btnConfirmar.style.display = 'none';
}

function atualizarBotaoConfirmar() {
    const existeSelecionado =
        !!document.querySelector('.botao-injetoras-selecionado');

    produtoSelecionado = existeSelecionado
        ? document.querySelector('.botao-injetoras-selecionado').dataset.produto
        : null;

    btnConfirmar.style.display = existeSelecionado ? 'block' : 'none';
}

function atualizarBotaoSelecionarTodas() {
    const botoes = document.querySelectorAll('.botoes-injetoras-botao');
    const todosSelecionados = [...botoes].every(btn =>
        btn.classList.contains('botao-injetoras-selecionado')
    );

    const botoesconjunto = document.querySelectorAll('.botoes-injetoras-botao-conjunto');
    const todosSelecionadosConjunto = [...botoesconjunto].every(btn =>
        btn.classList.contains('botao-injetoras-selecionado-conjunto')
    );

    if (todosSelecionados && todosSelecionadosConjunto) {
        botaoSelecionarTodas.innerHTML =
            'REMOVER SELEÇÕES <img src="/images/remover-selecoes.svg" width="25">';
    } else {
        botaoSelecionarTodas.innerHTML =
            'SELECIONAR TODAS <img src="/images/selecionar-todos.svg" width="25">';
    }
}

function selecionarTodasOuLimpar() {
    const botoes = document.querySelectorAll('.botoes-injetoras-botao');
    const todosSelecionados = [...botoes].every(btn =>
        btn.classList.contains('botao-injetoras-selecionado')
    );

    const botoesconjunto = document.querySelectorAll('.botoes-injetoras-botao-conjunto');
    const todosSelecionadosConjunto = [...botoesconjunto].every(btn =>
        btn.classList.contains('botao-injetoras-selecionado-conjunto')
    );

    const boxConjunto = document.querySelectorAll('.botoes-maquinas-conjunto');

    if (todosSelecionados && todosSelecionadosConjunto) {
        botoes.forEach(btn => btn.classList.remove('botao-injetoras-selecionado'));
        botoesconjunto.forEach(btn => btn.classList.remove('botao-injetoras-selecionado-conjunto'));
        boxConjunto.forEach(box => box.style.display = 'none')


    } else {
        botoes.forEach(btn => btn.classList.add('botao-injetoras-selecionado'));
        botoesconjunto.forEach(btn => btn.classList.add('botao-injetoras-selecionado-conjunto'))
        boxConjunto.forEach(box => box.style.display = 'flex')
    }

    atualizarBotaoConfirmar();
    atualizarBotaoSelecionarTodas();
}

function formatarCodigo(codigo) {
    return codigo.replace(/s\.I(\d{2})/, 's.I<strong class="destaque-injetora">$1</strong>');
}

function formatarJuncao(juncao) {
    return juncao
        .split('_')
        .map(formatarCodigo)
        .join('<br>');
}

export function encontrarOriginais(grupo) {
    return Object.keys(gruposInjetoras).filter(
        key => gruposInjetoras[key] === grupo
    );
}

function criarBlocoInjetora(container, numeroMaquina, maquinaPar) {
    // Botão principal
    const botaoInjetora = document.createElement("button");
    botaoInjetora.className = "botoes-injetoras-botao-conjunto";
    botaoInjetora.setAttribute("data-produto", numeroMaquina);

    const pInjetora = document.createElement("p");
    pInjetora.innerHTML = formatarJuncao(numeroMaquina);
    botaoInjetora.appendChild(pInjetora);

    // Section
    const section = document.createElement("section");
    section.className = "botoes-maquinas-conjunto";

    const texto = document.createElement("p");
    texto.className = "botoes-maquinas-conjunto-text";
    texto.textContent = `Produzirá com o mesmo operador da ${maquinaPar}?`;

    const divBotoes = document.createElement("div");

    const botaoSim = document.createElement("button");
    botaoSim.className = "botoes-maquinas-conjunto-botao btn-sim";
    botaoSim.textContent = "SIM";

    const botaoNao = document.createElement("button");
    botaoNao.className = "botoes-maquinas-conjunto-botao btn-nao";
    botaoNao.textContent = "NÃO";

    divBotoes.appendChild(botaoSim);
    divBotoes.appendChild(botaoNao);

    section.appendChild(texto);
    section.appendChild(divBotoes);

    // Adiciona tudo no container
    container.appendChild(botaoInjetora);
    container.appendChild(section);
}


container.addEventListener('click', (e) => {
    const botao = e.target.closest('.botoes-injetoras-botao');
    const botaoConjunto = e.target.closest('.botoes-injetoras-botao-conjunto');
    const btnNao = e.target.closest('.btn-nao');
    const btnSim = e.target.closest('.btn-sim');
    const btnRecarregar = e.target.closest('.recarregar-btn');

    if (botao && !botaoConjunto) {
        botao.classList.toggle('botao-injetoras-selecionado');
        atualizarBotaoConfirmar();
        atualizarBotaoSelecionarTodas();
    }

    if (botaoConjunto) {
        botaoConjunto.classList.toggle('botao-injetoras-selecionado-conjunto');

        const boxConjunto =
            botaoConjunto.parentElement.querySelector('.botoes-maquinas-conjunto');

        if (boxConjunto) {
            boxConjunto.style.display =
                boxConjunto.style.display === 'flex' ? 'none' : 'flex';
        }

        atualizarBotaoConfirmar();
        atualizarBotaoSelecionarTodas();
    }

    if (btnNao) {
        const conjunto = btnNao.closest('.botoes-maquinas-conjunto');
        const wrapper = conjunto.closest('.div-botoes-conjunto');
        const botaoMaquina = wrapper.querySelector('.botoes-injetoras-botao-conjunto');
        const dataProduto = botaoMaquina.dataset.produto;
        const botaoDupla = document.querySelector(`[data-produto="${gruposInjetorasDupla[dataProduto]}"]`);
        const conjuntoDupla = botaoDupla.parentElement.querySelector('.botoes-maquinas-conjunto');




        conjunto.remove();
        conjuntoDupla.remove();

        const imgRecarregar = document.createElement('img');
        imgRecarregar.className = 'recarregar-btn';
        imgRecarregar.src = '/images/recarregar.svg';
        wrapper.appendChild(imgRecarregar);

        botaoMaquina.classList.replace(
            'botao-injetoras-selecionado-conjunto',
            'botao-injetoras-selecionado'
        );
        botaoMaquina.classList.replace(
            'botoes-injetoras-botao-conjunto',
            'botoes-injetoras-botao'
        );

        botaoDupla.classList.remove(
            'botao-injetoras-selecionado-conjunto'
        );
        botaoDupla.classList.replace(
            'botoes-injetoras-botao-conjunto',
            'botoes-injetoras-botao'
        );

        atualizarBotaoConfirmar();
        atualizarBotaoSelecionarTodas();
    }

    if (btnSim) {
        const wrapper = btnSim.closest('.div-botoes-conjunto');
        const botaoMaquina = wrapper.querySelector('.botoes-injetoras-botao-conjunto');
        const dataProduto = botaoMaquina.dataset.produto;
        const botaoDupla = document.querySelector(`[data-produto="${gruposInjetorasDupla[dataProduto]}"]`);
        const wrapperDupla = botaoDupla.closest('.div-botoes-conjunto');
        const juncaoDupla = gruposInjetoras[dataProduto];

        wrapper.innerHTML = '';
        wrapperDupla.innerHTML = '';

        const botao = document.createElement("div");
        botao.className = "botoes-injetoras-botao botao-injetoras-selecionado";
        botao.dataset.produto = juncaoDupla;
        botao.innerHTML = `<p>${formatarJuncao(juncaoDupla)}</p>  <img class="recarregar-btn" src="/images/recarregar.svg" alt="">`;
        wrapper.appendChild(botao);

        atualizarBotaoConfirmar();
        atualizarBotaoSelecionarTodas();
    }

    if (btnRecarregar) {
        recarregarFuncao(btnRecarregar);
    }
});

export async function apontamentoConfirmarBtn(turno, RE, nomeTL, qntEsperada, status, prod_le, prod_ld, prod_unico) {
    const selecionados = document.querySelectorAll('.botao-injetoras-selecionado');
    const response = await fetch('/api/apontamentos/getesperados');
    const dados = await response.json();

    for (const botao of selecionados) {
        const nomeInjetora = botao.dataset.produto;
        criarBotoesTL(nomeInjetora, dados);
        let dedicado = null;

        const response = await apontamentoTeamLeader(
            turno, RE, nomeTL, "TL", nomeInjetora, qntEsperada, status, prod_le, prod_ld, prod_unico
        )

        if (response.sucesso) {
            toastr.success(`Apontamento para ${nomeInjetora} realizado.`);
        } else {
            toastr.error(`Erro no apontamento de ${nomeInjetora}: ${response.mensagem}`);
            return;
        }
    }
}


botaoSelecionarTodas.addEventListener('click', selecionarTodasOuLimpar);


sairBtn.addEventListener('click', fecharModal);


/***************************************************************************************/
/***************************************************************************************/
/***********************************ENCERRAR********************************************/
/***************************************************************************************/
/***************************************************************************************/

