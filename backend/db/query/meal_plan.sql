-- name: ListMealPlanEntries :many
SELECT mp.id, mp.person_id, mp.day_index, mp.recipe_id, mp.serving_grams,
       mp.ingredient_id, mp.amount, mp.unit, mp.created_at,
       r.name AS recipe_name, r.image_path AS recipe_image_path,
       i.name AS ingredient_name, i.kcal_per_100, i.protein_per_100,
       i.carbs_per_100, i.fat_per_100, i.image_path AS ingredient_image_path,
       i.weight_per_unit
FROM meal_plan_entries mp
LEFT JOIN recipes r ON mp.recipe_id = r.id
LEFT JOIN ingredients i ON mp.ingredient_id = i.id
ORDER BY mp.person_id ASC, mp.day_index ASC, mp.created_at ASC;

-- name: CreateMealPlanEntry :one
INSERT INTO meal_plan_entries (person_id, day_index, recipe_id, serving_grams, ingredient_id, amount, unit)
VALUES ($1, $2, $3, $4, $5, $6, $7)
RETURNING id, person_id, day_index, recipe_id, serving_grams, ingredient_id, amount, unit, created_at;

-- name: UpdateMealPlanEntry :one
UPDATE meal_plan_entries
SET serving_grams = COALESCE($2, serving_grams),
    amount = COALESCE($3, amount)
WHERE id = $1
RETURNING id, person_id, day_index, recipe_id, serving_grams, ingredient_id, amount, unit, created_at;

-- name: DeleteMealPlanEntry :exec
DELETE FROM meal_plan_entries WHERE id = $1;

-- name: DeleteAllMealPlanEntries :exec
DELETE FROM meal_plan_entries;
