const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
    try {
        const isGmail = process.env.SMTP_HOST?.includes('gmail');

        const transportConfig = isGmail ? {
            service: 'gmail',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        } : {
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT || 587,
            secure: process.env.SMTP_PORT == 465,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        };

        const transporter = nodemailer.createTransport(transportConfig);

        const mailOptions = {
            from: `"${process.env.FROM_NAME || 'DineDash'}" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
            to: options.email,
            subject: options.subject,
            text: options.message,
            html: options.html
        };

        const info = await transporter.sendMail(mailOptions);
        console.log("✅ Email sent successfully: %s", info.messageId);
        return info;
    } catch (error) {
        console.error("❌ Email Delivery Failed:", error.message);
        // Don't throw error in production to prevent app crash, just log it
        if (process.env.NODE_ENV === 'production') {
            return { error: error.message };
        }
        throw error;
    }
};

module.exports = sendEmail;
