const API_BASE_URL = 'http://10.109.132.135:3000';

async function carregarUsuarios() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/users`);
        
        if (!response.ok) {
            throw new Error(`Erro na requisição para ${response.url}: ${response.statusText}`);
        }
        
        const usuarios = await response.json();

        const lista = document.getElementById('lista-usuarios');
        lista.innerHTML = ''; 

        if (usuarios.length === 0) {
            lista.innerHTML = '<li>Nenhum usuário encontrado.</li>';
            return;
        }

        
        usuarios.forEach(usuario => {
            const itemPrincipal = document.createElement('li');
            itemPrincipal.style.border = '1px solid #ccc';
            itemPrincipal.style.marginBottom = '10px';
            itemPrincipal.style.padding = '10px';

            const titulo = document.createElement('h3');
            titulo.textContent = `Usuário ID: ${usuario.id} - ${usuario.name}`;
            itemPrincipal.appendChild(titulo);

            const detalhesLista = document.createElement('ul');

            
            for (const chave in usuario) {
                
                if (chave === 'id' || chave === 'name') {
                    continue;
                }

                
                const detalheItem = document.createElement('li');
                
                
                const valor = usuario[chave] !== null && usuario[chave] !== '' ? usuario[chave] : 'N/A';
                
                detalheItem.innerHTML = `<strong>${chave}:</strong> ${valor}`;
                detalhesLista.appendChild(detalheItem);
            }
            
            itemPrincipal.appendChild(detalhesLista);
            lista.appendChild(itemPrincipal);
        });

    } catch (error) {
        console.error('Falha ao carregar usuários:', error);
        const lista = document.getElementById('lista-usuarios');
        lista.innerHTML = `<li>Erro ao carregar dados. Verifique o console.</li>`;
    }
}


async function buscarUsuarioPorId(id) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/users/${id}`);
        if (response.status === 404) {
             console.log(`Usuário com ID ${id} não encontrado.`);
             return;
        }
        if (!response.ok) {
            throw new Error(`Erro na requisição para ${response.url}: ${response.statusText}`);
        }
        
        const usuario = await response.json();
        
        console.log('Usuário encontrado (todas as colunas):', usuario);
       
    } catch (error) {
        console.error(`Falha ao buscar usuário com ID ${id}:`, error);
    }
}


document.addEventListener('DOMContentLoaded', () => {
    carregarUsuarios();
    //buscarUsuarioPorId(1000001); 
});