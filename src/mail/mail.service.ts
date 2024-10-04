import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailerService } from '@nestjs-modules/mailer'; 
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter;

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
  async sendWelcomeEmail(to: string, organizationName: string) {
    const subject = `Welcome to Our Service, ${organizationName}!`;
    const html = `
      <p>Dear ${organizationName},</p>
      <p>Welcome to our service! We're thrilled to have you on board.</p>
      <p>If you have any questions or need assistance, feel free to reach out to us.</p>
      <p>Best Regards,<br/>The Team</p>
    `;

    await this.sendMail({ to, subject, html });
  }

    // email to the organisaiton admin after creation 
    async sendOrganisationWelcomeEmail(to : string , organizationName: string , admin_password : string){
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
      try{
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
      }catch(error){
        console.log(error)
      }
  }

}
