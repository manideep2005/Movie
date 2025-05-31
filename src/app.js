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

// Body parser middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Session middleware with secure configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: isProduction,
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Initialize WebSocket server
websocketService.initialize(server);

// Set view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

// Serve static files
app.use(express.static(path.join(__dirname, '../public')));

// Movie data (in-memory for demo)
const movies = [
    { id: 1, name: 'Inception', price: 250 },
    { id: 2, name: 'The Dark Knight', price: 300 },
    { id: 3, name: 'Interstellar', price: 280 }
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
    if (!booking) {
        return res.redirect('/');
    }
    res.render('payment', {
        booking
    });
});

// Payment preview success (simulate payment)
app.post('/payment-preview-success', async (req, res) => {
    try {
        const booking = req.session.pendingBooking;
        if (!booking) {
            return res.redirect('/');
        }
        // Confirm seats
        seatService.confirmSeats(booking.movieId, booking.seats);
        // Log the booking
        try { logBooking(booking); } catch (e) { console.error('Log error:', e); }
        // Send confirmation email
        try { await emailService.sendBookingConfirmation(booking); } catch (e) { console.error('Email error:', e); }
        // Store for success page
        req.session.lastBooking = booking;
        delete req.session.pendingBooking;
        res.redirect('/success');
    } catch (error) {
        console.error('Payment preview error:', error);
        res.status(500).render('error', {
            title: 'Payment Error',
            error: 'Failed to process payment preview.'
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
    if (!booking) {
        return res.redirect('/');
    }
    // Clear the session data
    delete req.session.lastBooking;
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
        
        // Log the request body for debugging
        console.log('Start booking request:', req.body);

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

        // Store in session
        req.session.pendingBooking = booking;
        
        // Log success
        console.log('Booking stored in session:', booking);
        
        // Send success response
        res.json({ 
            success: true,
            message: 'Booking started successfully',
            bookingId
        });
    } catch (error) {
        console.error('Start booking error:', error);
        res.status(500).json({ error: 'Failed to start booking. Please try again.' });
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