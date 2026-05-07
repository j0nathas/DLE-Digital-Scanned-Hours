
const bcrypt = require('bcrypt');

async function criarHash() {
  const senhaPlana = '000';
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(senhaPlana, salt);
  
  console.log('Senha original:', senhaPlana);
  console.log('Hash gerado:', hash);
}

criarHash();