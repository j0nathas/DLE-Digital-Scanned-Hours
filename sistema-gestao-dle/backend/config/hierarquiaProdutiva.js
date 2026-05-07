// backend/config/hierarquiaProdutiva.js

const { getInfoMaquina } = require('./mapeamentoMaquinas');
const { obterGrupoPorCC, obterSiglaPlanta } = require('./mapeamentoCentroCusto');

function obterHierarquiaProdutiva({ empresa, centroCusto, codigoMaquina }) {

    // Aceita tanto sigla ("MMB") quanto código numérico ("001")
    const siglaMap = { 'MLB': '700', 'MJN': '720', 'MMB': '001' };
    const empresaNorm = siglaMap[String(empresa).toUpperCase().trim()] || empresa;

    // 1️⃣ Planta
    const planta = obterSiglaPlanta(empresaNorm) || String(empresa).toUpperCase().trim();

    // 2️⃣ Centro de custo via CC
    let grupoCC = obterGrupoPorCC(empresaNorm, centroCusto);

    // 3️⃣ Info da máquina
    const infoMaquina = getInfoMaquina(codigoMaquina);

    // 🔁 Fallback: se CC não produtivo, tenta setor da máquina
    if (grupoCC === 'NÃO PRODUTIVO' && infoMaquina && infoMaquina.setor !== 'NÃO MAPEADO') {
        grupoCC = infoMaquina.setor;
    }

    return {
        planta:       planta || 'N/A',
        centroCusto:  grupoCC || 'NÃO MAPEADO',
        maquina:      codigoMaquina ? codigoMaquina.toString().toUpperCase().trim() : 'N/A'
    };
}

module.exports = { obterHierarquiaProdutiva };