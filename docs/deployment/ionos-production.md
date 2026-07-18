# IONOS Production Runbook

This runbook deploys ARBE DesignFit Studio to an IONOS VPS or Cloud Server as a Docker Compose stack with automatic TLS termination through Caddy.

## Scope

The deployment publishes the application code and deterministic decision services. It must not package controlled spectral datasets, customer measurements, private keys or local environment files.

The following paths are explicitly excluded from build and deployment boundaries:

- `private-data/`
- `controlled-data/`
- `customer-data/`
- local `.env*` files except `.env.example`
- private key and certificate files

## Server baseline

Recommended minimum:

- Ubuntu 24.04 LTS
- 2 vCPU
- 4 GB RAM
- 40 GB SSD
- Docker Engine with Docker Compose v2
- inbound TCP 22, 80 and 443
- inbound UDP 443 for HTTP/3, optional

Create a non-root deployment user with permission to run Docker. Use SSH key authentication and disable password login after verification.

## DNS

Create an A record for the production hostname pointing to the public IONOS server IPv4 address. Add an AAAA record only when IPv6 is configured on the server and firewall.

Example:

```text
designfit.example.com -> 203.0.113.10
```

Caddy requests and renews the TLS certificate after DNS resolves and ports 80 and 443 are reachable.

## Server preparation

```bash
sudo mkdir -p /opt/designfit/releases
sudo chown -R "$USER":"$USER" /opt/designfit
cp .env.example /opt/designfit/.env
chmod 600 /opt/designfit/.env
```

Set the real hostname in `/opt/designfit/.env`:

```dotenv
DESIGNFIT_DOMAIN=designfit.example.com
APP_ENV=production
APP_VERSION=bootstrap
```

## GitHub environment and secrets

Create a protected GitHub environment named `production`. Add these repository or environment secrets:

- `IONOS_HOST`: public server IP address or SSH hostname
- `IONOS_USER`: non-root deployment user
- `IONOS_SSH_KEY`: private Ed25519 deployment key
- `IONOS_DEPLOY_PATH`: `/opt/designfit`

The corresponding public key must be present in the deployment user's `~/.ssh/authorized_keys` file.

## Deployment lifecycle

A push to `main`, or a manual workflow dispatch, performs:

1. dependency installation with `npm ci`
2. TypeScript and deterministic test validation through `npm run check`
3. production Next.js build
4. source archive creation with controlled-data exclusions
5. SSH upload to the IONOS host
6. release extraction into `/opt/designfit/releases/<commit-sha>`
7. local Docker image build on the server
8. replacement of the stable Compose project `designfit`
9. internal `/api/health` verification
10. update of `/opt/designfit/current` only after successful verification
11. retention of the five newest release directories

## First deployment

After the branch containing this foundation is merged, run the `Deploy to IONOS` workflow manually. The first successful activation starts both services:

- `designfit-designfit-1`
- `designfit-caddy-1`

Verify:

```bash
curl --fail --silent --show-error https://designfit.example.com/api/health
```

Expected response fields include:

- `status: ok`
- `platform: ARBE DesignFit Studio`
- immutable Git commit in `version`
- `decisionEngine: available`

## Operational checks

```bash
cd /opt/designfit/current
docker compose -p designfit --env-file .env ps
docker compose -p designfit --env-file .env logs --tail=200 designfit
docker compose -p designfit --env-file .env logs --tail=200 caddy
```

## Rollback

Identify a previous retained release and activate it with the stable Compose project:

```bash
cd /opt/designfit/releases/<previous-commit-sha>
APP_VERSION=<previous-commit-sha> docker compose -p designfit --env-file .env build designfit
APP_VERSION=<previous-commit-sha> docker compose -p designfit --env-file .env up -d --remove-orphans
curl --fail http://127.0.0.1:3000/api/health
ln -sfn "$PWD" /opt/designfit/current
```

The application container is not published directly on a host port. External traffic reaches it only through Caddy.

## Claim and data boundary

A successful deployment proves that a particular software revision passed the repository checks and responded to the health contract. It does not prove production approval, spectral equivalence or customer acceptance.

Controlled spectral data and customer evidence require a separate authenticated storage and authorization design. They must not be added to this public deployment foundation by mounting arbitrary host directories or embedding datasets into the image.
