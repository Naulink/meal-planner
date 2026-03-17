-- name: GetIngredient :one
SELECT * FROM ingredients WHERE id = $1;

-- name: ListIngredients :many
SELECT * FROM ingredients ORDER BY name;

-- name: CreateIngredient :one
INSERT INTO ingredients (
    name, kcal_per_100, protein_per_100, carbs_per_100, fat_per_100,
    unsaturated_fat_per_100, sugar_per_100,
    nutrition_basis, pieces_allowed, weight_per_unit
) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
    RETURNING *;

-- name: DeleteIngredient :exec
DELETE FROM ingredients WHERE id = $1;

-- name: UpdateIngredient :one
UPDATE ingredients
SET name                    = $2,
    kcal_per_100            = $3,
    protein_per_100         = $4,
    carbs_per_100           = $5,
    fat_per_100             = $6,
    unsaturated_fat_per_100 = $7,
    sugar_per_100           = $8,
    nutrition_basis         = $9,
    pieces_allowed          = $10,
    weight_per_unit         = $11
WHERE id = $1
RETURNING *;

-- name: SearchIngredients :many
SELECT * FROM ingredients
WHERE ($1::TEXT = '' OR name ILIKE '%' || $1 || '%')
  AND ($2::FLOAT8 = 0   OR kcal_per_100 >= $2)
  AND ($3::FLOAT8 = 0   OR kcal_per_100 <= $3)
ORDER BY name;

-- name: UpdateIngredientImagePath :one
UPDATE ingredients SET image_path = $2 WHERE id = $1 RETURNING *;
