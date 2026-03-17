package api

import (
	"context"
	"encoding/json"
	"errors"
	db "meal-planner/db/gen"
	"net/http"
	"strconv"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgtype"
)

type CreateMealPlanEntryRequest struct {
	PersonID     int64    `json:"person_id"`
	DayIndex     int32    `json:"day_index"`
	RecipeID     *int64   `json:"recipe_id"`
	ServingGrams *float64 `json:"serving_grams"`
	IngredientID *int64   `json:"ingredient_id"`
	Amount       *float64 `json:"amount"`
	Unit         *string  `json:"unit"`
}

type UpdateMealPlanEntryRequest struct {
	ServingGrams *float64 `json:"serving_grams"`
	Amount       *float64 `json:"amount"`
}

type IngredientInEntry struct {
	ID                   int64   `json:"id"`
	Name                 string  `json:"name"`
	KcalPer100           float64 `json:"kcal_per_100"`
	ProteinPer100        float64 `json:"protein_per_100"`
	CarbsPer100          float64 `json:"carbs_per_100"`
	FatPer100            float64 `json:"fat_per_100"`
	UnsaturatedFatPer100 float64 `json:"unsaturated_fat_per_100"`
	SugarPer100          float64 `json:"sugar_per_100"`
	ImagePath            *string `json:"image_path"`
	WeightPerUnit        *int32  `json:"weight_per_unit"`
}

type MealPlanEntryResponse struct {
	ID           int64              `json:"id"`
	PersonID     int64              `json:"person_id"`
	DayIndex     int32              `json:"day_index"`
	RecipeID     *int64             `json:"recipe_id"`
	ServingGrams *float64           `json:"serving_grams"`
	Ingredient   *IngredientInEntry `json:"ingredient"`
	Amount       *float64           `json:"amount"`
	Unit         *string            `json:"unit"`
	CreatedAt    string             `json:"created_at"`
}

func toMealPlanEntryResponse(e db.MealPlanEntry) MealPlanEntryResponse {
	return MealPlanEntryResponse{
		ID:           e.ID,
		PersonID:     e.PersonID,
		DayIndex:     e.DayIndex,
		RecipeID:     e.RecipeID,
		ServingGrams: e.ServingGrams,
		Amount:       e.Amount,
		Unit:         e.Unit,
		CreatedAt:    e.CreatedAt.Time.Format("2006-01-02T15:04:05Z"),
	}
}

