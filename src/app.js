require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const session = require('express-session');
const http = require('http');
const emailService = require('./services/emailService');
const ticketService = require('./services/ticketService');
const seatService = require('./services/seatService');
const websocketService = require('./services/websocketService');
const { logBooking, getBookingLogs } = require('./services/bookingLogger');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3001;
const isProduction = process.env.NODE_ENV === 'production';
const isVercel = process.env.VERCEL === '1';

// Session configuration
app.use(session({
    secret: 'your-secret-key',
    resave: true,
    saveUninitialized: true,
    cookie: {
        secure: isProduction,
        httpOnly: true,
        maxAge: 30 * 60 * 1000 // 30 minutes
    }
}));

// Body parser middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Security headers middleware
app.use((req, res, next) => {
    // Set security headers
    res.set({
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'Referrer-Policy': 'strict-origin-when-cross-origin'
    });

    // Handle Vercel's security challenges
    if (req.headers['x-vercel-challenge-token']) {
        console.log('Handling Vercel security challenge');
        return next();
    }

    next();
});

// Trust proxy for Vercel
app.set('trust proxy', 1);

// Initialize WebSocket server
websocketService.initialize(server);

// Set view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

// Serve static files
app.use(express.static(path.join(__dirname, '../public')));

// Movie data (in-memory for demo)
const movies = [
    { 
        id: 1, 
        name: 'Inception', 
        price: 250,
        posterPath: '/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg',  // Inception poster
        rating: '8.8',
        duration: '2h 28min'
    },
    { 
        id: 2, 
        name: 'The Dark Knight', 
        price: 300,
        posterPath: '/qJ2tW6WMUDux911r6m7haRef0WH.jpg',  // Dark Knight poster
        rating: '9.0',
        duration: '2h 32min'
    },
    { 
        id: 3, 
        name: 'Interstellar', 
        price: 280,
        posterPath: '/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg',  // Interstellar poster
        rating: '8.6',
        duration: '2h 49min'
    }
];

// Routes
app.get('/', (req, res) => {
    res.render('index', { movies });
});

app.get('/book', (req, res) => {
    const movieId = parseInt(req.query.movie);
    const selectedMovie = movies.find(m => m.id === movieId);
    
    if (!movieId) {
        return res.redirect('/');
    }
    
    if (!selectedMovie) {
        return res.status(404).render('error', {
            title: 'Movie Not Found',
            error: 'The selected movie was not found.'
        });
    }

    // Get seat status for the movie
    const { occupiedSeats, blockedSeats } = seatService.getSeatsStatus(movieId);

    res.render('booking', { 
        movies,
        movie: selectedMovie,
        selectedMovie,
        occupiedSeats,
        blockedSeats
    });
});

// Check seat availability
app.post('/check-seats', (req, res) => {
    const { movieId, seats } = req.body;
    const available = seatService.checkSeatsAvailability(movieId, seats);
    
    if (available) {
        // Get current seat status
        const { occupiedSeats, blockedSeats } = seatService.getSeatsStatus(movieId);
        res.json({ 
            available,
            occupiedSeats,
            blockedSeats
        });
    } else {
        res.json({ available });
    }
});

// Payment page
app.get('/payment', (req, res) => {
    const booking = req.session.pendingBooking;
    console.log('Payment page - Session:', req.session);
    console.log('Payment page - Booking:', booking);
    
    if (!booking) {
        console.log('No pending booking found in session');
        return res.redirect('/?error=no_booking');
    }
    
    res.render('payment', {
        booking,
        baseUrl: isVercel ? process.env.BASE_URL : `http://localhost:${PORT}`
    });
});

// Payment preview success (simulate payment)
app.post('/payment-preview-success', async (req, res) => {
    try {
        const booking = req.session.pendingBooking;
        console.log('Payment success - Session:', req.session);
        console.log('Payment success - Booking:', booking);

        if (!booking) {
            console.log('No booking found in session for payment success');
            return res.redirect('/?error=no_booking');
        }

        // Confirm seats
        seatService.confirmSeats(booking.movieId, booking.seats);

        // Log the booking
        try { 
            logBooking(booking); 
        } catch (e) { 
            console.error('Log error:', e); 
        }

        // Send confirmation email
        try { 
            await emailService.sendBookingConfirmation(booking); 
        } catch (e) { 
            console.error('Email error:', e); 
        }

        // Store for success page and remove pending booking
        req.session.lastBooking = booking;
        delete req.session.pendingBooking;

        // Save session explicitly before redirect
        req.session.save((err) => {
            if (err) {
                console.error('Failed to save session after payment:', err);
                return res.status(500).render('error', {
                    title: 'Payment Error',
                    error: 'Failed to process payment. Please try again.'
                });
            }
            // Use res.redirect with 303 status to force GET request
            res.redirect(303, '/success');
        });
    } catch (error) {
        console.error('Payment preview error:', error);
        res.status(500).render('error', {
            title: 'Payment Error',
            error: 'Failed to process payment. Please try again.'
        });
    }
});

// Booking expired
app.get('/booking-expired', (req, res) => {
    res.render('error', {
        title: 'Booking Expired',
        error: 'Your booking session has expired. Please try again.'
    });
});

// Success page
app.get('/success', (req, res) => {
    const booking = req.session.lastBooking;
    console.log('Success page - Session:', req.session);
    console.log('Success page - Booking:', booking);

    if (!booking) {
        console.log('No booking found in session for success page');
        return res.redirect('/?error=no_booking');
    }

    // Clear the session data after rendering
    req.session.lastBooking = null;
    res.render('success', { booking });
});

