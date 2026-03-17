-- +goose Up
CREATE TABLE settings (
    id             INT PRIMARY KEY DEFAULT 1,
    target_kcal    INT NOT NULL DEFAULT 2000,
    target_protein INT NOT NULL DEFAULT 150,
    target_carbs   INT NOT NULL DEFAULT 200,
    target_fat     INT NOT NULL DEFAULT 65
);
INSERT INTO settings DEFAULT VALUES;

-- +goose Down
DROP TABLE settings;