// ListMealPlanEntries godoc
// @Summary List all meal plan entries
// @Tags meal-plan
// @Produce json
// @Success 200 {array} MealPlanEntryResponse
// @Failure 500 {string} string
// @Router /meal-plan [get]
func (h *Handler) ListMealPlanEntries(w http.ResponseWriter, r *http.Request) {
	const q = `
SELECT mp.id, mp.person_id, mp.day_index, mp.recipe_id, mp.serving_grams,
       mp.ingredient_id, mp.amount, mp.unit, mp.created_at,
       i.name, i.kcal_per_100, i.protein_per_100, i.carbs_per_100, i.fat_per_100,
       i.unsaturated_fat_per_100, i.sugar_per_100,
       i.image_path, i.weight_per_unit
FROM meal_plan_entries mp
LEFT JOIN ingredients i ON mp.ingredient_id = i.id
ORDER BY mp.person_id ASC, mp.day_index ASC, mp.created_at ASC`

	rows, err := h.pool.Query(r.Context(), q)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var resp []MealPlanEntryResponse
	for rows.Next() {
		var (
			id           int64
			personID     int64
			dayIndex     int32
			recipeID     *int64
			servingGrams *float64
			ingredientID *int64
			amount       *float64
			unit         *string
			createdAt    pgtype.Timestamp
			ingName      *string
			ingKcal      *float64
			ingProtein   *float64
			ingCarbs     *float64
			ingFat       *float64
			ingUnsatFat  *float64
			ingSugar     *float64
			ingImagePath *string
			ingWeight    *int32
		)
		if err := rows.Scan(
			&id, &personID, &dayIndex, &recipeID, &servingGrams,
			&ingredientID, &amount, &unit, &createdAt,
			&ingName, &ingKcal, &ingProtein, &ingCarbs, &ingFat,
			&ingUnsatFat, &ingSugar,
			&ingImagePath, &ingWeight,
		); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		entry := MealPlanEntryResponse{
			ID:           id,
			PersonID:     personID,
			DayIndex:     dayIndex,
			RecipeID:     recipeID,
			ServingGrams: servingGrams,
			Amount:       amount,
			Unit:         unit,
			CreatedAt:    createdAt.Time.Format("2006-01-02T15:04:05Z"),
		}
		if ingredientID != nil && ingName != nil {
			entry.Ingredient = &IngredientInEntry{
				ID:                   *ingredientID,
				Name:                 *ingName,
				KcalPer100:           derefFloat64(ingKcal),
				ProteinPer100:        derefFloat64(ingProtein),
				CarbsPer100:          derefFloat64(ingCarbs),
				FatPer100:            derefFloat64(ingFat),
				UnsaturatedFatPer100: derefFloat64(ingUnsatFat),
				SugarPer100:          derefFloat64(ingSugar),
				ImagePath:            ingImagePath,
				WeightPerUnit:        ingWeight,
			}
		}
		resp = append(resp, entry)
	}
	if err := rows.Err(); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if resp == nil {
		resp = []MealPlanEntryResponse{}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

func derefFloat64(p *float64) float64 {
	if p == nil {
		return 0
	}
	return *p
}

// CreateMealPlanEntry godoc
// @Summary Add a meal plan entry
// @Tags meal-plan
// @Accept json
// @Produce json
// @Param entry body CreateMealPlanEntryRequest true "Entry"
// @Success 201 {object} MealPlanEntryResponse
// @Failure 400 {string} string
// @Failure 409 {string} string
// @Failure 500 {string} string
// @Router /meal-plan [post]
func (h *Handler) CreateMealPlanEntry(w http.ResponseWriter, r *http.Request) {
	var req CreateMealPlanEntryRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid body", http.StatusBadRequest)
		return
	}
	if req.DayIndex < 1 {
		http.Error(w, "day_index must be >= 1", http.StatusBadRequest)
		return
	}

	hasRecipe := req.RecipeID != nil
	hasIngredient := req.IngredientID != nil

	if hasRecipe && hasIngredient {
		http.Error(w, "provide either recipe_id or ingredient_id, not both", http.StatusBadRequest)
		return
	}
	if !hasRecipe && !hasIngredient {
		http.Error(w, "provide either recipe_id or ingredient_id", http.StatusBadRequest)
		return
	}
	if hasRecipe && (req.ServingGrams == nil || *req.ServingGrams <= 0) {
		http.Error(w, "serving_grams must be > 0 for recipe entries", http.StatusBadRequest)
		return
	}
	if hasIngredient && (req.Amount == nil || *req.Amount <= 0) {
		http.Error(w, "amount must be > 0 for ingredient entries", http.StatusBadRequest)
		return
	}
	if hasIngredient && (req.Unit == nil || (*req.Unit != "g" && *req.Unit != "ml" && *req.Unit != "pcs")) {
		http.Error(w, "unit must be one of: g, ml, pcs", http.StatusBadRequest)
		return
	}

	entry, err := h.queries.CreateMealPlanEntry(r.Context(), db.CreateMealPlanEntryParams{
		PersonID:     req.PersonID,
		DayIndex:     req.DayIndex,
		RecipeID:     req.RecipeID,
		ServingGrams: req.ServingGrams,
		IngredientID: req.IngredientID,
		Amount:       req.Amount,
		Unit:         req.Unit,
	})
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) {
			switch pgErr.Code {
			case "23503":
				http.Error(w, "invalid person_id, recipe_id, or ingredient_id", http.StatusConflict)
				return
			case "23514":
				http.Error(w, "invalid entry data: "+pgErr.Message, http.StatusBadRequest)
				return
			}
		}
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(toMealPlanEntryResponse(db.MealPlanEntry{
		ID:           entry.ID,
		PersonID:     entry.PersonID,
		DayIndex:     entry.DayIndex,
		RecipeID:     entry.RecipeID,
		ServingGrams: entry.ServingGrams,
		IngredientID: entry.IngredientID,
		Amount:       entry.Amount,
		Unit:         entry.Unit,
		CreatedAt:    entry.CreatedAt,
	}))
}

