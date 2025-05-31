const WebSocket = require('ws');
const url = require('url');

class WebSocketService {
    constructor() {
        this.wss = null;
        this.movieRooms = new Map(); // Map to store clients for each movie
    }

    initialize(server) {
        // Initialize WebSocket server with more flexible options
        const options = {
            server,
            path: '/ws',
            clientTracking: true,
            perMessageDeflate: false,
            verifyClient: (info, cb) => {
                // Allow all connections
                cb(true);
            }
        };

        // Create WebSocket server
        this.wss = new WebSocket.Server(options);

        console.log('🔌 WebSocket server initialized with options:', options);

        this.wss.on('connection', (ws, req) => {
            const parameters = url.parse(req.url, true).query;
            const movieId = parameters.movieId ? parseInt(parameters.movieId) : null;

            console.log(`🔌 New WebSocket connection for movie ${movieId || 'none'}`);
            console.log('Connection headers:', req.headers);

            // Add client to movie room if movieId is provided
            if (movieId) {
                if (!this.movieRooms.has(movieId)) {
                    this.movieRooms.set(movieId, new Set());
                }
                this.movieRooms.get(movieId).add(ws);
            }

            // Send initial connection success message
            try {
                ws.send(JSON.stringify({ 
                    type: 'connection', 
                    status: 'connected',
                    movieId 
                }));
            } catch (error) {
                console.error('Failed to send initial connection message:', error);
            }

            // Handle incoming messages
            ws.on('message', (message) => {
                try {
                    const data = JSON.parse(message);
                    this.handleMessage(ws, data);
                } catch (error) {
                    console.error('Failed to parse WebSocket message:', error);
                }
            });

            // Handle client disconnection
            ws.on('close', () => {
                console.log('🔌 Client disconnected');
                if (movieId && this.movieRooms.has(movieId)) {
                    this.movieRooms.get(movieId).delete(ws);
                    // Clean up empty movie rooms
                    if (this.movieRooms.get(movieId).size === 0) {
                        this.movieRooms.delete(movieId);
                    }
                }
            });

            // Handle errors
            ws.on('error', (error) => {
                console.error('WebSocket error:', error);
            });
        });

        // Handle server errors
        this.wss.on('error', (error) => {
            console.error('WebSocket server error:', error);
        });
    }

    handleMessage(ws, data) {
        if (!this.wss) {
            console.log('WebSocket server not initialized (serverless environment)');
            return;
        }

        switch (data.type) {
            case 'join_movie':
                this.handleJoinMovie(ws, data.movieId);
                break;
            case 'block_seats':
                this.handleBlockSeats(data.movieId, data.seats);
                break;
            case 'book_seats':
                this.handleBookSeats(data.movieId, data.seats);
                break;
            default:
                console.log('Unknown message type:', data.type);
        }
    }

    handleJoinMovie(ws, movieId) {
        if (!this.wss) return;

        // Remove client from all other movie rooms first
        this.movieRooms.forEach((clients, roomId) => {
            clients.delete(ws);
            if (clients.size === 0) {
                this.movieRooms.delete(roomId);
            }
        });

        // Add client to new movie room
        if (!this.movieRooms.has(movieId)) {
            this.movieRooms.set(movieId, new Set());
        }
        this.movieRooms.get(movieId).add(ws);

        console.log(`👥 Client joined movie room ${movieId}`);
    }

    handleBlockSeats(movieId, seats) {
        if (!this.wss) return;
        this.broadcastToMovie(movieId, {
            type: 'seat_blocked',
            movieId,
            seats
        });
    }

    handleBookSeats(movieId, seats) {
        if (!this.wss) return;
        this.broadcastToMovie(movieId, {
            type: 'seat_booked',
            movieId,
            seats
        });
    }

    broadcastToMovie(movieId, data) {
        if (!this.wss || !this.movieRooms.has(movieId)) return;

        const clients = this.movieRooms.get(movieId);
        const message = JSON.stringify(data);
        
        clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
        });
    }

    // Update all clients in a movie room about seat status
    updateSeatStatus(movieId, occupiedSeats, blockedSeats) {
        if (!this.wss) return;
        this.broadcastToMovie(movieId, {
            type: 'seat_update',
            movieId,
            occupiedSeats,
            blockedSeats
        });
    }

    // Check if WebSocket server is running
    isRunning() {
        return !!this.wss;
    }
}

// Create and export a single instance
const websocketService = new WebSocketService();
module.exports = websocketService; 