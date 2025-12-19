import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailerService } from '@nestjs-modules/mailer';
import * as nodemailer from 'nodemailer';
import * as path from 'path';
import { promises as fs } from 'fs';

@Injectable()
export class MailService {
  private transporter;
  private otpTransporter;

  constructor(private readonly configService: ConfigService) {


    // Create the transporter with SMTP settings
    this.transporter = nodemailer.createTransport({
      host: this.configService.get('SMTP_HOST'), // Generic SMTP server (replace Gmail with your server)
      port: this.configService.get('SMTP_PORT') || 587, // Use the correct port (587 for TLS/STARTTLS)
      secure: this.configService.get('SMTP_SECURE') === 'true', // true for 465 (SSL), false for 587 (TLS)
      auth: {
        user: this.configService.get('EMAIL_USER'), // Your email address
        pass: this.configService.get('EMAIL_PASSWORD'), // Your email password
      },
    });

        const otpEmailUser = this.configService.get('OTP_EMAIL_SENDER');
    const otpEmailPass = this.configService.get('OTP_EMAIL_PASSWORD');
    
    if (otpEmailUser && otpEmailPass) {
      this.otpTransporter = nodemailer.createTransport({
        service: this.configService.get('OTP_EMAIL_SERVICE') || 'gmail',
        host: 'smtp.gmail.com',
        port: parseInt(this.configService.get('OTP_EMAIL_PORT') || '587'),
        secure: this.configService.get('OTP_EMAIL_SECURE') === 'true',
        auth: {
          user: otpEmailUser,
          pass: otpEmailPass,
        },
      });
    } else {
      console.warn('OTP email credentials not configured. OTP emails will not work.');
    }
  }

  /**
   * Send a password reset email with a reset code.
   * @param to Recipient email address.
   * @param resetCode The code for resetting the password.
   */
  async sendPasswordResetEmail(to: string, resetCode: string) {
    const subject = 'Reset Your Password';
    const html = `
      <p>You requested a password reset. Use the code below to reset your password:</p>
      <h2>${resetCode}</h2>
      <p>If you didn't request this, please ignore this email.</p>
    `;

    await this.sendMail({ to, subject, html });
  }

  /**
   * Send a verification email with a verification code.
   * @param to Recipient email address.
   * @param verificationCode The code to verify the user's email address.
   */
  async sendVerificationEmail(to: string, verificationCode: string) {
    const subject = 'Verify Your Email Address';
    const html = `
      <p>Thank you for registering. Please verify your email using the code below:</p>
      <h2>${verificationCode}</h2>
      <p>If you didn't register, please ignore this email.</p>
    `;

    await this.sendMail({ to, subject, html });
  }

  /**
   * Send a welcome email to a newly registered organization.
   * @param to Recipient email address.
   * @param organizationName The name of the organization.
   */
  async sendWelcomeEmail(to: string, userName: string) {
    const subject = `Welcome to Eco Yield, ${userName}!`;
    const filePath = path.resolve(__dirname, '../src/email-templates/welcome.html');
    // Read the HTML template
    let html = await fs.readFile(filePath, 'utf8');
    html = html.replace('${useName}', userName);


    await this.sendMail({ to, subject, html });
  }

  // email to the organisaiton admin after creation 
  async sendOrganisationWelcomeEmail(to: string, organizationName: string, admin_password: string) {
    const subject = `Welcome to Our Service, ${organizationName}!`;
    const html = `
      <p>Dear ${organizationName},</p>
      <p>Welcome to our service! We're thrilled to have you on board.</p>
      <p> You credentails are : </p>
      <p> username : ${to} </p>
      <p> password : ${admin_password} </p>
      <p>Make sure you reset them after you enter the account for the first time </p>
      <p>If you have any questions or need assistance, feel free to reach out to us.</p>
      <p>Best Regards,<br/>The Team</p>
    `;

    await this.sendMail({ to, subject, html });
  }

  /**
 * Send an email notifying the recipient that their demo request was accepted.
 * @param to Recipient email address.
 * @param organizationName The name of the organization.
 * @param zoomLink The Zoom meeting link for the demo.
 */
  async sendDemoRequestAcceptedEmail(to: string, organizationName: string, zoomLink: string) {
    const subject = `Demo Request Accepted`;
    const html = `
    <p>Dear ${organizationName},</p>
    <p>We're pleased to inform you that your demo request has been accepted.</p>
    <p>We have scheduled a demo meeting for you. Please find the details below:</p>
    <p><strong>Zoom Meeting Link:</strong> <a href="${zoomLink}">${zoomLink}</a></p>
    <p>We will get in touch with you shortly to provide further details.</p>
    <p>If you have any questions, please feel free to contact us.</p>
    <p>Best Regards,<br/>The Team</p>
  `;

    await this.sendMail({ to, subject, html });
  }


