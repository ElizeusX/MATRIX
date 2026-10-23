package server

import (
 "net/http"
 "net/http/httptest"
 "testing"
)

func TestAdminRequiresSession(t *testing.T){
 s:=&Server{}
 req:=httptest.NewRequest(http.MethodGet,"/api/v1/admin/orders",nil)
 out:=httptest.NewRecorder()
 s.Handler().ServeHTTP(out,req)
 if out.Code!=http.StatusUnauthorized{t.Fatalf("expected 401; got %d",out.Code)}
}
func TestAdminRejectsInvalidCookie(t *testing.T){
 s:=&Server{}
 req:=httptest.NewRequest(http.MethodGet,"/api/v1/admin/orders",nil)
 req.AddCookie(&http.Cookie{Name:"matrix_admin",Value:"invalid"})
 out:=httptest.NewRecorder()
 s.Handler().ServeHTTP(out,req)
 if out.Code!=http.StatusUnauthorized{t.Fatalf("expected 401; got %d",out.Code)}
}
