const BRAND_COLOR = '#ff4d4d'; // Customize this to match your brand
const SECONDARY_COLOR = '#1a1a1a';

const baseTemplate = (content) => `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 20px auto; border: 1px solid #eee; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
        .header { background: ${BRAND_COLOR}; padding: 30px; text-align: center; color: white; }
        .header h1 { margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; }
        .content { padding: 40px; background: #ffffff; }
        .footer { background: #f9f9f9; padding: 20px; text-align: center; color: #888; font-size: 12px; }
        .button { display: inline-block; padding: 14px 28px; background: ${BRAND_COLOR}; color: #ffffff !important; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
        .info-box { background: #f4f4f4; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .info-item { margin-bottom: 10px; font-size: 14px; }
        .info-label { font-weight: bold; color: #555; width: 120px; display: inline-block; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>DineDash</h1>
        </div>
        <div class="content">
            ${content}
        </div>
        <div class="footer">
            &copy; 2026 DineDash Systems. All rights reserved.<br>
            If you have any questions, contact us at support@DineDash.com
        </div>
    </div>
</body>
</html>
`;

module.exports = {
    // For the Sender (Restaurant Owner)
    getServiceRequestConfirmationTemplate: (companyName) => baseTemplate(`
        <h2 style="color: ${SECONDARY_COLOR};">Request Received!</h2>
        <p>Hello <strong>${companyName}</strong>,</p>
        <p>Thank you for choosing DineDash. We've received your request to join our platform. Our team is currently reviewing your details.</p>
        <div class="info-box">
            <p style="margin:0;"><strong>What happens next?</strong></p>
            <p style="margin:5px 0 0 0; font-size: 14px; color: #666;">Our Super Admin will verify your business information. Once approved, you will receive another email with instructions to access your dashboard.</p>
        </div>
        <p>We usually process requests within 24 hours.</p>
        <p>Best regards,<br>The DineDash Team</p>
    `),

    // For the Super Admin
    getAdminNotificationTemplate: (data) => baseTemplate(`
        <h2 style="color: ${SECONDARY_COLOR};">New Service Request</h2>
        <p>A new business has requested access to the platform:</p>
        <div class="info-box">
            <div class="info-item"><span class="info-label">Company:</span> ${data.companyName}</div>
            <div class="info-item"><span class="info-label">Email:</span> ${data.email}</div>
            <div class="info-item"><span class="info-label">Phone:</span> ${data.phone}</div>
            <div class="info-item"><span class="info-label">Address:</span> ${data.address}</div>
        </div>
        <p>Please log in to the Super Admin panel to review and approve/reject this request.</p>
        <a href="https://dine-dash-pos.vercel.app/superadmin/login" class="button">Go to Admin Panel</a>
    `),

    // For the Sender on Approval
    getServiceApprovalTemplate: (companyName) => baseTemplate(`
        <h2 style="color: ${BRAND_COLOR}; text-align: center;">Welcome to DineDash!</h2>
        <p>Hello <strong>${companyName}</strong>,</p>
        <p>Great news! Your request has been <strong>Approved</strong>. Your company profile and initial administrative account are now ready.</p>
        <p>You can now log in to your dashboard to set up your branches, staff, and products.</p>
        <div style="text-align: center;">
            <a href="https://dine-dash-pos.vercel.app/login" class="button">Log In to Dashboard</a>
        </div>
        <div class="info-box" style="border-left: 4px solid ${BRAND_COLOR};">
            <p style="margin:0; font-size: 14px;"><strong>Tip:</strong> Start by adding your first branch and categories in the Catalog section.</p>
        </div>
        <p>We're excited to have you on board!</p>
        <p>Best regards,<br>The DineDash Team</p>
    `),

    // Enhanced Forgot Password Template
    getForgotPasswordTemplate: (resetUrl) => baseTemplate(`
        <h2 style="color: ${SECONDARY_COLOR};">Password Reset Request</h2>
        <p>We received a request to reset your password for your DineDash account.</p>
        <p>Click the button below to choose a new password. This link is valid for 1 hour.</p>
        <div style="text-align: center;">
            <a href="${resetUrl}" class="button">Reset My Password</a>
        </div>
        <p style="font-size: 13px; color: #888;">If you didn't request a password reset, you can safely ignore this email.</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="font-size: 11px; color: #aaa; word-break: break-all;">If the button above doesn't work, copy and paste this link into your browser:<br>${resetUrl}</p>
    `)
};
