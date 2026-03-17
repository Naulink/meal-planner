package api

import (
	"encoding/json"
	"errors"
	db "meal-planner/db/gen"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

type CreateIngredientRequest struct {
	Name                 string   `json:"name"`
	KcalPer100           float64  `json:"kcal_per_100"`
	ProteinPer100        float64  `json:"protein_per_100"`
	CarbsPer100          float64  `json:"carbs_per_100"`
	FatPer100            float64  `json:"fat_per_100"`
	UnsaturatedFatPer100 float64  `json:"unsaturated_fat_per_100"`
	SugarPer100          float64  `json:"sugar_per_100"`
	NutritionBasis       string   `json:"nutrition_basis"`
	PiecesAllowed        bool     `json:"pieces_allowed"`
	WeightPerUnit        *int32   `json:"weight_per_unit"`
	TagIDs               []int64  `json:"tag_ids"`
}

type IngredientResponse struct {
	ID                   int64         `json:"id"`
	Name                 string        `json:"name"`
	KcalPer100           float64       `json:"kcal_per_100"`
	ProteinPer100        float64       `json:"protein_per_100"`
	CarbsPer100          float64       `json:"carbs_per_100"`
	FatPer100            float64       `json:"fat_per_100"`
	UnsaturatedFatPer100 float64       `json:"unsaturated_fat_per_100"`
	SugarPer100          float64       `json:"sugar_per_100"`
	NutritionBasis       string        `json:"nutrition_basis"`
	PiecesAllowed        bool          `json:"pieces_allowed"`
	WeightPerUnit        *int32        `json:"weight_per_unit"`
	Tags                 []TagResponse `json:"tags"`
	ImageURL             *string       `json:"image_url"`
}

func toIngredientResponse(i db.Ingredient, tags []db.Tag) IngredientResponse {
	var imageURL *string
	if i.ImagePath != nil {
		url := "/uploads/" + *i.ImagePath
		imageURL = &url
	}
	tagResp := make([]TagResponse, len(tags))
	for idx, t := range tags {
		tagResp[idx] = toTagResponse(t)
	}
	return IngredientResponse{
		ID:                   i.ID,
		Name:                 i.Name,
		KcalPer100:           i.KcalPer100,
		ProteinPer100:        i.ProteinPer100,
		CarbsPer100:          i.CarbsPer100,
		FatPer100:            i.FatPer100,
		UnsaturatedFatPer100: i.UnsaturatedFatPer100,
		SugarPer100:          i.SugarPer100,
		NutritionBasis:       i.NutritionBasis,
		PiecesAllowed:        i.PiecesAllowed,
		WeightPerUnit:        i.WeightPerUnit,
		Tags:                 tagResp,
		ImageURL:             imageURL,
	}
}

// ListIngredients godoc
// @Summary List all ingredients
// @Description Returns all ingredients, with optional search/filter params
// @Tags ingredients
// @Produce json
// @Param search query string false "Search by name"
// @Param tags query string false "Comma-separated tag ID filter (AND logic)"
// @Param min_kcal query number false "Minimum kcal per 100g"
// @Param max_kcal query number false "Maximum kcal per 100g"
// @Success 200 {array} IngredientResponse
// @Failure 500 {string} string
// @Router /ingredients [get]
func (h *Handler) ListIngredients(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	search := q.Get("search")
	tagsParam := q.Get("tags")
	minKcalStr := q.Get("min_kcal")
	maxKcalStr := q.Get("max_kcal")

	var tagIDs []int64
	if tagsParam != "" {
		for _, s := range strings.Split(tagsParam, ",") {
			s = strings.TrimSpace(s)
			if s == "" {
				continue
			}
			id, err := strconv.ParseInt(s, 10, 64)
			if err == nil {
				tagIDs = append(tagIDs, id)
			}
		}
	}

	var minKcal, maxKcal float64
	if minKcalStr != "" {
		minKcal, _ = strconv.ParseFloat(minKcalStr, 64)
	}
	if maxKcalStr != "" {
		maxKcal, _ = strconv.ParseFloat(maxKcalStr, 64)
	}

	ctx := r.Context()

	var ingredients []db.Ingredient
	var err error

	if len(tagIDs) > 0 {
		// Get ingredient IDs matching all required tags (AND logic)
		matchedIDs, err := h.queries.SearchIngredientIDsByTagIDs(ctx, db.SearchIngredientIDsByTagIDsParams{
			Column1: tagIDs,
			TagID:   int64(len(tagIDs)),
		})
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		if len(matchedIDs) == 0 {
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode([]IngredientResponse{})
			return
		}
		// Fetch all ingredients then filter by matched IDs and other criteria
		allIngredients, err := h.queries.SearchIngredients(ctx, db.SearchIngredientsParams{
			Column1: search,
			Column2: minKcal,
			Column3: maxKcal,
		})
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		idSet := make(map[int64]bool, len(matchedIDs))
		for _, id := range matchedIDs {
			idSet[id] = true
		}
		for _, ing := range allIngredients {
			if idSet[ing.ID] {
				ingredients = append(ingredients, ing)
			}
		}
	} else if search != "" || minKcal != 0 || maxKcal != 0 {
		ingredients, err = h.queries.SearchIngredients(ctx, db.SearchIngredientsParams{
			Column1: search,
			Column2: minKcal,
			Column3: maxKcal,
		})
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
	} else {
		ingredients, err = h.queries.ListIngredients(ctx)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
	}

	resp := make([]IngredientResponse, len(ingredients))
	for i, ing := range ingredients {
		tags, err := h.queries.GetIngredientTags(ctx, ing.ID)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		resp[i] = toIngredientResponse(ing, tags)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

// CreateIngredient godoc
// @Summary Create ingredient
// @Tags ingredients
// @Accept json
// @Produce json
// @Param ingredient body CreateIngredientRequest true "Ingredient"
// @Success 201 {object} IngredientResponse
// @Failure 400 {string} string
// @Failure 409 {string} string
// @Failure 500 {string} string
// @Router /ingredients [post]
func (h *Handler) CreateIngredient(w http.ResponseWriter, r *http.Request) {
	var req CreateIngredientRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid body", http.StatusBadRequest)
		return
	}

	if req.UnsaturatedFatPer100 > req.FatPer100 {
		http.Error(w, "unsaturated_fat cannot exceed total fat", http.StatusBadRequest)
		return
	}
	if req.SugarPer100 > req.CarbsPer100 {
		http.Error(w, "sugar cannot exceed total carbs", http.StatusBadRequest)
		return
	}

	ctx := r.Context()
	tx, err := h.pool.Begin(ctx)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer tx.Rollback(ctx)

	qtx := h.queries.WithTx(tx)

	ingredient, err := qtx.CreateIngredient(ctx, db.CreateIngredientParams{
		Name:                 req.Name,
		KcalPer100:           req.KcalPer100,
		ProteinPer100:        req.ProteinPer100,
		CarbsPer100:          req.CarbsPer100,
		FatPer100:            req.FatPer100,
		UnsaturatedFatPer100: req.UnsaturatedFatPer100,
		SugarPer100:          req.SugarPer100,
		NutritionBasis:       req.NutritionBasis,
		PiecesAllowed:        req.PiecesAllowed,
		WeightPerUnit:        req.WeightPerUnit,
	})

	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			http.Error(w, "ingredient name already exists", http.StatusConflict)
			return
		}
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	for _, tagID := range req.TagIDs {
		if err := qtx.AddIngredientTag(ctx, db.AddIngredientTagParams{
			IngredientID: ingredient.ID,
			TagID:        tagID,
		}); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
	}

	if err := tx.Commit(ctx); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	tags, err := h.queries.GetIngredientTags(ctx, ingredient.ID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(toIngredientResponse(ingredient, tags))
}

// UpdateIngredient godoc
// @Summary Update ingredient
// @Tags ingredients
// @Accept json
// @Produce json
// @Param id path int true "Ingredient ID"
// @Param ingredient body CreateIngredientRequest true "Ingredient"
// @Success 200 {object} IngredientResponse
// @Failure 400 {string} string
// @Failure 404 {string} string
// @Failure 409 {string} string
// @Failure 500 {string} string
// @Router /ingredients/{id} [put]
func (h *Handler) UpdateIngredient(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.Atoi(r.PathValue("id"))
	if err != nil {
		http.Error(w, "invalid id", http.StatusBadRequest)
		return
	}

	var req CreateIngredientRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid body", http.StatusBadRequest)
		return
	}

	if req.UnsaturatedFatPer100 > req.FatPer100 {
		http.Error(w, "unsaturated_fat cannot exceed total fat", http.StatusBadRequest)
		return
	}
	if req.SugarPer100 > req.CarbsPer100 {
		http.Error(w, "sugar cannot exceed total carbs", http.StatusBadRequest)
		return
	}

	ctx := r.Context()
	tx, err := h.pool.Begin(ctx)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer tx.Rollback(ctx)

	qtx := h.queries.WithTx(tx)

	ingredient, err := qtx.UpdateIngredient(ctx, db.UpdateIngredientParams{
		ID:                   int64(id),
		Name:                 req.Name,
		KcalPer100:           req.KcalPer100,
		ProteinPer100:        req.ProteinPer100,
		CarbsPer100:          req.CarbsPer100,
		FatPer100:            req.FatPer100,
		UnsaturatedFatPer100: req.UnsaturatedFatPer100,
		SugarPer100:          req.SugarPer100,
		NutritionBasis:       req.NutritionBasis,
		PiecesAllowed:        req.PiecesAllowed,
		WeightPerUnit:        req.WeightPerUnit,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			http.Error(w, "ingredient not found", http.StatusNotFound)
			return
		}
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			http.Error(w, "ingredient name already exists", http.StatusConflict)
			return
		}
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Replace all tags: delete existing, insert new
	if err := qtx.DeleteIngredientTags(ctx, ingredient.ID); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	for _, tagID := range req.TagIDs {
		if err := qtx.AddIngredientTag(ctx, db.AddIngredientTagParams{
			IngredientID: ingredient.ID,
			TagID:        tagID,
		}); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
	}

	if err := tx.Commit(ctx); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	tags, err := h.queries.GetIngredientTags(ctx, ingredient.ID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(toIngredientResponse(ingredient, tags))
}

// DeleteIngredient godoc
// @Summary Delete ingredient
// @Tags ingredients
// @Param id path int true "Ingredient ID"
// @Success 204
// @Failure 400 {string} string
// @Failure 409 {string} string
// @Router /ingredients/{id} [delete]
func (h *Handler) DeleteIngredient(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.Atoi(r.PathValue("id"))
	if err != nil {
		http.Error(w, "invalid id", http.StatusBadRequest)
		return
	}

	ingredient, err := h.queries.GetIngredient(r.Context(), int64(id))
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	if err := h.queries.DeleteIngredient(r.Context(), int64(id)); err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23503" {
			http.Error(w, "ingredient is used in one or more recipes", http.StatusConflict)
			return
		}
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	if ingredient.ImagePath != nil {
		_ = os.Remove(filepath.Join(h.uploadDir, *ingredient.ImagePath))
	}

	w.WriteHeader(http.StatusNoContent)
}
