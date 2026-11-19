const path = require('node:path');
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const db = require('./db');
const {
    SESSION_TTL_SECONDS,
    clearSessionCookie,
    hashSessionToken,
    readSessionToken,
    sessionCookie,
    verifyPassword
} = require('./security');

const app = express();
const projectRoot = path.resolve(__dirname, '..');
const adminDirectory = path.join(projectRoot, 'admin');
const productSizes = {
    apparel: ['S', 'M', 'L', 'XL'],
    bottoms: ['30', '32', '34', '36'],
    outerwear: ['S', 'M', 'L', 'XL'],
    footwear: ['41', '42', '43', '44', '45'],
    accessory: ['One Size']
};
const orderStatuses = ['pending', 'paid', 'fulfilled', 'cancelled', 'refunded'];

class HttpError extends Error {
    constructor(status, message) {
        super(message);
        this.status = status;
    }
}

app.disable('x-powered-by');
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", 'data:', 'https:'],
            connectSrc: ["'self'"],
            objectSrc: ["'none'"],
            baseUri: ["'self'"],
            frameAncestors: ["'none'"]
        }
    },
    crossOriginResourcePolicy: { policy: 'cross-origin' }
}));
app.use(express.json({ limit: '100kb' }));

function requireValue(value, label, maxLength) {
    if (typeof value !== 'string' || !value.trim() || value.trim().length > maxLength) {
        throw new HttpError(400, `${label} is required and must be at most ${maxLength} characters.`);
    }
    return value.trim();
}

function positiveId(value, label) {
    const id = Number(value);
    if (!Number.isSafeInteger(id) || id < 1) throw new HttpError(400, `${label} is invalid.`);
    return id;
}

function safeImageUrl(value) {
    const image = requireValue(value, 'Image path', 2048);
    let url;
    try {
        url = new URL(image, 'http://storefront.local');
    } catch {
        throw new HttpError(400, 'Image path must be a relative path or an HTTPS URL.');
    }
    if (url.protocol === 'http:' && url.hostname === 'storefront.local') return image;
    if (url.protocol === 'https:') return image;
    throw new HttpError(400, 'Image path must be a relative path or an HTTPS URL.');
}

function slugify(value) {
    const slug = value.normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
    if (!slug) throw new HttpError(400, 'Name must include letters or numbers.');
    return slug.slice(0, 80);
}

function productInput(body = {}) {
    const title = requireValue(body.title, 'Title', 200);
    const description = requireValue(body.description, 'Description', 10000);
    const imageUrl = safeImageUrl(body.imageUrl);
    const price = Number(body.price);
    const categoryId = positiveId(body.categoryId, 'Category');
    const brandId = body.brandId === '' || body.brandId === null || body.brandId === undefined
        ? null
        : positiveId(body.brandId, 'Brand');
    const sizeType = body.sizeType;
    const status = body.status || 'draft';
    const sortOrder = body.sortOrder === undefined ? 0 : Number(body.sortOrder);

    if (!Number.isFinite(price) || price < 0 || price > 10000000) {
        throw new HttpError(400, 'Price must be a non-negative amount.');
    }
    if (!Object.prototype.hasOwnProperty.call(productSizes, sizeType)) {
        throw new HttpError(400, 'Choose a supported size type.');
    }
    if (!['active', 'draft', 'archived'].includes(status)) {
        throw new HttpError(400, 'Choose a valid product status.');
    }
    if (!Number.isSafeInteger(sortOrder) || sortOrder < 0) {
        throw new HttpError(400, 'Sort order must be a non-negative whole number.');
    }
    return { title, description, imageUrl, price, categoryId, brandId, sizeType, status, sortOrder };
}

async function validateProductRelations(product) {
    const [categories] = await db.execute('SELECT id FROM categories WHERE id = ? AND is_active = TRUE', [product.categoryId]);
    if (!categories.length) throw new HttpError(400, 'Choose an active category.');
    if (product.brandId !== null) {
        const [brands] = await db.execute('SELECT id FROM brands WHERE id = ? AND is_active = TRUE', [product.brandId]);
        if (!brands.length) throw new HttpError(400, 'Choose an active brand.');
    }
}

