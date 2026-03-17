-- name: ListTags :many
SELECT * FROM tags ORDER BY name;

-- name: GetTag :one
SELECT * FROM tags WHERE id = $1;

-- name: CreateTag :one
INSERT INTO tags (name, description, color, show_on_cards)
VALUES ($1, $2, $3, $4)
RETURNING *;

-- name: UpdateTag :one
UPDATE tags
SET name         = $2,
    description  = $3,
    color        = $4,
    show_on_cards = $5
WHERE id = $1
RETURNING *;

-- name: DeleteTag :exec
DELETE FROM tags WHERE id = $1;

-- name: CountIngredientsByTag :one
SELECT COUNT(*) FROM ingredient_tags WHERE tag_id = $1;

-- name: GetIngredientTags :many
SELECT t.id, t.name, t.description, t.color, t.show_on_cards
FROM tags t
JOIN ingredient_tags it ON it.tag_id = t.id
WHERE it.ingredient_id = $1
ORDER BY t.name;

-- name: DeleteIngredientTags :exec
DELETE FROM ingredient_tags WHERE ingredient_id = $1;

-- name: AddIngredientTag :exec
INSERT INTO ingredient_tags (ingredient_id, tag_id) VALUES ($1, $2)
ON CONFLICT DO NOTHING;

-- name: SearchIngredientIDsByTagIDs :many
SELECT ingredient_id
FROM ingredient_tags
WHERE tag_id = ANY($1::BIGINT[])
GROUP BY ingredient_id
HAVING COUNT(DISTINCT tag_id) = $2;

-- name: GetRecipeTags :many
SELECT t.id, t.name, t.description, t.color, t.show_on_cards
FROM tags t
JOIN recipe_tags rt ON rt.tag_id = t.id
WHERE rt.recipe_id = $1
ORDER BY t.name;

-- name: DeleteRecipeTags :exec
DELETE FROM recipe_tags WHERE recipe_id = $1;

-- name: AddRecipeTag :exec
INSERT INTO recipe_tags (recipe_id, tag_id) VALUES ($1, $2)
ON CONFLICT DO NOTHING;

-- name: CountRecipesByTag :one
SELECT COUNT(*) FROM recipe_tags WHERE tag_id = $1;
