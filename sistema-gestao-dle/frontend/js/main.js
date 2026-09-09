document.addEventListener('DOMContentLoaded', () => {
    const mainContent = document.getElementById('main-content');
    const navLinks    = document.querySelectorAll('.sidebar nav a');
    let clockIntervalId = null;

    // =============================================
    // AUTENTICAÇÃO — verifica token ao carregar
    // =============================================
    const token   = localStorage.getItem('dle_token');
    const userRaw = localStorage.getItem('dle_usuario');

    if (!token) {
        window.location.href = '/login.html';
        return;
    }

    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.exp && payload.exp * 1000 < Date.now()) {
            localStorage.removeItem('dle_token');
            localStorage.removeItem('dle_usuario');
            window.location.href = '/login.html';
            return;
        }
    } catch {
        localStorage.removeItem('dle_token');
        localStorage.removeItem('dle_usuario');
        window.location.href = '/login.html';
        return;
    }

    // Dados do usuário logado
    const usuario = userRaw ? JSON.parse(userRaw) : null;

    // Lógica para exibir menu de usuários apenas para admin
    if (usuario?.perfil === 'admin') {
        const menuEl = document.getElementById('menuUsuarios');
        if (menuEl) menuEl.style.display = '';
    }

    // =============================================
    // RELÓGIO E CABEÇALHO (DINÂMICO)
    // =============================================
    const startHeaderUpdater = () => {
        // Procure o header dentro do mainContent ou no corpo
        const headerElement = document.querySelector('header') || mainContent.querySelector('header');
        if (!headerElement) return;

        let clockContainer = document.getElementById('clock-container');
        if (!clockContainer) {
            clockContainer = document.createElement('div');
            clockContainer.id        = 'clock-container';
            clockContainer.className = 'header-info';
            const userProfile = headerElement.querySelector('.user-profile');
            
            // CORREÇÃO: Usa userProfile.parentNode para garantir que o insertBefore funcione
            // independente da profundidade do elemento dentro do header.
            if (userProfile && userProfile.parentNode) {
                userProfile.parentNode.insertBefore(clockContainer, userProfile);
            } else {
                headerElement.appendChild(clockContainer);
            }
        }

        // Atualiza Perfil do Usuário com Abreviação (MPT)
        const userProfileEl = headerElement.querySelector('.user-profile');
        if (userProfileEl && usuario) {
            let nomeFormatado = (usuario.nome || usuario.login).toUpperCase();
            // Abrevia Magna Partner para (MPT)
            nomeFormatado = nomeFormatado.replace('MAGNA PARTNER', '(MPT)');
            
            userProfileEl.innerHTML = `<span>${nomeFormatado}</span>`;
            userProfileEl.title = `Planta: ${usuario.planta} | Perfil: ${usuario.perfil} (Clique para Sair)`;
            userProfileEl.style.display = 'flex';
            userProfileEl.style.alignItems = 'center';
            userProfileEl.style.textAlign = 'right';
            userProfileEl.style.fontSize = '12px';
            userProfileEl.style.maxWidth = '200px';
            userProfileEl.style.lineHeight = '1.2';
        }

        const updateClock = () => {
            const now         = new Date();
            const optionsDate = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
            const dateString  = now.toLocaleDateString('pt-BR', optionsDate)
                                   .replace(/(^|\s)\S/g, l => l.toUpperCase());
            const timeString  = now.toLocaleTimeString('pt-BR');

            const hours       = now.getHours();
            const minutes     = now.getMinutes();
            const currentTime = hours + minutes / 60;
            let turno         = '';

            if      (currentTime >= 6.25  && currentTime < 14.25) turno = '1º Turno';
            else if (currentTime >= 14.25 && currentTime < 22.25) turno = '2º Turno';
            else turno = '3º Turno';

            if (now.getDay() === 0 || now.getDay() === 6) turno = 'Turno Extra';

            clockContainer.innerHTML = `
                <span class="info-item">${dateString}</span>
                <span class="info-item">${timeString}</span>
                <span class="info-item">${turno}</span>
            `;
        };

        if (clockIntervalId) clearInterval(clockIntervalId);
        clockIntervalId = setInterval(updateClock, 1000);
        updateClock();
    };

    // =============================================
    // ROTEAMENTO DE PÁGINAS
    // =============================================
    const routes = {
        '#selecao':    { html: 'planta-selection-content.html', init: () => { if (typeof iniciarSelecaoPlanta === 'function') iniciarSelecaoPlanta(); } },
        '#gestao':     { html: 'gestao-content.html',           init: () => { if (typeof iniciarGestao       === 'function') iniciarGestao();       } },
        '#indicadores':{ html: 'indicadores-content.html',      init: () => { if (typeof iniciarIndicadores  === 'function') iniciarIndicadores();  } },
        '#financeiro': { html: 'financeiro-content.html',       init: () => { if (typeof iniciarFinanceiro   === 'function') iniciarFinanceiro();   } },
        '#rh':         { html: 'rh-content.html',               init: () => { if (typeof iniciarRh          === 'function') iniciarRh();           } },
        '#calculo-dle':{ html: 'calculo-dle-content.html',      init: () => { if (typeof iniciarCalculoDle  === 'function') iniciarCalculoDle();   } },
        '#gestao-fabrica': { html: 'kpi-content.html',          init: () => { if (typeof iniciarKpiFabrica === 'function') iniciarKpiFabrica(); } },
        '#usuarios':   { html: 'usuarios-content.html',         init: () => { if (typeof window.iniciarGestaoAcessos === 'function') window.iniciarGestaoAcessos(); } },
    };

    const limparIntervalos = () => {
        if (typeof limparGestao      === 'function') limparGestao();
        if (typeof limparFinanceiro  === 'function') limparFinanceiro();
        if (typeof limparRh         === 'function') limparRh();
        if (typeof limparCalculoDle === 'function') limparCalculoDle();
        if (typeof limparKpiFabrica === 'function') limparKpiFabrica(); 
        if (clockIntervalId) { clearInterval(clockIntervalId); clockIntervalId = null; }
    };

    const router = async () => {
        limparIntervalos();
        const hash  = window.location.hash || '#selecao';
        const route = routes[hash] || routes['#selecao'];

        if (route && mainContent) {
            try {
                const response = await fetch(route.html);
                if (!response.ok) throw new Error(`Página não encontrada: ${route.html}`);
                const text = await response.text();
                
                if (text.includes('<!DOCTYPE html>')) throw new Error('Fragmento não encontrado.');

                mainContent.innerHTML = text;

                // Execução de scripts internos
                const scripts = mainContent.querySelectorAll('script');
                scripts.forEach(oldScript => {
                    const newScript = document.createElement('script');
                    Array.from(oldScript.attributes).forEach(attr => newScript.setAttribute(attr.name, attr.value));
                    newScript.appendChild(document.createTextNode(oldScript.innerHTML));
                    oldScript.parentNode.replaceChild(newScript, oldScript);
                });

                // CHAMA O UPDATER DE CABEÇALHO SEMPRE QUE MUDA A ROTA
                startHeaderUpdater();

                if (route.init) route.init();

                navLinks.forEach(link => link.parentElement.classList.remove('active'));
                const activeLink = document.querySelector(`.sidebar nav a[href="${hash}"]`);
                if (activeLink) activeLink.parentElement.classList.add('active');

            } catch (error) {
                mainContent.innerHTML = `<p style="color:#ef4444;text-align:center;padding:2rem;">Erro: ${error.message}</p>`;
            }
        }
    };

    function confirmarLogout() {
        if (!confirm('Deseja encerrar sua sessão?')) return;
        localStorage.clear();
        window.location.href = '/login.html';
    }

    window.apiFetch = async (url, options = {}) => {
        const currentToken = localStorage.getItem('dle_token');
        const res = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${currentToken}`,
                ...(options.headers || {}),
            },
        });
        if (res.status === 401) { localStorage.clear(); window.location.href = '/login.html'; }
        return res;
    };

    document.addEventListener('click', (e) => {
        if (e.target.closest('.user-profile')) confirmarLogout();
    });

    window.addEventListener('hashchange', router);
    router();
});