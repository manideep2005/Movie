const nodemailer = require('nodemailer');

// Create a transporter using Gmail
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'manideep.gonugunta1802@gmail.com',
        pass: 'keqvspawutwehxnz'// Replace with your actual App Password
    }
});

// Email template for booking confirmation
const getEmailTemplate = (booking) => {
    return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
            <div style="background-color: #1e3c72; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1 style="margin: 0;">🎬 Cinema Booking Confirmation</h1>
            </div>
            
            <div style="background-color: white; padding: 20px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
                <h2 style="color: #1e3c72; margin-top: 0;">Dear ${booking.username},</h2>
                <p>Your movie booking has been confirmed! Here are your booking details:</p>
                
                <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
                    <h3 style="color: #1e3c72; margin-top: 0;">🎟️ BOOKING DETAILS</h3>
                    <p><strong>🎥 Movie:</strong> ${booking.movie}</p>
                    <p><strong>💺 Number of Seats:</strong> ${booking.seats}</p>
                    <p><strong>📅 Show Date:</strong> ${new Date(booking.date).toLocaleDateString()}</p>
                    <p><strong>💰 Total Amount:</strong> $${booking.totalAmount}</p>
                </div>

                <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <p style="color: #856404; margin: 0;">
                        <strong>⚠️ Important:</strong> Please arrive 15 minutes before the show time. 
                        Bring this confirmation email or booking ID to collect your tickets.
                    </p>
                </div>

                <div style="text-align: center; margin-top: 30px;">
                    <p style="color: #00b894; font-size: 1.2em;">Enjoy your movie! 🍿</p>
                </div>
            </div>
            
            <div style="text-align: center; margin-top: 20px; color: #666; font-size: 0.8em;">
                <p>This is an automated email. Please do not reply.</p>
                <p>© ${new Date().getFullYear()} Cinema Booking. All rights reserved.</p>
            </div>
        </div>
    `;
};

// Function to send confirmation email
const sendBookingConfirmation = async (booking) => {
    try {
        const mailOptions = {
            from: '"Cinema Booking" <manideep.gonugunta1802@gmail.com>',
            to: booking.email,
            subject: `🎬 Movie Booking Confirmation - ${booking.movie}`,
            html: getEmailTemplate(booking)
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('📧 Email sent successfully:', info.messageId);
        return {
            success: true,
            messageId: info.messageId
        };
    } catch (error) {
        console.error('❌ Error sending email:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

module.exports = {
    sendBookingConfirmation
}; 