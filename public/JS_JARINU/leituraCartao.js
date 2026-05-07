// ipMonitor.js

class IpMonitor {
    constructor(ipAlvo, apiUrlBase, cargosAlvo, interval = 3000) {
        this.ipAlvo = ipAlvo;
        this.apiUrl = `${apiUrlBase}/apontamentos/ultimoapontamento-ip_JARINU/${this.ipAlvo}`;
        this.interval = interval;
        this.ultimoAcessoId = 0;
        this.isFirstRun = true;
        this.intervalId = null;

        // Correção aqui: Garante que cargosAlvo é sempre um array de strings em maiúsculas
        if (Array.isArray(cargosAlvo)) {
            this.cargosAlvo = cargosAlvo.map(c => c.toUpperCase());
        } else if (typeof cargosAlvo === 'string') {
            this.cargosAlvo = [cargosAlvo.toUpperCase()];
        } else {
            // Caso cargosAlvo não seja nem array nem string (ex: null, undefined),
            // defina um array vazio ou um valor padrão para evitar erros futuros.
            this.cargosAlvo = [];
            console.warn(`Monitor ${this.ipAlvo}: 'cargosAlvo' inválido. Definido como array vazio.`);
        }

        console.log(`%cMonitor ${this.ipAlvo}: Iniciando monitoramento para cargos: ${this.cargosAlvo.join(', ')}`, 'color: #88B; font-weight: bold;');
    }

    _initializeState() {
        const storedUltimoAcesso = localStorage.getItem(`ultimoAcesso_${this.ipAlvo}`);
        if (storedUltimoAcesso) {
            this.ultimoAcessoId = parseInt(storedUltimoAcesso, 10);
            this.isFirstRun = false;
            console.log(`%cMonitor ${this.ipAlvo}: Estado inicial carregado do localStorage. Último ID: ${this.ultimoAcessoId}`, 'color: gray;');
        } else {
            console.log(`%cMonitor ${this.ipAlvo}: Sem estado prévio no localStorage. Iniciando do zero.`, 'color: gray;');
        }
    }

    async _fetchLatestRecord() {
        try {
            const response = await fetch(this.apiUrl);
            if (!response.ok) {
                console.warn(`Monitor ${this.ipAlvo}: Falha ao buscar registro. Status: ${response.status}`);
                return null;
            }
            return await response.json();
        } catch (error) {
            console.error(`Monitor ${this.ipAlvo}: Erro na requisição fetch:`, error);
            return null;
        }
    }

    async _processRecord() {
        if (this._processing) return;
        this._processing = true;

        try {
            const dados = await this._fetchLatestRecord();

            if (!dados || !dados.id) {
                console.log(`Monitor ${this.ipAlvo}: Nenhum dado válido recebido ou sem ID.`);
                return;
            }

            const acessoAtualId = dados.id;

            if (!dados.cargo) {
                return;
            }

            const cargoUpperCase = dados.cargo.toUpperCase();

            if (this.isFirstRun) {
                this.ultimoAcessoId = acessoAtualId;
                localStorage.setItem(`ultimoAcesso_${this.ipAlvo}`, this.ultimoAcessoId);
                this.isFirstRun = false;
                console.log(`%cPONTO DE PARTIDA DEFINIDO para IP ${this.ipAlvo}! ID inicial: ${this.ultimoAcessoId}`, 'color: orange;');
                return;
            }

            if (acessoAtualId !== this.ultimoAcessoId && acessoAtualId > this.ultimoAcessoId) {
                console.log(`%cNOVO ACESSO DETECTADO para IP ${this.ipAlvo}! ID: ${acessoAtualId}. Anterior: ${this.ultimoAcessoId}`, 'color: yellow; font-weight: bold;');

                this.ultimoAcessoId = acessoAtualId;

                localStorage.setItem(`ultimoAcesso_${this.ipAlvo}`, this.ultimoAcessoId);

                if (this.cargosAlvo.includes(cargoUpperCase)) {
                    const corLog = cargoUpperCase === "TL" ? 'lightgreen' : (cargoUpperCase === "MOD" ? 'lightblue' : 'white');
                    console.log(`%cNOVO ACESSO DE ${cargoUpperCase}! (${dados.nome}) no IP ${this.ipAlvo}. Disparando evento...`, `color: ${corLog}; font-weight: bold;`);

                    document.dispatchEvent(new CustomEvent('newAccessDetected', {
                        detail: {
                            ip: this.ipAlvo,
                            nome: dados.nome,
                            RE: dados.RE,
                            cargo: dados.cargo,
                            id: dados.id
                        }
                    }));
                } else {
                    console.log(`Monitor ${this.ipAlvo}: Cargo ${cargoUpperCase} não está entre os monitorados.`);
                }
            } else {
                console.log(`Monitor ${this.ipAlvo}: Nenhum novo acesso. Último ID: ${this.ultimoAcessoId}`);
            }

        } catch (err) {
            console.error(`Monitor ${this.ipAlvo}: Erro ao processar registro:`, err);
        } finally {
            this._processing = false;
        }
    }

    startMonitoring() {
        this._initializeState();
        const runLoop = async () => {
            await this._processRecord();
            this.intervalId = setTimeout(runLoop, this.interval);
        };
        runLoop();
        console.log(`%cMonitor ${this.ipAlvo}: Monitoramento iniciado a cada ${this.interval / 1000} segundos.`, 'color: blue;');
    }

    stopMonitoring() {
        clearTimeout(this.intervalId);
        console.log(`%cMonitor ${this.ipAlvo}: Monitoramento parado.`, 'color: red;');
    }
}

export { IpMonitor };