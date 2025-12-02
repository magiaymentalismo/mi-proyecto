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

// Endpoint para generar imagen desde API externa
app.get('/api/generate-from-api', async (req, res) => {
    try {
        const response = await fetch('https://11q.co/api/last/131');
        if (!response.ok) {
            throw new Error(`External API error: ${response.statusText}`);
        }
        const data = await response.json();
        const prompt = data.query;

        if (!prompt) {
            return res.status(400).json({ error: 'No query found in external API response' });
        }

        const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent("hand drawing of " + prompt)}`;
        const imageData = { type: 'image', url: imageUrl };

        drawingHistory.push(imageData);
        io.emit('image', imageData);

        res.json({ success: true, prompt: prompt, url: imageUrl });
    } catch (error) {
        console.error('Error fetching from external API:', error);
        res.status(500).json({ error: 'Failed to fetch from external API' });
    }
});

// Polling logic
let lastQuery = "";

async function pollExternalApi() {
    try {
        const response = await fetch('https://11q.co/api/last/131');
        if (!response.ok) return; // Silent fail on error

        const data = await response.json();
        const currentQuery = data.query;

        if (currentQuery && currentQuery !== lastQuery) {
            console.log(`New query detected: ${currentQuery}`);
            lastQuery = currentQuery;

            const prompt = "hand drawing of " + currentQuery;
            const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}`;
            const imageData = { type: 'image', url: imageUrl };

            drawingHistory.push(imageData);
            io.emit('image', imageData);
        }
    } catch (error) {
        console.error('Error polling external API:', error);
    }
}

// Start polling every 5 seconds
setInterval(pollExternalApi, 5000);

// Servir las webs
app.use('/emisor', express.static(__dirname + '/emisor'));
app.use('/receptor', express.static(__dirname + '/receptor'));

// Iniciar el servidor
server.listen(port, () => {
    console.log(`Servidor corriendo en http://localhost:${port}`);
});
