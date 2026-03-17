-- +goose Up
ALTER TABLE tags ADD COLUMN show_on_cards BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE recipes ADD COLUMN cook_time_minutes INTEGER CHECK (cook_time_minutes IS NULL OR cook_time_minutes >= 1);

-- +goose Down
ALTER TABLE recipes DROP COLUMN cook_time_minutes;
ALTER TABLE tags DROP COLUMN show_on_cards;
