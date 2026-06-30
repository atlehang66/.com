const { generateSignature, verifyItnSignature } = require('../services/payfast');
const { sendOrderConfirmation } = require('../services/emailService');

exports.initiatePayment = (req, res) => {
  const { amount, item_name } = req.body;

  const paymentData = {
    merchant_id: process.env.PAYFAST_MERCHANT_ID,
    merchant_key: process.env.PAYFAST_MERCHANT_KEY,
    return_url: process.env.PAYFAST_RETURN_URL,
    cancel_url: process.env.PAYFAST_CANCEL_URL,
    notify_url: `${process.env.PUBLIC_URL}/api/payments/notify`,
    name_first: req.user.first_name || '',
    email_address: req.user.email,
    m_payment_id: `order_${Date.now()}_${req.user.id}`,
    amount: Number(amount).toFixed(2),
    item_name: item_name.replace(/\s*\(.*?\)/g, '').trim(),
  };

  Object.keys(paymentData).forEach(key => {
    if (paymentData[key] === '' || paymentData[key] === null || paymentData[key] === undefined) {
      delete paymentData[key];
    }
  });

  paymentData.signature = generateSignature(paymentData, process.env.PAYFAST_PASSPHRASE);

  console.log('--- PayFast payload ---');
  Object.entries(paymentData).forEach(([k, v]) => console.log(`${k}=${v}`));

  res.json({
    paymentUrl: 'https://sandbox.payfast.co.za/eng/process',
    paymentData,
  });
};

exports.handleNotify = async (req, res) => {
  const pfData = req.body;

  const { valid } = verifyItnSignature(pfData, process.env.PAYFAST_PASSPHRASE);
  if (!valid) {
    console.error('❌ Signature mismatch — rejecting ITN');
    return res.status(400).send('Invalid signature');
  }

  if (pfData.payment_status === 'COMPLETE') {
    try {
      await sendOrderConfirmation({
        to: pfData.email_address,
        customerName: pfData.name_first || 'Customer',
        orderId: pfData.m_payment_id,
        items: [{ name: pfData.item_name, quantity: 1, price: pfData.amount_gross }],
        total: pfData.amount_gross,
      });
      console.log(`✅ Order confirmation email sent to ${pfData.email_address}`);
    } catch (err) {
      console.error('❌ Failed to send order confirmation email:', err.message);
    }
  }

  res.sendStatus(200);
};