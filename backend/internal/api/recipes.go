package api

import (
	"context"
	"encoding/json"
	"errors"
	db "meal-planner/db/gen"
	"net/http"
	"os"
	"path/filepath"
	"strconv"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

type RecipeIngredientRequest struct {
	IngredientID int64   `json:"ingredient_id"`
	Amount       float64 `json:"amount"`
	Unit         string  `json:"unit"`
}

type CreateRecipeRequest struct {
	Name            string                    `json:"name"`
	Description     *string                   `json:"description"`
	Steps           *string                   `json:"steps"`
	Ingredients     []RecipeIngredientRequest `json:"ingredients"`
	TagIDs          []int64                   `json:"tag_ids,omitempty"`
	CookTimeMinutes *int32                    `json:"cook_time_minutes,omitempty"`
	Persons         int32                     `json:"persons"`
	Yield           float64                   `json:"yield"`
}

type RecipeIngredientResponse struct {
	IngredientID         int64         `json:"ingredient_id"`
	Name                 string        `json:"name"`
	Amount               float64       `json:"amount"`
	Unit                 string        `json:"unit"`
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
}

type RecipeResponse struct {
	ID              int64                      `json:"id"`
	Name            string                     `json:"name"`
	Description     *string                    `json:"description"`
	Steps           *string                    `json:"steps"`
	ImageURL        *string                    `json:"image_url"`
	Ingredients     []RecipeIngredientResponse `json:"ingredients"`
	IngredientCount int                        `json:"ingredient_count"`
	Tags            []TagResponse              `json:"tags"`
	CookTimeMinutes *int32                     `json:"cook_time_minutes,omitempty"`
	Persons         int32                      `json:"persons"`
	Yield           float64                    `json:"yield"`
}

func toRecipeResponse(r db.Recipe, ingredients []db.ListRecipeIngredientsRow, tagsByIngredient map[int64][]db.Tag, recipeTags []db.Tag) RecipeResponse {
	ingResp := make([]RecipeIngredientResponse, len(ingredients))
	for i, ing := range ingredients {
		tags := tagsByIngredient[ing.IngredientID]
		tagResp := make([]TagResponse, len(tags))
		for j, t := range tags {
			tagResp[j] = toTagResponse(t)
		}
		ingResp[i] = RecipeIngredientResponse{
			IngredientID:         ing.IngredientID,
			Name:                 ing.Name,
			Amount:               ing.Amount,
			Unit:                 ing.Unit,
			KcalPer100:           ing.KcalPer100,
			ProteinPer100:        ing.ProteinPer100,
			CarbsPer100:          ing.CarbsPer100,
			FatPer100:            ing.FatPer100,
			UnsaturatedFatPer100: ing.UnsaturatedFatPer100,
			SugarPer100:          ing.SugarPer100,
			NutritionBasis:       ing.NutritionBasis,
			PiecesAllowed:        ing.PiecesAllowed,
			WeightPerUnit:        ing.WeightPerUnit,
			Tags:                 tagResp,
		}
	}
	var imageURL *string
	if r.ImagePath != nil {
		u := "/uploads/" + *r.ImagePath
		imageURL = &u
	}
	tagResp := make([]TagResponse, len(recipeTags))
	for i, t := range recipeTags {
		tagResp[i] = toTagResponse(t)
	}
	return RecipeResponse{
		ID:              r.ID,
		Name:            r.Name,
		Description:     r.Description,
		Steps:           r.Steps,
		ImageURL:        imageURL,
		Ingredients:     ingResp,
		IngredientCount: len(ingResp),
		Tags:            tagResp,
		CookTimeMinutes: r.CookTimeMinutes,
		Persons:         r.Persons,
		Yield:           r.Yield,
	}
}


func isPgTriggerError(err error) bool {
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) {
		// P0001 = raise_exception (trigger error), 23514 = check_violation
		return pgErr.Code == "P0001" || pgErr.Code == "23514"
	}
	return false
}

