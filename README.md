# Cinema Booking System

A simple and elegant cinema ticket booking system built with Node.js, Express, and EJS.

## Features

- 🎬 Browse available movies
- 🎟️ Book movie tickets
- 📧 Email confirmation (mock)
- 💰 Simple payment flow (mock)
- 🍿 Snack offers (mock)

## Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd Movie
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory:
```bash
PORT=3001
```

## Running the Application

1. Start the server:
```bash
npm start
```

2. For development with auto-reload:
```bash
npm run dev
```

3. Open your browser and navigate to:
```
http://localhost:3001
```

## Project Structure

```
Movie/
├── src/
│   └── app.js          # Main application file
├── views/
│   ├── index.ejs       # Home page
│   ├── book.ejs        # Booking form
│   ├── confirmation.ejs # Booking confirmation
│   └── error.ejs       # Error page
├── public/             # Static files
├── package.json        # Project dependencies
├── .env               # Environment variables
└── README.md          # Project documentation
```

## Available Movies

The system comes with sample movies:
- Inception ($1200)
- The Dark Knight ($1000)
- Interstellar ($1500)
- Avengers: Endgame ($1300)

## Contributing

Feel free to submit issues and enhancement requests! 