// backend/utils/enriquecerHierarquia.js

const { obterHierarquiaProdutiva } = require('../config/hierarquiaProdutiva');

function enriquecerComHierarquia(registro) {

    const empresa =
        registro.Empresa ||
        registro.Planta ||
        registro.PlantaSigla ||
        registro.Codigo_Empresa ||
        null;

    const centroCusto =
        registro.CentroCusto ||
        registro.C_Custo ||
        registro.Codigo_CentroCusto ||
        registro.Setor ||
        registro.Desc_C_Custo ||
        null;

    const codigoMaquina =
        registro.Maquina ||
        registro.Linha ||
        registro.CodMaquina ||
        registro.NomeMaquina ||
        null;

    const hierarquia = obterHierarquiaProdutiva({
        empresa,
        centroCusto,
        codigoMaquina
    });

    return {
        ...registro,
        Planta:       hierarquia.planta,       // maiúsculo (usado pelo frontend como p.Planta)
        Maquina:      hierarquia.maquina,      // maiúsculo (usado pelo frontend como p.Maquina)
        planta:       hierarquia.planta,       // minúsculo (compatibilidade)
        centroCusto:  hierarquia.centroCusto,
        maquina:      hierarquia.maquina
    };
}

module.exports = { enriquecerComHierarquia };