require('dotenv').config();

const app = require('./app');
const db = require('./db');

const host = process.env.HOST || '127.0.0.1';
const port = Number(process.env.PORT || 3000);

async function start() {
    try {
        if (!process.env.DB_USER || !process.env.DB_PASSWORD) {
            throw new Error('Set DB_USER and DB_PASSWORD in your local .env file before starting.');
        }
        if (!Number.isInteger(port) || port < 1 || port > 65535) {
            throw new Error('PORT must be a whole number between 1 and 65535.');
        }
        const [settings] = await db.execute('SELECT id FROM store_settings WHERE id = 1');
        if (!settings.length) {
            throw new Error('Run database/schema.sql and database/seed.sql in MySQL Workbench before starting.');
        }
        const server = app.listen(port, host, () => {
            console.log(`Storefront and admin portal running at http://${host}:${port}`);
        });

        server.once('error', async error => {
            console.error(`Could not listen on ${host}:${port}: ${error.message}`);
            await db.end();
            process.exitCode = 1;
        });
        const shutdown = async () => {
            server.close(async () => {
                await db.end();
                process.exit(0);
            });
        };
        process.once('SIGINT', shutdown);
        process.once('SIGTERM', shutdown);
    } catch (error) {
        console.error('Could not start the store. Check .env and confirm the local database setup is complete.');
        console.error(error.message);
        await db.end();
        process.exitCode = 1;
    }
}

start();
