const express = require('express');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000; // Usa el puerto de Render o 3000 como respaldo

// Middleware
app.use(cors());
app.use(express.json());

// Dibujo almacenado
let dibujoActual = null;

// Endpoint para enviar un dibujo
app.post('/api/dibujo', (req, res) => {
    dibujoActual = req.body;
    res.status(200).send({ success: true });
});

// Endpoint para recibir el dibujo
app.get('/api/dibujo', (req, res) => {
    res.status(200).json(dibujoActual || []);
});

// Servir las webs
app.use('/emisor', express.static(__dirname + '/emisor'));
app.use('/receptor', express.static(__dirname + '/receptor'));

// Iniciar el servidor
app.listen(port, () => {
    console.log(`Servidor corriendo en http://localhost:${port}`);
});