// ListRecipes godoc
// @Summary List all recipes
// @Tags recipes
// @Produce json
// @Success 200 {array} RecipeResponse
// @Router /recipes [get]
func (h *Handler) ListRecipes(w http.ResponseWriter, r *http.Request) {
	recipes, err := h.queries.ListRecipes(r.Context())
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	resp := make([]RecipeResponse, len(recipes))
	for i, rec := range recipes {
		ings, err := h.queries.ListRecipeIngredients(r.Context(), rec.ID)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		tagsByIng, err := h.fetchTagsForRecipeIngredients(r.Context(), ings)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		recipeTags, err := h.queries.GetRecipeTags(r.Context(), rec.ID)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		resp[i] = toRecipeResponse(rec, ings, tagsByIng, recipeTags)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

// GetRecipe godoc
// @Summary Get recipe by ID
// @Tags recipes
// @Produce json
// @Param id path int true "Recipe ID"
// @Success 200 {object} RecipeResponse
// @Failure 404 {string} string
// @Router /recipes/{id} [get]
func (h *Handler) GetRecipe(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.Atoi(r.PathValue("id"))
	if err != nil {
		http.Error(w, "invalid id", http.StatusBadRequest)
		return
	}

	recipe, err := h.queries.GetRecipe(r.Context(), int64(id))
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			http.Error(w, "recipe not found", http.StatusNotFound)
			return
		}
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	ings, err := h.queries.ListRecipeIngredients(r.Context(), recipe.ID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	tagsByIng, err := h.fetchTagsForRecipeIngredients(r.Context(), ings)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	recipeTags, err := h.queries.GetRecipeTags(r.Context(), recipe.ID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(toRecipeResponse(recipe, ings, tagsByIng, recipeTags))
}

// CreateRecipe godoc
// @Summary Create recipe
// @Tags recipes
// @Accept json
// @Produce json
// @Param recipe body CreateRecipeRequest true "Recipe"
// @Success 201 {object} RecipeResponse
// @Failure 400 {string} string
// @Failure 409 {string} string
// @Router /recipes [post]
func (h *Handler) CreateRecipe(w http.ResponseWriter, r *http.Request) {
	var req CreateRecipeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid body", http.StatusBadRequest)
		return
	}
	if req.Persons < 1 {
		http.Error(w, "persons must be >= 1", http.StatusBadRequest)
		return
	}
	if req.Yield == 0 {
		req.Yield = 100
	}
	if req.Yield < 1 {
		http.Error(w, "yield must be >= 1", http.StatusBadRequest)
		return
	}

	tx, err := h.pool.Begin(r.Context())
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer tx.Rollback(r.Context())

	qtx := h.queries.WithTx(tx)

	recipe, err := qtx.CreateRecipe(r.Context(), db.CreateRecipeParams{
		Name:            req.Name,
		Description:     req.Description,
		Steps:           req.Steps,
		CookTimeMinutes: req.CookTimeMinutes,
		Persons:         req.Persons,
		Yield:           req.Yield,
	})
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			http.Error(w, "recipe name already exists", http.StatusConflict)
			return
		}
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	for _, ing := range req.Ingredients {
		if err := qtx.AddRecipeIngredient(r.Context(), db.AddRecipeIngredientParams{
			RecipeID:     recipe.ID,
			IngredientID: ing.IngredientID,
			Amount:       ing.Amount,
			Unit:         ing.Unit,
		}); err != nil {
			if isPgTriggerError(err) {
				http.Error(w, extractPgMessage(err), http.StatusConflict)
				return
			}
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
	}

	for _, tagID := range req.TagIDs {
		if err := qtx.AddRecipeTag(r.Context(), db.AddRecipeTagParams{
			RecipeID: recipe.ID,
			TagID:    tagID,
		}); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
	}

	if err := tx.Commit(r.Context()); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	ings, _ := h.queries.ListRecipeIngredients(r.Context(), recipe.ID)
	tagsByIng, _ := h.fetchTagsForRecipeIngredients(r.Context(), ings)
	recipeTags, _ := h.queries.GetRecipeTags(r.Context(), recipe.ID)
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(toRecipeResponse(recipe, ings, tagsByIng, recipeTags))
}

// UpdateRecipe godoc
// @Summary Update recipe
// @Tags recipes
// @Accept json
// @Produce json
// @Param id path int true "Recipe ID"
// @Param recipe body CreateRecipeRequest true "Recipe"
// @Success 200 {object} RecipeResponse
// @Failure 400 {string} string
// @Failure 404 {string} string
// @Failure 409 {string} string
// @Router /recipes/{id} [put]
func (h *Handler) UpdateRecipe(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.Atoi(r.PathValue("id"))
	if err != nil {
		http.Error(w, "invalid id", http.StatusBadRequest)
		return
	}

	var req CreateRecipeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid body", http.StatusBadRequest)
		return
	}
	if req.Persons < 1 {
		http.Error(w, "persons must be >= 1", http.StatusBadRequest)
		return
	}
	if req.Yield == 0 {
		req.Yield = 100
	}
	if req.Yield < 1 {
		http.Error(w, "yield must be >= 1", http.StatusBadRequest)
		return
	}

	tx, err := h.pool.Begin(r.Context())
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer tx.Rollback(r.Context())

	qtx := h.queries.WithTx(tx)

	recipe, err := qtx.UpdateRecipe(r.Context(), db.UpdateRecipeParams{
		ID:              int64(id),
		Name:            req.Name,
		Description:     req.Description,
		Steps:           req.Steps,
		CookTimeMinutes: req.CookTimeMinutes,
		Persons:         req.Persons,
		Yield:           req.Yield,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			http.Error(w, "recipe not found", http.StatusNotFound)
			return
		}
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			http.Error(w, "recipe name already exists", http.StatusConflict)
			return
		}
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	if err := qtx.DeleteRecipeIngredients(r.Context(), recipe.ID); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	if err := qtx.DeleteRecipeTags(r.Context(), recipe.ID); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	for _, ing := range req.Ingredients {
		if err := qtx.AddRecipeIngredient(r.Context(), db.AddRecipeIngredientParams{
			RecipeID:     recipe.ID,
			IngredientID: ing.IngredientID,
			Amount:       ing.Amount,
			Unit:         ing.Unit,
		}); err != nil {
			if isPgTriggerError(err) {
				http.Error(w, extractPgMessage(err), http.StatusConflict)
				return
			}
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
	}

	for _, tagID := range req.TagIDs {
		if err := qtx.AddRecipeTag(r.Context(), db.AddRecipeTagParams{
			RecipeID: recipe.ID,
			TagID:    tagID,
		}); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
	}

	if err := tx.Commit(r.Context()); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	ings, _ := h.queries.ListRecipeIngredients(r.Context(), recipe.ID)
	tagsByIng, _ := h.fetchTagsForRecipeIngredients(r.Context(), ings)
	recipeTags, _ := h.queries.GetRecipeTags(r.Context(), recipe.ID)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(toRecipeResponse(recipe, ings, tagsByIng, recipeTags))
}

// DeleteRecipe godoc
// @Summary Delete recipe
// @Tags recipes
// @Param id path int true "Recipe ID"
// @Success 204
// @Failure 400 {string} string
// @Router /recipes/{id} [delete]
func (h *Handler) DeleteRecipe(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.Atoi(r.PathValue("id"))
	if err != nil {
		http.Error(w, "invalid id", http.StatusBadRequest)
		return
	}

	recipe, err := h.queries.GetRecipe(r.Context(), int64(id))
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	if err := h.queries.DeleteRecipe(r.Context(), int64(id)); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	if recipe.ImagePath != nil {
		_ = os.Remove(filepath.Join(h.uploadDir, *recipe.ImagePath))
	}

	w.WriteHeader(http.StatusNoContent)
}

func extractPgMessage(err error) string {
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) {
		return pgErr.Message
	}
	return err.Error()
}

// fetchTagsForRecipeIngredients returns a map of ingredient ID -> tags for the given recipe ingredient rows.
func (h *Handler) fetchTagsForRecipeIngredients(ctx context.Context, ings []db.ListRecipeIngredientsRow) (map[int64][]db.Tag, error) {
	result := make(map[int64][]db.Tag, len(ings))
	for _, ing := range ings {
		if _, ok := result[ing.IngredientID]; ok {
			continue
		}
		tags, err := h.queries.GetIngredientTags(ctx, ing.IngredientID)
		if err != nil {
			return nil, err
		}
		result[ing.IngredientID] = tags
	}
	return result, nil
}

