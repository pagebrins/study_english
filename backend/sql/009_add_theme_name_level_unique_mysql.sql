USE study_english;

ALTER TABLE themes
  DROP PRIMARY KEY,
  ADD PRIMARY KEY (name, level),
  ADD UNIQUE KEY uk_themes_id (id);
