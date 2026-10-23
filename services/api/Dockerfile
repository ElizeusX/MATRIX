FROM golang:1.23-alpine AS builder
WORKDIR /src
COPY go.mod ./
COPY . .
RUN go mod tidy && CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/matrix-api ./cmd/server

FROM alpine:3.21
RUN addgroup -S matrix && adduser -S matrix -G matrix
USER matrix
COPY --from=builder /out/matrix-api /usr/local/bin/matrix-api
EXPOSE 8080
ENTRYPOINT ["/usr/local/bin/matrix-api"]
