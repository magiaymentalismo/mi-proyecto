const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Allow all origins for simplicity, adjust for production
        methods: ["GET", "POST"]
    }
});

const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Dibujo almacenado en memoria
let drawingHistory = [];

// Socket.io connection handling
io.on('connection', (socket) => {
    console.log('Un cliente se ha conectado');

    // Send existing drawing history to the new client
    socket.emit('history', drawingHistory);

    // Handle drawing events
    socket.on('draw', (data) => {
        const lineData = { type: 'line', ...data };
        drawingHistory.push(lineData);
        // Broadcast the drawing data to all other clients
        socket.broadcast.emit('draw', data);
    });

    // Handle clear event
    socket.on('clear', () => {
        drawingHistory = [];
        io.emit('clear');
    });

    socket.on('disconnect', () => {
        console.log('Un cliente se ha desconectado');
    });
});

// Endpoint para generar imagen
app.post('/api/generate', (req, res) => {
    const { prompt } = req.body;
    if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required' });
    }

    const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}`;
    const imageData = { type: 'image', url: imageUrl };

    drawingHistory.push(imageData);
    io.emit('image', imageData);

    res.json({ success: true, url: imageUrl });
});

// Servir las webs
app.use('/emisor', express.static(__dirname + '/emisor'));
app.use('/receptor', express.static(__dirname + '/receptor'));

// Iniciar el servidor
server.listen(port, () => {
    console.log(`Servidor corriendo en http://localhost:${port}`);
});
