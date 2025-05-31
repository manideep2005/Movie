const websocketService = require('./websocketService');
const occupiedSeatsMap = new Map();
const blockedSeatsMap = new Map();
const blockTimeout = 5 * 60 * 1000; // 5 minutes

function cleanupBlockedSeats(movieId) {
    if (!blockedSeatsMap.has(movieId)) return;
    
    const blockedSeats = blockedSeatsMap.get(movieId);
    const now = Date.now();
    
    // Remove expired blocks
    for (const [seat, timestamp] of blockedSeats.entries()) {
        if (now - timestamp > blockTimeout) {
            blockedSeats.delete(seat);
        }
    }
    
    // Clean up if no blocked seats remain
    if (blockedSeats.size === 0) {
        blockedSeatsMap.delete(movieId);
    }
}

function getSeatsStatus(movieId) {
    cleanupBlockedSeats(movieId);
    
    return {
        occupiedSeats: Array.from(occupiedSeatsMap.get(movieId) || []),
        blockedSeats: Array.from(blockedSeatsMap.get(movieId)?.keys() || [])
    };
}

function checkSeatsAvailability(movieId, seats) {
    cleanupBlockedSeats(movieId);
    
    const occupiedSeats = occupiedSeatsMap.get(movieId) || new Set();
    const blockedSeats = blockedSeatsMap.get(movieId) || new Map();
    
    return seats.every(seat => 
        !occupiedSeats.has(seat) && !blockedSeats.has(seat)
    );
}

function blockSeats(movieId, seats) {
    if (!blockedSeatsMap.has(movieId)) {
        blockedSeatsMap.set(movieId, new Map());
    }
    
    const blockedSeats = blockedSeatsMap.get(movieId);
    const now = Date.now();
    
    seats.forEach(seat => {
        blockedSeats.set(seat, now);
    });
    
    // Schedule cleanup
    setTimeout(() => cleanupBlockedSeats(movieId), blockTimeout);
    
    return true;
}

function confirmSeats(movieId, seats) {
    // Initialize occupied seats set if not exists
    if (!occupiedSeatsMap.has(movieId)) {
        occupiedSeatsMap.set(movieId, new Set());
    }
    
    const occupiedSeats = occupiedSeatsMap.get(movieId);
    
    // Move seats from blocked to occupied
    seats.forEach(seat => {
        occupiedSeats.add(seat);
    });
    
    // Remove from blocked seats
    if (blockedSeatsMap.has(movieId)) {
        const blockedSeats = blockedSeatsMap.get(movieId);
        seats.forEach(seat => {
            blockedSeats.delete(seat);
        });
        
        // Clean up if no blocked seats remain
        if (blockedSeats.size === 0) {
            blockedSeatsMap.delete(movieId);
        }
    }
    
    return true;
}

function releaseSeats(movieId, seats) {
    if (blockedSeatsMap.has(movieId)) {
        const blockedSeats = blockedSeatsMap.get(movieId);
        seats.forEach(seat => {
            blockedSeats.delete(seat);
        });
        
        // Clean up if no blocked seats remain
        if (blockedSeats.size === 0) {
            blockedSeatsMap.delete(movieId);
        }
    }
    return true;
}

// Function to get all blocked seats for a movie (for backward compatibility)
const getBlockedSeats = (movieId) => {
    const { occupiedSeats, blockedSeats } = getSeatsStatus(movieId);
    return [...occupiedSeats, ...blockedSeats];
};

module.exports = {
    getSeatsStatus,
    checkSeatsAvailability,
    blockSeats,
    confirmSeats,
    releaseSeats,
    getBlockedSeats
}; 