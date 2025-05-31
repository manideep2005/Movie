const nodemailer = require('nodemailer');

// Create transporter object using Gmail SMTP
const transporter = nodemailer.createTransport({
    service: 'gmail',
    host: 'smtp.gmail.com',
    port: 465,
    secure: true, // use SSL
    auth: {
        user: process.env.EMAIL_USER || 'w25087926@gmail.com',
        pass: process.env.EMAIL_PASS || 'ncrewxbcwgxmpxcq'
    },
    tls: {
        rejectUnauthorized: false // Accept self-signed certificates
    }
});

// Function to format currency
const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR'
    }).format(amount);
};

// Generate QR Code URL
const getQRCodeUrl = (bookingId) => {
    return `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${bookingId}`;
};

// Get base URL for the application
const getBaseUrl = () => {
    // Use environment variable if set, otherwise fallback to production URL or localhost
    if (process.env.BASE_URL) {
        return process.env.BASE_URL;
    }
    
    if (process.env.VERCEL_URL) {
        return `https://${process.env.VERCEL_URL}`;
    }
    
    // Check if we're in production
    if (process.env.NODE_ENV === 'production') {
        return 'https://movie-gilt-six.vercel.app';
    }
    
    // Local development
    return 'http://localhost:3001';
};

// Function to send confirmation email
const sendBookingConfirmation = async (booking) => {
    try {
        // Ensure seats is an array
        const seatsArray = Array.isArray(booking.seats) ? booking.seats : [booking.seats];
        const formattedAmount = formatCurrency(booking.amount);
        const formattedDate = new Date(booking.timestamp).toLocaleString('en-IN', {
            dateStyle: 'long',
            timeStyle: 'short'
        });

        // Generate ticket download URL with proper base URL
        const baseUrl = getBaseUrl();
        const ticketUrl = `${baseUrl}/download-ticket/${booking._id}`;
        const qrCodeUrl = getQRCodeUrl(booking._id);

        // Retry mechanism for email sending
        const maxRetries = 3;
        let lastError = null;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const mailOptions = {
                    from: {
                        name: 'Cinema Booking',
                        address: process.env.EMAIL_USER || 'w25087926@gmail.com'
                    },
                    to: booking.email,
                    subject: `🎬 Booking Confirmed - ${booking.movie}`,
                    html: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                            <div style="background-color: #1e3c72; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
                                <h1 style="margin: 0;">🎬 Booking Confirmed!</h1>
                                <p style="margin: 10px 0 0 0; opacity: 0.9;">Your movie tickets are booked</p>
                            </div>
                            
                            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
                                <h2 style="color: #1e3c72; margin-top: 0;">Hello ${booking.name},</h2>
                                <p>Thank you for booking with us! Here are your booking details:</p>
                                
                                <div style="background-color: white; padding: 20px; border-radius: 5px; margin: 20px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                                    <h3 style="color: #1e3c72; margin-top: 0; border-bottom: 2px solid #f0f0f0; padding-bottom: 10px;">Booking Details</h3>
                                    <p><strong>🎥 Movie:</strong> ${booking.movie}</p>
                                    <p><strong>💺 Seats:</strong> ${seatsArray.join(', ')}</p>
                                    <p><strong>🎫 Booking ID:</strong> <span style="font-family: monospace; background: #f8f9fa; padding: 2px 6px; border-radius: 4px;">${booking._id}</span></p>
                                    <p><strong>💰 Amount Paid:</strong> ${formattedAmount}</p>
                                    <p><strong>🕒 Booked On:</strong> ${formattedDate}</p>
                                </div>

                                <!-- QR Code Section -->
                                <div style="text-align: center; margin: 20px 0; background-color: white; padding: 20px; border-radius: 5px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                                    <h3 style="color: #1e3c72; margin-top: 0;">Your Ticket QR Code</h3>
                                    <img src="${qrCodeUrl}" alt="Ticket QR Code" style="width: 150px; height: 150px; margin: 10px 0;">
                                    <p style="color: #666; margin: 10px 0 0 0;">Scan this QR code at the cinema entrance</p>
                                </div>

                                <!-- Download Button -->
                                <div style="text-align: center; margin: 20px 0;">
                                    <a href="${ticketUrl}" style="display: inline-block; background-color: #28a745; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                                        📄 Download Ticket
                                    </a>
                                    <p style="color: #666; margin: 10px 0 0 0; font-size: 0.9em;">
                                        Click the button above to download your ticket
                                    </p>
                                </div>

                                <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0;">
                                    <p style="margin: 0; color: #856404;">
                                        <strong>⚠️ Important Notes:</strong>
                                    </p>
                                    <ul style="margin: 10px 0 0 0; padding-left: 20px; color: #856404;">
                                        <li>Please arrive 15 minutes before showtime</li>
                                        <li>Bring this email or your booking ID for verification</li>
                                        <li>You can show either the QR code or printed ticket</li>
                                        <li>Outside food and beverages are not allowed</li>
                                    </ul>
                                </div>

                                <div style="text-align: center; margin-top: 30px; padding: 20px; background-color: white; border-radius: 5px;">
                                    <p style="color: #1e3c72; font-size: 1.2em; margin: 0;">Enjoy your movie! 🍿</p>
                                </div>
                            </div>
                            
                            <div style="text-align: center; margin-top: 20px; color: #6c757d;">
                                <p style="margin: 5px 0;">Thank you for choosing our cinema!</p>
                                <small style="opacity: 0.7;">© ${new Date().getFullYear()} Cinema Booking. All rights reserved.</small>
                            </div>
                        </div>
                    `
                };

                console.log(`📧 Attempt ${attempt}: Sending confirmation email to:`, booking.email);
                const info = await transporter.sendMail(mailOptions);
                console.log('✅ Email sent successfully:', info.messageId);
                return { success: true, messageId: info.messageId };
            } catch (error) {
                console.error(`❌ Attempt ${attempt} failed:`, error);
                lastError = error;
                
                // Wait before retrying (exponential backoff)
                if (attempt < maxRetries) {
                    const delay = attempt * 1000; // 1s, 2s, 3s
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }

        // If we get here, all attempts failed
        throw new Error(`Failed to send email after ${maxRetries} attempts. Last error: ${lastError.message}`);
    } catch (error) {
        console.error('❌ Email error:', error);
        throw error;
    }
};

// Verify connection configuration with retries
const verifyConnection = async () => {
    const maxRetries = 3;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            await transporter.verify();
            console.log('✅ SMTP connection verified and ready');
            return;
        } catch (error) {
            console.error(`❌ SMTP connection error (attempt ${attempt}/${maxRetries}):`, error);
            if (attempt < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, attempt * 1000));
            }
        }
    }
};

verifyConnection();

module.exports = {
    sendBookingConfirmation
};