async function addSizeVariants(connection, productId, sizeType) {
    for (const sizeValue of productSizes[sizeType]) {
        await connection.execute(
            'INSERT INTO product_variants (product_id, size_value) VALUES (?, ?)',
            [productId, sizeValue]
        );
    }
}

function cookieSecure() {
    return process.env.NODE_ENV === 'production';
}

async function findAdmin(req) {
    const token = readSessionToken(req.headers.cookie);
    if (!token) return null;
    const [rows] = await db.execute(
        `SELECT admins.id, admins.email
         FROM admin_sessions
         JOIN admin_users AS admins ON admins.id = admin_sessions.admin_id
         WHERE admin_sessions.token_hash = ? AND admin_sessions.expires_at > UTC_TIMESTAMP()`,
        [hashSessionToken(token)]
    );
    return rows[0] || null;
}

function sameOrigin(req, res, next) {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
    const requestOrigin = req.get('origin');
    const expectedOrigin = process.env.APP_ORIGIN || `http://${process.env.HOST || '127.0.0.1'}:${process.env.PORT || 3000}`;
    try {
        if (!requestOrigin || new URL(requestOrigin).origin !== new URL(expectedOrigin).origin) {
            return res.status(403).json({ error: 'Request origin was rejected.' });
        }
    } catch {
        return res.status(403).json({ error: 'Request origin was rejected.' });
    }
    next();
}

async function requireAdminApi(req, res, next) {
    try {
        req.admin = await findAdmin(req);
        if (!req.admin) return res.status(401).json({ error: 'Sign in to continue.' });
        next();
    } catch (error) {
        next(error);
    }
}

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Too many sign-in attempts. Try again in 15 minutes.' }
});

app.use('/api', sameOrigin);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.post('/api/auth/login', loginLimiter, async (req, res, next) => {
    try {
        const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
        const password = typeof req.body.password === 'string' ? req.body.password : '';
        const [admins] = await db.execute(
            'SELECT id, email, password_hash FROM admin_users WHERE id = 1 AND email = ?',
            [email]
        );
        if (!admins.length || !(await verifyPassword(password, admins[0].password_hash))) {
            return res.status(401).json({ error: 'Email or password is incorrect.' });
        }

        const token = require('node:crypto').randomBytes(32).toString('base64url');
        const tokenHash = hashSessionToken(token);
        await db.execute('DELETE FROM admin_sessions WHERE expires_at <= UTC_TIMESTAMP()');
        await db.execute(
            `INSERT INTO admin_sessions (token_hash, admin_id, expires_at)
             VALUES (?, 1, DATE_ADD(UTC_TIMESTAMP(), INTERVAL ? SECOND))`,
            [tokenHash, SESSION_TTL_SECONDS]
        );
        res.setHeader('Set-Cookie', sessionCookie(token, cookieSecure()));
        res.json({ email: admins[0].email });
    } catch (error) {
        next(error);
    }
});

app.post('/api/auth/logout', async (req, res, next) => {
    try {
        const token = readSessionToken(req.headers.cookie);
        if (token) await db.execute('DELETE FROM admin_sessions WHERE token_hash = ?', [hashSessionToken(token)]);
        res.setHeader('Set-Cookie', clearSessionCookie(cookieSecure()));
        res.json({ ok: true });
    } catch (error) {
        next(error);
    }
});

