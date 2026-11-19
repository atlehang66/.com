const test = require('node:test');
const assert = require('node:assert/strict');

const dbPath = require.resolve('../server/db');
require.cache[dbPath] = {
    id: dbPath,
    filename: dbPath,
    loaded: true,
    exports: {
        execute: async () => { throw new Error('Unauthenticated requests must not query MySQL.'); }
    }
};

const app = require('../server/app');
let server;
let origin;

test.before(async () => {
    server = app.listen(0, '127.0.0.1');
    await new Promise((resolve, reject) => {
        server.once('listening', resolve);
        server.once('error', reject);
    });
    origin = `http://127.0.0.1:${server.address().port}`;
});

test.after(async () => {
    if (server) await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
});

test('admin pages and APIs stay private without a session', async () => {
    const dashboard = await fetch(`${origin}/admin`, { redirect: 'manual' });
    assert.equal(dashboard.status, 302);
    assert.equal(dashboard.headers.get('location'), '/admin/login');

    const login = await fetch(`${origin}/admin/login`);
    assert.equal(login.status, 200);
    assert.match(await login.text(), /name="password"/);

    const htmlFile = await fetch(`${origin}/admin/index.html`);
    assert.equal(htmlFile.status, 404);

    const serverFile = await fetch(`${origin}/server/app.js`);
    assert.equal(serverFile.status, 404);

    const adminApi = await fetch(`${origin}/api/admin/products`);
    assert.equal(adminApi.status, 401);
    assert.deepEqual(await adminApi.json(), { error: 'Sign in to continue.' });
});
