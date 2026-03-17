FROM golang:1.25-alpine AS builder

WORKDIR /app

# Install goose
RUN go install github.com/pressly/goose/v3/cmd/goose@latest

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o app ./cmd/server

FROM alpine:3.23.2

WORKDIR /app

RUN apk add --no-cache postgresql-client && \
    adduser -D appuser && \
    mkdir -p /data/uploads/ingredients && \
    chown -R appuser:appuser /data/uploads

USER appuser

# Copy binary
COPY --from=builder /app/app .

# Copy goose binary
COPY --from=builder /go/bin/goose /usr/local/bin/goose

# Copy migrations
COPY --from=builder /app/db/migrations /app/db/migrations

EXPOSE 8080

CMD ["sh", "-c", "goose -dir /app/db/migrations postgres \"$DATABASE_URL\" up && ./app"]