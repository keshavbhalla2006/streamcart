const nodemailer = require('nodemailer');
const dotenv = require('dotenv');

dotenv.config();

// SMTP transporter
const transporter = nodemailer.createTransport({
  host: process.env.MAILTRAP_HOST,
  port: Number(process.env.MAILTRAP_PORT),
  auth: {
    user: process.env.MAILTRAP_USER,
    pass: process.env.MAILTRAP_PASS,
  },
});

// Verify SMTP connection
transporter.verify((error) => {
  if (error) {
    console.error('Mailer connection failed:', error);
  } else {
    console.log('Mailer ready — SMTP connected');
  }
});

module.exports = transporter;