-- ============================================================================
-- CONFIGURATION DASHBOARD - DATABASE QUERIES
-- ============================================================================
-- This file contains all SQL queries needed to populate the Configuration Dashboard
-- Use these queries in your backend API endpoints
-- ============================================================================

-- ============================================================================
-- 1. STATISTICS CARDS (8 Cards)
-- ============================================================================

-- Get all statistics in a single query for better performance
SELECT 
    (SELECT COUNT(*) FROM categories WHERE status = 'Active') as active_categories,
    (SELECT COUNT(*) FROM sub_categories WHERE status = 'Active') as sub_categories,
    (SELECT COUNT(*) FROM brands WHERE status = 'Active') as active_brands,
    (SELECT COUNT(*) FROM supplier WHERE status = 'Active') as active_suppliers,
    (SELECT COUNT(*) FROM product WHERE status = 'Active' AND is_deleted = false) as active_products,
    (SELECT COUNT(*) FROM warehouse WHERE status = 'Active') as warehouses,
    (SELECT COUNT(*) FROM aisle WHERE status = 'Active') as aisles,
    (SELECT COUNT(DISTINCT sku) FROM product WHERE is_deleted = false) as total_skus;

-- Individual queries if needed:

-- Active Categories
SELECT COUNT(*) as count FROM categories WHERE status = 'Active';

-- Sub-Categories (all active)
SELECT COUNT(*) as count FROM sub_categories WHERE status = 'Active';

-- Active Brands
SELECT COUNT(*) as count FROM brands WHERE status = 'Active';

-- Active Suppliers
SELECT COUNT(*) as count FROM supplier WHERE status = 'Active';

-- Active Products (not deleted)
SELECT COUNT(*) as count FROM product WHERE status = 'Active' AND is_deleted = false;

-- Warehouses
SELECT COUNT(*) as count FROM warehouse WHERE status = 'Active';

-- Aisles/Zones
SELECT COUNT(*) as count FROM aisle WHERE status = 'Active';

-- Total Unique SKUs
SELECT COUNT(DISTINCT sku) as count FROM product WHERE is_deleted = false;


-- ============================================================================
-- 2. CATEGORY DISTRIBUTION (Chart Data)
-- ============================================================================

-- Get product count by category with percentage
SELECT 
    c.name as category_name,
    COUNT(p.oid) as product_count,
    ROUND(COUNT(p.oid) * 100.0 / (SELECT COUNT(*) FROM product WHERE status = 'Active' AND is_deleted = false), 2) as percentage
FROM categories c
LEFT JOIN product p ON p.category_oid = c.oid AND p.status = 'Active' AND p.is_deleted = false
WHERE c.status = 'Active'
GROUP BY c.oid, c.name
ORDER BY product_count DESC
LIMIT 6;


-- ============================================================================
-- 3. TOP SUPPLIERS BY PRODUCT COUNT
-- ============================================================================

-- Get top 5 suppliers with most products
SELECT 
    s.name as supplier_name,
    COUNT(p.oid) as product_count
FROM supplier s
LEFT JOIN product p ON p.supplier_oid = s.oid AND p.status = 'Active' AND p.is_deleted = false
WHERE s.status = 'Active'
GROUP BY s.oid, s.name
ORDER BY product_count DESC
LIMIT 5;

-- Get "Others" count for remaining suppliers
SELECT 
    'Others' as supplier_name,
    SUM(product_count) as product_count
FROM (
    SELECT COUNT(p.oid) as product_count
    FROM supplier s
    LEFT JOIN product p ON p.supplier_oid = s.oid AND p.status = 'Active' AND p.is_deleted = false
    WHERE s.status = 'Active'
    GROUP BY s.oid
    ORDER BY product_count DESC
    OFFSET 5
) as remaining_suppliers;


-- ============================================================================
-- 4. RECENT ACTIVITIES
-- ============================================================================

