// backend/config/mapeamentoMaquinas.js

const criarMapa = (lista, planta, setor) => {
    return lista.reduce((acc, id) => {
        acc[id.toUpperCase().trim()] = { planta, setor };
        return acc;
    }, {});
};

// Função para gerar injetoras MMB por padrão (v.L01 a v.L30, v.I01 a v.I40, v.J01 a v.J20)
const gerarInjetorasMMB = () => {
    const lista = ['INJETORA'];
    // Padrão v.Lxx-H (ex: v.L01-H1K150, v.L16-H1K400)
    for (let i = 1; i <= 30; i++) {
        const n = i.toString().padStart(2, '0');
        ['H1K80','H1K100','H1K110','H1K150','H1K160','H1K200','H1K280',
         'H1K300','H1K400','H1K420','H1K500','V1K27','V1K100'].forEach(s => {
            lista.push(`v.l${n}-${s}`);
        });
        lista.push(`v.l${n}`); // sem sufixo
    }
    // Padrão v.Ixx (ex: v.I12-H1K300)
    for (let i = 1; i <= 40; i++) {
        const n = i.toString().padStart(2, '0');
        ['H1K80','H1K100','H1K110','H1K150','H1K160','H1K200','H1K280',
         'H1K300','H1K400','H1K420','H1K500','H1K530','H1K1300',
         'H2K1000','H2K1150','H2K1700','H3K1000'].forEach(s => {
            lista.push(`v.i${n}-${s}`);
        });
        lista.push(`v.i${n}`);
    }
    // Padrão v.Jxx (ex: v.J16-H1K400)
    for (let i = 1; i <= 30; i++) {
        const n = i.toString().padStart(2, '0');
        ['H1K80','H1K100','H1K110','H1K150','H1K160','H1K200','H1K280',
         'H1K300','H1K400','H1K420','H1K500'].forEach(s => {
            lista.push(`v.j${n}-${s}`);
        });
        lista.push(`v.j${n}`);
    }
    return lista;
};

