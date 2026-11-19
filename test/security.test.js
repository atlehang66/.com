const test = require('node:test');
const assert = require('node:assert/strict');
const {
    hashPassword,
    hashSessionToken,
    verifyPassword
} = require('../server/security');

test('password hashes verify without accepting a different password', async () => {
    const encoded = await hashPassword('a strong local admin password');

    assert.match(encoded, /^scrypt\$16384\$8\$1\$[a-f0-9]{32}\$[a-f0-9]{128}$/);
    assert.equal(await verifyPassword('a strong local admin password', encoded), true);
    assert.equal(await verifyPassword('another password', encoded), false);
    assert.equal(await verifyPassword('a strong local admin password', 'invalid'), false);
});

test('session tokens are stored as deterministic hashes, not plaintext', () => {
    const token = 'private-session-token';
    const hashed = hashSessionToken(token);

    assert.notEqual(hashed, token);
    assert.equal(hashSessionToken(token), hashed);
    assert.match(hashed, /^[a-f0-9]{64}$/);
});
