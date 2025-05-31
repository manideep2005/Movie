const fs = require('fs');
const path = require('path');

const logFilePath = path.join(__dirname, '../../logs/bookings.log');

// Ensure logs directory exists
if (!fs.existsSync(path.join(__dirname, '../../logs'))) {
    fs.mkdirSync(path.join(__dirname, '../../logs'));
}

const logBooking = (bookingDetails) => {
    const timestamp = new Date().toISOString();
    const logEntry = {
        timestamp,
        ...bookingDetails
    };
    
    const logString = JSON.stringify(logEntry) + '\n';
    fs.appendFileSync(logFilePath, logString);
};

const getBookingLogs = () => {
    if (!fs.existsSync(logFilePath)) {
        return [];
    }
    
    const logs = fs.readFileSync(logFilePath, 'utf8')
        .split('\n')
        .filter(line => line.trim())
        .map(line => JSON.parse(line));
    
    return logs;
};

module.exports = {
    logBooking,
    getBookingLogs
}; 