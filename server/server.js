const fs = require('fs');
const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors'); // ✅ CORS enabled
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors()); // ✅ Allow cross-origin requests (e.g., from GitHub Pages)
app.use(express.static('public'));
app.use(bodyParser.json());

// ✅ Email transporter config (keep credentials safe in .env in real apps)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'sabinogd8@gmail.com',
    pass: 'kvsr svjf hfou vtis' // ✅ App password (never share publicly)
  }
});

// ✅ Contact form handler
app.post('/api/contact', (req, res) => {
  const { name, email, message, company } = req.body;

  // 🛡️ Honeypot check
  if (company && company.trim() !== '') {
    console.log('🛑 Spam blocked by honeypot.');
    return res.status(200).json({ message: 'Thank you!' }); // Silently ignore spam
  }

  const newContact = {
    name,
    email,
    message,
    date: new Date().toISOString()
  };

  console.log('✅ Received contact:', newContact);

  // ✅ Make sure contacts.json is in the correct folder (adjust if needed)
  const filePath = path.join(__dirname, '../contacts.json');

  // Save contact to JSON file
  fs.readFile(filePath, 'utf8', (err, data) => {
    const contacts = data ? JSON.parse(data) : [];
    contacts.push(newContact);

    fs.writeFile(filePath, JSON.stringify(contacts, null, 2), err => {
      if (err) {
        console.error('❌ Failed to save contact:', err);
        return res.status(500).json({ message: 'Error saving data' });
      }

      // ✅ Send email notification
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
          return res.status(500).json({ message: 'Email sending failed' });
        } else {
          console.log('✅ Email sent:', info.response);
          return res.status(200).json({ message: 'Contact saved and email sent!' });
        }
      });
    });
  });
});

// ✅ View all contacts
app.get('/api/contacts', (req, res) => {
  const filePath = path.join(__dirname, '../contacts.json');
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      console.error('Failed to read contacts:', err);
      return res.status(500).json({ message: 'Error reading contacts' });
    }
    const contacts = JSON.parse(data || '[]');
    res.json(contacts);
  });
});

// ✅ Start server
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});