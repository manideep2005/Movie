const fs = require('fs');
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
        // Test write permissions
        fs.accessSync(logsDir, fs.constants.W_OK);
        console.log('✅ Logs directory is writable');
    } catch (error) {
        console.error('❌ Logs directory error:', error);
        // Fallback to memory storage if file system is not accessible
        console.log('⚠️ Falling back to memory storage');
        process.env.VERCEL = '1';
    }
};

const logBooking = (bookingDetails) => {
    if (!bookingDetails || typeof bookingDetails !== 'object') {
        console.error('❌ Invalid booking details:', bookingDetails);
        return;
    }

    try {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            ...bookingDetails
        };

        console.log('📝 Attempting to log booking:', {
            id: logEntry._id,
            movie: logEntry.movie,
            email: logEntry.email
        });

        if (isVercelEnv) {
            // Store in memory for Vercel
            bookingsMemory.push(logEntry);
            console.log('✅ Booking stored in memory, total bookings:', bookingsMemory.length);
            // Keep only last 100 bookings in memory
            if (bookingsMemory.length > 100) {
                bookingsMemory = bookingsMemory.slice(-100);
            }
            return;
        }

        // File-based storage for local environment
        ensureLogsDirectory();
        
        const logString = JSON.stringify(logEntry) + '\n';
        fs.appendFileSync(logFilePath, logString);
        console.log('✅ Booking logged to file:', logFilePath);
    } catch (error) {
        console.error('❌ Failed to log booking:', error);
        // Fallback to memory storage
        if (!isVercelEnv) {
            console.log('⚠️ Falling back to memory storage');
            process.env.VERCEL = '1';
            logBooking(bookingDetails);
        }
    }
};

const getBookingLogs = () => {
    console.log('📖 Attempting to retrieve bookings...');
    
    try {
        if (isVercelEnv) {
            console.log('📱 Using memory storage, found bookings:', bookingsMemory.length);
            return bookingsMemory;
        }

        // File-based retrieval for local environment
        ensureLogsDirectory();
        
        if (!fs.existsSync(logFilePath)) {
            console.log('⚠️ No bookings log file found');
            return [];
        }
        
        const fileContent = fs.readFileSync(logFilePath, 'utf8');
        const logs = fileContent
            .split('\n')
            .filter(line => line.trim())
            .map(line => {
                try {
                    return JSON.parse(line);
                } catch (e) {
                    console.error('❌ Failed to parse booking line:', line);
                    return null;
                }
            })
            .filter(booking => booking !== null);
        
        console.log('📚 Retrieved bookings from file:', logs.length);
        return logs;
    } catch (error) {
        console.error('❌ Failed to read booking logs:', error);
        // Fallback to memory storage
        if (!isVercelEnv) {
            console.log('⚠️ Falling back to memory storage');
            process.env.VERCEL = '1';
            return getBookingLogs();
        }
        return [];
    }
};

// Add a function to clear corrupted log file
const clearCorruptedLogs = () => {
    if (isVercelEnv) return;
    
    try {
        if (fs.existsSync(logFilePath)) {
            const backup = `${logFilePath}.bak`;
            fs.renameSync(logFilePath, backup);
            console.log('✅ Backed up corrupted log file:', backup);
        }
        fs.writeFileSync(logFilePath, '', 'utf8');
        console.log('✅ Created fresh log file');
    } catch (error) {
        console.error('❌ Failed to clear corrupted logs:', error);
    }
};

module.exports = {
    logBooking,
    getBookingLogs,
    clearCorruptedLogs
};