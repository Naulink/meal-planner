-- +goose Up
ALTER TABLE meal_plan_entries
  ALTER COLUMN recipe_id DROP NOT NULL,
  ALTER COLUMN serving_grams DROP NOT NULL,
  ADD COLUMN ingredient_id BIGINT REFERENCES ingredients(id) ON DELETE CASCADE,
  ADD COLUMN amount DOUBLE PRECISION,
  ADD COLUMN unit TEXT CHECK (unit IN ('g', 'ml', 'pcs'));

ALTER TABLE meal_plan_entries
  DROP CONSTRAINT meal_plan_entries_serving_grams_check;

ALTER TABLE meal_plan_entries
  ADD CONSTRAINT meal_plan_entries_serving_grams_check
    CHECK (serving_grams IS NULL OR serving_grams > 0);

ALTER TABLE meal_plan_entries
  ADD CONSTRAINT meal_plan_item_check CHECK (
    (recipe_id IS NOT NULL AND ingredient_id IS NULL AND serving_grams IS NOT NULL) OR
    (ingredient_id IS NOT NULL AND recipe_id IS NULL AND amount IS NOT NULL AND unit IS NOT NULL)
  );

-- +goose Down
ALTER TABLE meal_plan_entries DROP CONSTRAINT IF EXISTS meal_plan_item_check;
ALTER TABLE meal_plan_entries DROP CONSTRAINT IF EXISTS meal_plan_entries_serving_grams_check;
ALTER TABLE meal_plan_entries
  ADD CONSTRAINT meal_plan_entries_serving_grams_check CHECK (serving_grams > 0);
ALTER TABLE meal_plan_entries
  DROP COLUMN IF EXISTS unit,
  DROP COLUMN IF EXISTS amount,
  DROP COLUMN IF EXISTS ingredient_id,
  ALTER COLUMN recipe_id SET NOT NULL,
  ALTER COLUMN serving_grams SET NOT NULL;
