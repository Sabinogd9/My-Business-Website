document.addEventListener('DOMContentLoaded', function () {
  const form = document.querySelector('form');
  const responseMessage = document.createElement('p');
  responseMessage.style.marginTop = '10px';
  form.appendChild(responseMessage);

  form.addEventListener('submit', async function (e) {
    e.preventDefault();

    const name = form.querySelector('input[name="name"]').value.trim();
    const email = form.querySelector('input[name="email"]').value.trim();
    const message = form.querySelector('textarea[name="message"]').value.trim();
    const company = form.querySelector('input[name="company"]')?.value.trim() || ''; // Honeypot (hidden field)

    // 🛡️ Spam honeypot check
    if (company !== '') {
      console.warn('🛑 Spam bot detected (honeypot triggered).');
      return;
    }

    // ✅ Simple validation
    if (!name || !email || !message) {
      responseMessage.textContent = 'Please fill in all fields.';
      responseMessage.style.color = 'red';
      return;
    }

    const emailPattern = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
    if (!emailPattern.test(email)) {
      responseMessage.textContent = 'Invalid email format.';
      responseMessage.style.color = 'red';
      return;
    }

    if (message.length > 1000) {
      responseMessage.textContent = 'Message too long (max 1000 characters).';
      responseMessage.style.color = 'red';
      return;
    }

    try {
      const res = await fetch('https://my-business-website-1.onrender.com/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, message, company })
      });

      const result = await res.json();

      if (res.ok) {
        responseMessage.textContent = `✅ Thank you, ${name}! We'll be in touch soon.`;
        responseMessage.style.color = 'green';
        form.reset();
      } else {
        responseMessage.textContent = result.message || 'Something went wrong.';
        responseMessage.style.color = 'red';
      }

      console.log('📨 Response from server:', result);
    } catch (error) {
      console.error('❌ Error submitting form:', error);
      responseMessage.textContent = 'Error sending message. Please try again.';
      responseMessage.style.color = 'red';
    }
  });
});