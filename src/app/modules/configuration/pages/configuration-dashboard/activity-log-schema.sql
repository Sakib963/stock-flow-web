-- Feature-based Activity Log Schema
-- Store activities for different modules separately for better performance and maintainability
-- Configuration Activities (Categories, Brands, Suppliers, Products, Warehouses, Aisles)
CREATE TABLE IF NOT EXISTS audit_log (
      oid BIGSERIAL PRIMARY KEY,
      feature_name VARCHAR(50) NOT NULL,
      -- e.g., 'categories', 'products', 'suppliers', 'brands', 'warehouses', 'aisles'
      title VARCHAR(255) NOT NULL,
      description TEXT,
      icon VARCHAR(50),
      activity_type VARCHAR(50) NOT NULL,
      -- e.g., 'create', 'update', 'deactivate', 'delete'
      reference_url VARCHAR(255),
      -- URL to the affected record in the application such as http://app.com/configuration/categories/123
      created_by BIGINT NOT NULL REFERENCES login(oid),
      created_on TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);