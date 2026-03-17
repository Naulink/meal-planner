-- +goose Up
ALTER TABLE ingredients ADD COLUMN image_path TEXT;

-- +goose Down
ALTER TABLE ingredients DROP COLUMN image_path;
