UPDATE roles
SET description = 'No settings/chat'
WHERE code = 'guest';

INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.code = 'practice.use'
WHERE r.code = 'guest';
