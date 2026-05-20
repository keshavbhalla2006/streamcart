import nodemailer, { Transporter } from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

// A transporter is Nodemailer's connection to the SMTP server
// Think of it as the "mail client" your server uses to send emails
const transporter: Transporter = nodemailer.createTransport({
  host:   process.env.MAILTRAP_HOST,
  port:   Number(process.env.MAILTRAP_PORT),
  auth: {
    user: process.env.MAILTRAP_USER,
    pass: process.env.MAILTRAP_PASS,
  },
});

// Verify connection on startup — fails loudly if credentials are wrong
transporter.verify((error) => {
  if (error) {
    console.error('Mailer connection failed:', error);
  } else {
    console.log('Mailer ready — SMTP connected');
  }
});

export default transporter;