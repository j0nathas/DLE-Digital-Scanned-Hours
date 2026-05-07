// arquivo: gerarUpdate.js
const bcrypt = require('bcryptjs');

const senha = 'senha123';
const saltRounds = 10;

bcrypt.hash(senha, saltRounds, (err, hash) => {
    if (err) {
        console.error("Erro ao gerar o hash:", err);
        return;
    }
    
    console.log("-- SCRIPT SQL PRONTO PARA EXECUTAR --");
    console.log("-- Copie e cole todo o bloco abaixo no seu SQL Server --");
    console.log("\n");
    console.log("UPDATE Usuarios_Gestao");
    console.log(`SET Senha_Hash = '${hash}'`);
    console.log("WHERE Login IN ('diretor', 'gerente.sbc', 'supervisor.l1');");
    console.log("\n");
    console.log("-- FIM DO SCRIPT --");
});