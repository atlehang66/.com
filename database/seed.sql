USE `collection`;

INSERT IGNORE INTO categories (slug, name, tagline, sort_order) VALUES
    ('tops', 'Tops', 'Tailored fits in breathable fabrics', 1),
    ('bottoms', 'Bottoms', 'Built for movement, made to last', 2),
    ('outerwear', 'Outerwear', 'Layers for every kind of cold', 3),
    ('footwear', 'Footwear', 'Step out in something built to last', 4),
    ('accessories', 'Accessories', 'Small details, big finish', 5);

INSERT IGNORE INTO products (category_id, title, description, price, image_url, size_type, status, sort_order) VALUES
    ((SELECT id FROM categories WHERE slug = 'tops'), 'Slim Fit Tee', 'Soft cotton tee with a tailored fit.', 18.00, 'images/91D3xTDLwrL._UL1500_.jpg', 'apparel', 'active', 1),
    ((SELECT id FROM categories WHERE slug = 'tops'), 'Oxford Shirt', 'Classic oxford for smart-casual looks.', 42.00, 'images/91D3xTDLwrL._UL1500_.jpg', 'apparel', 'active', 2),
    ((SELECT id FROM categories WHERE slug = 'tops'), 'Henley Tee', 'Three-button henley in brushed cotton.', 22.00, 'images/91D3xTDLwrL._UL1500_.jpg', 'apparel', 'active', 3),
    ((SELECT id FROM categories WHERE slug = 'tops'), 'Flannel Overshirt', 'Brushed flannel for layering in cooler weather.', 48.00, 'images/91D3xTDLwrL._UL1500_.jpg', 'apparel', 'active', 4),
    ((SELECT id FROM categories WHERE slug = 'bottoms'), 'Denim Jeans', 'Classic denim with durable stitching.', 58.00, 'images/US_Loose_Baggy_PLP_Headers__M_569_LOOSESTRAIGHT.jfif', 'bottoms', 'active', 1),
    ((SELECT id FROM categories WHERE slug = 'bottoms'), 'Casual Chinos', 'Versatile chinos in multiple colors.', 46.00, 'images/US_Loose_Baggy_PLP_Headers__M_569_LOOSESTRAIGHT.jfif', 'bottoms', 'active', 2),
    ((SELECT id FROM categories WHERE slug = 'bottoms'), 'Cargo Pants', 'Utility cargo pants with reinforced pockets.', 52.00, 'images/US_Loose_Baggy_PLP_Headers__M_569_LOOSESTRAIGHT.jfif', 'bottoms', 'active', 3),
    ((SELECT id FROM categories WHERE slug = 'bottoms'), 'Relaxed Taper Jeans', 'Roomy through the thigh, tapered at the ankle.', 62.00, 'images/US_Loose_Baggy_PLP_Headers__M_569_LOOSESTRAIGHT.jfif', 'bottoms', 'active', 4),
    ((SELECT id FROM categories WHERE slug = 'outerwear'), 'Leather Jacket', 'Premium leather for an elevated look.', 189.00, 'images/91D3xTDLwrL._UL1500_.jpg', 'outerwear', 'active', 1),
    ((SELECT id FROM categories WHERE slug = 'outerwear'), 'Bomber Jacket', 'Lightweight bomber for daily wear.', 98.00, 'images/91D3xTDLwrL._UL1500_.jpg', 'outerwear', 'active', 2),
    ((SELECT id FROM categories WHERE slug = 'outerwear'), 'Denim Jacket', 'Classic trucker jacket in washed denim.', 84.00, 'images/91D3xTDLwrL._UL1500_.jpg', 'outerwear', 'active', 3),
    ((SELECT id FROM categories WHERE slug = 'outerwear'), 'Quilted Vest', 'Packable insulation for in-between weather.', 76.00, 'images/91D3xTDLwrL._UL1500_.jpg', 'outerwear', 'active', 4),
    ((SELECT id FROM categories WHERE slug = 'footwear'), 'Sneakers', 'Comfortable everyday sneakers.', 64.00, 'images/18959422-high-heels-shoes.jpg', 'footwear', 'active', 1),
    ((SELECT id FROM categories WHERE slug = 'footwear'), 'Loafers', 'Smart-casual loafers in leather.', 72.00, 'images/18959422-high-heels-shoes.jpg', 'footwear', 'active', 2),
    ((SELECT id FROM categories WHERE slug = 'footwear'), 'Chukka Boots', 'Ankle-height boots in suede leather.', 68.00, 'images/18959422-high-heels-shoes.jpg', 'footwear', 'active', 3),
    ((SELECT id FROM categories WHERE slug = 'footwear'), 'Canvas Boots', 'Rugged canvas boots for everyday wear.', 58.00, 'images/18959422-high-heels-shoes.jpg', 'footwear', 'active', 4),
    ((SELECT id FROM categories WHERE slug = 'accessories'), 'Classic Belt', 'Durable leather belt with metal buckle.', 28.00, 'images/18959422-high-heels-shoes.jpg', 'accessory', 'active', 1),
    ((SELECT id FROM categories WHERE slug = 'accessories'), 'Leather Wallet', 'Slim bifold wallet in full-grain leather.', 34.00, 'images/91D3xTDLwrL._UL1500_.jpg', 'accessory', 'active', 2),
    ((SELECT id FROM categories WHERE slug = 'accessories'), 'Wool Beanie', 'Ribbed knit beanie for cold mornings.', 19.00, 'images/91D3xTDLwrL._UL1500_.jpg', 'accessory', 'active', 3),
    ((SELECT id FROM categories WHERE slug = 'accessories'), 'Crew Socks (3-Pack)', 'Breathable cotton-blend crew socks.', 16.00, 'images/91D3xTDLwrL._UL1500_.jpg', 'accessory', 'active', 4);

INSERT IGNORE INTO product_variants (product_id, size_value, stock_quantity)
SELECT p.id, sizes.size_value, NULL
FROM products p
JOIN (
    SELECT 'apparel' AS size_type, 'S' AS size_value UNION ALL
    SELECT 'apparel', 'M' UNION ALL
    SELECT 'apparel', 'L' UNION ALL
    SELECT 'apparel', 'XL' UNION ALL
    SELECT 'bottoms', '30' UNION ALL
    SELECT 'bottoms', '32' UNION ALL
    SELECT 'bottoms', '34' UNION ALL
    SELECT 'bottoms', '36' UNION ALL
    SELECT 'outerwear', 'S' UNION ALL
    SELECT 'outerwear', 'M' UNION ALL
    SELECT 'outerwear', 'L' UNION ALL
    SELECT 'outerwear', 'XL' UNION ALL
    SELECT 'footwear', '41' UNION ALL
    SELECT 'footwear', '42' UNION ALL
    SELECT 'footwear', '43' UNION ALL
    SELECT 'footwear', '44' UNION ALL
    SELECT 'footwear', '45' UNION ALL
    SELECT 'accessory', 'One Size'
) AS sizes ON sizes.size_type = p.size_type;

INSERT IGNORE INTO store_settings (id, brand_sections_enabled) VALUES (1, FALSE);
