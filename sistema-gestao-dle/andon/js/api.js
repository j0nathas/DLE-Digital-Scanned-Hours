const api = {
    async getDados(ano) {
        const r = await fetch(`http://localhost:5000/api/dados/${ano}`);
        return r.json();
    }
};