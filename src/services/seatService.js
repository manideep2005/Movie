const websocketService = require('./websocketService');
const seats = new Map(); // Store seat status for all movies

// Function to block seats temporarily (for 10 minutes during booking process)
const blockSeats = (movieId, selectedSeats) => {
    const key = `${movieId}`;
    if (!seats.has(key)) {
        seats.set(key, new Map());
    }
    
    const movieSeats = seats.get(key);
    const blockingTime = Date.now();
    
    selectedSeats.forEach(seat => {
        movieSeats.set(seat, {
            blocked: true,
            timestamp: blockingTime
        });
    });

    // Notify all clients about the blocked seats
    websocketService.handleBlockSeats(movieId, selectedSeats);

    // Set timeout to automatically unblock seats after 10 minutes
    setTimeout(() => {
        selectedSeats.forEach(seat => {
            const seatInfo = movieSeats.get(seat);
            if (seatInfo && seatInfo.timestamp === blockingTime) {
                movieSeats.delete(seat);
            }
        });
        // Notify clients about the updated seat status
        const { occupiedSeats, blockedSeats } = getSeatsStatus(movieId);
        websocketService.updateSeatStatus(movieId, occupiedSeats, blockedSeats);
    }, 10 * 60 * 1000); // 10 minutes
};

// Function to check if seats are available
const checkSeatsAvailability = (movieId, selectedSeats) => {
    const key = `${movieId}`;
    if (!seats.has(key)) {
        return true; // If no seats are blocked, all seats are available
    }

    const movieSeats = seats.get(key);
    const now = Date.now();

    // Check each selected seat
    for (const seat of selectedSeats) {
        const seatInfo = movieSeats.get(seat);
        if (seatInfo) {
            // If seat is blocked and blocking time is less than 10 minutes ago
            if (seatInfo.blocked && (now - seatInfo.timestamp) < 10 * 60 * 1000) {
                return false;
            }
        }
    }
    return true;
};

// Function to confirm seats after successful payment
const confirmSeats = (movieId, selectedSeats) => {
    const key = `${movieId}`;
    if (!seats.has(key)) {
        seats.set(key, new Map());
    }

    const movieSeats = seats.get(key);
    selectedSeats.forEach(seat => {
        movieSeats.set(seat, {
            blocked: true,
            confirmed: true,
            timestamp: Date.now()
        });
    });

    // Notify all clients about the booked seats
    websocketService.handleBookSeats(movieId, selectedSeats);
};

// Function to get all blocked and occupied seats for a movie
const getSeatsStatus = (movieId) => {
    const key = `${movieId}`;
    if (!seats.has(key)) {
        return { occupiedSeats: [], blockedSeats: [] };
    }

    const movieSeats = seats.get(key);
    const now = Date.now();
    const occupiedSeats = [];
    const blockedSeats = [];

    movieSeats.forEach((info, seat) => {
        if (info.confirmed) {
            occupiedSeats.push(seat);
        } else if (info.blocked && (now - info.timestamp) < 10 * 60 * 1000) {
            blockedSeats.push(seat);
        }
    });

    return { occupiedSeats, blockedSeats };
};

// Function to get all blocked seats for a movie (for backward compatibility)
const getBlockedSeats = (movieId) => {
    const { occupiedSeats, blockedSeats } = getSeatsStatus(movieId);
    return [...occupiedSeats, ...blockedSeats];
};

module.exports = {
    blockSeats,
    checkSeatsAvailability,
    confirmSeats,
    getBlockedSeats,
    getSeatsStatus
}; 