app.get('/api/products', async (req, res, next) => {
    try {
        const [rows] = await db.execute(
            `SELECT
                c.id AS categoryId, c.slug AS categorySlug, c.name AS categoryName,
                c.tagline AS categoryTagline, c.sort_order AS categoryOrder,
                p.id AS productId, p.title AS productName, p.price, p.description,
                p.image_url AS image, p.size_type AS sizeType, p.sort_order AS productOrder,
                b.id AS brandId, b.name AS brandName
             FROM categories AS c
             LEFT JOIN products AS p ON p.category_id = c.id AND p.status = 'active'
             LEFT JOIN brands AS b ON b.id = p.brand_id AND b.is_active = TRUE
             WHERE c.is_active = TRUE
             ORDER BY c.sort_order, p.sort_order, p.id`
        );
        const categories = new Map();
        const brands = new Map();
        rows.forEach(row => {
            if (!categories.has(row.categoryId)) {
                categories.set(row.categoryId, {
                    id: row.categorySlug,
                    name: row.categoryName,
                    tagline: row.categoryTagline,
                    products: []
                });
            }
            if (row.productId === null) return;
            categories.get(row.categoryId).products.push({
                id: row.productId,
                categoryId: row.categorySlug,
                name: row.productName,
                price: Number(row.price),
                description: row.description,
                image: row.image,
                sizeType: row.sizeType,
                brandId: row.brandId,
                brandName: row.brandName
            });
            if (row.brandId !== null) brands.set(row.brandId, { id: row.brandId, name: row.brandName });
        });

        const [settings] = await db.execute('SELECT brand_sections_enabled FROM store_settings WHERE id = 1');
        res.json({
            categories: Array.from(categories.values()).filter(category => category.products.length),
            brands: Array.from(brands.values()),
            brandSectionsEnabled: Boolean(settings[0] && settings[0].brand_sections_enabled)
        });
    } catch (error) {
        next(error);
    }
});

app.use('/api/admin', requireAdminApi);

app.get('/api/admin/me', (req, res) => res.json({ email: req.admin.email }));

app.get('/api/admin/summary', async (req, res, next) => {
    try {
        const [[products]] = await db.execute("SELECT COUNT(*) AS count FROM products WHERE status = 'active'");
        const [[orders]] = await db.execute('SELECT COUNT(*) AS count FROM orders');
        const [[customers]] = await db.execute('SELECT COUNT(*) AS count FROM customers');
        const [[sales]] = await db.execute("SELECT COALESCE(SUM(total), 0) AS revenue FROM orders WHERE status IN ('paid', 'fulfilled')");
        res.json({
            products: products.count,
            orders: orders.count,
            customers: customers.count,
            revenue: Number(sales.revenue)
        });
    } catch (error) {
        next(error);
    }
});

app.get('/api/admin/settings', async (req, res, next) => {
    try {
        const [rows] = await db.execute('SELECT brand_sections_enabled AS brandSectionsEnabled FROM store_settings WHERE id = 1');
        res.json({ brandSectionsEnabled: Boolean(rows[0] && rows[0].brandSectionsEnabled) });
    } catch (error) {
        next(error);
    }
});

app.patch('/api/admin/settings', async (req, res, next) => {
    try {
        if (typeof req.body.brandSectionsEnabled !== 'boolean') {
            throw new HttpError(400, 'Choose whether products should be grouped by brand.');
        }
        await db.execute('UPDATE store_settings SET brand_sections_enabled = ? WHERE id = 1', [req.body.brandSectionsEnabled]);
        res.json({ brandSectionsEnabled: req.body.brandSectionsEnabled });
    } catch (error) {
        next(error);
    }
});

app.get('/api/admin/products', async (req, res, next) => {
    try {
        const [rows] = await db.execute(
            `SELECT p.id, p.title, p.description, p.price, p.image_url AS imageUrl,
                p.size_type AS sizeType, p.status, p.sort_order AS sortOrder,
                c.id AS categoryId, c.name AS categoryName,
                b.id AS brandId, b.name AS brandName
             FROM products AS p
             JOIN categories AS c ON c.id = p.category_id
             LEFT JOIN brands AS b ON b.id = p.brand_id
             ORDER BY p.sort_order, p.title`
        );
        res.json(rows);
    } catch (error) {
        next(error);
    }
});