  /**
   * Send an email notifying the recipient that their demo request was rejected.
   * @param to Recipient email address.
   * @param organizationName The name of the organization.
   * @param reason The reason for rejection.
   */
  async sendDemoRequestRejectedEmail(to: string, organizationName: string, reason: string) {
    const subject = `Demo Request Rejected`;
    const html = `
      <p>Dear ${organizationName},</p>
      <p>We regret to inform you that your demo request has been rejected.</p>
      <p>Reason for rejection:</p>
      <p>${reason}</p>
      <p>If you believe this is an error or if you have any questions, please reach out to us for further clarification.</p>
      <p>Best Regards,<br/>The Team</p>
    `;

    await this.sendMail({ to, subject, html });
  }

  /**
   * Generic method to send an email.
   * @param options Object containing the email options (to, subject, html).
   */
  private async sendMail(options: { to: string; subject: string; html: string }) {
    try {
      console.log(
        this.configService.get('EMAIL_USER'),
        this.configService.get('EMAIL_PASSWORD')
      )

      await this.transporter.sendMail({
        from: `"No Reply" <${this.configService.get('EMAIL_USER')}>`, // sender address
        to: options.to, // list of receivers
        subject: options.subject, // Subject line
        html: options.html, // html body
      });
    } catch (error) {
      console.log(error)
    }
  }

   async sendOtpEmail(to: string, otp: string, userName: string, expiryMinutes: number = 10): Promise<boolean> {
    // Check if OTP transporter is configured
    if (!this.otpTransporter) {
      console.warn('OTP email transporter not configured. Cannot send OTP email.');
      return false;
    }

    const subject = 'Your OTP Code for Agro App';
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
          .otp-code { 
            font-size: 32px; 
            font-weight: bold; 
            text-align: center; 
            letter-spacing: 5px;
            color: #4CAF50;
            margin: 25px 0;
            padding: 20px;
            background-color: #f0f0f0;
            border-radius: 8px;
            border: 2px dashed #4CAF50;
          }
          .warning { 
            background-color: #fff3cd; 
            border: 1px solid #ffeaa7; 
            color: #856404; 
            padding: 15px; 
            border-radius: 5px; 
            margin: 20px 0;
          }
          .footer { margin-top: 30px; font-size: 12px; color: #666; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Agro App</h1>
            <p>Farmer Onboarding OTP</p>
          </div>
          <div class="content">
            <h2>Hello ${userName},</h2>
            <p>Your One-Time Password (OTP) for farmer account verification is:</p>
            <div class="otp-code">${otp}</div>
            <p>This code will expire in <strong>${expiryMinutes} minutes</strong>.</p>
            
            <div class="warning">
              <p><strong>Important:</strong> Do not share this OTP with anyone. Agro App team will never ask for your OTP.</p>
            </div>
            
            <p>If you didn't request this OTP, please ignore this email or contact support if you're concerned.</p>
            
            <div class="footer">
              <p>Best regards,<br><strong>The Agro App Team</strong></p>
              <p>This is an automated message, please do not reply to this email.</p>
              <p>Need help? Contact support at developers@ohereza.rw</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    try {
      const mailOptions = {
        from: `"Agro App" <${this.configService.get('OTP_EMAIL_SENDER')}>`,
        to: to,
        subject: subject,
        html: html,
      };

      const info = await this.otpTransporter.sendMail(mailOptions);
      console.log(`OTP email sent to ${to}: ${info.messageId}`);
      return true;
    } catch (error) {
      console.error('Failed to send OTP email:', error);
      return false;
    }
  }

  async testOtpEmailConfig(): Promise<boolean> {
    if (!this.otpTransporter) {
      console.error('OTP transporter not configured');
      return false;
    }

    try {
      await this.otpTransporter.verify();
      console.log('✅ OTP email configuration is valid');
      return true;
    } catch (error) {
      console.error('❌ OTP email configuration error:', error.message);
      return false;
    }
  }

}
