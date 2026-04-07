-- name: CreateMealPlanEntryIngredients :exec
INSERT INTO meal_plan_entry_ingredients (meal_plan_entry_id, ingredient_id, amount, unit)
SELECT @meal_plan_entry_id, ingredient_id, amount,
       CASE WHEN unit = 'pieces' THEN 'pcs' ELSE unit END
FROM recipe_ingredients
WHERE recipe_id = @recipe_id;

-- name: ListMealPlanEntryIngredients :many
SELECT
    mpei.meal_plan_entry_id,
    mpei.ingredient_id,
    mpei.amount,
    mpei.unit,
    i.name,
    i.kcal_per_100,
    i.protein_per_100,
    i.carbs_per_100,
    i.fat_per_100,
    i.unsaturated_fat_per_100,
    i.sugar_per_100,
    i.nutrition_basis,
    i.pieces_allowed,
    i.weight_per_unit,
    i.image_path
FROM meal_plan_entry_ingredients mpei
JOIN ingredients i ON i.id = mpei.ingredient_id
ORDER BY mpei.meal_plan_entry_id, i.name;

-- name: AddMealPlanEntryIngredient :exec
INSERT INTO meal_plan_entry_ingredients (meal_plan_entry_id, ingredient_id, amount, unit)
VALUES (@meal_plan_entry_id, @ingredient_id, @amount, @unit);

-- name: UpdateMealPlanEntryIngredient :exec
UPDATE meal_plan_entry_ingredients
SET amount = @amount, unit = @unit
WHERE meal_plan_entry_id = @meal_plan_entry_id AND ingredient_id = @ingredient_id;

-- name: DeleteMealPlanEntryIngredient :exec
DELETE FROM meal_plan_entry_ingredients
WHERE meal_plan_entry_id = @meal_plan_entry_id AND ingredient_id = @ingredient_id;

-- name: DeleteAllMealPlanEntryIngredients :exec
DELETE FROM meal_plan_entry_ingredients
WHERE meal_plan_entry_id = @meal_plan_entry_id;

-- name: HasMealPlanEntryIngredients :one
SELECT EXISTS (
    SELECT 1 FROM meal_plan_entry_ingredients WHERE meal_plan_entry_id = @meal_plan_entry_id
) AS is_customized;
