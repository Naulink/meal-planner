-- +goose Up
ALTER TABLE recipes ADD COLUMN image_path TEXT;

-- +goose Down
ALTER TABLE recipes DROP COLUMN image_path;
