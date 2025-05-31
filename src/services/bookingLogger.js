/*const fs = require('fs');
const path = require('path');

// In-memory storage for Vercel environment
let bookingsMemory = [];

const isVercelEnv = process.env.VERCEL === '1';
const logFilePath = path.join(__dirname, '../../logs/bookings.log');
const logsDir = path.join(__dirname, '../../logs');

const ensureLogsDirectory = () => {
    if (isVercelEnv) return; // Skip for Vercel environment
    
    try {
        if (!fs.existsSync(logsDir)) {
            fs.mkdirSync(logsDir, { recursive: true });
            console.log('✅ Created logs directory');
        }
    } catch (error) {
        console.error('❌ Failed to create logs directory:', error);
    }
};

const logBooking = (bookingDetails) => {
    try {
        if (isVercelEnv) {
            // Store in memory for Vercel
            bookingsMemory.push({
                timestamp: new Date().toISOString(),
                ...bookingDetails
            });
            console.log('✅ Booking stored in memory');
            // Keep only last 100 bookings in memory
            if (bookingsMemory.length > 100) {
                bookingsMemory = bookingsMemory.slice(-100);
            }
            return;
        }

        // File-based storage for local environment
        ensureLogsDirectory();
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            ...bookingDetails
        };
        
        const logString = JSON.stringify(logEntry) + '\n';
        fs.appendFileSync(logFilePath, logString);
        console.log('✅ Booking logged to file');
    } catch (error) {
        console.error('❌ Failed to log booking:', error);
    }
};

const getBookingLogs = () => {
    try {
        if (isVercelEnv) {
            // Return from memory for Vercel
            return bookingsMemory;
        }

        // File-based retrieval for local environment
        ensureLogsDirectory();
        
        if (!fs.existsSync(logFilePath)) {
            return [];
        }
        
        const logs = fs.readFileSync(logFilePath, 'utf8')
            .split('\n')
            .filter(line => line.trim())
            .map(line => JSON.parse(line));
        
        return logs;
    } catch (error) {
        console.error('❌ Failed to read booking logs:', error);
        return [];
    }
};

module.exports = {
    logBooking,
    getBookingLogs
}; */