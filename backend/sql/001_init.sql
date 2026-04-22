CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  phone TEXT,
  image TEXT,
  password_hash TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS roles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS permissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS role_permissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  role_id INTEGER NOT NULL,
  permission_id INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS user_roles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL UNIQUE,
  role_id INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS modes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  level INTEGER NOT NULL DEFAULT 1,
  numbers INTEGER NOT NULL DEFAULT 10,
  type INTEGER NOT NULL DEFAULT 2,
  mode INTEGER NOT NULL DEFAULT 1,
  theme_id INTEGER,
  requirements TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS themes (
  id INTEGER NOT NULL UNIQUE,
  name TEXT NOT NULL,
  parent_id INTEGER,
  level INTEGER NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (name, level)
);

CREATE TABLE IF NOT EXISTS user_questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  mode_id INTEGER NOT NULL,
  question TEXT NOT NULL,
  answer_key TEXT NOT NULL,
  answer_text TEXT,
  score INTEGER NOT NULL DEFAULT 0,
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pre_generated_questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  mode_id INTEGER NOT NULL,
  question TEXT NOT NULL,
  answer_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ready',
  served_at DATETIME,
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_modes_user_id ON modes(user_id);
CREATE INDEX IF NOT EXISTS idx_modes_theme_id ON modes(theme_id);
CREATE INDEX IF NOT EXISTS idx_themes_parent_id ON themes(parent_id);
CREATE INDEX IF NOT EXISTS idx_themes_level ON themes(level);
CREATE INDEX IF NOT EXISTS idx_user_questions_user_time ON user_questions(user_id, create_time);
CREATE INDEX IF NOT EXISTS idx_user_questions_mode_id ON user_questions(mode_id);
CREATE INDEX IF NOT EXISTS idx_pgq_user_mode_status ON pre_generated_questions(user_id, mode_id, status);
CREATE INDEX IF NOT EXISTS idx_pgq_status_served_at ON pre_generated_questions(status, served_at);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON role_permissions(permission_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id);

INSERT OR IGNORE INTO roles (code, name, description) VALUES ('admin', 'Admin', 'Full access');
INSERT OR IGNORE INTO roles (code, name, description) VALUES ('learner', 'Learner', 'All except settings');
INSERT OR IGNORE INTO roles (code, name, description) VALUES ('guest', 'Guest', 'No settings/chat/practice');

INSERT OR IGNORE INTO permissions (code, name, description) VALUES ('dashboard.view', 'Dashboard View', 'Access dashboard pages');
INSERT OR IGNORE INTO permissions (code, name, description) VALUES ('modes.manage', 'Modes Manage', 'Access and manage modes');
INSERT OR IGNORE INTO permissions (code, name, description) VALUES ('study.view', 'Study View', 'Access study pages');
INSERT OR IGNORE INTO permissions (code, name, description) VALUES ('history.view', 'History View', 'Access history pages');
INSERT OR IGNORE INTO permissions (code, name, description) VALUES ('practice.use', 'Practice Use', 'Use practice generate/submit');
INSERT OR IGNORE INTO permissions (code, name, description) VALUES ('chat.use', 'Chat Use', 'Use help chat panel');
INSERT OR IGNORE INTO permissions (code, name, description) VALUES ('settings.theme.manage', 'Theme Settings', 'Manage theme settings');
INSERT OR IGNORE INTO permissions (code, name, description) VALUES ('settings.permission.manage', 'Permission Settings', 'Manage permission settings');

INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p WHERE r.code = 'admin';

INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.code IN ('dashboard.view', 'modes.manage', 'study.view', 'history.view', 'practice.use', 'chat.use')
WHERE r.code = 'learner';

INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.code IN ('dashboard.view', 'modes.manage', 'study.view', 'history.view')
WHERE r.code = 'guest';

INSERT OR IGNORE INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u JOIN roles r ON r.code = 'guest';
