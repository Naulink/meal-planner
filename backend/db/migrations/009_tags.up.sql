-- +goose Up
CREATE TABLE tags (
    id          BIGSERIAL PRIMARY KEY,
    name        TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL DEFAULT '',
    color       TEXT NOT NULL
);

CREATE TABLE ingredient_tags (
    ingredient_id BIGINT REFERENCES ingredients(id) ON DELETE CASCADE,
    tag_id        BIGINT REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (ingredient_id, tag_id)
);

-- +goose Down
DROP TABLE ingredient_tags;
DROP TABLE tags;
