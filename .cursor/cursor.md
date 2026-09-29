# Cursor Cloud Agent Guide

This repository uses a Dockerfile-backed Cursor Cloud Agent environment with Docker-in-Docker and browser automation support. The image includes Go, Node.js, Docker, Docker Compose, AWS CLI, `agent-browser`, Chrome runtime libraries, and preloaded Antimatter Enterprise and Postgres images.

## Skip Flags

Set these environment variables to shorten boot when you already have dependencies or images:

- `CLOUD_AGENT_SKIP_GO_MOD=1` — skip `go mod download`
- `CLOUD_AGENT_SKIP_BUILD_TOOLS=1` — skip `make apply` (manifest/pluginctl build)
- `CLOUD_AGENT_SKIP_WEBAPP_DEPS=1` — skip `npm ci --prefix webapp`
- `CLOUD_AGENT_SKIP_IMAGE_LOAD=1` — skip loading preloaded Docker image archives

When `DOCKERHUB_USERNAME` and `DOCKERHUB_TOKEN` are configured as Cloud Agent secrets, `cloud-agent-start.sh` logs in to Docker Hub so fallback `docker pull` operations avoid anonymous rate limits. Mark `DOCKERHUB_TOKEN` as **redacted** in the dashboard.

## Overview

**Antimatter Boards** (formerly Focalboard) is a project management plugin for Antimatter with:

- **Go server plugin** (`server/`) — compiled with `CGO_ENABLED=0`
- **React/TypeScript webapp** (`webapp/`) — bundled with Webpack

The plugin id is `focalboard`. Bundles are named `boards-<version>.tar.gz` under `dist/`.

## Start Antimatter

After cloud-agent startup, Docker should be ready and Antimatter/Postgres images should be loaded. Start the stack:

```bash
export AM_IMAGE="${ANTIMATTER_IMAGE:-mattermostdevelopment/mattermost-enterprise-edition}:${ANTIMATTER_IMAGE_TAG:-master}"
export AM_PLATFORM="${ANTIMATTER_PLATFORM:-linux/amd64}"
export POSTGRES_IMAGE="${POSTGRES_IMAGE:-postgres}:${POSTGRES_IMAGE_TAG:-16-alpine}"
export AM_DB_USER=mmuser
export AM_DB_PASSWORD=mostest
export AM_DB_NAME=mattermost_test
export AM_ADMIN_USERNAME=admin
export AM_ADMIN_PASSWORD=Password123

docker network create antimatter-dev || true
docker rm -f antimatter am-postgres 2>/dev/null || true
docker volume create am-postgres-data

docker run -d \
  --name am-postgres \
  --network antimatter-dev \
  -e POSTGRES_USER="$AM_DB_USER" \
  -e POSTGRES_PASSWORD="$AM_DB_PASSWORD" \
  -e POSTGRES_DB="$AM_DB_NAME" \
  --health-cmd='pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"' \
  --health-interval=5s \
  --health-timeout=5s \
  --health-retries=24 \
  -v am-postgres-data:/var/lib/postgresql/data \
  "$POSTGRES_IMAGE"

until [ "$(docker inspect -f '{{.State.Health.Status}}' am-postgres)" = "healthy" ]; do
  sleep 2
done

mkdir -p /tmp/antimatter/{config,data,logs,plugins,client-plugins,bleve-indexes}
chmod -R 777 /tmp/antimatter

docker run -d \
  --name antimatter \
  --platform "$AM_PLATFORM" \
  --network antimatter-dev \
  -p 8065:8065 \
  -e MM_SQLSETTINGS_DRIVERNAME=postgres \
  -e "MM_SQLSETTINGS_DATASOURCE=postgres://$AM_DB_USER:$AM_DB_PASSWORD@am-postgres:5432/$AM_DB_NAME?sslmode=disable&connect_timeout=10" \
  -e MM_SERVICESETTINGS_SITEURL=http://localhost:8065 \
  -e MM_SERVICESETTINGS_ENABLEDEVELOPER=true \
  -e MM_SERVICESETTINGS_ENABLELOCALMODE=true \
  -e MM_PLUGINSETTINGS_ENABLEUPLOADS=true \
  -e MM_PLUGINSETTINGS_ENABLEMARKETPLACE=false \
  -e MM_FILESETTINGS_MAXFILESIZE=256000000 \
  -v /tmp/antimatter/config:/mattermost/config \
  -v /tmp/antimatter/data:/mattermost/data \
  -v /tmp/antimatter/logs:/mattermost/logs \
  -v /tmp/antimatter/plugins:/mattermost/plugins \
  -v /tmp/antimatter/client-plugins:/mattermost/client/plugins \
  -v /tmp/antimatter/bleve-indexes:/mattermost/bleve-indexes \
  "$AM_IMAGE"
```

Wait for Antimatter, then create a system admin:

```bash
until curl -fsS http://localhost:8065/api/v4/system/ping | jq -e '.status == "OK"' >/dev/null; do
  sleep 2
done

docker exec antimatter mmctl --local user search "$AM_ADMIN_USERNAME" | grep -q "$AM_ADMIN_USERNAME" || \
  docker exec antimatter mmctl --local user create \
    --email admin@example.com \
    --username "$AM_ADMIN_USERNAME" \
    --password "$AM_ADMIN_PASSWORD" \
    --system-admin
```

Antimatter will be available on port `8065`.

