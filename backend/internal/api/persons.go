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

type CreatePersonRequest struct {
	Name   string `json:"name"`
	Gender string `json:"gender"`
	Age    int    `json:"age"`
}

type UpdatePersonRequest struct {
	Name   string `json:"name"`
	Gender string `json:"gender"`
	Age    int    `json:"age"`
}

type UpdatePersonSettingsRequest struct {
	TargetKcal    int32 `json:"target_kcal"`
	TargetProtein int32 `json:"target_protein"`
	TargetCarbs   int32 `json:"target_carbs"`
	TargetFat     int32 `json:"target_fat"`
}

type PersonSettingsResponse struct {
	PersonID      int64 `json:"person_id"`
	TargetKcal    int32 `json:"target_kcal"`
	TargetProtein int32 `json:"target_protein"`
	TargetCarbs   int32 `json:"target_carbs"`
	TargetFat     int32 `json:"target_fat"`
}

type PersonResponse struct {
	ID        int64                  `json:"id"`
	Name      string                 `json:"name"`
	Gender    string                 `json:"gender"`
	Age       int32                  `json:"age"`
	Settings  PersonSettingsResponse `json:"settings"`
	CreatedAt string                 `json:"created_at"`
}

func toPersonSettingsResponse(personID int64, s db.PersonSetting) PersonSettingsResponse {
	return PersonSettingsResponse{
		PersonID:      personID,
		TargetKcal:    s.TargetKcal,
		TargetProtein: s.TargetProtein,
		TargetCarbs:   s.TargetCarbs,
		TargetFat:     s.TargetFat,
	}
}

func toPersonResponse(p db.Person, s db.PersonSetting) PersonResponse {
	return PersonResponse{
		ID:     p.ID,
		Name:   p.Name,
		Gender: p.Gender,
		Age:    p.Age,
		Settings: PersonSettingsResponse{
			PersonID:      p.ID,
			TargetKcal:    s.TargetKcal,
			TargetProtein: s.TargetProtein,
			TargetCarbs:   s.TargetCarbs,
			TargetFat:     s.TargetFat,
		},
		CreatedAt: p.CreatedAt.Time.Format("2006-01-02T15:04:05Z"),
	}
}

func toPersonResponseFromRow(row db.ListPersonsWithSettingsRow) PersonResponse {
	var settings PersonSettingsResponse
	settings.PersonID = row.ID
	if row.TargetKcal != nil {
		settings.TargetKcal = *row.TargetKcal
	}
	if row.TargetProtein != nil {
		settings.TargetProtein = *row.TargetProtein
	}
	if row.TargetCarbs != nil {
		settings.TargetCarbs = *row.TargetCarbs
	}
	if row.TargetFat != nil {
		settings.TargetFat = *row.TargetFat
	}
	return PersonResponse{
		ID:        row.ID,
		Name:      row.Name,
		Gender:    row.Gender,
		Age:       row.Age,
		Settings:  settings,
		CreatedAt: row.CreatedAt.Time.Format("2006-01-02T15:04:05Z"),
	}
}

// ListPersons godoc
// @Summary List all persons
// @Tags persons
// @Produce json
// @Success 200 {array} PersonResponse
// @Failure 500 {string} string
// @Router /persons [get]
func (h *Handler) ListPersons(w http.ResponseWriter, r *http.Request) {
	rows, err := h.queries.ListPersonsWithSettings(r.Context())
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	resp := make([]PersonResponse, len(rows))
	for i, row := range rows {
		resp[i] = toPersonResponseFromRow(row)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

// CreatePerson godoc
// @Summary Create a person
// @Tags persons
// @Accept json
// @Produce json
// @Param person body CreatePersonRequest true "Person"
// @Success 201 {object} PersonResponse
// @Failure 400 {string} string
// @Failure 500 {string} string
// @Router /persons [post]
func (h *Handler) CreatePerson(w http.ResponseWriter, r *http.Request) {
	var req CreatePersonRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid body", http.StatusBadRequest)
		return
	}
	if req.Name == "" {
		http.Error(w, "name is required", http.StatusBadRequest)
		return
	}
	if req.Gender != "male" && req.Gender != "female" && req.Gender != "other" {
		http.Error(w, "gender must be male, female, or other", http.StatusBadRequest)
		return
	}
	if req.Age <= 0 {
		http.Error(w, "age must be a positive integer", http.StatusBadRequest)
		return
	}

	tx, err := h.pool.Begin(r.Context())
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer tx.Rollback(r.Context())
	qtx := h.queries.WithTx(tx)

	person, err := qtx.CreatePerson(r.Context(), db.CreatePersonParams{
		Name:   req.Name,
		Gender: req.Gender,
		Age:    int32(req.Age),
	})
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23514" {
			http.Error(w, "invalid person data: "+pgErr.Message, http.StatusBadRequest)
			return
		}
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	settings, err := qtx.CreatePersonSettings(r.Context(), db.CreatePersonSettingsParams{
		PersonID:      person.ID,
		TargetKcal:    2000,
		TargetProtein: 150,
		TargetCarbs:   200,
		TargetFat:     65,
	})
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	if err := tx.Commit(r.Context()); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(toPersonResponse(person, settings))
}

