package api

import (
	"archive/zip"
	"bytes"
	"context"
	"fmt"
	"io"
	"io/fs"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"
)

// DownloadBackup streams a zip containing a pg_dump and all uploaded images.
func (h *Handler) DownloadBackup(w http.ResponseWriter, r *http.Request) {
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		http.Error(w, "DATABASE_URL not configured", http.StatusInternalServerError)
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Minute)
	defer cancel()

	// Run pg_dump into a buffer so we can detect errors before streaming.
	cmd := exec.CommandContext(ctx, "pg_dump", "--no-owner", "--no-acl", "-F", "p", dbURL)
	var dumpBuf bytes.Buffer
	var dumpErr bytes.Buffer
	cmd.Stdout = &dumpBuf
	cmd.Stderr = &dumpErr
	if err := cmd.Run(); err != nil {
		http.Error(w, fmt.Sprintf("pg_dump failed: %s", dumpErr.String()), http.StatusInternalServerError)
		return
	}

	timestamp := time.Now().UTC().Format(time.RFC3339)
	filename := fmt.Sprintf("backup-%s.zip", timestamp)

	w.Header().Set("Content-Type", "application/zip")
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=%q", filename))

	zw := zip.NewWriter(w)
	defer zw.Close()

	// Add dump.sql
	dumpEntry, err := zw.Create("dump.sql")
	if err != nil {
		return
	}
	if _, err := io.Copy(dumpEntry, &dumpBuf); err != nil {
		return
	}

	// Walk uploads dir and add each file
	uploadDir := h.uploadDir
	_ = filepath.WalkDir(uploadDir, func(path string, d fs.DirEntry, err error) error {
		if err != nil || d.IsDir() {
			return nil
		}
		rel, err := filepath.Rel(uploadDir, path)
		if err != nil {
			return nil
		}
		entry, err := zw.Create("uploads/" + rel)
		if err != nil {
			return nil
		}
		f, err := os.Open(path)
		if err != nil {
			return nil
		}
		defer f.Close()
		_, _ = io.Copy(entry, f)
		return nil
	})
}

// RestoreBackup restores a previously downloaded backup zip.
func (h *Handler) RestoreBackup(w http.ResponseWriter, r *http.Request) {
	if !h.restoreMu.TryLock() {
		http.Error(w, "restore already in progress", http.StatusConflict)
		return
	}
	defer h.restoreMu.Unlock()

	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		http.Error(w, "DATABASE_URL not configured", http.StatusInternalServerError)
		return
	}

	if err := r.ParseMultipartForm(500 << 20); err != nil {
		http.Error(w, "failed to parse form: "+err.Error(), http.StatusBadRequest)
		return
	}

	file, _, err := r.FormFile("file")
	if err != nil {
		http.Error(w, "missing file field", http.StatusBadRequest)
		return
	}
	defer file.Close()

	zipBytes, err := io.ReadAll(file)
	if err != nil {
		http.Error(w, "failed to read file", http.StatusBadRequest)
		return
	}

	zr, err := zip.NewReader(bytes.NewReader(zipBytes), int64(len(zipBytes)))
	if err != nil {
		http.Error(w, "invalid zip file: "+err.Error(), http.StatusBadRequest)
		return
	}

	var dumpEntry *zip.File
	for _, f := range zr.File {
		if f.Name == "dump.sql" {
			dumpEntry = f
			break
		}
	}
	if dumpEntry == nil {
		http.Error(w, "zip does not contain dump.sql", http.StatusBadRequest)
		return
	}

	dumpReader, err := dumpEntry.Open()
	if err != nil {
		http.Error(w, "failed to open dump.sql: "+err.Error(), http.StatusInternalServerError)
		return
	}
	dumpSQL, err := io.ReadAll(dumpReader)
	dumpReader.Close()
	if err != nil {
		http.Error(w, "failed to read dump.sql: "+err.Error(), http.StatusInternalServerError)
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Minute)
	defer cancel()

	// Wipe database and restore from dump.
	// The dump is a full schema+data export, so we must NOT run migrations first —
	// that would create tables before the dump tries to CREATE them, causing the
	// dump's CREATE TABLE statements to fail and leaving sequences out of sync.
	wipeSQL := "DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO CURRENT_USER; GRANT ALL ON SCHEMA public TO PUBLIC;"
	wipeCmd := exec.CommandContext(ctx, "psql", dbURL, "-c", wipeSQL)
	var wipeErr bytes.Buffer
	wipeCmd.Stderr = &wipeErr
	if err := wipeCmd.Run(); err != nil {
		http.Error(w, "failed to wipe database: "+wipeErr.String(), http.StatusInternalServerError)
		return
	}

	// Restore dump.sql — this recreates all tables, sequences, and data.
	psqlCmd := exec.CommandContext(ctx, "psql", dbURL, "-v", "ON_ERROR_STOP=1")
	psqlCmd.Stdin = bytes.NewReader(dumpSQL)
	var psqlErr bytes.Buffer
	psqlCmd.Stderr = &psqlErr
	if err := psqlCmd.Run(); err != nil {
		http.Error(w, "failed to restore dump: "+psqlErr.String(), http.StatusInternalServerError)
		return
	}

	// Wipe contents of uploads dir without removing the dir itself
	// (removing the dir requires write permission on the parent, which is owned by root)
	dirEntries, err := os.ReadDir(h.uploadDir)
	if err != nil && !os.IsNotExist(err) {
		http.Error(w, "failed to read uploads dir: "+err.Error(), http.StatusInternalServerError)
		return
	}
	for _, de := range dirEntries {
		if err := os.RemoveAll(filepath.Join(h.uploadDir, de.Name())); err != nil {
			http.Error(w, "failed to wipe uploads: "+err.Error(), http.StatusInternalServerError)
			return
		}
	}

	for _, f := range zr.File {
		if !strings.HasPrefix(f.Name, "uploads/") || f.FileInfo().IsDir() {
			continue
		}
		rel := strings.TrimPrefix(f.Name, "uploads/")
		if rel == "" {
			continue
		}
		destPath := filepath.Join(h.uploadDir, rel)
		if err := os.MkdirAll(filepath.Dir(destPath), 0755); err != nil {
			continue
		}
		rc, err := f.Open()
		if err != nil {
			continue
		}
		destFile, err := os.Create(destPath)
		if err != nil {
			rc.Close()
			continue
		}
		_, _ = io.Copy(destFile, rc)
		destFile.Close()
		rc.Close()
	}

	w.WriteHeader(http.StatusOK)
}