app.post('/api/admin/products', async (req, res, next) => {
    const connection = await db.getConnection();
    let transactionStarted = false;
    try {
        const product = productInput(req.body);
        await validateProductRelations(product);
        await connection.beginTransaction();
        transactionStarted = true;
        const [result] = await connection.execute(
            `INSERT INTO products
                (category_id, brand_id, title, description, price, image_url, size_type, status, sort_order)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [product.categoryId, product.brandId, product.title, product.description, product.price,
                product.imageUrl, product.sizeType, product.status, product.sortOrder]
        );
        await addSizeVariants(connection, result.insertId, product.sizeType);
        await connection.commit();
        transactionStarted = false;
        res.status(201).json({ id: result.insertId });
    } catch (error) {
        if (transactionStarted) await connection.rollback();
        next(error);
    } finally {
        connection.release();
    }
});

app.put('/api/admin/products/:id', async (req, res, next) => {
    const connection = await db.getConnection();
    let transactionStarted = false;
    try {
        const id = positiveId(req.params.id, 'Product');
        const product = productInput(req.body);
        await validateProductRelations(product);
        await connection.beginTransaction();
        transactionStarted = true;
        const [existingRows] = await connection.execute('SELECT size_type FROM products WHERE id = ? FOR UPDATE', [id]);
        if (!existingRows.length) throw new HttpError(404, 'Product not found.');

        if (existingRows[0].size_type !== product.sizeType) {
            const [trackedRows] = await connection.execute(
                'SELECT COUNT(*) AS count FROM product_variants WHERE product_id = ? AND stock_quantity IS NOT NULL',
                [id]
            );
            if (trackedRows[0].count) throw new HttpError(409, 'Size type cannot change while stock is recorded for this product.');
            await connection.execute('DELETE FROM product_variants WHERE product_id = ?', [id]);
            await addSizeVariants(connection, id, product.sizeType);
        }

        await connection.execute(
            `UPDATE products
             SET category_id = ?, brand_id = ?, title = ?, description = ?, price = ?,
                 image_url = ?, size_type = ?, status = ?, sort_order = ?
             WHERE id = ?`,
            [product.categoryId, product.brandId, product.title, product.description, product.price,
                product.imageUrl, product.sizeType, product.status, product.sortOrder, id]
        );
        await connection.commit();
        transactionStarted = false;
        res.json({ id });
    } catch (error) {
        if (transactionStarted) await connection.rollback();
        next(error);
    } finally {
        connection.release();
    }
});

app.delete('/api/admin/products/:id', async (req, res, next) => {
    try {
        const id = positiveId(req.params.id, 'Product');
        const [result] = await db.execute('DELETE FROM products WHERE id = ?', [id]);
        if (!result.affectedRows) throw new HttpError(404, 'Product not found.');
        res.status(204).end();
    } catch (error) {
        next(error);
    }
});

app.get('/api/admin/categories', async (req, res, next) => {
    try {
        const [rows] = await db.execute(
            `SELECT c.id, c.slug, c.name, c.tagline, c.sort_order AS sortOrder, c.is_active AS active,
                COUNT(p.id) AS productCount
             FROM categories AS c
             LEFT JOIN products AS p ON p.category_id = c.id
             GROUP BY c.id
             ORDER BY c.sort_order, c.name`
        );
        res.json(rows);
    } catch (error) {
        next(error);
    }
});

app.post('/api/admin/categories', async (req, res, next) => {
    try {
        const name = requireValue(req.body.name, 'Category name', 120);
        const tagline = typeof req.body.tagline === 'string' ? req.body.tagline.trim().slice(0, 255) : '';
        const sortOrder = Number(req.body.sortOrder || 0);
        if (!Number.isSafeInteger(sortOrder) || sortOrder < 0) throw new HttpError(400, 'Sort order must be a non-negative whole number.');
        const [result] = await db.execute(
            'INSERT INTO categories (slug, name, tagline, sort_order) VALUES (?, ?, ?, ?)',
            [slugify(name), name, tagline, sortOrder]
        );
        res.status(201).json({ id: result.insertId });
    } catch (error) {
        next(error);
    }
});

app.put('/api/admin/categories/:id', async (req, res, next) => {
    try {
        const id = positiveId(req.params.id, 'Category');
        const name = requireValue(req.body.name, 'Category name', 120);
        const tagline = typeof req.body.tagline === 'string' ? req.body.tagline.trim().slice(0, 255) : '';
        if (typeof req.body.active !== 'boolean') throw new HttpError(400, 'Choose whether the category is active.');
        const sortOrder = Number(req.body.sortOrder || 0);
        if (!Number.isSafeInteger(sortOrder) || sortOrder < 0) throw new HttpError(400, 'Sort order must be a non-negative whole number.');
        const [result] = await db.execute(
            'UPDATE categories SET name = ?, tagline = ?, is_active = ?, sort_order = ? WHERE id = ?',
            [name, tagline, req.body.active, sortOrder, id]
        );
        if (!result.affectedRows) {
            const [rows] = await db.execute('SELECT id FROM categories WHERE id = ?', [id]);
            if (!rows.length) throw new HttpError(404, 'Category not found.');
        }
        res.json({ id });
    } catch (error) {
        next(error);
    }
});

app.delete('/api/admin/categories/:id', async (req, res, next) => {
    try {
        const id = positiveId(req.params.id, 'Category');
        const [products] = await db.execute('SELECT id FROM products WHERE category_id = ? LIMIT 1', [id]);
        if (products.length) throw new HttpError(409, "Move or delete this category's products before removing it.");
        const [result] = await db.execute('DELETE FROM categories WHERE id = ?', [id]);
        if (!result.affectedRows) throw new HttpError(404, 'Category not found.');
        res.status(204).end();
    } catch (error) {
        next(error);
    }
});

app.get('/api/admin/brands', async (req, res, next) => {
    try {
        const [rows] = await db.execute(
            `SELECT b.id, b.name, b.is_active AS active,
                COUNT(p.id) AS productCount
             FROM brands AS b
             LEFT JOIN products AS p ON p.brand_id = b.id
             GROUP BY b.id
             ORDER BY b.name`
        );
        res.json(rows);
    } catch (error) {
        next(error);
    }
});

app.post('/api/admin/brands', async (req, res, next) => {
    try {
        const name = requireValue(req.body.name, 'Brand name', 120);
        const [result] = await db.execute('INSERT INTO brands (name) VALUES (?)', [name]);
        res.status(201).json({ id: result.insertId });
    } catch (error) {
        next(error);
    }
});

app.put('/api/admin/brands/:id', async (req, res, next) => {
    try {
        const id = positiveId(req.params.id, 'Brand');
        const name = requireValue(req.body.name, 'Brand name', 120);
        if (typeof req.body.active !== 'boolean') throw new HttpError(400, 'Choose whether the brand is active.');
        const [result] = await db.execute(
            'UPDATE brands SET name = ?, is_active = ? WHERE id = ?',
            [name, req.body.active, id]
        );
        if (!result.affectedRows) {
            const [rows] = await db.execute('SELECT id FROM brands WHERE id = ?', [id]);
            if (!rows.length) throw new HttpError(404, 'Brand not found.');
        }
        res.json({ id });
    } catch (error) {
        next(error);
    }
});

app.delete('/api/admin/brands/:id', async (req, res, next) => {
    try {
        const id = positiveId(req.params.id, 'Brand');
        const [result] = await db.execute('DELETE FROM brands WHERE id = ?', [id]);
        if (!result.affectedRows) throw new HttpError(404, 'Brand not found.');
        res.status(204).end();
    } catch (error) {
        next(error);
    }
});

app.get('/api/admin/inventory', async (req, res, next) => {
    try {
        const [rows] = await db.execute(
            `SELECT v.id, v.size_value AS size, v.stock_quantity AS quantity,
                p.id AS productId, p.title AS product,
                c.name AS category, b.name AS brand
             FROM product_variants AS v
             JOIN products AS p ON p.id = v.product_id
             JOIN categories AS c ON c.id = p.category_id
             LEFT JOIN brands AS b ON b.id = p.brand_id
             ORDER BY p.title, v.id`
        );
        res.json(rows);
    } catch (error) {
        next(error);
    }
});

app.patch('/api/admin/inventory/:id', async (req, res, next) => {
    try {
        const id = positiveId(req.params.id, 'Inventory row');
        const quantity = req.body.quantity;
        if (quantity !== null && (!Number.isSafeInteger(quantity) || quantity < 0 || quantity > 2147483647)) {
            throw new HttpError(400, 'Stock must be a non-negative whole number or null for untracked.');
        }
        const [result] = await db.execute('UPDATE product_variants SET stock_quantity = ? WHERE id = ?', [quantity, id]);
        if (!result.affectedRows) {
            const [rows] = await db.execute('SELECT id FROM product_variants WHERE id = ?', [id]);
            if (!rows.length) throw new HttpError(404, 'Inventory row not found.');
        }
        res.json({ id, quantity });
    } catch (error) {
        next(error);
    }
});

app.get('/api/admin/orders', async (req, res, next) => {
    try {
        const [rows] = await db.execute(
            `SELECT o.id, o.order_number AS orderNumber, o.status, o.currency, o.total,
                o.shipping_name AS customer, c.email, o.created_at AS createdAt
             FROM orders AS o
             LEFT JOIN customers AS c ON c.id = o.customer_id
             ORDER BY o.created_at DESC
             LIMIT 500`
        );
        res.json(rows);
    } catch (error) {
        next(error);
    }
});

app.patch('/api/admin/orders/:id', async (req, res, next) => {
    try {
        const id = positiveId(req.params.id, 'Order');
        if (!orderStatuses.includes(req.body.status)) throw new HttpError(400, 'Choose a valid order status.');
        const [result] = await db.execute('UPDATE orders SET status = ? WHERE id = ?', [req.body.status, id]);
        if (!result.affectedRows) {
            const [rows] = await db.execute('SELECT id FROM orders WHERE id = ?', [id]);
            if (!rows.length) throw new HttpError(404, 'Order not found.');
        }
        res.json({ id, status: req.body.status });
    } catch (error) {
        next(error);
    }
});

app.get('/api/admin/customers', async (req, res, next) => {
    try {
        const [rows] = await db.execute(
            `SELECT c.id, c.email, c.full_name AS name, c.phone, c.created_at AS createdAt,
                COUNT(o.id) AS orderCount, COALESCE(SUM(CASE WHEN o.status IN ('paid', 'fulfilled') THEN o.total ELSE 0 END), 0) AS spend
             FROM customers AS c
             LEFT JOIN orders AS o ON o.customer_id = c.id
             GROUP BY c.id
             ORDER BY c.created_at DESC
             LIMIT 500`
        );
        res.json(rows);
    } catch (error) {
        next(error);
    }
});

app.get('/api/admin/sales', async (req, res, next) => {
    try {
        const [rows] = await db.execute(
            `SELECT DATE_FORMAT(created_at, '%Y-%m') AS month,
                COUNT(*) AS orders, SUM(total) AS revenue
             FROM orders
             WHERE status IN ('paid', 'fulfilled')
               AND created_at >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL 12 MONTH)
             GROUP BY DATE_FORMAT(created_at, '%Y-%m')
             ORDER BY month DESC`
        );
        res.json(rows);
    } catch (error) {
        next(error);
    }
});

app.get('/admin/login', (req, res) => {
    res.set('Cache-Control', 'no-store');
    res.sendFile('login.html', { root: adminDirectory });
});

app.get(['/admin', '/admin/'], async (req, res, next) => {
    try {
        if (!await findAdmin(req)) return res.redirect('/admin/login');
        res.set('Cache-Control', 'no-store');
        res.sendFile('index.html', { root: adminDirectory });
    } catch (error) {
        next(error);
    }
});

app.use('/admin-assets', (req, res, next) => {
    if (!['/admin.css', '/app.js', '/login.js'].includes(req.path)) return res.sendStatus(404);
    next();
}, express.static(adminDirectory, { index: false, dotfiles: 'deny' }));

app.use((req, res, next) => {
    const blocked = ['/admin/', '/server/', '/database/', '/scripts/', '/node_modules/'];
    if (blocked.some(prefix => req.path.startsWith(prefix)) ||
        ['/package.json', '/package-lock.json', '/server.js'].includes(req.path)) {
        return res.sendStatus(404);
    }
    next();
});

app.use(express.static(projectRoot, { index: 'index.html', dotfiles: 'deny', maxAge: 0 }));
app.use('/api', (req, res) => res.status(404).json({ error: 'API route not found.' }));
app.use((req, res) => res.status(404).send('Not found.'));

app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    const status = error.status || (error.code === 'ER_DUP_ENTRY' ? 409 : 500);
    if (status >= 500) console.error(error);
    const message = status >= 500 ? 'A server error occurred.' : error.message;
    res.status(status).json({ error: message });
});

module.exports = app;
