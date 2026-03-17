-- +goose Up
ALTER TABLE recipes ADD COLUMN persons INTEGER NOT NULL DEFAULT 1;

-- +goose Down
ALTER TABLE recipes DROP COLUMN persons;
