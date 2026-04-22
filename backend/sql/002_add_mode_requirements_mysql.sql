USE study_english;

ALTER TABLE modes ADD COLUMN IF NOT EXISTS requirements TEXT NULL AFTER mode;
