
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const PORT = process.env.PORT || 5000;

// Configuração para servir o frontend
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.use(express.json());

// Servir arquivos estáticos do React (pasta dist na raiz do projeto)
// Assumindo que o server está em /server e a dist em /dist
app.use(express.static(path.join(__dirname, '../dist')));

// Qualquer rota que não seja API retorna o index.html do React
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor estático rodando na porta ${PORT}`);
});
