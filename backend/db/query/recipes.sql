-- name: GetRecipe :one
SELECT * FROM recipes WHERE id = $1;

-- name: ListRecipes :many
SELECT * FROM recipes ORDER BY name;

-- name: CreateRecipe :one
INSERT INTO recipes (name, description, steps, cook_time_minutes, persons, yield)
VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *;

-- name: DeleteRecipe :exec
DELETE FROM recipes WHERE id = $1;

-- name: UpdateRecipe :one
UPDATE recipes SET name = $2, description = $3, steps = $4, cook_time_minutes = $5, persons = $6, yield = $7
WHERE id = $1 RETURNING *;

-- name: UpdateRecipeImagePath :one
UPDATE recipes SET image_path = $2 WHERE id = $1 RETURNING *;