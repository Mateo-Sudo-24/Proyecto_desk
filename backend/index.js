import dotenv from 'dotenv';
dotenv.config();
import app from './app.js';

const PORT = process.env.PORT || 4000;
const HOST = '0.0.0.0';  // Agrega esto para escuchar en todas las interfaces

app.listen(PORT, HOST, () => {
    console.log(`Servidor escuchando en ${HOST}:${PORT}`);
});
