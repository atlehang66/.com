const crypto = require('crypto');

function phpUrlencode(str) {
  return encodeURIComponent(str)
    .replace(/%20/g, '+')
    .replace(/!/g, '%21')
    .replace(/'/g, '%27')
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29')
    .replace(/\*/g, '%2A')
    .replace(/~/g, '%7E');
}

function generateSignature(data, passphrase) {
  let pfOutput = '';
  for (const key in data) {
    if (data.hasOwnProperty(key) && data[key] !== '') {
      pfOutput += `${key}=${phpUrlencode(data[key].toString().trim())}&`;
    }
  }
  pfOutput = pfOutput.slice(0, -1);
  if (passphrase) {
    pfOutput += `&passphrase=${phpUrlencode(passphrase.trim())}`;
  }

  console.log('--- STRING BEING SIGNED ---');
  console.log(pfOutput);

  return crypto.createHash('md5').update(pfOutput).digest('hex');
}
function verifyItnSignature(pfData, passphrase) {
  const { signature, ...dataToSign } = pfData;

  const pfParamString = Object.entries(dataToSign)
    .map(([key, val]) => `${key}=${phpUrlencode(val.toString().trim())}`)
    .join('&') + `&passphrase=${phpUrlencode(passphrase.trim())}`;

  console.log('--- ITN STRING BEING SIGNED ---');
  console.log(pfParamString);

  const expectedSig = crypto.createHash('md5').update(pfParamString).digest('hex');
  return { valid: expectedSig === signature, expectedSig, receivedSig: signature };
}

module.exports = { generateSignature, phpUrlencode, verifyItnSignature };