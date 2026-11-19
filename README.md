# .com Store Admin

The storefront reads its catalog from a local MySQL database. The private admin portal manages products, categories, brands, inventory, order records, customers, and sales. It is intended for local development; checkout is still a prototype and does not create real orders or process payments.

## Local setup

1. Install Node.js and MySQL Server with MySQL Workbench.
2. Copy `.env.example` to `.env`. Choose a local database password and set `DB_PASSWORD` to it. Do not commit `.env`.
3. In MySQL Workbench, connect with a local MySQL account that can create databases and users. Run `database/schema.sql`, then `database/seed.sql`.
4. Create a restricted account for the app, using the same password you put in `.env`:

   ```sql
   CREATE USER IF NOT EXISTS 'store_admin'@'127.0.0.1' IDENTIFIED BY 'your-local-password';
   GRANT SELECT, INSERT, UPDATE, DELETE ON collection.* TO 'store_admin'@'127.0.0.1';
   ```

5. In PowerShell, from the project folder:

   ```powershell
   Copy-Item .env.example .env
   npm install
   npm run create-admin
   npm start
   ```

   If you already copied `.env.example`, skip the `Copy-Item` command. The admin setup prompts for the single owner's email and password; it does not print the password.
6. Open `http://localhost:3000/admin`. The storefront is at `http://localhost:3000`.

The seeded products start with untracked stock and no assigned brands. Add brands and assign products in the admin. Product images use a path in the project (for example `images/product.jpg`) or an HTTPS URL; image uploads are not included.

Run the focused automated checks with `npm test`.

## Publishing to GitHub Pages

GitHub Pages cannot run the Node/MySQL admin app. After editing products in the local admin, run `npm run export-catalog` to update the public `catalog.json` snapshot, then commit that file with the storefront changes. The static storefront uses that snapshot when the API is unavailable. Product names, prices, descriptions, categories, brands, and image URLs in this file are public. HTTPS image links are hotlinked, so an image host may block external display; use repository image files or a public image host if that happens.

## Scope and safety

- There is no public admin registration. `npm run create-admin` creates the one owner account and can reset its password when run with the same email.
- Admin sessions are stored server-side and use an HttpOnly cookie. Login attempts are rate limited.
- Keep the server bound to `127.0.0.1` for local work. This prototype is not a production deployment: it has no live payment integration, order-creation flow, customer email service, TLS termination, or production hosting configuration.
- Customers, orders, and sales remain empty until a real order flow is built.
