-- +goose Up
ALTER TABLE recipes ADD COLUMN steps TEXT;

-- +goose Down
ALTER TABLE recipes DROP COLUMN steps;
