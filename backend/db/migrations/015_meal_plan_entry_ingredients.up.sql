-- +goose Up
CREATE TABLE meal_plan_entry_ingredients (
    meal_plan_entry_id BIGINT NOT NULL REFERENCES meal_plan_entries(id) ON DELETE CASCADE,
    ingredient_id      BIGINT NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
    amount             DOUBLE PRECISION NOT NULL CHECK (amount > 0),
    unit               TEXT NOT NULL CHECK (unit IN ('g', 'ml', 'pcs')),
    PRIMARY KEY (meal_plan_entry_id, ingredient_id)
);

-- +goose Down
DROP TABLE IF EXISTS meal_plan_entry_ingredients;
