package api

import (
	"bytes"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	db "meal-planner/db/gen"
	"net/http"
	"os"
	"path/filepath"
	"strconv"

	"github.com/jackc/pgx/v5"
)

const (
	maxUploadSize = 8 << 20 // 8 MB
	maxMemory     = 2 << 20 // 2 MB
)

var allowedMIME = map[string]string{
	"image/jpeg": ".jpg",
	"image/png":  ".png",
	"image/webp": ".webp",
}

// UploadIngredientImage godoc
// @Summary Upload ingredient image
// @Tags ingredients
// @Accept multipart/form-data
// @Produce json
// @Param id path int true "Ingredient ID"
// @Param image formData file true "Image file"
// @Success 201 {object} map[string]string
// @Failure 400 {string} string
// @Failure 404 {string} string
// @Failure 413 {string} string
// @Failure 415 {string} string
// @Router /ingredients/{id}/image [post]
func (h *Handler) UploadIngredientImage(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.Atoi(r.PathValue("id"))
	if err != nil {
		http.Error(w, "invalid id", http.StatusBadRequest)
		return
	}

	// Verify ingredient exists
	_, err = h.queries.GetIngredient(r.Context(), int64(id))
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			http.Error(w, "ingredient not found", http.StatusNotFound)
			return
		}
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, maxUploadSize)
	if err := r.ParseMultipartForm(maxMemory); err != nil {
		http.Error(w, "file too large (max 8 MB)", http.StatusRequestEntityTooLarge)
		return
	}

	file, _, err := r.FormFile("image")
	if err != nil {
		http.Error(w, "missing image field", http.StatusBadRequest)
		return
	}
	defer file.Close()

	// Detect MIME type from first 512 bytes
	header := make([]byte, 512)
	n, err := file.Read(header)
	if err != nil && err != io.EOF {
		http.Error(w, "failed to read file", http.StatusInternalServerError)
		return
	}
	header = header[:n]
	mimeType := http.DetectContentType(header)

	ext, ok := allowedMIME[mimeType]
	if !ok {
		http.Error(w, fmt.Sprintf("unsupported file type: %s", mimeType), http.StatusUnsupportedMediaType)
		return
	}

	// Generate unique filename
	randBytes := make([]byte, 16)
	if _, err := rand.Read(randBytes); err != nil {
		http.Error(w, "failed to generate filename", http.StatusInternalServerError)
		return
	}
	filename := hex.EncodeToString(randBytes) + ext

	// Write file
	destPath := filepath.Join(h.uploadDir, "ingredients", filename)
	dest, err := os.OpenFile(destPath, os.O_WRONLY|os.O_CREATE|os.O_EXCL, 0644)
	if err != nil {
		http.Error(w, "failed to create file", http.StatusInternalServerError)
		return
	}
	defer dest.Close()

	// Reconstruct full stream: already-read header bytes + rest of file
	if _, err := io.Copy(dest, io.MultiReader(bytes.NewReader(header), file)); err != nil {
		http.Error(w, "failed to write file", http.StatusInternalServerError)
		return
	}

	// Update DB
	imagePath := "ingredients/" + filename
	_, err = h.queries.UpdateIngredientImagePath(r.Context(), db.UpdateIngredientImagePathParams{
		ID:        int64(id),
		ImagePath: &imagePath,
	})
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	imageURL := "/uploads/" + imagePath
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]string{"image_url": imageURL})
}

// UploadRecipeImage godoc
// @Summary Upload recipe image
// @Tags recipes
// @Accept multipart/form-data
// @Produce json
// @Param id path int true "Recipe ID"
// @Param image formData file true "Image file"
// @Success 201 {object} map[string]string
// @Failure 400 {string} string
// @Failure 404 {string} string
// @Failure 413 {string} string
// @Failure 415 {string} string
// @Router /recipes/{id}/image [post]
func (h *Handler) UploadRecipeImage(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.Atoi(r.PathValue("id"))
	if err != nil {
		http.Error(w, "invalid id", http.StatusBadRequest)
		return
	}

	// Verify recipe exists
	_, err = h.queries.GetRecipe(r.Context(), int64(id))
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			http.Error(w, "recipe not found", http.StatusNotFound)
			return
		}
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, maxUploadSize)
	if err := r.ParseMultipartForm(maxMemory); err != nil {
		http.Error(w, "file too large (max 8 MB)", http.StatusRequestEntityTooLarge)
		return
	}

	file, _, err := r.FormFile("image")
	if err != nil {
		http.Error(w, "missing image field", http.StatusBadRequest)
		return
	}
	defer file.Close()

	// Detect MIME type from first 512 bytes
	header := make([]byte, 512)
	n, err := file.Read(header)
	if err != nil && err != io.EOF {
		http.Error(w, "failed to read file", http.StatusInternalServerError)
		return
	}
	header = header[:n]
	mimeType := http.DetectContentType(header)

	ext, ok := allowedMIME[mimeType]
	if !ok {
		http.Error(w, fmt.Sprintf("unsupported file type: %s", mimeType), http.StatusUnsupportedMediaType)
		return
	}

	// Generate unique filename
	randBytes := make([]byte, 16)
	if _, err := rand.Read(randBytes); err != nil {
		http.Error(w, "failed to generate filename", http.StatusInternalServerError)
		return
	}
	filename := hex.EncodeToString(randBytes) + ext

	// Write file
	destPath := filepath.Join(h.uploadDir, "recipes", filename)
	dest, err := os.OpenFile(destPath, os.O_WRONLY|os.O_CREATE|os.O_EXCL, 0644)
	if err != nil {
		http.Error(w, "failed to create file", http.StatusInternalServerError)
		return
	}
	defer dest.Close()

	// Reconstruct full stream: already-read header bytes + rest of file
	if _, err := io.Copy(dest, io.MultiReader(bytes.NewReader(header), file)); err != nil {
		http.Error(w, "failed to write file", http.StatusInternalServerError)
		return
	}

	// Update DB
	imagePath := "recipes/" + filename
	_, err = h.queries.UpdateRecipeImagePath(r.Context(), db.UpdateRecipeImagePathParams{
		ID:        int64(id),
		ImagePath: &imagePath,
	})
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	imageURL := "/uploads/" + imagePath
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]string{"image_url": imageURL})
}