// UpdatePerson godoc
// @Summary Update a person
// @Tags persons
// @Accept json
// @Produce json
// @Param id path int true "Person ID"
// @Param person body UpdatePersonRequest true "Person"
// @Success 200 {object} PersonResponse
// @Failure 400 {string} string
// @Failure 404 {string} string
// @Failure 500 {string} string
// @Router /persons/{id} [put]
func (h *Handler) UpdatePerson(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		http.Error(w, "invalid id", http.StatusBadRequest)
		return
	}

	var req UpdatePersonRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid body", http.StatusBadRequest)
		return
	}

	person, err := h.queries.UpdatePerson(r.Context(), db.UpdatePersonParams{
		ID:     id,
		Name:   req.Name,
		Gender: req.Gender,
		Age:    int32(req.Age),
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			http.Error(w, "person not found", http.StatusNotFound)
			return
		}
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23514" {
			http.Error(w, "invalid person data: "+pgErr.Message, http.StatusBadRequest)
			return
		}
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	settings, err := h.queries.GetPersonSettings(r.Context(), id)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(toPersonResponse(person, settings))
}

// DeletePerson godoc
// @Summary Delete a person
// @Tags persons
// @Param id path int true "Person ID"
// @Success 204
// @Failure 400 {string} string
// @Failure 500 {string} string
// @Router /persons/{id} [delete]
func (h *Handler) DeletePerson(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		http.Error(w, "invalid id", http.StatusBadRequest)
		return
	}

	if err := h.queries.DeletePerson(r.Context(), id); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// GetPersonSettings godoc
// @Summary Get person's nutritional goals
// @Tags persons
// @Produce json
// @Param id path int true "Person ID"
// @Success 200 {object} PersonSettingsResponse
// @Failure 400 {string} string
// @Failure 404 {string} string
// @Failure 500 {string} string
// @Router /persons/{id}/settings [get]
func (h *Handler) GetPersonSettings(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		http.Error(w, "invalid id", http.StatusBadRequest)
		return
	}

	settings, err := h.queries.GetPersonSettings(r.Context(), id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			http.Error(w, "person not found", http.StatusNotFound)
			return
		}
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(toPersonSettingsResponse(id, settings))
}

// UpdatePersonSettings godoc
// @Summary Update person's nutritional goals
// @Tags persons
// @Accept json
// @Produce json
// @Param id path int true "Person ID"
// @Param settings body UpdatePersonSettingsRequest true "Settings"
// @Success 200 {object} PersonSettingsResponse
// @Failure 400 {string} string
// @Failure 404 {string} string
// @Failure 500 {string} string
// @Router /persons/{id}/settings [put]
func (h *Handler) UpdatePersonSettings(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		http.Error(w, "invalid id", http.StatusBadRequest)
		return
	}

	var req UpdatePersonSettingsRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid body", http.StatusBadRequest)
		return
	}

	settings, err := h.queries.UpdatePersonSettings(r.Context(), db.UpdatePersonSettingsParams{
		PersonID:      id,
		TargetKcal:    req.TargetKcal,
		TargetProtein: req.TargetProtein,
		TargetCarbs:   req.TargetCarbs,
		TargetFat:     req.TargetFat,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			http.Error(w, "person not found", http.StatusNotFound)
			return
		}
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(toPersonSettingsResponse(id, settings))
}