-- Get last 10 configuration activities with user info
SELECT 
    a.title,
    a.description,
    a.icon,
    a.activity_type,
    a.feature_name,
    a.created_on,
    l.name as created_by_name,
    CASE 
        WHEN a.created_on > NOW() - INTERVAL '1 hour' THEN EXTRACT(EPOCH FROM (NOW() - a.created_on))/60 || ' minutes ago'
        WHEN a.created_on > NOW() - INTERVAL '1 day' THEN EXTRACT(EPOCH FROM (NOW() - a.created_on))/3600 || ' hours ago'
        ELSE EXTRACT(EPOCH FROM (NOW() - a.created_on))/86400 || ' days ago'
    END as time_ago
FROM audit_log a
JOIN login l ON a.created_by = l.oid
WHERE a.feature_name IN ('categories', 'sub_categories', 'brands', 'suppliers', 'products', 'warehouses', 'aisles')
ORDER BY a.created_on DESC
LIMIT 10;


-- ============================================================================
-- 5. CONFIGURATION INSIGHTS (Dynamic Calculations)
-- ============================================================================

-- Get all insights in one query
SELECT 
    -- Avg Products per Category
    ROUND(
        (SELECT COUNT(*) FROM product WHERE status = 'Active' AND is_deleted = false)::numeric / 
        NULLIF((SELECT COUNT(*) FROM categories WHERE status = 'Active'), 0), 
        1
    ) as avg_products_per_category,
    
    -- Avg Sub-Categories per Category
    ROUND(
        (SELECT COUNT(*) FROM sub_categories WHERE status = 'Active')::numeric / 
        NULLIF((SELECT COUNT(*) FROM categories WHERE status = 'Active'), 0), 
        1
    ) as avg_subcategories_per_category,
    
    -- Products per Supplier
    ROUND(
        (SELECT COUNT(*) FROM product WHERE status = 'Active' AND is_deleted = false)::numeric / 
        NULLIF((SELECT COUNT(*) FROM supplier WHERE status = 'Active'), 0), 
        1
    ) as products_per_supplier,
    
    -- Avg Aisles per Warehouse
    ROUND(
        (SELECT COUNT(*) FROM aisle WHERE status = 'Active')::numeric / 
        NULLIF((SELECT COUNT(*) FROM warehouse WHERE status = 'Active'), 0), 
        1
    ) as avg_aisles_per_warehouse,
    
    -- Products per Warehouse
    ROUND(
        (SELECT COUNT(*) FROM product WHERE status = 'Active' AND is_deleted = false)::numeric / 
        NULLIF((SELECT COUNT(*) FROM warehouse WHERE status = 'Active'), 0), 
        1
    ) as products_per_warehouse;


-- ============================================================================
-- 6. MOST PRODUCTIVE CATEGORIES
-- ============================================================================

-- Get top 4 categories with product and sub-category counts
SELECT 
    c.name as category_name,
    COUNT(DISTINCT p.oid) as product_count,
    COUNT(DISTINCT sc.oid) as subcategory_count,
    ROUND(COUNT(DISTINCT p.oid) * 100.0 / (SELECT COUNT(*) FROM product WHERE status = 'Active' AND is_deleted = false), 0) as percentage
FROM categories c
LEFT JOIN product p ON p.category_oid = c.oid AND p.status = 'Active' AND p.is_deleted = false
LEFT JOIN sub_categories sc ON sc.category_oid = c.oid AND sc.status = 'Active'
WHERE c.status = 'Active'
GROUP BY c.oid, c.name
ORDER BY product_count DESC
LIMIT 4;


-- ============================================================================
-- 7. WAREHOUSE & STORAGE INSIGHTS
-- ============================================================================

SELECT 
    (SELECT COUNT(*) FROM warehouse WHERE status = 'Active') as active_warehouses,
    (SELECT COUNT(*) FROM aisle WHERE status = 'Active') as total_aisles,
    ROUND(
        (SELECT COUNT(*) FROM aisle WHERE status = 'Active')::numeric / 
        NULLIF((SELECT COUNT(*) FROM warehouse WHERE status = 'Active'), 0), 
        1
    ) as avg_aisles_per_warehouse;


-- ============================================================================
-- 8. BRAND PERFORMANCE
-- ============================================================================

