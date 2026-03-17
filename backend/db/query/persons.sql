-- name: ListPersonsWithSettings :many
SELECT
    p.id, p.name, p.gender, p.age, p.created_at,
    ps.target_kcal, ps.target_protein, ps.target_carbs, ps.target_fat
FROM persons p
LEFT JOIN person_settings ps ON ps.person_id = p.id
ORDER BY p.created_at ASC;

-- name: GetPersonWithSettings :one
SELECT
    p.id, p.name, p.gender, p.age, p.created_at,
    ps.target_kcal, ps.target_protein, ps.target_carbs, ps.target_fat
FROM persons p
LEFT JOIN person_settings ps ON ps.person_id = p.id
WHERE p.id = $1;

-- name: CreatePerson :one
INSERT INTO persons (name, gender, age)
VALUES ($1, $2, $3)
RETURNING id, name, gender, age, created_at;

-- name: UpdatePerson :one
UPDATE persons
SET name = $2, gender = $3, age = $4
WHERE id = $1
RETURNING id, name, gender, age, created_at;

-- name: DeletePerson :exec
DELETE FROM persons WHERE id = $1;
