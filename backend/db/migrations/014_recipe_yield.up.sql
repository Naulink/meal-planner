-- +goose Up
ALTER TABLE recipes ADD COLUMN yield NUMERIC NOT NULL DEFAULT 100 CHECK (yield >= 1);

-- +goose Down
ALTER TABLE recipes DROP COLUMN yield;
