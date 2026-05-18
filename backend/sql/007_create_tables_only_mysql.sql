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
  source VARCHAR(20) NOT NULL DEFAULT 'manual',
  plan_item_id BIGINT UNSIGNED NULL,
  theme_id BIGINT UNSIGNED NULL,
  requirements TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_modes_user_id (user_id),
  KEY idx_modes_plan_item_id (plan_item_id),
  KEY idx_modes_theme_id (theme_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS learning_profiles (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  goal VARCHAR(255) NOT NULL,
  daily_minutes INT NOT NULL DEFAULT 20,
  study_time_range VARCHAR(120) NULL,
  translation_mode TINYINT NOT NULL DEFAULT 1 COMMENT '1=zh_to_en,2=en_to_zh',
  focuses TEXT NULL,
  notes TEXT NULL,
  word_level INT NOT NULL DEFAULT 3,
  sentence_level INT NOT NULL DEFAULT 3,
  overall_level INT NOT NULL DEFAULT 3,
  onboarding_completed TINYINT(1) NOT NULL DEFAULT 0,
  last_assessment_at DATETIME NULL,
  next_assessment_type VARCHAR(20) NOT NULL DEFAULT 'initial',
  next_assessment_due_date DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_learning_profiles_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS learning_plans (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  profile_id BIGINT UNSIGNED NOT NULL,
  assessment_id BIGINT UNSIGNED NULL,
  title VARCHAR(120) NOT NULL,
  goal_summary TEXT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  version INT NOT NULL DEFAULT 1,
  plan_date DATE NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_learning_plans_user_id (user_id),
  KEY idx_learning_plans_profile_id (profile_id),
  KEY idx_learning_plans_assessment_id (assessment_id),
  KEY idx_learning_plans_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS learning_plan_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  plan_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(120) NOT NULL,
  description TEXT NULL,
  study_type TINYINT NOT NULL COMMENT '1=word,2=sentence,3=article',
  translation_mode TINYINT NOT NULL DEFAULT 1 COMMENT '1=zh_to_en,2=en_to_zh',
  level INT NOT NULL,
  numbers INT NOT NULL,
  estimated_min INT NOT NULL DEFAULT 10,
  theme_id BIGINT UNSIGNED NULL,
  requirements TEXT NULL,
  mode_id BIGINT UNSIGNED NULL,
  sort_order INT NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_learning_plan_items_plan_id (plan_id),
  KEY idx_learning_plan_items_user_id (user_id),
  KEY idx_learning_plan_items_mode_id (mode_id),
  KEY idx_learning_plan_items_theme_id (theme_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS learning_assessments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  profile_id BIGINT UNSIGNED NOT NULL,
  assessment_type VARCHAR(20) NOT NULL,
  trigger_reason VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  word_level_before INT NOT NULL DEFAULT 3,
  sentence_level_before INT NOT NULL DEFAULT 3,
  word_level_after INT NOT NULL DEFAULT 3,
  sentence_level_after INT NOT NULL DEFAULT 3,
  overall_level_after INT NOT NULL DEFAULT 3,
  started_at DATETIME NULL,
  completed_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_learning_assessments_user_id (user_id),
  KEY idx_learning_assessments_profile_id (profile_id),
  KEY idx_learning_assessments_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS learning_assessment_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  assessment_id BIGINT UNSIGNED NOT NULL,
  study_type TINYINT NOT NULL COMMENT '1=word,2=sentence',
  translation_mode TINYINT NOT NULL DEFAULT 1 COMMENT '1=zh_to_en,2=en_to_zh',
  level INT NOT NULL DEFAULT 3,
  question TEXT NOT NULL,
  answer_key TEXT NOT NULL,
  user_answer TEXT NULL,
  score INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_learning_assessment_items_assessment_id (assessment_id)
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

CREATE TABLE IF NOT EXISTS words (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  word VARCHAR(120) NOT NULL,
  definition TEXT NOT NULL,
  l1_category VARCHAR(120) NOT NULL,
  l2_category VARCHAR(120) NOT NULL DEFAULT '',
  example TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (word),
  UNIQUE KEY uk_words_id (id),
  KEY idx_words_l1_category (l1_category),
  KEY idx_words_l2_category (l2_category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS word_tags (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  word_id BIGINT UNSIGNED NOT NULL,
  category_id BIGINT UNSIGNED NOT NULL DEFAULT 0,
  category_name VARCHAR(120) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_word_tags_word_id (word_id),
  KEY idx_word_tags_category_name (category_name)
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
