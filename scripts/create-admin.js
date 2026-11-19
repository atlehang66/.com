require('dotenv').config();

const readline = require('node:readline');
const db = require('../server/db');
const { hashPassword } = require('../server/security');

function ask(prompt) {
    const terminal = readline.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise(resolve => terminal.question(prompt, answer => {
        terminal.close();
        resolve(answer.trim());
    }));
}

function askPassword(prompt) {
    const terminal = readline.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise(resolve => terminal.question(prompt, { hideEchoBack: true }, answer => {
        terminal.close();
        resolve(answer);
    }));
}

async function main() {
    if (!process.env.DB_USER || !process.env.DB_PASSWORD) {
        throw new Error('Set DB_USER and DB_PASSWORD in your local .env file before creating the admin account.');
    }
    const email = (await ask('Admin email: ')).toLowerCase();
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new Error('Enter a valid email address.');
    }

    const password = await askPassword('Admin password (12+ characters): ');
    const confirmation = await askPassword('Confirm password: ');
    if (password.length < 12) throw new Error('Use a password with at least 12 characters.');
    if (password !== confirmation) throw new Error('Passwords do not match.');

    const [admins] = await db.execute('SELECT id, email FROM admin_users');
    if (admins.length > 1) throw new Error('Multiple admin accounts exist; remove extras before continuing.');

    const passwordHash = await hashPassword(password);
    if (admins.length === 0) {
        await db.execute('INSERT INTO admin_users (id, email, password_hash) VALUES (1, ?, ?)', [email, passwordHash]);
        console.log('The single admin account has been created.');
    } else if (admins[0].email === email) {
        await db.execute('UPDATE admin_users SET password_hash = ? WHERE id = 1', [passwordHash]);
        await db.execute('DELETE FROM admin_sessions');
        console.log('The existing admin password has been reset.');
    } else {
        throw new Error('Only one admin is allowed. Use the existing admin email to reset its password.');
    }
}

main()
    .catch(error => {
        console.error(error.message);
        process.exitCode = 1;
    })
    .finally(() => db.end());