SELECT 
    (SELECT COUNT(*) FROM brands WHERE status = 'Active') as active_brands,
    
    -- Avg products per brand
    ROUND(
        (SELECT COUNT(*) FROM product WHERE status = 'Active' AND is_deleted = false)::numeric / 
        NULLIF((SELECT COUNT(*) FROM brands WHERE status = 'Active'), 0), 
        1
    ) as avg_products_per_brand,
    
    -- Brands with 10+ products
    (SELECT COUNT(*) FROM (
        SELECT b.oid
        FROM brands b
        LEFT JOIN product p ON p.brand_oid = b.oid AND p.status = 'Active' AND p.is_deleted = false
        WHERE b.status = 'Active'
        GROUP BY b.oid
        HAVING COUNT(p.oid) >= 10
    ) as brands_with_many_products) as brands_with_10_plus_products;


-- ============================================================================
-- 9. STATUS OVERVIEW
-- ============================================================================

SELECT 
    -- Total Active Items (sum of all active configuration items)
    (
        (SELECT COUNT(*) FROM categories WHERE status = 'Active') +
        (SELECT COUNT(*) FROM sub_categories WHERE status = 'Active') +
        (SELECT COUNT(*) FROM brands WHERE status = 'Active') +
        (SELECT COUNT(*) FROM supplier WHERE status = 'Active') +
        (SELECT COUNT(*) FROM product WHERE status = 'Active' AND is_deleted = false) +
        (SELECT COUNT(*) FROM warehouse WHERE status = 'Active') +
        (SELECT COUNT(*) FROM aisle WHERE status = 'Active')
    ) as total_active_items,
    
    -- Total Inactive Items
    (
        (SELECT COUNT(*) FROM categories WHERE status = 'Inactive') +
        (SELECT COUNT(*) FROM sub_categories WHERE status = 'Inactive') +
        (SELECT COUNT(*) FROM brands WHERE status = 'Inactive') +
        (SELECT COUNT(*) FROM supplier WHERE status = 'Inactive') +
        (SELECT COUNT(*) FROM product WHERE status = 'Inactive' AND is_deleted = false) +
        (SELECT COUNT(*) FROM warehouse WHERE status = 'Inactive') +
        (SELECT COUNT(*) FROM aisle WHERE status = 'Inactive')
    ) as total_inactive_items;


-- ============================================================================
-- 10. DATA QUALITY ISSUES
-- ============================================================================

-- Get all data quality issues in one query
SELECT 
    -- Products missing images
    (SELECT COUNT(*) FROM product 
     WHERE (image_url IS NULL OR image_url = '') 
     AND status = 'Active' AND is_deleted = false) as products_missing_images,
    
    -- Products without brands
    (SELECT COUNT(*) FROM product 
     WHERE brand_oid IS NULL 
     AND status = 'Active' AND is_deleted = false) as products_without_brands,
    
    -- Products without categories
    (SELECT COUNT(*) FROM product 
     WHERE category_oid IS NULL 
     AND status = 'Active' AND is_deleted = false) as products_without_categories,
    
    -- Products without suppliers
    (SELECT COUNT(*) FROM product 
     WHERE supplier_oid IS NULL 
     AND status = 'Active' AND is_deleted = false) as products_without_suppliers,
    
    -- Inactive suppliers
    (SELECT COUNT(*) FROM supplier 
     WHERE status = 'Inactive') as inactive_suppliers,
    
    -- Categories with no products
    (SELECT COUNT(*) FROM categories c
     WHERE NOT EXISTS (
         SELECT 1 FROM product p 
         WHERE p.category_oid = c.oid 
         AND p.status = 'Active' AND p.is_deleted = false
     ) AND c.status = 'Active') as empty_categories,
    
    -- Brands with no products
    (SELECT COUNT(*) FROM brands b
     WHERE NOT EXISTS (
         SELECT 1 FROM product p 
         WHERE p.brand_oid = b.oid 
         AND p.status = 'Active' AND p.is_deleted = false
     ) AND b.status = 'Active') as empty_brands;

-- Calculate total issues
SELECT 
    COALESCE((SELECT COUNT(*) FROM product WHERE (image_url IS NULL OR image_url = '') AND status = 'Active' AND is_deleted = false), 0) +
    COALESCE((SELECT COUNT(*) FROM product WHERE brand_oid IS NULL AND status = 'Active' AND is_deleted = false), 0) +
    COALESCE((SELECT COUNT(*) FROM product WHERE category_oid IS NULL AND status = 'Active' AND is_deleted = false), 0) +
    COALESCE((SELECT COUNT(*) FROM product WHERE supplier_oid IS NULL AND status = 'Active' AND is_deleted = false), 0)
    as total_data_quality_issues;


