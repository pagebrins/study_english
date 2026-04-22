USE study_english;

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

ALTER TABLE modes
  ADD COLUMN  theme_id BIGINT UNSIGNED NULL AFTER mode,
  ADD KEY idx_modes_theme_id (theme_id);
