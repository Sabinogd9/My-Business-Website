const fs = require('fs');
const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3000;

// ✅ Allowed domains for CORS
const allowedOrigins = ['https://sgdvendingllc.com', 'https://www.sgdvendingllc.com'];

// ✅ Manual CORS headers
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }

  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// ✅ Express CORS middleware fallback
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST']
}));

app.use(bodyParser.json());

// ✅ Serve static files (HTML, CSS, JS, etc.)
app.use(express.static(path.join(__dirname, '..')));

// ✅ Email setup
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  tls: { rejectUnauthorized: false }
});

// 🛡️ Basic Auth middleware
function requireAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) {
    res.set('WWW-Authenticate', 'Basic realm="Admin Area"');
    return res.status(401).send('Authentication required.');
  }

  const [user, pass] = Buffer.from(auth.split(' ')[1], 'base64').toString().split(':');
  if (user === process.env.ADMIN_USER && pass === process.env.ADMIN_PASS) {
    return next();
  }

  res.set('WWW-Authenticate', 'Basic realm="Admin Area"');
  res.status(401).send('Access denied.');
}

// 📩 Save contact + send email
app.post('/api/contact', (req, res) => {
  const { name, email, message, company } = req.body;

  // Honeypot
  if (company && company.trim() !== '') {
    console.log('🛑 Spam bot detected.');
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
    if (!err && data) {
      try {
        contacts = JSON.parse(data);
      } catch (parseErr) {
        console.error('⚠️ Failed to parse contacts:', parseErr);
      }
    }

    contacts.push(newContact);

    fs.writeFile(filePath, JSON.stringify(contacts, null, 2), writeErr => {
      if (writeErr) {
        console.error('❌ Failed to write contact:', writeErr);
        return res.status(500).json({ message: 'Error saving contact' });
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
          console.error('❌ Email send failed:', error);
          return res.status(500).json({ message: 'Email failed', error: error.toString() });
        }

        console.log('✅ Email sent:', info.response);
        res.status(200).json({ message: 'Contact saved and email sent!' });
      });
    });
  });
});

// 🔒 Protected route for viewing contacts
app.get('/api/contacts', requireAuth, (req, res) => {
  const filePath = path.join(__dirname, '../data/contacts.json');

  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      console.error('❌ Could not read contacts:', err);
      return res.status(500).json({ message: 'Error reading contacts' });
    }

    try {
      const contacts = JSON.parse(data || '[]');
      contacts.sort((a, b) => new Date(b.date) - new Date(a.date));
      res.json(contacts);
    } catch (parseErr) {
      console.error('❌ JSON parse error:', parseErr);
      res.status(500).json({ message: 'Error parsing contacts' });
    }
  });
});

// 🔒 Serve admin page
app.get('/view-contacts', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, '../view-contacts.html'));
});

// ✅ Test route (optional)
app.get('/test-email', (req, res) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: process.env.EMAIL_USER,
    subject: 'Test Email',
    text: '✅ This is a test email from your backend.'
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error('❌ Test email failed:', error);
      return res.status(500).send('Email test failed: ' + error.toString());
    }

    console.log('✅ Test email sent:', info.response);
    res.send('✅ Test email sent!');
  });
});

// 🏠 Homepage route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../index.html'));
});

// 🚀 Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running at http://0.0.0.0:${PORT}`);
});