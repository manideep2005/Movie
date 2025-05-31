const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');

// Function to generate PDF ticket
const generateTicket = async (booking, stream) => {
    // Create a new PDF document
    const doc = new PDFDocument({
        size: 'A4',
        margin: 50
    });

    // Pipe the PDF into the response stream
    doc.pipe(stream);

    // Add cinema logo/header
    doc.fontSize(25)
        .text('Cinema Booking', { align: 'center' })
        .moveDown();

    // Add movie title
    doc.fontSize(20)
        .fillColor('#1e3c72')
        .text(booking.movie, { align: 'center' })
        .moveDown();

    // Add booking details
    doc.fontSize(12)
        .fillColor('#000000');

    // Create a table-like structure for booking details
    const details = [
        ['Booking ID', booking._id],
        ['Customer Name', booking.name],
        ['Seats', Array.isArray(booking.seats) ? booking.seats.join(', ') : booking.seats],
        ['Amount Paid', `₹${booking.amount}`],
        ['Booking Date', new Date(booking.timestamp).toLocaleString('en-IN')]
    ];

    details.forEach(([label, value]) => {
        doc.text(`${label}:`, { continued: true, width: 150 })
            .text(`  ${value}`, { align: 'left' })
            .moveDown(0.5);
    });

    // Generate QR code
    try {
        const qrCodeDataUrl = await QRCode.toDataURL(booking._id, {
            width: 150,
            margin: 2
        });

        // Add QR code to PDF
        doc.moveDown(2)
            .image(qrCodeDataUrl, {
                fit: [150, 150],
                align: 'center'
            })
            .moveDown();

        // Add scanning instruction
        doc.fontSize(10)
            .fillColor('#666666')
            .text('Scan this QR code at the cinema entrance', { align: 'center' })
            .moveDown(2);

        // Add important notes
        doc.fontSize(12)
            .fillColor('#000000')
            .text('Important Notes:', { underline: true })
            .moveDown(0.5);

        const notes = [
            '• Please arrive 15 minutes before showtime',
            '• Bring this ticket or your booking ID for verification',
            '• Outside food and beverages are not allowed',
            '• Keep this ticket safe and present it at the entrance'
        ];

        notes.forEach(note => {
            doc.text(note).moveDown(0.5);
        });

        // Add footer
        doc.fontSize(10)
            .fillColor('#666666')
            .text('Thank you for choosing our cinema!', { align: 'center' })
            .moveDown(0.5)
            .text(`© ${new Date().getFullYear()} Cinema Booking. All rights reserved.`, { align: 'center' });

    } catch (error) {
        console.error('Error generating QR code:', error);
        // Continue without QR code if there's an error
    }

    // Finalize the PDF
    doc.end();
};

module.exports = {
    generateTicket
}; 