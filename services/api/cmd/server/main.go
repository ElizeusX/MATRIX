package main

import (
 "database/sql"
 "log"
 "os"
 "time"

 "github.com/ElizeusX/MATRIX/services/api/internal/server"
 _ "github.com/lib/pq"
)

func main() {
 dsn:=os.Getenv("DATABASE_URL")
 if dsn=="" {log.Fatal("DATABASE_URL must be set")}
 db,err:=sql.Open("postgres",dsn)
 if err!=nil{log.Fatal(err)}
 defer db.Close()
 db.SetMaxOpenConns(12)
 db.SetMaxIdleConns(4)
 db.SetConnMaxLifetime(15*time.Minute)
 if err:=server.Run(db);err!=nil{log.Fatal(err)}
}
