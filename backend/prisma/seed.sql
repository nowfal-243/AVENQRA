-- ==========================================================================
-- AVENQRA seed data — matches backend/prisma/schema.prisma column names.
-- Run AFTER prisma/init.sql:
--   psql -U avenqra_user -d avenqra_db -v ON_ERROR_STOP=1 -f prisma/init.sql
--   psql -U avenqra_user -d avenqra_db -v ON_ERROR_STOP=1 -f prisma/seed.sql
-- Ids are Prisma-style TEXT, generated server-side below.
-- ==========================================================================

-- Municipal departments (mirrors ai-service/app/services/taxonomy.py)
INSERT INTO "departments" ("id", "name", "code", "slaHours", "createdAt")
VALUES
    (gen_random_uuid()::text, 'Roads & Infrastructure', 'ROAD', 48, NOW()),
    (gen_random_uuid()::text, 'Waste Management', 'WASTE', 24, NOW()),
    (gen_random_uuid()::text, 'Water Supply & Sewage', 'WATER', 36, NOW()),
    (gen_random_uuid()::text, 'Electrical & Streetlights', 'ELEC', 24, NOW()),
    (gen_random_uuid()::text, 'Drainage & Flood Control', 'DRAIN', 48, NOW())
ON CONFLICT ("code") DO NOTHING;

-- Demo accounts (bcrypt, cost 10). Passwords:
--   admin@avenqra.gov   / Admin@123    (SUPER_ADMIN)
--   citizen@avenqra.gov / Citizen@123  (CITIZEN)
--   officer@avenqra.gov / Officer@123  (OFFICER)
INSERT INTO "users" ("id", "name", "email", "password", "phone", "role", "isVerified", "createdAt", "updatedAt")
VALUES
    (gen_random_uuid()::text, 'System Administrator', 'admin@avenqra.gov',
     '$2a$10$yrsGabzQq.6EGU67AaA1lOXh/1ZV78Vd07UNFysl3NOc8bv5fYtiy', '+91 9000000001', 'SUPER_ADMIN', true, NOW(), NOW()),
    (gen_random_uuid()::text, 'Demo Citizen', 'citizen@avenqra.gov',
     '$2a$10$I.7cQ3/j5yKj9nYjHN2CA.I6HTuILqTPGGQf8bPLLVzJe6sDoL2l2', '+91 9000000002', 'CITIZEN', true, NOW(), NOW()),
    (gen_random_uuid()::text, 'Field Officer Rajesh', 'officer@avenqra.gov',
     '$2a$10$KaoXMFK/KaLtw88TEaTaO.56dXyZXE5vFsqFJGWT1L5Syk2bj9SkO', '+91 9000000003', 'OFFICER', true, NOW(), NOW())
ON CONFLICT ("email") DO NOTHING;

-- Role profile extensions (registration creates these automatically)
INSERT INTO "citizens" ("id", "userId", "address", "totalComplaints")
SELECT gen_random_uuid()::text, u."id", '12 MG Road, Bengaluru', 0
FROM "users" u WHERE u."email" = 'citizen@avenqra.gov'
ON CONFLICT DO NOTHING;

INSERT INTO "officers" ("id", "userId", "departmentId", "badgeNumber", "status")
SELECT gen_random_uuid()::text, u."id", d."id", 'OFF-1001', 'ACTIVE'
FROM "users" u, "departments" d
WHERE u."email" = 'officer@avenqra.gov' AND d."code" = 'ROAD'
ON CONFLICT DO NOTHING;
