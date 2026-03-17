-- +goose Up
CREATE TABLE recipe_tags (
    recipe_id BIGINT REFERENCES recipes(id) ON DELETE CASCADE,
    tag_id    BIGINT REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (recipe_id, tag_id)
);

-- +goose Down
DROP TABLE recipe_tags;
