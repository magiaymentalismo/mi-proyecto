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
    // Verifica que se haya recibido un dibujo en el cuerpo de la solicitud
    if (!req.body || !Array.isArray(req.body)) {
        return res.status(400).send({ error: 'Se esperaba un dibujo en formato de array' });
    }

    dibujoActual = req.body; // Actualiza el dibujo actual con los datos recibidos
    console.log('Dibujo recibido:', dibujoActual); // Verifica el contenido recibido
    res.status(200).send({ success: true });
});

// Endpoint para obtener el dibujo actual
app.get('/api/dibujo', (req, res) => {
    console.log('Dibujo actual:', dibujoActual); // Verifica lo que se está enviando
    res.status(200).json(dibujoActual || []); // Devuelve el dibujo actual o un arreglo vacío si no existe
});

// Servir las webs
app.use('/emisor', express.static(__dirname + '/emisor'));
app.use('/receptor', express.static(__dirname + '/receptor'));

// Iniciar el servidor
app.listen(port, () => {
    console.log(`Servidor corriendo en http://localhost:${port}`);
});