-- ============================================================================
-- 11. DETAILED DATA QUALITY ISSUES (For Fix Issues Page)
-- ============================================================================

-- Products missing images
SELECT 
    p.oid,
    p.sku,
    p.name,
    c.name as category_name,
    b.name as brand_name,
    'Missing Image' as issue_type,
    'high' as priority
FROM product p
LEFT JOIN categories c ON p.category_oid = c.oid
LEFT JOIN brands b ON p.brand_oid = b.oid
WHERE (p.image_url IS NULL OR p.image_url = '')
AND p.status = 'Active' AND p.is_deleted = false
ORDER BY p.name;

-- Products without brands
SELECT 
    p.oid,
    p.sku,
    p.name,
    c.name as category_name,
    'Missing Brand' as issue_type,
    'high' as priority
FROM product p
LEFT JOIN categories c ON p.category_oid = c.oid
WHERE p.brand_oid IS NULL
AND p.status = 'Active' AND p.is_deleted = false
ORDER BY p.name;

-- Products without categories
SELECT 
    p.oid,
    p.sku,
    p.name,
    b.name as brand_name,
    'Missing Category' as issue_type,
    'critical' as priority
FROM product p
LEFT JOIN brands b ON p.brand_oid = b.oid
WHERE p.category_oid IS NULL
AND p.status = 'Active' AND p.is_deleted = false
ORDER BY p.name;

-- Products without suppliers
SELECT 
    p.oid,
    p.sku,
    p.name,
    c.name as category_name,
    b.name as brand_name,
    'Missing Supplier' as issue_type,
    'high' as priority
FROM product p
LEFT JOIN categories c ON p.category_oid = c.oid
LEFT JOIN brands b ON p.brand_oid = b.oid
WHERE p.supplier_oid IS NULL
AND p.status = 'Active' AND p.is_deleted = false
ORDER BY p.name;

-- Empty categories (no products)
SELECT 
    c.oid,
    c.name as category_name,
    (SELECT COUNT(*) FROM sub_categories WHERE category_oid = c.oid) as subcategory_count,
    'Empty Category' as issue_type,
    'low' as priority
FROM categories c
WHERE NOT EXISTS (
    SELECT 1 FROM product p 
    WHERE p.category_oid = c.oid 
    AND p.status = 'Active' AND p.is_deleted = false
)
AND c.status = 'Active'
ORDER BY c.name;

-- Empty brands (no products)
SELECT 
    b.oid,
    b.name as brand_name,
    'Empty Brand' as issue_type,
    'low' as priority
FROM brands b
WHERE NOT EXISTS (
    SELECT 1 FROM product p 
    WHERE p.brand_oid = b.oid 
    AND p.status = 'Active' AND p.is_deleted = false
)
AND b.status = 'Active'
ORDER BY b.name;


-- ============================================================================
-- 12. PERFORMANCE OPTIMIZATION INDEXES
-- ============================================================================

-- Create these indexes for better query performance:

-- CREATE INDEX idx_product_status_deleted ON product(status, is_deleted) WHERE is_deleted = false;
-- CREATE INDEX idx_product_category ON product(category_oid) WHERE status = 'Active' AND is_deleted = false;
-- CREATE INDEX idx_product_brand ON product(brand_oid) WHERE status = 'Active' AND is_deleted = false;
-- CREATE INDEX idx_product_supplier ON product(supplier_oid) WHERE status = 'Active' AND is_deleted = false;
-- CREATE INDEX idx_categories_status ON categories(status);
-- CREATE INDEX idx_brands_status ON brands(status);
-- CREATE INDEX idx_supplier_status ON supplier(status);
-- CREATE INDEX idx_warehouse_status ON warehouse(status);
-- CREATE INDEX idx_aisle_status ON aisle(status);
-- CREATE INDEX idx_audit_log_feature_created ON audit_log(feature_name, created_on DESC);
