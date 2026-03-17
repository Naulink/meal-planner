package api

import (
	"log"
	db "meal-planner/db/gen"
	"os"
	"path/filepath"
	"sync"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Handler struct {
	queries   *db.Queries
	pool      *pgxpool.Pool
	uploadDir string
	restoreMu sync.Mutex
}

func NewHandler(pool *pgxpool.Pool, uploadDir string) *Handler {
	for _, sub := range []string{"ingredients", "recipes"} {
		dir := filepath.Join(uploadDir, sub)
		if err := os.MkdirAll(dir, 0755); err != nil {
			log.Printf("warning: could not create upload dir %s: %v", dir, err)
		}
	}
	return &Handler{
		queries:   db.New(pool),
		pool:      pool,
		uploadDir: uploadDir,
	}
}
