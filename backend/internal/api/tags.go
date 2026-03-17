package api

import (
	"encoding/json"
	"errors"
	db "meal-planner/db/gen"
	"net/http"
	"strconv"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

type TagResponse struct {
	ID          int64  `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	Color       string `json:"color"`
	ShowOnCards bool   `json:"show_on_cards"`
}

type CreateTagRequest struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	Color       string `json:"color"`
	ShowOnCards *bool  `json:"show_on_cards"`
}

func toTagResponse(t db.Tag) TagResponse {
	return TagResponse{
		ID:          t.ID,
		Name:        t.Name,
		Description: t.Description,
		Color:       t.Color,
		ShowOnCards: t.ShowOnCards,
	}
}

// ListTags godoc
// @Summary List all tags
// @Tags tags
// @Produce json
// @Success 200 {array} TagResponse
// @Failure 500 {string} string
// @Router /tags [get]
func (h *Handler) ListTags(w http.ResponseWriter, r *http.Request) {
	tags, err := h.queries.ListTags(r.Context())
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	resp := make([]TagResponse, len(tags))
	for i, t := range tags {
		resp[i] = toTagResponse(t)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

// CreateTag godoc
// @Summary Create tag
// @Tags tags
// @Accept json
// @Produce json
// @Param tag body CreateTagRequest true "Tag"
// @Success 201 {object} TagResponse
// @Failure 400 {string} string
// @Failure 422 {string} string
// @Failure 500 {string} string
// @Router /tags [post]
func (h *Handler) CreateTag(w http.ResponseWriter, r *http.Request) {
	var req CreateTagRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid body", http.StatusBadRequest)
		return
	}

	showOnCards := true
	if req.ShowOnCards != nil {
		showOnCards = *req.ShowOnCards
	}
	tag, err := h.queries.CreateTag(r.Context(), db.CreateTagParams{
		Name:        req.Name,
		Description: req.Description,
		Color:       req.Color,
		ShowOnCards: showOnCards,
	})
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			http.Error(w, "tag name already exists", http.StatusUnprocessableEntity)
			return
		}
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(toTagResponse(tag))
}

// UpdateTag godoc
// @Summary Update tag
// @Tags tags
// @Accept json
// @Produce json
// @Param id path int true "Tag ID"
// @Param tag body CreateTagRequest true "Tag"
// @Success 200 {object} TagResponse
// @Failure 400 {string} string
// @Failure 404 {string} string
// @Failure 422 {string} string
// @Failure 500 {string} string
// @Router /tags/{id} [put]
func (h *Handler) UpdateTag(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.Atoi(r.PathValue("id"))
	if err != nil {
		http.Error(w, "invalid id", http.StatusBadRequest)
		return
	}

	var req CreateTagRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid body", http.StatusBadRequest)
		return
	}

	showOnCards := true
	if req.ShowOnCards != nil {
		showOnCards = *req.ShowOnCards
	} else {
		existing, err := h.queries.GetTag(r.Context(), int64(id))
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				http.Error(w, "tag not found", http.StatusNotFound)
				return
			}
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		showOnCards = existing.ShowOnCards
	}

	tag, err := h.queries.UpdateTag(r.Context(), db.UpdateTagParams{
		ID:          int64(id),
		Name:        req.Name,
		Description: req.Description,
		Color:       req.Color,
		ShowOnCards: showOnCards,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			http.Error(w, "tag not found", http.StatusNotFound)
			return
		}
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			http.Error(w, "tag name already exists", http.StatusUnprocessableEntity)
			return
		}
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(toTagResponse(tag))
}

// DeleteTag godoc
// @Summary Delete tag
// @Tags tags
// @Param id path int true "Tag ID"
// @Success 204
// @Failure 400 {string} string
// @Failure 409 {string} string
// @Failure 500 {string} string
// @Router /tags/{id} [delete]
func (h *Handler) DeleteTag(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.Atoi(r.PathValue("id"))
	if err != nil {
		http.Error(w, "invalid id", http.StatusBadRequest)
		return
	}

	recipeCount, err := h.queries.CountRecipesByTag(r.Context(), int64(id))
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if recipeCount > 0 {
		http.Error(w, "tag is assigned to one or more recipes", http.StatusConflict)
		return
	}

	count, err := h.queries.CountIngredientsByTag(r.Context(), int64(id))
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if count > 0 {
		http.Error(w, "tag is assigned to one or more ingredients", http.StatusConflict)
		return
	}

	if err := h.queries.DeleteTag(r.Context(), int64(id)); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
