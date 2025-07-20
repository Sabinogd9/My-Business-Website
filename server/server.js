const fs = require('fs');
const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3000;

// ✅ CORS: Allow only your domain(s)
app.use(cors({
  origin: ['https://sgdvendingllc.com', 'https://www.sgdvendingllc.com'],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}));

// ✅ Handle CORS preflight manually (important for some setups)
app.options('/api/contact', cors());

// ✅ Serve static files (HTML/CSS/JS)
app.use(express.static(path.join(__dirname, '..')));
app.use(bodyParser.json());

// ✅ Email transporter using Gmail App Password (Render secrets)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  tls: {
    rejectUnauthorized: false // Render workaround
  }
});

// 📩 POST /api/contact - handle form submission
app.post('/api/contact', (req, res) => {
  const { name, email, message, company } = req.body;

  // 🛡️ Honeypot spam check
  if (company && company.trim() !== '') {
    console.log('🛑 Honeypot triggered — spam bot blocked.');
    return res.status(200).json({ message: 'Thank you!' });
  }

  if (!name || !email || !message) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  const newContact = {
    name,
    email,
    message,
    date: new Date().toISOString()
  };

  const filePath = path.join(__dirname, '../data/contacts.json');

  fs.readFile(filePath, 'utf8', (err, data) => {
    let contacts = [];
    if (data) {
      try {
        contacts = JSON.parse(data);
      } catch (parseErr) {
        console.error('⚠️ Failed to parse contacts.json:', parseErr);
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
Message:
${newContact.message}

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

// 🗂️ GET /api/contacts - retrieve all contacts
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

// 🧪 GET /test-email - verify email works
app.get('/test-email', (req, res) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: process.env.EMAIL_USER,
    subject: 'Test Email',
    text: '✅ This is a test email from your Render backend.'
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error('❌ Test email failed:', error);
      return res.status(500).send('Email test failed: ' + error.toString());
    }
    console.log('✅ Test email sent:', info.response);
    res.send('✅ Test email sent successfully!');
  });
});

// 🏠 Serve index.html at root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../index.html'));
});

// 🚀 Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});