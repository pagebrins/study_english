CREATE DATABASE IF NOT EXISTS study_english
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE study_english;

CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  email VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(30) DEFAULT NULL,
  image VARCHAR(255) DEFAULT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS roles (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code VARCHAR(64) NOT NULL,
  name VARCHAR(120) NOT NULL,
  description VARCHAR(255) DEFAULT '',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_roles_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS permissions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code VARCHAR(128) NOT NULL,
  name VARCHAR(120) NOT NULL,
  description VARCHAR(255) DEFAULT '',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_permissions_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS role_permissions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  role_id BIGINT UNSIGNED NOT NULL,
  permission_id BIGINT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_role_permission (role_id, permission_id),
  KEY idx_role_permissions_role_id (role_id),
  KEY idx_role_permissions_permission_id (permission_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_roles (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  role_id BIGINT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_user_roles_user_id (user_id),
  KEY idx_user_roles_role_id (role_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS modes (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  title VARCHAR(120) NOT NULL,
  description TEXT,
  level TINYINT NOT NULL DEFAULT 1,
  numbers INT NOT NULL DEFAULT 10,
  type TINYINT NOT NULL DEFAULT 2 COMMENT '1=word,2=sentence,3=article',
  mode TINYINT NOT NULL DEFAULT 1 COMMENT '1=zh_to_en,2=en_to_zh',
  theme_id BIGINT UNSIGNED NULL,
  requirements TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_modes_user_id (user_id),
  KEY idx_modes_theme_id (theme_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS themes (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(120) NOT NULL,
  parent_id BIGINT UNSIGNED NULL,
  level TINYINT NOT NULL COMMENT '1=level1,2=level2,3=level3',
  sort_order INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (name, level),
  UNIQUE KEY uk_themes_id (id),
  KEY idx_themes_parent_id (parent_id),
  KEY idx_themes_level (level)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_questions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  mode_id BIGINT UNSIGNED NOT NULL,
  question TEXT NOT NULL,
  answer_key TEXT NOT NULL,
  answer_text TEXT,
  score INT NOT NULL DEFAULT 0,
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_user_questions_user_time (user_id, create_time),
  KEY idx_user_questions_mode_id (mode_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS pre_generated_questions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  mode_id BIGINT UNSIGNED NOT NULL,
  question TEXT NOT NULL,
  answer_key TEXT NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'ready' COMMENT 'ready|served',
  served_at DATETIME NULL,
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_pgq_user_mode_status (user_id, mode_id, status),
  KEY idx_pgq_status_served_at (status, served_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO roles (code, name, description)
SELECT 'admin', 'Admin', 'Full access'
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE code = 'admin');

INSERT INTO roles (code, name, description)
SELECT 'learner', 'Learner', 'All except settings'
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE code = 'learner');

INSERT INTO roles (code, name, description)
SELECT 'guest', 'Guest', 'No settings/chat/practice'
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE code = 'guest');

INSERT INTO permissions (code, name, description)
SELECT 'dashboard.view', 'Dashboard View', 'Access dashboard pages'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'dashboard.view');
INSERT INTO permissions (code, name, description)
SELECT 'modes.manage', 'Modes Manage', 'Access and manage modes'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'modes.manage');
INSERT INTO permissions (code, name, description)
SELECT 'study.view', 'Study View', 'Access study pages'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'study.view');
INSERT INTO permissions (code, name, description)
SELECT 'history.view', 'History View', 'Access history pages'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'history.view');
INSERT INTO permissions (code, name, description)
SELECT 'practice.use', 'Practice Use', 'Use practice generate/submit'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'practice.use');
INSERT INTO permissions (code, name, description)
SELECT 'chat.use', 'Chat Use', 'Use help chat panel'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'chat.use');
INSERT INTO permissions (code, name, description)
SELECT 'settings.theme.manage', 'Theme Settings', 'Manage theme settings'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'settings.theme.manage');
INSERT INTO permissions (code, name, description)
SELECT 'settings.permission.manage', 'Permission Settings', 'Manage permission settings'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'settings.permission.manage');

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON 1 = 1
WHERE r.code = 'admin'
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.code IN ('dashboard.view', 'modes.manage', 'study.view', 'history.view', 'practice.use', 'chat.use')
WHERE r.code = 'learner'
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.code IN ('dashboard.view', 'modes.manage', 'study.view', 'history.view')
WHERE r.code = 'guest'
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u
JOIN roles r ON r.code = 'guest'
WHERE NOT EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = u.id);
