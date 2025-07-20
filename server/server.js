const fs = require('fs');
const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3000;

// ✅ Allow only your frontend domain (GoDaddy)
app.use(cors({
  origin: 'https://sgdvendingllc.com'
}));

app.use(express.static(path.join(__dirname, '..')));
app.use(bodyParser.json());

// ✅ Email transporter using Gmail + App Password + TLS for Render
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  tls: {
    rejectUnauthorized: false
  }
});

// 📩 Handle contact form submission
app.post('/api/contact', (req, res) => {
  const { name, email, message, company } = req.body;

  // 🛡️ Spam honeypot check
  if (company && company.trim() !== '') {
    console.log('🛑 Spam blocked.');
    return res.status(200).json({ message: 'Thank you!' });
  }

  const newContact = {
    name,
    email,
    message,
    date: new Date().toISOString()
  };

  console.log('📩 New contact:', newContact);

  const filePath = path.join(__dirname, '../data/contacts.json');

  fs.readFile(filePath, 'utf8', (err, data) => {
    let contacts = [];
    if (data) {
      try {
        contacts = JSON.parse(data);
      } catch (parseErr) {
        console.error('⚠️ Failed to parse contacts:', parseErr);
      }
    }

    contacts.push(newContact);

    fs.writeFile(filePath, JSON.stringify(contacts, null, 2), err => {
      if (err) {
        console.error('❌ Failed to save contact:', err);
        return res.status(500).json({ message: 'Error saving data' });
      }

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: process.env.EMAIL_USER,
        subject: 'New Contact Form Submission',
        text: `
Name: ${newContact.name}
Email: ${newContact.email}
Message: ${newContact.message}
Date: ${newContact.date}
        `
      };

      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.error('❌ Email sending failed:', error);
          return res.status(500).json({ message: 'Email failed', error: error.toString() });
        } else {
          console.log('✅ Email sent:', info.response);
          return res.status(200).json({ message: 'Contact saved and email sent!' });
        }
      });
    });
  });
});

// 🗂️ GET all contacts
app.get('/api/contacts', (req, res) => {
  const filePath = path.join(__dirname, '../data/contacts.json');
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      console.error('❌ Failed to read contacts:', err);
      return res.status(500).json({ message: 'Error reading contacts' });
    }
    const contacts = JSON.parse(data || '[]');
    res.json(contacts);
  });
});

// 🏠 Serve index.html on root path
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../index.html'));
});

// 🧪 Optional: test email endpoint for debugging
app.get('/test-email', (req, res) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: process.env.EMAIL_USER,
    subject: 'Test Email',
    text: 'This is a test email from your server.'
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error('❌ Test email failed:', error);
      return res.status(500).send('Email test failed: ' + error.toString());
    }
    console.log('✅ Test email sent:', info.response);
    res.send('Test email sent successfully!');
  });
});

// 🚀 Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});