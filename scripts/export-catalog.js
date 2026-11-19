require('dotenv').config();

const fs = require('node:fs/promises');
const path = require('node:path');
const db = require('../server/db');

async function exportCatalog() {
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
    const catalog = {
        categories: Array.from(categories.values()).filter(category => category.products.length),
        brands: Array.from(brands.values()),
        brandSectionsEnabled: Boolean(settings[0] && settings[0].brand_sections_enabled)
    };
    const outputPath = path.resolve(__dirname, '..', 'catalog.json');
    await fs.writeFile(outputPath, `${JSON.stringify(catalog, null, 2)}\n`, 'utf8');
    console.log(`Exported ${catalog.categories.reduce((total, category) => total + category.products.length, 0)} active products to catalog.json.`);
}

if (!process.env.DB_USER || !process.env.DB_PASSWORD) {
    console.error('Set DB_USER and DB_PASSWORD in your local .env file before exporting the catalog.');
    process.exitCode = 1;
    db.end();
} else {
    exportCatalog()
        .catch(error => {
            console.error(`Could not export catalog: ${error.message}`);
            process.exitCode = 1;
        })
        .finally(() => db.end());
}