`MM_FILESETTINGS_MAXFILESIZE=256000000` sets `FileSettings.MaxFileSize` to 256 MB so `make dist` bundles (~140 MB) can be uploaded via `pluginctl deploy`. The default limit is 100 MB and fails with `Uploaded plugin size exceeds limit`.

## Deploy The Plugin

Use `AM_DEBUG=true` for faster local-only builds (single platform binary):

```bash
export MM_SERVICESETTINGS_SITEURL=http://localhost:8065
export AM_ADMIN_USERNAME=admin
export AM_ADMIN_PASSWORD=Password123

AM_DEBUG=true make dist
./build/bin/pluginctl deploy focalboard dist/boards-*.tar.gz
```

Or use the Makefile deploy target (rebuilds via `make dist`):

```bash
export MM_SERVICESETTINGS_SITEURL=http://localhost:8065
export AM_ADMIN_USERNAME=admin
export AM_ADMIN_PASSWORD=Password123

AM_DEBUG=true make deploy
```

For iterative webapp work:

```bash
export MM_SERVICESETTINGS_SITEURL=http://localhost:8065
export AM_ADMIN_USERNAME=admin
export AM_ADMIN_PASSWORD=Password123

AM_DEBUG=true make watch
```

## Lint, Test, and Type Check

| Task | Command |
|------|---------|
| Webapp lint + stylelint | `cd webapp && npm run check` |
| Webapp type check | `cd webapp && npm run check-types` |
| Webapp unit tests | `cd webapp && npm run test` |
| Server lint | `cd server && golangci-lint run ./...` |
| Server unit tests | `FOCALBOARD_UNIT_TESTING=1 go test -race -v ./server/...` |
| Full plugin build | `AM_DEBUG=true make dist` |
| E2E tests | `make e2e` (requires Docker + built dist) |

## Drive The Antimatter UI

The Dockerfile installs `agent-browser` and Chrome runtime libraries so cloud agents can test Antimatter through the browser. The agent-browser skill is at `.cursor/skills/agent-browser/SKILL.md`.

After Antimatter is running and the plugin is deployed:

```bash
agent-browser open http://localhost:8065/login
agent-browser snapshot -i
agent-browser fill @e9 "admin"
agent-browser fill @e10 "Password123"
agent-browser click @e8
agent-browser wait --load networkidle
agent-browser screenshot /tmp/artifacts/boards-login.png
agent-browser close
```

Useful checks:

```bash
agent-browser --version
agent-browser skills get core --full
agent-browser install
```

If browser automation fails, rerun `agent-browser install` and inspect the agent-browser output before changing app code.

## Upload Screenshot Artifacts

AWS CLI is installed so cloud agents can upload browser screenshots and other artifacts when AWS credentials and an artifact S3 destination are available.

```bash
mkdir -p /tmp/artifacts
agent-browser screenshot /tmp/artifacts/antimatter-boards.png
aws sts get-caller-identity
aws s3 cp /tmp/artifacts/antimatter-boards.png <artifact-s3-uri>/antimatter-boards.png
```

Do not print AWS credentials or secret environment variables. If `aws sts get-caller-identity` fails, stop and report the missing AWS configuration instead of attempting to work around credentials.

## Gotchas

- The Boards API requires an `X-Requested-With: XMLHttpRequest` header for CSRF protection in addition to the `Authorization: Bearer` header.
- Three server test packages (`server/boards`, `server/integrationtests`, `server/services/store/sqlstore`) require a live PostgreSQL instance. They will fail in environments without one — this is expected. The remaining packages are pure unit tests and pass without a database.
- The `build/sync/` directory has its own `go.mod` and its tests may not compile with current Go versions — this is a pre-existing repo issue.
- Templates archive must be built before server compilation: `make templates-archive`. The `make dist` / `make server` targets handle this automatically.
- Plugin deploy needs `MM_PLUGINSETTINGS_ENABLEUPLOADS=true` and `FileSettings.MaxFileSize` large enough for the bundle (see **Start Antimatter**). If Antimatter was started without `MM_FILESETTINGS_MAXFILESIZE`, raise it before deploy: `docker exec antimatter mmctl --local config set FileSettings.MaxFileSize 256000000 && docker exec antimatter mmctl --local config reload`.

## Troubleshooting

- If Docker Hub rate limits block fallback pulls, configure `DOCKERHUB_USERNAME` and `DOCKERHUB_TOKEN` as Cloud Agent secrets and restart the agent.
- If Docker is unavailable, inspect `/tmp/docker-service-start.log` and `/tmp/dockerd.log`.
- If browser automation fails, run `agent-browser install` to refresh browser assets.
- If artifact uploads fail, run `aws sts get-caller-identity` and verify the target S3 URI before retrying.
- If the plugin upload fails with `Uploaded plugin size exceeds limit`, confirm `MM_FILESETTINGS_MAXFILESIZE=256000000` was set when starting Antimatter (or use the `mmctl` command in **Gotchas**).
- If the plugin upload fails for other reasons, confirm `MM_PLUGINSETTINGS_ENABLEUPLOADS=true` and the admin credentials are exported.
- If Antimatter is unhealthy, run `docker logs antimatter` and `docker logs am-postgres`.
- To reset the local Antimatter stack, run `docker rm -f antimatter am-postgres` and remove `/tmp/antimatter` or `am-postgres-data` if persisted data is not needed.
