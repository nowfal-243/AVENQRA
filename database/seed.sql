-- Seed Municipal Departments
INSERT INTO departments (name, code, sla_hours)
VALUES 
    ('Roads & Infrastructure', 'ROAD', 48),
    ('Waste Management', 'WASTE', 24),
    ('Water Supply & Sewage', 'WATER', 36),
    ('Electrical & Streetlights', 'ELEC', 24),
    ('Drainage & Flood Control', 'DRAIN', 48)
ON CONFLICT (code) DO NOTHING;

-- Seed Super Admin User (Password: Admin@123)
INSERT INTO users (name, email, password_hash, role)
VALUES 
    ('System Administrator', 'admin@avenqra.gov', '$2a$10$w09Z.4jXkM7vK1fX8u9CZeD5/S7Jk41aLp4j7m4L4fX8u9CZeD5/S', 'SUPER_ADMIN')
ON CONFLICT (email) DO NOTHING;
