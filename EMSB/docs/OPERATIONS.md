# Operations Guide

## Production Environment

### Environment Variables

| Variable | Required | Description |
|---|---|---|
| `NODE_ENV` | Yes | Must be `production` |
| `PORT` | No | Server port (default: 4000) |
| `MONGODB_URI` | Yes | MongoDB connection URI (use Atlas or self-hosted with auth) |
| `MONGODB_DATABASE` | Yes | Database name |
| `JWT_SECRET` | Yes | JWT signing key (minimum 32 characters) |
| `JWT_EXPIRES_IN` | Yes | JWT access token expiry (e.g., `24h`) |
| `CORS_ORIGIN` | Yes | Comma-separated allowed origins (e.g., `https://app.eniac.com`) |
| `LOG_LEVEL` | No | Pino log level (default: `info`) |
| `FRONTEND_BASE_URL` | No | Public frontend URL used to build invitation links (default: `http://localhost:5173`) |
| `INVITE_EXPIRY_DAYS` | No | Account invitation validity in days, 1-30 (default: `7`) |
| `MAIL_PROVIDER` | No | `log` (prints emails to the server log, development) or `smtp` (real email, production) |
| `SMTP_HOST` | No | SMTP host (required when `MAIL_PROVIDER=smtp`) |
| `SMTP_PORT` | No | SMTP port (default: `587`; use `465` with `SMTP_SECURE=true`) |
| `SMTP_USER` | No | SMTP username (omit for unauthenticated relays) |
| `SMTP_PASS` | No | SMTP password |
| `SMTP_SECURE` | No | `true` for implicit TLS on port 465 (default: `false`) |
| `MAIL_FROM` | No | From header for outgoing mail (default: `Eniac Inc. EMS <no-reply@eniacinc.com>`) |

### Secrets Management

- Never commit `.env` to Git (it is in `.gitignore`)
- Use a secrets manager (AWS Secrets Manager, HashiCorp Vault, etc.) in production
- Rotate JWT secrets periodically
- Use MongoDB Atlas or a self-hosted replica set with authentication enabled

## CORS Configuration

CORS is configured with an origin allowlist:
- Only listed origins are allowed
- Credentials (cookies, auth headers) are enabled
- Methods: GET, POST, PATCH, DELETE, OPTIONS
- Headers: Content-Type, Authorization, X-Request-ID
- Max age: 86400 seconds (24 hours)

## Logging

Logging uses Pino:
- **Production**: JSON format to stdout for log aggregation
- **Development**: Human-readable format via pino-pretty
- Sensitive fields are redacted: `authorization` headers, `cookies`, `password`, `hashedPassword`
- HTTP request/response logging via `pino-http` with autoLogging
- Each request has a unique `X-Request-ID` for tracing

## Health Checks

| Endpoint | Description |
|---|---|
| `GET /health` | Basic liveness check — returns `{"status":"ok"}` |
| `GET /health/ready` | Readiness check — pings MongoDB, returns 200 if ready, 503 if database unavailable |
| `GET /health/live` | Liveness check — returns `{"status":"alive"}` |

## Graceful Shutdown

The server handles `SIGTERM` and `SIGINT` signals:
1. Stops accepting new HTTP connections
2. Closes the MongoDB connection pool
3. Exits with code 0

## Database Backup Strategy

### MongoDB Atlas
- Automated daily snapshots (Atlas provides these by default)
- Point-in-time recovery (PITR) enabled
- Cross-region backup replication recommended

### Self-Hosted MongoDB
- Use `mongodump` for regular backups:
  ```bash
  mongodump --uri="$MONGODB_URI" --db="$MONGODB_DATABASE" --out=/backup/$(date +%Y%m%d)
  ```
- Schedule via cron (daily full, hourly incrementals):
  ```bash
  0 2 * * * mongodump --uri="$MONGODB_URI" --db="$MONGODB_DATABASE" --out=/backup/$(date +\%Y\%m\%d)
  ```
- Store backups in a separate, encrypted storage bucket
- Test restore procedures periodically

## Monitoring

The application provides:
- **Health endpoints**: `/health`, `/health/ready`, `/health/live`
- **Error logging**: All errors logged with request ID, user ID, and error details
- **Rate limiting**: 1000 req/15min for API, 50 req/15min for auth endpoints
- **Request tracing**: Each request has a unique `X-Request-ID` header

### Recommended Monitoring Setup

For production deployments, add:
1. **APM**: Use New Relic, Datadog, or similar for end-to-end tracing
2. **Log aggregation**: Ship logs to Datadog, ELK, or similar
3. **Infrastructure monitoring**: Monitor CPU, memory, disk, and network
4. **MongoDB monitoring**: Use Atlas monitoring or MongoDB Ops Manager
5. **Alerting**: Alert on health check failures, high error rates, and slow queries

### Key Metrics to Monitor

| Metric | Threshold | Action |
|---|---|---|
| API error rate (5xx) | > 1% | Alert and investigate |
| API latency (p95) | > 500ms | Investigate slow queries |
| MongoDB connection pool | > 80% utilized | Scale pool size |
| Health check failures | Any | Investigate immediately |
| Rate limit hits | > 10/min | Check for abuse |

## API Documentation

OpenAPI 3.0 specification is available at:
- `GET /api-docs` — Returns the OpenAPI spec as JSON

## Deployment

### Docker (Recommended)

```bash
# Build
docker build -t eniac-emsb .

# Run with docker-compose
docker-compose up -d
```

### Manual Deployment

1. Install Node.js 20+
2. Install dependencies: `npm install --production`
3. Set environment variables from `.env.production`
4. Build: `npm run build`
5. Start: `npm start`
6. Or with tsx for development: `npm run dev`

### Production Build

```bash
npm run build      # TypeScript compilation
npm run lint       # Lint check
npm run typecheck  # Type check
npm test            # Run tests
npm start           # Start production server
```

## Email (SMTP) Configuration

Outbound email is used for account invitations sent at the end of onboarding.

- `MAIL_PROVIDER=log` (development): invitation links are printed to the server console instead of being emailed. The invite API still returns `emailSent: true`.
- `MAIL_PROVIDER=smtp` (production): emails are sent via nodemailer. Configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, and `MAIL_FROM`. Use `SMTP_SECURE=true` only for implicit TLS (port 465); for STARTTLS (port 587) keep it `false`.

If the SMTP provider is misconfigured or a send fails, the invitation is still created (`201`) with `emailSent: false` in the response, and the failure is logged — the invite link can be found in the server log when `MAIL_PROVIDER=log`, or the invitation can be resent by HR from the onboarding page.
