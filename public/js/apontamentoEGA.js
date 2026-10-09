export async function atualizarApontadosEGA(maquina) {
    let quantidadeApontadaTotal = 0;
    try {
        const response = await fetch(`/ega/contagemEGA/${maquina}`);
        const dados = await response.json();
        quantidadeApontadaTotal = dados.quantidade_apontada;
    } catch (error) {
        console.error('Erro ao buscar contagem EGA:', error);
    }
    return quantidadeCadastradaTotal;
}


export async function atualizarCadastradosEGA(maquina) {
    let quantidadeCadastradaTotal = 0;
    try {
        const response = await fetch(`/ega/esperadoEGA/${maquina}`);
        const dados = await response.json();
        quantidadeCadastradaTotal = dados.quantidade_esperada;
    } catch (error) {
        console.error('Erro ao buscar contagem EGA:', error);
    }
    return quantidadeCadastradaTotal;
}




export async function atualizarApontadosEGALanterna(maquinas, conjunto) {
    let quantidadeApontadaTotal = 0;
    try {
        for (const maquina of maquinas) {
            const response = await fetch(`/ega/contagemEGA/${maquina}`);

            if (!response.ok) {
                console.warn(`Falha ao buscar dados. Status: ${response.status}`);
                return;
            }

            const dados = await response.json();;
            quantidadeApontadaTotal += dados.quantidade_apontada;
        }

    } catch (error) {
        console.error('Erro ao buscar contagem EGA:', error);
    } finally {
        quantidadeApontadaTotal = quantidadeApontadaTotal > 2 ? quantidadeApontadaTotal / 2 : quantidadeApontadaTotal;
    }

    return quantidadeApontadaTotal;
}

export async function atualizarCadastradosEGALanterna(maquinas, conjunto) {
    let quantidadeCadastradaTotal = 0;
    try {
        for (const maquina of maquinas) {
            const response = await fetch(`/ega/esperadoEGA/${maquina}`);
            const dados = await response.json();
            quantidadeCadastradaTotal += dados.quantidade_esperada;
        }
    } catch (error) {
        console.error('Erro ao buscar contagem EGA:', error);
    } finally {
        quantidadeCadastradaTotal = quantidadeCadastradaTotal > 2 ? quantidadeCadastradaTotal / 2 : quantidadeCadastradaTotal;
    }

    return quantidadeCadastradaTotal;
}


