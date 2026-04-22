USE study_english;

UPDATE modes
SET type = '2'
WHERE type IS NULL OR TRIM(type) = '' OR TRIM(type) = 'daily' OR TRIM(type) NOT IN ('1', '2', '3');

ALTER TABLE modes
  MODIFY COLUMN type TINYINT NOT NULL DEFAULT 2 COMMENT '1=word,2=sentence,3=article';

ALTER TABLE modes
  ADD COLUMN IF NOT EXISTS mode TINYINT NOT NULL DEFAULT 1 COMMENT '1=zh_to_en,2=en_to_zh' AFTER type;

