-- +goose Up
ALTER TABLE ingredients
  DROP COLUMN IF EXISTS tags,
  ALTER COLUMN kcal_per_100            TYPE DOUBLE PRECISION,
  ALTER COLUMN protein_per_100         TYPE DOUBLE PRECISION,
  ALTER COLUMN carbs_per_100           TYPE DOUBLE PRECISION,
  ALTER COLUMN fat_per_100             TYPE DOUBLE PRECISION,
  ALTER COLUMN unsaturated_fat_per_100 TYPE DOUBLE PRECISION,
  ALTER COLUMN sugar_per_100           TYPE DOUBLE PRECISION;

-- +goose Down
ALTER TABLE ingredients
  ADD COLUMN IF NOT EXISTS tags TEXT[],
  ALTER COLUMN kcal_per_100            TYPE INT USING kcal_per_100::INT,
  ALTER COLUMN protein_per_100         TYPE INT USING protein_per_100::INT,
  ALTER COLUMN carbs_per_100           TYPE INT USING carbs_per_100::INT,
  ALTER COLUMN fat_per_100             TYPE INT USING fat_per_100::INT,
  ALTER COLUMN unsaturated_fat_per_100 TYPE INT USING unsaturated_fat_per_100::INT,
  ALTER COLUMN sugar_per_100           TYPE INT USING sugar_per_100::INT;
