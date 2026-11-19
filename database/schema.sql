CREATE SCHEMA IF NOT EXISTS `collection`
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_0900_ai_ci;

USE `collection`;

CREATE TABLE IF NOT EXISTS categories (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    slug VARCHAR(80) NOT NULL UNIQUE,
    name VARCHAR(120) NOT NULL,
    tagline VARCHAR(255) NOT NULL DEFAULT '',
    sort_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS brands (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(120) NOT NULL UNIQUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS products (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    category_id INT UNSIGNED NOT NULL,
    brand_id INT UNSIGNED NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    image_url VARCHAR(2048) NOT NULL,
    size_type VARCHAR(30) NOT NULL,
    status ENUM('active', 'draft', 'archived') NOT NULL DEFAULT 'draft',
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_products_category_title (category_id, title),
    KEY idx_products_status_category (status, category_id, sort_order),
    KEY idx_products_brand (brand_id),
    CONSTRAINT fk_products_category FOREIGN KEY (category_id) REFERENCES categories(id),
    CONSTRAINT fk_products_brand FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS product_variants (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    product_id INT UNSIGNED NOT NULL,
    size_value VARCHAR(40) NOT NULL,
    stock_quantity INT UNSIGNED NULL DEFAULT NULL,
    UNIQUE KEY uq_product_variant_size (product_id, size_value),
    CONSTRAINT fk_variants_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS customers (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(254) NOT NULL UNIQUE,
    full_name VARCHAR(200) NOT NULL,
    phone VARCHAR(40) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS orders (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    order_number VARCHAR(40) NOT NULL UNIQUE,
    customer_id INT UNSIGNED NULL,
    status ENUM('pending', 'paid', 'fulfilled', 'cancelled', 'refunded') NOT NULL DEFAULT 'pending',
    currency CHAR(3) NOT NULL DEFAULT 'USD',
    subtotal DECIMAL(10, 2) NOT NULL,
    shipping_total DECIMAL(10, 2) NOT NULL DEFAULT 0,
    total DECIMAL(10, 2) NOT NULL,
    payment_reference VARCHAR(120) NULL,
    shipping_name VARCHAR(200) NOT NULL,
    shipping_address TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_orders_status_created (status, created_at),
    CONSTRAINT fk_orders_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS order_items (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    order_id INT UNSIGNED NOT NULL,
    product_id INT UNSIGNED NULL,
    product_title VARCHAR(200) NOT NULL,
    size_value VARCHAR(40) NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    quantity INT UNSIGNED NOT NULL,
    CONSTRAINT fk_order_items_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    CONSTRAINT fk_order_items_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS admin_users (
    id TINYINT UNSIGNED NOT NULL PRIMARY KEY,
    email VARCHAR(254) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_single_admin CHECK (id = 1)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS admin_sessions (
    token_hash CHAR(64) NOT NULL PRIMARY KEY,
    admin_id TINYINT UNSIGNED NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_admin_sessions_expiry (expires_at),
    CONSTRAINT fk_admin_sessions_user FOREIGN KEY (admin_id) REFERENCES admin_users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS store_settings (
    id TINYINT UNSIGNED NOT NULL PRIMARY KEY,
    brand_sections_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT chk_single_store_settings CHECK (id = 1)
) ENGINE=InnoDB;
