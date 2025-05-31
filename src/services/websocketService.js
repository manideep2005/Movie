const WebSocket = require('ws');
const url = require('url');

class WebSocketService {
    constructor() {
        this.wss = null;
        this.movieRooms = new Map(); // Map to store clients for each movie
    }

    initialize(server) {
        try {
            // Check if we're running on Vercel
            const isVercel = process.env.VERCEL === '1';
            console.log(`🌍 Initializing WebSocket server (Environment: ${isVercel ? 'Vercel' : 'Local'})`);

            // Initialize WebSocket server with more flexible options
            const options = {
                server,
                path: '/ws',
                clientTracking: true,
                perMessageDeflate: false,
                handleProtocols: (protocols) => {
                    if (protocols.includes('websocket')) {
                        return 'websocket';
                    }
                    return '';
                },
                verifyClient: (info, cb) => {
                    // Log verification attempt
                    console.log('🔐 Verifying WebSocket connection:', {
                        origin: info.origin,
                        secure: info.secure,
                        url: info.req.url,
                        headers: info.req.headers
                    });
                    
                    // Allow all connections in development
                    if (!isVercel) {
                        cb(true);
                        return;
                    }

                    // In production, verify the origin
                    const origin = info.origin || info.req.headers.origin;
                    const host = info.req.headers.host;
                    
                    // Allow connections from the same host
                    if (host && origin && (origin.includes(host) || host.includes(origin))) {
                        console.log('✅ Verified WebSocket connection from same host');
                        cb(true);
                        return;
                    }

                    // Also allow local development
                    if (origin && (
                        origin.includes('localhost') || 
                        origin.includes('127.0.0.1')
                    )) {
                        console.log('✅ Verified local development WebSocket connection');
                        cb(true);
                        return;
                    }

                    console.log(`❌ Rejected WebSocket connection from unauthorized origin: ${origin}`);
                    cb(false, 403, 'Unauthorized origin');
                }
            };

            // Create WebSocket server
            this.wss = new WebSocket.Server(options);

            console.log('🔌 WebSocket server initialized with options:', {
                path: options.path,
                clientTracking: options.clientTracking,
                perMessageDeflate: options.perMessageDeflate,
                environment: isVercel ? 'Vercel' : 'Local'
            });

            this.wss.on('connection', this.handleConnection.bind(this));

            // Handle server errors
            this.wss.on('error', (error) => {
                console.error('WebSocket server error:', error);
                // Try to recover from errors
                if (this.wss) {
                    try {
                        this.wss.close(() => {
                            console.log('WebSocket server closed, attempting to reinitialize...');
                            setTimeout(() => this.initialize(server), 5000);
                        });
                    } catch (closeError) {
                        console.error('Error closing WebSocket server:', closeError);
                    }
                }
            });

            // Log when server is ready
            this.wss.on('listening', () => {
                console.log('🎉 WebSocket server is ready and listening');
            });

        } catch (error) {
            console.error('Failed to initialize WebSocket server:', error);
        }
    }

    handleConnection(ws, req) {
        try {
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
            ws.send(JSON.stringify({ 
                type: 'connection', 
                status: 'connected',
                movieId 
            }));

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
        } catch (error) {
            console.error('Error in WebSocket connection handler:', error);
        }
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