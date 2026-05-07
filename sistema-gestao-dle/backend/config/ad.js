const ldap = require('ldapjs');

const plantaConfig = {
  MLB: { ou: process.env.AD_OU_OBR, saUser: process.env.AD_SA_OBR_USER, saPass: process.env.AD_SA_OBR_PASS, nome: 'MLB - São Bernardo', codigo: 'BR-MLB-DL' },
  MJN: { ou: process.env.AD_OU_OBR, saUser: process.env.AD_SA_OBR_USER, saPass: process.env.AD_SA_OBR_PASS, nome: 'MJN - Jarinu', codigo: 'BR-MJN-DL' },
  MMB: { ou: process.env.AD_OU_MMB, saUser: process.env.AD_SA_MMB_USER, saPass: process.env.AD_SA_MMB_PASS, nome: 'MMB - Vinhedo', codigo: 'BR-MMB-DL' },
};

function criarCliente() {
  return ldap.createClient({ 
    url: process.env.AD_URL, 
    timeout: 10000, 
    connectTimeout: 15000 
  });
}

function bindUsuarioDireto(login, senha) {
  return new Promise((resolve, reject) => {
    const userDN = `${login}@${process.env.AD_DOMAIN}`;
    const client = criarCliente();
    client.bind(userDN, senha, (err) => {
      client.unbind();
      if (err) return reject(err);
      resolve(true);
    });
  });
}

async function autenticarAD(login, senha, codigoPlanta) {
  const config = plantaConfig[codigoPlanta];
  if (!config) throw new Error(`Planta inválida: ${codigoPlanta}`);

  // PASSO 1: Validar senha (já sabemos que funciona pelo seu log!)
  await bindUsuarioDireto(login, senha);

  // PASSO 2: Buscar dados extras
  const saClient = criarCliente();
  
  return new Promise((resolve) => {
    saClient.bind(config.saUser, config.saPass, (err) => {
      if (err) {
        saClient.unbind();
        return resolve({ login, displayName: login, mail: `${login}@magna.global`, planta: codigoPlanta, nomePlanta: config.nome });
      }

      const opts = {
        filter: `(sAMAccountName=${login})`,
        scope: 'sub',
        attributes: ['displayName', 'mail']
      };

      saClient.search(config.ou, opts, (err, res) => {
        let adUser = null;

        if (err) {
          saClient.unbind();
          return resolve({ login, displayName: login, mail: `${login}@magna.global`, planta: codigoPlanta, nomePlanta: config.nome });
        }

        res.on('searchEntry', (entry) => {
          // Correção: capturando o objeto de forma segura
          adUser = entry.pojo ? entry.pojo.attributes : entry.attributes;
        });

        res.on('end', () => {
          saClient.unbind();
          
          // Extraindo atributos (lidando com arrays do LDAP)
          const getAttr = (attrName) => {
            if (!adUser) return null;
            const attr = adUser.find(a => a.type === attrName || a.attribute === attrName);
            return attr ? (Array.isArray(attr.values) ? attr.values[0] : attr.vals[0]) : null;
          };

          const nomeCompleto = getAttr('displayName') || login;
          const emailPrincipal = getAttr('mail') || `${login}@magna.global`;

          resolve({
            login: login,
            displayName: nomeCompleto,
            mail: emailPrincipal,
            planta: codigoPlanta,
            nomePlanta: config.nome
          });
        });

        res.on('error', () => {
          saClient.unbind();
          resolve({ login, displayName: login, mail: `${login}@magna.global`, planta: codigoPlanta, nomePlanta: config.nome });
        });
      });
    });
  });
}

module.exports = { autenticarAD };