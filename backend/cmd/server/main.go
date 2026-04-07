package main

import (
	"context"
	"log"
	"net/http"
	"os"

	_ "meal-planner/docs" // swaggo
	"meal-planner/internal/api"
	"meal-planner/internal/db"
	"meal-planner/internal/middleware"

	httpSwagger "github.com/swaggo/http-swagger"
)

// @title Meal Planner API
// @version 1.0
// @description Meal planner backend
// @host localhost:8080
// @BasePath /
func main() {
	port := os.Getenv("BACKEND_PORT")
	if port == "" {
		port = "8080"
	}

	corsOrigin := os.Getenv("CORS_ORIGIN")
	if corsOrigin == "" {
		corsOrigin = "http://localhost:5173"
	}

	uploadDir := os.Getenv("UPLOAD_DIR")
	if uploadDir == "" {
		uploadDir = "/data/uploads"
	}

	ctx := context.Background()

	dbpool, err := db.NewPool(ctx)
	if err != nil {
		log.Fatal(err)
	}
	defer dbpool.Close()

	handler := api.NewHandler(dbpool, uploadDir)

	mux := http.NewServeMux()

	mux.HandleFunc("/ingredients", func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			handler.ListIngredients(w, r)
		case http.MethodPost:
			handler.CreateIngredient(w, r)
		default:
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		}
	})
	mux.HandleFunc("/ingredients/{id}", func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodPut:
			handler.UpdateIngredient(w, r)
		case http.MethodDelete:
			handler.DeleteIngredient(w, r)
		default:
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		}
	})
	mux.HandleFunc("POST /ingredients/{id}/image", handler.UploadIngredientImage)
	mux.HandleFunc("POST /recipes/{id}/image", handler.UploadRecipeImage)
	mux.Handle("/uploads/", http.StripPrefix("/uploads/", http.FileServer(http.Dir(uploadDir))))

	mux.HandleFunc("/recipes", func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			handler.ListRecipes(w, r)
		case http.MethodPost:
			handler.CreateRecipe(w, r)
		default:
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		}
	})
	mux.HandleFunc("/recipes/{id}", func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			handler.GetRecipe(w, r)
		case http.MethodPut:
			handler.UpdateRecipe(w, r)
		case http.MethodDelete:
			handler.DeleteRecipe(w, r)
		default:
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		}
	})

	mux.HandleFunc("GET /persons", handler.ListPersons)
	mux.HandleFunc("POST /persons", handler.CreatePerson)
	mux.HandleFunc("PUT /persons/{id}", handler.UpdatePerson)
	mux.HandleFunc("DELETE /persons/{id}", handler.DeletePerson)
	mux.HandleFunc("GET /persons/{id}/settings", handler.GetPersonSettings)
	mux.HandleFunc("PUT /persons/{id}/settings", handler.UpdatePersonSettings)

	mux.HandleFunc("GET /meal-plan", handler.ListMealPlanEntries)
	mux.HandleFunc("POST /meal-plan", handler.CreateMealPlanEntry)
	mux.HandleFunc("DELETE /meal-plan", handler.DeleteAllMealPlanEntries)
	mux.HandleFunc("DELETE /meal-plan/day/{dayIndex}", handler.DeleteMealPlanDay)
	mux.HandleFunc("PUT /meal-plan/{id}", handler.UpdateMealPlanEntry)
	mux.HandleFunc("DELETE /meal-plan/{id}", handler.DeleteMealPlanEntry)
	mux.HandleFunc("POST /meal-plan/{id}/customize", handler.CustomizeMealPlanEntry)
	mux.HandleFunc("POST /meal-plan/{id}/ingredients", handler.AddEntryIngredient)
	mux.HandleFunc("PUT /meal-plan/{id}/ingredients/{ingredientId}", handler.UpdateEntryIngredient)
	mux.HandleFunc("DELETE /meal-plan/{id}/ingredients/{ingredientId}", handler.DeleteEntryIngredient)

	mux.HandleFunc("GET /tags", handler.ListTags)
	mux.HandleFunc("POST /tags", handler.CreateTag)
	mux.HandleFunc("PUT /tags/{id}", handler.UpdateTag)
	mux.HandleFunc("DELETE /tags/{id}", handler.DeleteTag)

	mux.HandleFunc("GET /backup", handler.DownloadBackup)
	mux.HandleFunc("POST /backup/restore", handler.RestoreBackup)

	mux.Handle("/swagger/", httpSwagger.WrapHandler)

	log.Printf("Listening on :%s\n", port)
	log.Fatal(http.ListenAndServe(":"+port, middleware.WithCORS(corsOrigin)(mux)))
}
