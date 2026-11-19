const { createHash, randomBytes, scrypt: scryptCallback, timingSafeEqual } = require('node:crypto');
const { promisify } = require('node:util');

const scrypt = promisify(scryptCallback);
const SESSION_COOKIE = 'store_admin_session';
const SESSION_TTL_SECONDS = 8 * 60 * 60;

async function hashPassword(password) {
    const salt = randomBytes(16);
    const derivedKey = await scrypt(password, salt, 64, {
        N: 16384,
        r: 8,
        p: 1,
        maxmem: 64 * 1024 * 1024
    });
    return `scrypt$16384$8$1$${salt.toString('hex')}$${derivedKey.toString('hex')}`;
}

async function verifyPassword(password, encodedHash) {
    const [algorithm, n, r, p, saltHex, hashHex] = String(encodedHash).split('$');
    if (algorithm !== 'scrypt' || n !== '16384' || r !== '8' || p !== '1' ||
        !/^[a-f0-9]{32}$/.test(saltHex) || !/^[a-f0-9]{128}$/.test(hashHex)) {
        return false;
    }

    const expected = Buffer.from(hashHex, 'hex');
    const actual = await scrypt(password, Buffer.from(saltHex, 'hex'), expected.length, {
        N: Number(n),
        r: Number(r),
        p: Number(p),
        maxmem: 64 * 1024 * 1024
    });
    return timingSafeEqual(expected, actual);
}

function hashSessionToken(token) {
    return createHash('sha256').update(token).digest('hex');
}

function readSessionToken(cookieHeader = '') {
    const cookie = cookieHeader.split(';').map(value => value.trim())
        .find(value => value.startsWith(`${SESSION_COOKIE}=`));
    return cookie ? cookie.slice(SESSION_COOKIE.length + 1) : '';
}

function sessionCookie(token, secure = false) {
    return `${SESSION_COOKIE}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSION_TTL_SECONDS}${secure ? '; Secure' : ''}`;
}

function clearSessionCookie(secure = false) {
    return `${SESSION_COOKIE}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${secure ? '; Secure' : ''}`;
}

module.exports = {
    SESSION_COOKIE,
    SESSION_TTL_SECONDS,
    clearSessionCookie,
    hashPassword,
    hashSessionToken,
    readSessionToken,
    sessionCookie,
    verifyPassword
};
