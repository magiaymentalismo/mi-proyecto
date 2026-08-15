const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
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

// Endpoint manual para forzar una lectura de la última palabra en 11q.co
app.get('/api/generate-from-api', async (req, res) => {
    try {
        const response = await fetch('https://11q.co/api/last/131');
        if (!response.ok) {
            throw new Error(`External API error: ${response.statusText}`);
        }

        const data = await response.json();
        const query = (data.query || '').trim();

        if (!query) {
            return res.status(400).json({ error: 'No query found in external API response' });
        }

        const wordData = { type: 'word', text: query };
        drawingHistory.push(wordData);
        io.emit('word', wordData);

        res.json({ success: true, text: query });
    } catch (error) {
        console.error('Error fetching from external API:', error);
        res.status(500).json({ error: 'Failed to fetch from external API' });
    }
});

// Polling logic
let lastQuery = null;

async function pollExternalApi() {
    try {
        const response = await fetch('https://11q.co/api/last/131', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; dibujo-pizarra-bot/1.0)',
                'Accept': 'application/json'
            }
        });
        if (!response.ok) {
            console.error(`Polling 11q.co failed: HTTP ${response.status} ${response.statusText}`);
            return;
        }

        const data = await response.json();
        const currentQuery = (data.query || '').trim();

        // Generate whenever the query differs from what we last showed,
        // including right after a restart (Render free tier restarts/sleeps
        // often, and the word shouldn't get silently swallowed when that happens).
        if (currentQuery && currentQuery !== lastQuery) {
            console.log(`New query detected: ${currentQuery} (was: ${lastQuery})`);
            lastQuery = currentQuery;

            const wordData = { type: 'word', text: currentQuery };
            drawingHistory.push(wordData);
            io.emit('word', wordData);
        }
    } catch (error) {
        console.error('Error polling external API:', error);
    }
}

// Start polling every 2 seconds
setInterval(pollExternalApi, 2000);

// Servir las webs
app.use('/emisor', express.static(__dirname + '/emisor'));
app.use('/receptor', express.static(__dirname + '/receptor'));

// Iniciar el servidor
server.listen(port, () => {
    console.log(`Servidor corriendo en http://localhost:${port}`);
});
