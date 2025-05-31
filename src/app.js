require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const session = require('express-session');
const emailService = require('./services/emailService');
const ticketService = require('./services/ticketService');
const { logBooking, getBookingLogs } = require('./services/bookingLogger');

const app = express();
const PORT = process.env.PORT || 3001;
const isProduction = process.env.NODE_ENV === 'production';
const isVercel = process.env.VERCEL === '1';

// Sample movie data
const movies = [
  { 
    id: 1, 
    name: "Inception", 
    price: 200, 
    seats: Array(84).fill(false),
    image: "https://m.media-amazon.com/images/M/MV5BMjAxMzY3NjcxNF5BMl5BanBnXkFtZTcwNTI5OTM0Mw@@._V1_.jpg",
    description: "A thief who steals corporate secrets through dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O."
  },
  { 
    id: 2, 
    name: "The Dark Knight", 
    price: 200, 
    seats: Array(84).fill(false),
    image: "https://m.media-amazon.com/images/M/MV5BMTMxNTMwODM0NF5BMl5BanBnXkFtZTcwODAyMTk2Mw@@._V1_.jpg",
    description: "When the menace known as the Joker wreaks havoc and chaos on the people of Gotham, Batman must accept one of the greatest psychological and physical tests of his ability to fight injustice."
  },
  { 
    id: 3, 
    name: "Interstellar", 
    price: 200, 
    seats: Array(84).fill(false),
    image: "https://m.media-amazon.com/images/M/MV5BZjdkOTU3MDktN2IxOS00OGEyLWFmMjktY2FiMmZkNWIyODZiXkEyXkFqcGdeQXVyMTMxODk2OTU@._V1_.jpg",
    description: "A team of explorers travel through a wormhole in space in an attempt to ensure humanity's survival."
  },
  { 
    id: 4, 
    name: "Avengers: Endgame", 
    price: 200, 
    seats: Array(84).fill(false),
    image: "https://m.media-amazon.com/images/M/MV5BMTc5MDE2ODcwNV5BMl5BanBnXkFtZTgwMzI2NzQ2NzM@._V1_.jpg",
    description: "After the devastating events of Infinity War, the universe is in ruins. With the help of remaining allies, the Avengers assemble once more in order to reverse Thanos' actions and restore balance to the universe."
  }
];

// Middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static('public'));

// Session configuration
const sessionConfig = {
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
};

if (isProduction || isVercel) {
  app.set('trust proxy', 1); // trust first proxy
  sessionConfig.cookie.secure = true; // serve secure cookies
}

app.use(session(sessionConfig));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

// Routes
app.get('/', (req, res) => {
  res.render('index', { movies });
});

app.get('/book', (req, res) => {
  const movieId = parseInt(req.query.movie);
  const selectedMovie = movies.find(m => m.id === movieId);
  
  if (movieId && !selectedMovie) {
    return res.status(404).render('error', {
      title: 'Movie Not Found',
      error: 'The selected movie was not found.'
    });
  }

  res.render('booking', { 
    movies,
    selectedMovie
  });
});

// Book tickets
app.post('/book', async (req, res) => {
  try {
    console.log('📝 Received booking request:', req.body);
    const { name, email, movie, seats, amount } = req.body;
    
    // Validate input
    if (!name || !email || !movie || !seats || !amount) {
      console.log('❌ Validation failed:', { name, email, movie, seats, amount });
      return res.status(400).json({ 
        success: false, 
        error: 'All fields are required' 
      });
    }

    // Validate movie exists
    const movieExists = movies.some(m => m.name === movie);
    if (!movieExists) {
      console.log('❌ Invalid movie:', movie);
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid movie selection' 
      });
    }

    // Generate booking ID
    const bookingId = Date.now().toString(36) + Math.random().toString(36).substr(2);
    
    const bookingDetails = {
      _id: bookingId,
      name,
      email,
      movie,
      seats: Array.isArray(seats) ? seats : [seats],
      amount,
      timestamp: new Date()
    };

    console.log('📋 Booking details:', bookingDetails);

    // Log the booking
    try {
      logBooking(bookingDetails);
      console.log('✅ Booking logged successfully');
    } catch (logError) {
      console.error('❌ Failed to log booking:', logError);
      // Continue with booking even if logging fails
    }

    // Send confirmation email
    let emailSent = false;
    try {
      await emailService.sendBookingConfirmation(bookingDetails);
      console.log('✅ Confirmation email sent to:', email);
      emailSent = true;
    } catch (emailError) {
      console.error('❌ Failed to send confirmation email:', emailError);
      // Continue with booking even if email fails
    }

    // Store booking in session
    try {
      req.session.lastBooking = bookingDetails;
      if (!isVercel) { // Skip session save in Vercel environment
        await new Promise((resolve, reject) => {
          req.session.save((err) => {
            if (err) {
              console.error('❌ Session save error:', err);
              reject(err);
            } else {
              resolve();
            }
          });
        });
      }
      console.log('✅ Session saved successfully');
    } catch (sessionError) {
      console.error('❌ Failed to save session:', sessionError);
      // Continue even if session save fails
    }

    // Send success response
    res.json({ 
      success: true,
      message: emailSent ? 'Booking confirmed! Check your email for confirmation.' : 'Booking confirmed! Email delivery might be delayed.',
      bookingId: bookingId
    });

  } catch (error) {
    console.error('❌ Booking error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to process booking. Please try again.' 
    });
  }
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
    console.error('❌ Failed to get booking logs:', error);
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
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📍 Platform: ${isVercel ? 'Vercel' : 'Local'}`);
  console.log('✉️ Email service is configured with Gmail SMTP');
});

module.exports = app; 