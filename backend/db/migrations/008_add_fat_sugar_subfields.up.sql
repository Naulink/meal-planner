-- +goose Up
ALTER TABLE ingredients
  ADD COLUMN saturated_fat_per_100   INT NOT NULL DEFAULT 0,
  ADD COLUMN unsaturated_fat_per_100 INT NOT NULL DEFAULT 0,
  ADD COLUMN sugar_per_100           INT NOT NULL DEFAULT 0;

-- +goose Down
ALTER TABLE ingredients
  DROP COLUMN saturated_fat_per_100,
  DROP COLUMN unsaturated_fat_per_100,
  DROP COLUMN sugar_per_100;