// UpdateMealPlanEntry godoc
// @Summary Update a meal plan entry's serving grams or amount
// @Tags meal-plan
// @Accept json
// @Produce json
// @Param id path int true "Entry ID"
// @Param entry body UpdateMealPlanEntryRequest true "Entry"
// @Success 200 {object} MealPlanEntryResponse
// @Failure 400 {string} string
// @Failure 404 {string} string
// @Failure 500 {string} string
// @Router /meal-plan/{id} [put]
func (h *Handler) UpdateMealPlanEntry(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		http.Error(w, "invalid id", http.StatusBadRequest)
		return
	}

	var req UpdateMealPlanEntryRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid body", http.StatusBadRequest)
		return
	}

	entry, err := h.queries.UpdateMealPlanEntry(r.Context(), db.UpdateMealPlanEntryParams{
		ID:           id,
		ServingGrams: req.ServingGrams,
		Amount:       req.Amount,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			http.Error(w, "entry not found", http.StatusNotFound)
			return
		}
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23514" {
			http.Error(w, "invalid entry data: "+pgErr.Message, http.StatusBadRequest)
			return
		}
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(toMealPlanEntryResponse(db.MealPlanEntry{
		ID:           entry.ID,
		PersonID:     entry.PersonID,
		DayIndex:     entry.DayIndex,
		RecipeID:     entry.RecipeID,
		ServingGrams: entry.ServingGrams,
		IngredientID: entry.IngredientID,
		Amount:       entry.Amount,
		Unit:         entry.Unit,
		CreatedAt:    entry.CreatedAt,
	}))
}

// DeleteMealPlanEntry godoc
// @Summary Remove a single meal plan entry
// @Tags meal-plan
// @Param id path int true "Entry ID"
// @Success 204
// @Failure 400 {string} string
// @Failure 500 {string} string
// @Router /meal-plan/{id} [delete]
func (h *Handler) DeleteMealPlanEntry(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		http.Error(w, "invalid id", http.StatusBadRequest)
		return
	}

	if err := h.queries.DeleteMealPlanEntry(r.Context(), id); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// DeleteMealPlanDay godoc
// @Summary Delete all entries for a specific day and reindex subsequent days
// @Tags meal-plan
// @Param dayIndex path int true "Day Index (>= 1)"
// @Success 204
// @Failure 400 {string} string
// @Failure 500 {string} string
// @Router /meal-plan/day/{dayIndex} [delete]
func (h *Handler) DeleteMealPlanDay(w http.ResponseWriter, r *http.Request) {
	dayIndex, err := strconv.ParseInt(r.PathValue("dayIndex"), 10, 32)
	if err != nil || dayIndex < 1 {
		http.Error(w, "dayIndex must be a positive integer", http.StatusBadRequest)
		return
	}

	tx, err := h.pool.Begin(r.Context())
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer tx.Rollback(context.Background())

	if _, err := tx.Exec(r.Context(),
		"DELETE FROM meal_plan_entries WHERE day_index = $1",
		int32(dayIndex),
	); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if _, err := tx.Exec(r.Context(),
		"UPDATE meal_plan_entries SET day_index = day_index - 1 WHERE day_index > $1",
		int32(dayIndex),
	); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	if err := tx.Commit(r.Context()); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// DeleteAllMealPlanEntries godoc
// @Summary Delete all meal plan entries (reset)
// @Tags meal-plan
// @Success 204
// @Failure 500 {string} string
// @Router /meal-plan [delete]
func (h *Handler) DeleteAllMealPlanEntries(w http.ResponseWriter, r *http.Request) {
	if err := h.queries.DeleteAllMealPlanEntries(r.Context()); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