const MAPA_MAQUINAS = {

    // =========================================================
    // MMB (RHEMA)
    // =========================================================
    ...criarMapa([
        "v.RE01gm","v.RE02gm","v.RE03gm","v.RE04gm","v.RE05re",
        "v.RE06re","v.RE07fi","v.RE08fi","v.RE09fi","v.EM01re",
        "v.RE04GM","v.RE05RE" // aliases extras
    ], "MMB", "MONTAGEM RETROVISORES"),

    ...criarMapa([
        "v.FE01fi","v.FE02fi","v.FE03vw","v.FE04vw","v.FE05fi","v.FE06fi",
        "P.FT",
        "v.BA01fi",
        "v.PA01di",
        "v.AT01ab","v.AT02ab",
        "v.FS01ab","v.FS02ab","v.FS03fi"
    ], "MMB", "MONTAGEM FECHADURAS"),

    ...criarMapa(gerarInjetorasMMB(), "MMB", "INJEÇÃO"),

    ...criarMapa([
        "v.CA01fi","v.CA02fi",
        "v.SC01at","v.SC02at","v.SC03so","v.SC04at","v.SC05ab",
        "v.SC06vw","v.SC07fi","v.SC08fi","v.SC09fi","v.SC10fi",
        "v.SC11vw","v.SC12ab","v.SC13fi","v.SC14so","v.SC15so",
        "v.SC16so","v.SC17so",
        "v.SC14SO","v.SC15SO","v.SC16SO","v.SC17SO" // aliases
    ], "MMB", "MONTAGEM SUBCONJUNTOS"),

    // Máquinas MMB extras vistas nos logs
    ...criarMapa([
        "v.FE05FI","v.FE06FI","v.FE03VW","v.FE04VW",
        "v.RE06RE","v.FS02AB","v.RE02GM","v.RE03GM",
        "v.FO6FI","v.FO5FI",
        "E.GM1-2","E.GM1-1"
    ], "MMB", "MONTAGEM RETROVISORES"),

    // =========================================================
    // MLB (OLSA)
    // =========================================================
    ...criarMapa([
        "S.MT01","S.MT02","S.MT03","S.MT04",
        "MT01","MT02","MT03","MT04",
    ], "MLB", "METALIZAÇÃO"),

    ...criarMapa(["S.HC01","HC01"], "MLB", "PINTURA"),

    ...criarMapa(["MONTAGEM MANUAL","MANUAL"], "MLB", "MONTAGEM MANUAL"),

    ...criarMapa([
        "S.I01H1K160","S.I02H1K200","S.I03H1K100","S.I04H1K120",
        "S.I05H1K65","S.I06H1K150","S.I07H1K150","S.I08H1K65",
        "S.I09H1K86","S.I10H1K220","S.I11H1K120","S.I12H1K120",
        "S.I13H1K320","S.I14H1K160","S.I15H1K140","S.I16H1K200",
        "S.I17H1K220","S.I18H1K220","S.I19H1K220","S.I20H1K320",
        "S.I21H1K530","S.I22H1K1300","S.I23H3K1000","S.I24H1K1300",
        "S.I25H3K1000","S.I26H1K530","S.I27H2K1000","S.I28H1K320",
        "S.I29H1K1300","S.I30H2K1700","S.I31H2K1000","S.I32H1K1000",
        "S.I33H2K1000","S.I34H1K1300"
    ], "MLB", "INJEÇÃO"),

    ...criarMapa([
        "S.LA01ST","S.LA02ST","S.LA03GM","S.LA04GM","S.LA05GM",
        "S.LA06GM","S.LA07RE","S.LA08RE","S.LA09VW","S.LA010ST"
    ], "MLB", "MONTAGEM LANTERNAS"),

    ...criarMapa([
        "S.SM01VW","S.SM02VW","S.SM03VW","S.SM04M","S.SM05MT","S.SM16MT",
        "S.SM06TY","S.SM07ST","S.SM08ST","S.SM09ST","S.SM10ST",
        "S.SM11ST","S.SM12NI","S.SM13ST","S.SM14ST","S.SM15VW",
        "S.SM17HO","S.SM18VW","S.SM19ST","S.SM20GM",
        "S.SC21VW","S.SC22VW"
    ], "MLB", "MONTAGEM SMALL"),

    ...criarMapa([
        "2001","TERCEIRIZACAO","TERCEIRIZAÇÃO"
    ], "MLB", "TERCEIRIZAÇÃO"),

    // =========================================================
    // MJN (JARINU)
    // =========================================================
    ...criarMapa([
        "J.FA01","J.FA02","J.FA03","J.FA04"
    ], "MJN", "MONTAGEM FAROL"),

    ...criarMapa([
        "J.I01-H1K1000","J.I02-H2K1150","J.I03-H2K1700",
        "J.I04-H1K500","J.I05-H1K500","J.I06-H1K500"
    ], "MJN", "INJEÇÃO"),

    ...criarMapa([
        "J.LA01","J.LA02","J.LA03"
    ], "MJN", "MONTAGEM LANTERNA"),

    "J.MT01": { planta: "MJN", setor: "METALIZAÇÃO" },

    ...criarMapa([
        "J.SC01","J.SC02","J.SC03","J.SC04","J.SC05","J.SC07"
    ], "MJN", "MONTAGEM SUBCONJUNTO"),
};

const getInfoMaquina = (codigo) => {
    if (!codigo) return { planta: "N/A", setor: "NÃO MAPEADO" };
    const key = codigo.toString().toUpperCase().trim();
    return (
        MAPA_MAQUINAS[key] ||
        MAPA_MAQUINAS["S." + key] ||
        MAPA_MAQUINAS["V." + key] ||
        { planta: "N/A", setor: "NÃO MAPEADO" }
    );
};

module.exports = { MAPA_MAQUINAS, getInfoMaquina };