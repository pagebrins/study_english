USE study_english;

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
