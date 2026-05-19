USE study_english;

ALTER TABLE modes
  ADD COLUMN source VARCHAR(20) NOT NULL DEFAULT 'manual' AFTER mode,
  ADD COLUMN plan_item_id BIGINT UNSIGNED NULL AFTER source,
  ADD KEY idx_modes_plan_item_id (plan_item_id);

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
