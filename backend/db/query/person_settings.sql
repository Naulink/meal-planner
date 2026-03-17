-- name: CreatePersonSettings :one
INSERT INTO person_settings (person_id, target_kcal, target_protein, target_carbs, target_fat)
VALUES ($1, $2, $3, $4, $5)
RETURNING person_id, target_kcal, target_protein, target_carbs, target_fat;

-- name: GetPersonSettings :one
SELECT person_id, target_kcal, target_protein, target_carbs, target_fat
FROM person_settings WHERE person_id = $1;

-- name: UpdatePersonSettings :one
UPDATE person_settings
SET target_kcal = $2, target_protein = $3, target_carbs = $4, target_fat = $5
WHERE person_id = $1
RETURNING person_id, target_kcal, target_protein, target_carbs, target_fat;
