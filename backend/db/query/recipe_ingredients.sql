-- name: AddRecipeIngredient :exec
INSERT INTO recipe_ingredients (recipe_id, ingredient_id, amount, unit)
VALUES ($1, $2, $3, $4);

-- name: DeleteRecipeIngredients :exec
DELETE FROM recipe_ingredients WHERE recipe_id = $1;

-- name: ListRecipeIngredients :many
SELECT
    ri.recipe_id,
    ri.ingredient_id,
    ri.amount,
    ri.unit,
    i.name,
    i.kcal_per_100,
    i.protein_per_100,
    i.carbs_per_100,
    i.fat_per_100,
    i.unsaturated_fat_per_100,
    i.sugar_per_100,
    i.nutrition_basis,
    i.pieces_allowed,
    i.weight_per_unit
FROM recipe_ingredients ri
         JOIN ingredients i ON i.id = ri.ingredient_id
WHERE ri.recipe_id = $1;