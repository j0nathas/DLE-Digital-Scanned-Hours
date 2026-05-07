// backend/config/mapeamentoCentroCusto.js

// Mapeamento para MLB (700, 702, 703, 710)
const mapeamentoMLB = {
    '2222': 'METALIZAÇÃO',
    '2238': 'MONTAGEM LANTERNAS',
    '2211': 'INJEÇÃO',
    '2217': 'INJEÇÃO',
    '2216': 'INJEÇÃO',
    '2231': 'SMALL',
    '2242': 'PINTURA',
    'NULL': 'MONTAGEM LANTERNAS'
};

// Mapeamento para MJN (720, 721)
const mapeamentoMJN = {
    '40261': 'INJEÇÃO',
    '40265': 'INJEÇÃO',
    '40264': 'INJEÇÃO',
    '40272': 'MONTAGEM FAROL',
    '40271': 'MONTAGEM FAROL',
    '40273': 'MONTAGEM LANTERNAS',
    '40223': 'METALIZAÇÃO',
    '40135': 'MONTAGEM SUBCONJUNTO',
    '40163': 'MONTAGEM SUBCONJUNTO',
    'NULL' : 'MONTAGEM SUBCONJUNTO'
};

// Mapeamento para MMB (001, 003) - Baseado na sua lista
const mapeamentoMMB = {
    // Injeção
    '1.2.01.0.0': 'INJETORAS',
    // Solta / Cabos
    '1.1.07.0.0': 'SOLDA',
    '1.1.06.0.0': 'CABOS',
    // Albatross
    '1.1.25.0.0': 'ALBATROSS',
    '1.1.25.1.0': 'ALBATROSS',
    '1.1.25.2.0': 'ALBATROSS',
    '1.1.25.3.0': 'ALBATROSS',
    '1.1.25.4.0': 'ALBATROSS',
    // Atuadores
    '1.1.04.0.0': 'ATUADORES',
    // Espelhos
    '1.1.19.0.0': 'ESPELHOS',
    '1.1.20.0.0': 'ESPELHOS',
    '1.1.20.1.0': 'ESPELHOS',
    '1.1.20.2.0': 'ESPELHOS',
    '1.1.20.3.0': 'ESPELHOS',
    '1.1.21.0.0': 'ESPELHOS',
    '1.1.22.0.0': 'ESPELHOS',
    '1.1.23.0.0': 'ESPELHOS',
    '1.1.24.0.0': 'ESPELHOS',
    // Fechaduras e Maçanetas
    '1.1.01.0.0': 'FECHADURAS / MACANETAS',
    '1.1.03.0.0': 'FECHADURAS / MACANETAS',
    '1.1.11.0.0': 'FECHADURAS / MACANETAS',
    '1.1.12.0.0': 'FECHADURAS / MACANETAS',
    '1.1.14.0.0': 'FECHADURAS / MACANETAS',
    '1.1.18.0.0': 'FECHADURAS / MACANETAS',
    // Produção Geral
    '1.3.01.0.0': 'FORA DE ROTA',
    '1.1.00.0.0': 'PRODUÇÃO',
    '1.1.15.0.0': 'EMBALAGEM'
};

/**
 * Retorna a sigla da planta baseada no código da empresa
 */
function obterSiglaPlanta(empresa) {
    const emp = String(empresa).trim();
    if (['001', '002', '003', '004', '006'].includes(emp)) return 'MMB';
    if (['700', '702', '703', '710'].includes(emp)) return 'MLB';
    if (['720', '721'].includes(emp)) return 'MJN';
    return 'OUTROS';
}

/**
 * Retorna o nome do grupo mapeado ou "NÃO PRODUTIVO" para setores administrativos
 */
function obterGrupoPorCC(empresa, codCC, nomeSetorOriginal) {
    const cc = codCC ? String(codCC).trim() : 'NULL';
    const emp = String(empresa).trim();

    // Regras para MLB
    if (['700', '702', '703', '710'].includes(emp)) {
        return mapeamentoMLB[cc] || 'NÃO PRODUTIVO';
    }

    // Regras para MJN
    if (['720', '721'].includes(emp)) {
        return mapeamentoMJN[cc] || 'NÃO PRODUTIVO';
    }

    // Regras para MMB
    if (['001', '002', '003', '004', '006'].includes(emp)) {
        return mapeamentoMMB[cc] || 'NÃO PRODUTIVO';
    }

    return 'NÃO PRODUTIVO';
}

module.exports = { obterGrupoPorCC, obterSiglaPlanta };