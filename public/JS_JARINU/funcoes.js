export async function apontamentoOperador(
    turno, RE, pessoa, cargo, linha,
    qntd_esperada, operacao, status,
    prod_LE, prod_LD, prod_Unico
) {

    if (!RE || RE.toString().trim() === '') {
        toastr.error('RE é obrigatório.', 'Erro');
        return {
            sucesso: false,
            mensagem: 'RE é obrigatório.'
        };
    }

    if (!pessoa || pessoa.trim() === '') {
        toastr.error('Nome é obrigatório.', 'Erro');
        return {
            sucesso: false,
            mensagem: 'Nome é obrigatório.'
        };
    }

    const dados = {
        turno,
        RE,
        pessoa,
        cargo,
        linha,
        qntd_esperada,
        operacao,
        status,
        prod_LE,
        prod_LD,
        prod_Unico
    };

    try {
        const response = await fetch('/api/apontamentos/operador_JARINU', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dados)
        });

        const result = await response.json();

        if (response.ok) {
            return { sucesso: true, mensagem: result.mensagem, dados };
        } else {
            toastr.error(result.error || 'Erro desconhecido.', 'Erro');
            return { sucesso: false, mensagem: result.error || 'Erro desconhecido', dados };
        }

    } catch (error) {
        toastr.error('Erro de comunicação com o servidor.', 'Erro');
        return {
            sucesso: false,
            mensagem: 'Erro de comunicação com o servidor.',
            dados
        };
    }
}


export async function apontamentoTeamLeader(turno, RE, pessoa, cargo, linha, qntd_esperada, status_turno, prod_LE, prod_LD, prod_Unico) {
    const dados = {
        turno,
        RE,
        pessoa,
        cargo,
        linha,
        qntd_esperada,
        status_turno,
        prod_LE,
        prod_LD,
        prod_Unico
    };

    try {
        const response = await fetch('/api/apontamentos/tl_JARINU', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dados)
        });

        const result = await response.json();

        if (response.ok) {
            return { sucesso: true, mensagem: result.message, dados };
        } else {
            return { sucesso: false, mensagem: result.error || 'Erro desconhecido', dados };
        }
    } catch (error) {
        return { sucesso: false, mensagem: 'Erro de comunicação com o servidor.', dados };
    }
}



export async function registrarSaidaAutomaticaParaLinha(nomeMaquina) {
    try {
        const response = await fetch(`/api/apontamentos/operadoresSemSaida?maquina=${encodeURIComponent(nomeMaquina)}`, {
            method: 'GET'
        });

        console.log(`Registrando saída para ${nomeMaquina}. Status da resposta:`, response.status);

        if (response.ok) {
            const data = await response.json();
            console.log(`${data.message}`);
        } else {
            const errData = await response.json().catch(() => ({}));
            alert(`Erro ao registrar saídas pendentes para ${nomeMaquina}: ` + (errData.error || response.statusText));
        }
    } catch (err) {
        alert(`Erro na requisição para ${nomeMaquina}: ` + err.message);
    }
};

export async function verificarStatusDaLinha(nomeDaLinha) {
    try {
        const response = await fetch(`/api/apontamentos/status/${nomeDaLinha}`); // Ajuste a URL base do seu backend
        const data = await response.json();

        if (response.ok) {
            console.log(`Status da linha ${data.linha}: ${data.ultimoStatus}`);
            return data.ultimoStatus;
        } else {
            console.error('Erro ao verificar status da linha:', data.error);
            return null;
        }
    } catch (error) {
        console.error('Erro na requisição de status:', error);
        return null;
    }
}
