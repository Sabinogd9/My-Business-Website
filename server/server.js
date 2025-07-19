const fs = require('fs');
const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');

const app = express();
const PORT = 3000;

app.use(express.static('public'));
app.use(bodyParser.json());

// Email transporter config
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'sabinogd8@gmail.com',
    pass: 'kvsr svjf hfou vtis' // App password (do NOT share publicly)
  }
});

// Handle contact form submission
app.post('/api/contact', (req, res) => {
  const { name, email, message, company } = req.body;

  // 🛡️ Honeypot check
  if (company && company.trim() !== '') {
    console.log('🛑 Spam blocked by honeypot.');
    return res.status(200).json({ message: 'Thank you!' }); // Silently accept
  }

  const newContact = {
    name,
    email,
    message,
    date: new Date().toISOString()
  };

  console.log('✅ Received contact:', newContact);

  const filePath = path.join(__dirname, '../data/contacts.json');

  // Save contact to JSON file
  fs.readFile(filePath, 'utf8', (err, data) => {
    const contacts = data ? JSON.parse(data) : [];
    contacts.push(newContact);

    fs.writeFile(filePath, JSON.stringify(contacts, null, 2), err => {
      if (err) {
        console.error('❌ Failed to save contact:', err);
        return res.status(500).json({ message: 'Error saving data' });
      }

      // Send email notification
      const mailOptions = {
        from: 'sabinogd8@gmail.com',
        to: 'sabinogd8@gmail.com',
        subject: 'New Contact Form Submission',
        text: `
New contact submission:

Name: ${newContact.name}
Email: ${newContact.email}
Message: ${newContact.message}
Date: ${newContact.date}
        `
      };

      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.error('❌ Email failed:', error);
        } else {
          console.log('✅ Email sent:', info.response);
        }
      });

      res.status(200).json({ message: 'Contact saved and email sent!' });
    });
  });
});

// API to view all contacts
app.get('/api/contacts', (req, res) => {
  const filePath = path.join(__dirname, '../data/contacts.json');
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      console.error('Failed to read contacts:', err);
      return res.status(500).json({ message: 'Error reading contacts' });
    }
    const contacts = JSON.parse(data || '[]');
    res.json(contacts);
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});