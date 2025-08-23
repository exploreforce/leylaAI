## Deployment (AWS EC2 + Docker Compose + Caddy)

Prerequisites:
- Point your domain DNS A record to your EC2 public IP
- Install Docker and Docker Compose on EC2

Steps:
1. Copy repo to EC2 (or pull from Git)
2. cd into `deploy/`
3. Create `.env.prod` from example and fill values:

```
Copy deploy\backend.env.example.txt deploy\backend.env ; Copy deploy\.env.prod.example deploy\.env.prod
```

4. Edit `Caddyfile` and set `{$DOMAIN}` and `{$ACME_EMAIL}` via `.env.prod`
5. Build and start:

```
docker compose -f docker-compose.prod.yml --env-file .env.prod build ; docker compose -f docker-compose.prod.yml --env-file .env.prod up -d
```

Environment variables:
- `.env.prod`: `DOMAIN`, `PUBLIC_ORIGIN`, `ACME_EMAIL`, `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SOCKET_URL`
- `backend.env`: All backend runtime secrets and config

Service URLs:
- Frontend: https://your-domain.example.com
- API: https://your-domain.example.com/api
- Health: https://your-domain.example.com/health


