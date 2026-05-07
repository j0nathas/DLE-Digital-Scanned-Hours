const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');
const app = express();
app.use(cors());
app.use('/', createProxyMiddleware({ target: 'http://10.109.133.33:3000', changeOrigin: true }));
app.listen(4000, () => { console.log('Proxy rodando em http://localhost:4000'); });