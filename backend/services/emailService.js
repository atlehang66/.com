const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

async function sendOrderConfirmation({ to, customerName, orderId, items, total }) {
  const itemRows = items.map(item => `
    <tr>
      <td style="padding:8px;border-bottom:1px solid #eee;">${item.name}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;text-align:center;">${item.quantity}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">R${Number(item.price).toFixed(2)}</td>
    </tr>`).join('');

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:auto;color:#333;">
      <h2 style="background:#111;color:#fff;padding:20px;margin:0;">Order Confirmed ✅</h2>
      <div style="padding:24px;">
        <p>Hi ${customerName},</p>
        <p>Thanks for your order! Here's your receipt:</p>

        <p><strong>Order ID:</strong> ${orderId}</p>

        <table style="width:100%;border-collapse:collapse;margin:16px 0;">
          <thead>
            <tr style="background:#f5f5f5;">
              <th style="padding:8px;text-align:left;">Item</th>
              <th style="padding:8px;text-align:center;">Qty</th>
              <th style="padding:8px;text-align:right;">Price</th>
            </tr>
          </thead>
          <tbody>${itemRows}</tbody>
          <tfoot>
            <tr>
              <td colspan="2" style="padding:8px;font-weight:bold;">Total</td>
              <td style="padding:8px;text-align:right;font-weight:bold;">R${Number(total).toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>

        <p>We'll notify you once your order is on its way.</p>
        <p>— The Team</p>
      </div>
    </div>`;

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject: `Order Confirmed — #${orderId}`,
    html,
  });
}

module.exports = { sendOrderConfirmation };