// Admin route
app.get('/admin', (req, res) => {
    try {
        const bookings = getBookingLogs();
        res.render('admin', { bookings });
    } catch (error) {
        console.error('Failed to get booking logs:', error);
        res.render('admin', { bookings: [] });
    }
});

// Test email route
app.get('/test-email', async (req, res) => {
  try {
    const testBooking = {
      _id: 'TEST-' + Date.now(),
      name: 'Test User',
      email: 'w25087926@gmail.com',
      movie: 'Test Movie',
      seats: ['A1', 'A2'],
      amount: 400,
      timestamp: new Date()
    };

    const result = await emailService.sendBookingConfirmation(testBooking);
    res.json({ 
      success: true, 
      message: 'Test email sent successfully!',
      details: result 
    });
  } catch (error) {
    console.error('❌ Test email error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Download ticket route
app.get('/download-ticket/:bookingId', async (req, res) => {
  try {
    const bookingId = req.params.bookingId;
    console.log('📥 Attempting to download ticket for booking:', bookingId);

    const bookings = getBookingLogs();
    console.log('📋 Found bookings:', bookings.length);

    const booking = bookings.find(b => b._id === bookingId);
    
    if (!booking) {
      console.error('❌ Booking not found:', bookingId);
      return res.status(404).render('error', {
        title: 'Booking Not Found',
        error: 'Could not find the specified booking. Please check your booking ID.'
      });
    }

    console.log('✅ Found booking:', booking);

    try {
      // Set response headers for PDF download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="ticket-${bookingId}.pdf"`);

      // Generate and stream the PDF
      console.log('🎫 Generating PDF ticket...');
      await ticketService.generateTicket(booking, res);
      console.log('✅ PDF ticket generated successfully');
    } catch (pdfError) {
      console.error('❌ PDF generation error:', pdfError);
      throw new Error('Failed to generate PDF ticket');
    }
  } catch (error) {
    console.error('❌ Error in download-ticket route:', error);
    res.status(500).render('error', {
      title: 'Download Failed',
      error: 'Failed to generate your ticket. Please try again or contact support.'
    });
  }
});

// Start booking: store booking info in session and redirect to /payment
app.post('/start-booking', (req, res) => {
    try {
        const { name, email, movie, movieId, seats, amount } = req.body;
        
        // Log the request body and session for debugging
        console.log('Start booking request:', req.body);
        console.log('Session before storing:', req.session);

        // Validate required fields
        if (!name || !email || !movie || !movieId || !seats || !amount) {
            console.log('Missing required fields:', { name, email, movie, movieId, seats, amount });
            return res.status(400).json({ error: 'All fields are required' });
        }

        // Validate movie exists
        const selectedMovie = movies.find(m => m.id === parseInt(movieId));
        if (!selectedMovie) {
            return res.status(400).json({ error: 'Invalid movie selected' });
        }

        // Generate unique booking ID
        const bookingId = Date.now().toString(36) + Math.random().toString(36).substr(2);
        
        // Create booking object
        const booking = {
            _id: bookingId,
            name,
            email,
            movie,
            movieId: parseInt(movieId),
            seats: Array.isArray(seats) ? seats : [seats],
            amount: parseInt(amount),
            timestamp: new Date()
        };

        // Block seats
        seatService.blockSeats(movieId, booking.seats);

        // Store in session
        req.session.pendingBooking = booking;
        
        // Save session explicitly
        req.session.save((err) => {
            if (err) {
                console.error('Failed to save session:', err);
                return res.status(500).json({ error: 'Failed to save booking. Please try again.' });
            }
            
            // Log success and session after storing
            console.log('Booking stored in session:', booking);
            console.log('Session after storing:', req.session);
            
            // Send success response with redirect URL
            res.json({ 
                success: true,
                message: 'Booking started successfully',
                bookingId,
                redirectUrl: '/payment'
            });
        });
    } catch (error) {
        console.error('Start booking error:', error);
        res.status(500).json({ error: 'Failed to start booking. Please try again.' });
    }
});

// Seat status polling endpoint
app.get('/seat-status', (req, res) => {
    try {
        const movieId = parseInt(req.query.movieId);
        if (!movieId) {
            return res.status(400).json({ error: 'Movie ID is required' });
        }

        // Get current seat status
        const { occupiedSeats, blockedSeats } = seatService.getSeatsStatus(movieId);
        
        res.json({
            success: true,
            movieId,
            occupiedSeats,
            blockedSeats,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error getting seat status:', error);
        res.status(500).json({ error: 'Failed to get seat status' });
    }
});

// 404 handler
app.use((req, res) => {
  res.status(404).render('error', {
    title: 'Page Not Found',
    error: 'The page you are looking for does not exist.'
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err.stack);
  res.status(500).render('error', {
    title: 'Server Error',
    error: 'Something went wrong on our end!'
  });
});

// Start server
const startServer = () => {
    try {
        server.listen(PORT, () => {
            console.log(`🚀 Server running on http://localhost:${PORT}`);
            console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`📍 Platform: ${isVercel ? 'Vercel' : 'Local'}`);
            console.log('✉️ Email service is configured with Gmail SMTP');
            console.log('🔌 WebSocket server is running');
        });

        server.on('error', (error) => {
            if (error.code === 'EADDRINUSE') {
                console.error(`❌ Port ${PORT} is already in use`);
                console.log('🔄 Trying alternative port...');
                server.listen(0); // Let OS assign a random available port
            } else {
                console.error('❌ Server error:', error);
                process.exit(1);
            }
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
};

startServer();

module.exports = app; 