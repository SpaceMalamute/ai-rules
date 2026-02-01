---
name: deploy
description: Generate deployment configuration and CI/CD pipelines
argument-hint: "<target> [--provider <name>]"
---

# Deployment Configuration Generator

Generate deployment configurations for various platforms.

## Usage

- `/deploy github-actions` - GitHub Actions workflow
- `/deploy docker` - Docker + docker-compose production setup
- `/deploy kubernetes` - Kubernetes manifests
- `/deploy vercel` - Vercel configuration
- `/deploy aws` - AWS (ECS/Lambda) configuration
- `/deploy --provider azure` - Azure-specific setup

## Behavior

1. **Analyze Project**
   - Detect framework and runtime
   - Identify build commands
   - Find environment variables needed
   - Check for database/cache dependencies

2. **Generate Configuration**
   - CI/CD pipeline files
   - Infrastructure configuration
   - Environment templates
   - Deployment scripts

## Targets

### `github-actions`

Generate `.github/workflows/` files:

| Workflow | Trigger | Actions |
|----------|---------|---------|
| ci.yml | PR, push | Lint, test, build |
| deploy.yml | push to main | Build, push, deploy |
| release.yml | tag | Create release, changelog |

**Output files:**
- `.github/workflows/ci.yml`
- `.github/workflows/deploy.yml`
- `.github/workflows/release.yml`

### `docker`

Generate production Docker setup:
- Multi-stage `Dockerfile`
- `docker-compose.prod.yml`
- `docker-compose.override.yml` (dev)
- `.dockerignore`
- `scripts/deploy.sh`

### `kubernetes`

Generate K8s manifests:
- `k8s/deployment.yaml`
- `k8s/service.yaml`
- `k8s/ingress.yaml`
- `k8s/configmap.yaml`
- `k8s/secrets.yaml` (template)
- `k8s/hpa.yaml` (autoscaling)
- `kustomization.yaml`

### `vercel`

Generate Vercel config:
- `vercel.json`
- Environment variable setup guide
- Build configuration

### `aws`

Generate AWS config:

**For ECS:**
- `ecs/task-definition.json`
- `ecs/service.json`
- `buildspec.yml` (CodeBuild)
- `appspec.yml` (CodeDeploy)

**For Lambda:**
- `serverless.yml` or `sam/template.yaml`
- Lambda handler wrapper

## Output Format

```
## Deployment Configuration

### Target: GitHub Actions + Docker + Kubernetes

## Files Created

### .github/workflows/deploy.yml
<workflow content>

### k8s/deployment.yaml
<k8s manifest>

### k8s/service.yaml
<k8s manifest>

## Environment Variables Required

| Variable | Description | Example |
|----------|-------------|---------|
| DATABASE_URL | PostgreSQL connection | postgresql://... |
| REDIS_URL | Redis connection | redis://... |
| SECRET_KEY | Application secret | <random> |

## Deployment Steps

1. Configure secrets in GitHub/provider
2. Push to main branch
3. Monitor deployment
4. Verify health checks

## Rollback

To rollback: `kubectl rollout undo deployment/myapp`
```

## Best Practices Included

- Health checks and readiness probes
- Resource limits and requests
- Horizontal pod autoscaling
- Rolling update strategy
- Secret management (never in code)
- Environment-specific configurations
- Monitoring and logging setup
- SSL/TLS configuration
