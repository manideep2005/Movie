require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const EventEmitter = require('events');
const path = require('path');
const emailService = require('./services/emailService');

class CinemaBooking extends EventEmitter {}
const bookingSystem = new CinemaBooking();
const app = express();
const PORT = process.env.PORT || 3001;

// Sample movie data
const movies = [
  { id: 1, name: "Inception", price: 1200 },
  { id: 2, name: "The Dark Knight", price: 1000 },
  { id: 3, name: "Interstellar", price: 1500 },
  { id: 4, name: "Avengers: Endgame", price: 1300 }
];

// Middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static('public'));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

// Event listeners
bookingSystem.on('bookingComplete', async (booking) => {
  console.log(`🎟️ Booking complete for ${booking.username}. Starting payment...`);
  setTimeout(() => bookingSystem.emit('paymentComplete', booking), 1000);
});

bookingSystem.on('paymentComplete', async (booking) => {
  console.log(`💰 Payment received from ${booking.username}. Sending email...`);
  try {
    const emailResult = await emailService.sendBookingConfirmation(booking);
    if (emailResult.success) {
      booking.emailPreviewUrl = emailResult.previewUrl;
      setTimeout(() => bookingSystem.emit('emailSent', booking), 1000);
    } else {
      console.error('Failed to send email:', emailResult.error);
    }
  } catch (error) {
    console.error('Email error:', error);
  }
});

bookingSystem.on('emailSent', (booking) => {
  console.log(`📧 Email sent to ${booking.username}. Showing snack offers...`);
  setTimeout(() => bookingSystem.emit('snackOffer', booking), 1000);
});

bookingSystem.on('snackOffer', (booking) => {
  console.log(`🍿 Hey ${booking.username}, check out snack offers!`);
});

// Routes
app.get('/', (req, res) => {
  res.render('index', { title: 'Cinema Booking' });
});

app.get('/book', (req, res) => {
  res.render('book', { 
    title: 'Book Ticket',
    movies: movies,
    error: null
  });
});

app.post('/book', async (req, res) => {
  try {
    const { username, movie, seats, date, email } = req.body;
    
    if (!username || !movie || !seats || !date || !email) {
      return res.render('book', {
        title: 'Book Ticket',
        movies: movies,
        error: 'Please fill all fields'
      });
    }

    const selectedMovie = movies.find(m => m.name === movie);
    if (!selectedMovie) {
      return res.render('book', {
        title: 'Book Ticket',
        movies: movies,
        error: 'Invalid movie selection'
      });
    }

    const booking = {
      username,
      movie,
      seats: parseInt(seats),
      date,
      email,
      timestamp: new Date(),
      totalAmount: selectedMovie.price * parseInt(seats)
    };

    // Start the booking process
    console.log(`🛒 ${username} started booking...`);
    
    // Send confirmation email
    const emailResult = await emailService.sendBookingConfirmation(booking);
    booking.emailPreviewUrl = emailResult.previewUrl;
    
    bookingSystem.emit('bookingComplete', booking);
    
    res.render('confirmation', {
      title: 'Booking Confirmed',
      booking: booking,
      emailPreviewUrl: emailResult.previewUrl
    });
    
  } catch (error) {
    console.error('Booking error:', error);
    res.render('error', {
      title: 'Booking Error',
      error: 'Failed to process your booking. Please try again.'
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

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('error', {
    title: 'Server Error',
    error: 'Something went wrong on our end!'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

module.exports = app; 