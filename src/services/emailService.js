const nodemailer = require('nodemailer');

// Create transporter object using Gmail SMTP
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
        user: 'manideep.gonugunta1802@gmail.com',
        pass: 'keqvspawutwehxnz'
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
    return process.env.BASE_URL || 
           (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3001');
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

        const mailOptions = {
            from: {
                name: 'Cinema Booking',
                address: 'manideep.gonugunta1802@gmail.com'
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
                                <ul style="margin: 10px 0 0 0; padding-left: 20px;">
                                    <li>Please arrive 15 minutes before showtime</li>
                                    <li>Bring this email or your booking ID for verification</li>
                                    <li>You can show either the QR code or printed ticket</li>
                                    <li>Outside food and beverages are not allowed</li>
                                </ul>
                            </p>
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

        console.log('📧 Sending confirmation email to:', booking.email);
        console.log('🔗 Ticket download URL:', ticketUrl);
        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Email sent successfully:', info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('❌ Email error:', error);
        throw error;
    }
};

// Verify connection configuration
transporter.verify()
    .then(() => console.log('✅ SMTP connection verified and ready'))
    .catch(error => console.error('❌ SMTP connection error:', error));

module.exports = {
    sendBookingConfirmation
};