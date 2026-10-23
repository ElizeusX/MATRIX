package main

import (
 "encoding/json"
 "log"
 "net/http"
 "os"
 "time"
)

func main() {
 mux := http.NewServeMux()
 mux.HandleFunc("GET /health", func(w http.ResponseWriter, r *http.Request) {
  w.Header().Set("Content-Type", "application/json")
  _ = json.NewEncoder(w).Encode(map[string]string{"status":"ok","service":"matrix-api"})
 })
 mux.HandleFunc("GET /api/v1/products", func(w http.ResponseWriter, r *http.Request) {
  w.Header().Set("Content-Type", "application/json")
  _ = json.NewEncoder(w).Encode(map[string]any{"items":[]any{},"total":0})
 })
 port := os.Getenv("API_PORT")
 if port == "" { port = "8080" }
 log.Printf("MATRIX API listening on :%s",port)
 log.Fatal((&http.Server{Addr:":"+port,Handler:mux,ReadHeaderTimeout:5*time.Second}).ListenAndServe())
}
