const { generateSignature } = require('../services/payfast');

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

  // Strip empty fields so signed payload matches submitted payload
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
  const { signature, ...dataToSign } = pfData;

  const expectedSig = generateSignature(dataToSign, process.env.PAYFAST_PASSPHRASE);
  if (signature !== expectedSig) {
    return res.status(400).send('Invalid signature');
  }

  // TODO: POST pfData to https://sandbox.payfast.co.za/eng/query/validate
  // TODO: update order to 'paid' in Supabase using pfData.m_payment_id

  res.sendStatus(200);
};