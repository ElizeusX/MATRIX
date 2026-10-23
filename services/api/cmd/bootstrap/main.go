package main

import (
 "database/sql"
 "fmt"
 "golang.org/x/term"
 "log"
 "os"
 "strings"

 _ "github.com/lib/pq"
 "golang.org/x/crypto/bcrypt"
)

func main(){
 dsn:=os.Getenv("DATABASE_URL")
 if dsn==""{log.Fatal("DATABASE_URL must be set")}
 email:=strings.ToLower(strings.TrimSpace(os.Getenv("ADMIN_EMAIL")))
 if len(email)<5||!strings.Contains(email,"@"){log.Fatal("set ADMIN_EMAIL to a valid owner email")}
 fmt.Fprint(os.Stderr,"Initial owner password (minimum 14 characters): ")
 raw,err:=term.ReadPassword(int(os.Stdin.Fd()))
 fmt.Fprintln(os.Stderr)
 if err!=nil{log.Fatal(err)}
 password:=string(raw)
 if len(password)<14||len(password)>72{log.Fatal("password length must be 14 to 72 bytes")}
 hashed,err:=bcrypt.GenerateFromPassword([]byte(password),bcrypt.DefaultCost)
 if err!=nil{log.Fatal(err)}
 db,err:=sql.Open("postgres",dsn)
 if err!=nil{log.Fatal(err)}
 defer db.Close()
 var count int
 if err:=db.QueryRow("SELECT count(*) FROM admin_users WHERE role='owner'").Scan(&count);err!=nil{log.Fatal(err)}
 if count!=0{log.Fatal("an owner already exists; refusing to create another through bootstrap")}
 _,err=db.Exec("INSERT INTO admin_users(email,password_hash,role) VALUES($1,$2,'owner')",email,string(hashed))
 if err!=nil{log.Fatal(err)}
 fmt.Println("Owner created; credentials have not been written to a file")
}
