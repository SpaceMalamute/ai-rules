---
paths:
  - "**/.env*"
  - "**/secrets/**"
  - "**/config/**"
  - "**/appsettings*.json"
---

# Secrets Management

## Core Principles

- **Never commit secrets** to version control
- **Rotate regularly** (90 days max for critical secrets)
- **Least privilege** - only grant necessary access
- **Audit access** - log who accessed what
- **Encrypt at rest** and in transit

## Environment Files

### Structure

```
.env                 # Shared defaults (commit)
.env.local           # Local overrides (gitignore)
.env.development     # Dev environment (commit, no secrets)
.env.production      # Prod template (commit, no secrets)
.env.production.local # Prod secrets (gitignore)
```

### .gitignore

```gitignore
# Always ignore
.env.local
.env.*.local
*.pem
*.key
**/secrets/
credentials.json
service-account.json
```

### Format

```bash
# .env.example (commit this as template)
DATABASE_URL=postgresql://user:password@localhost:5432/db
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-here
API_KEY=your-api-key-here

# Required for production
# AWS_ACCESS_KEY_ID=
# AWS_SECRET_ACCESS_KEY=
# STRIPE_SECRET_KEY=
```

## Secret Types & Storage

| Type | Example | Storage |
|------|---------|---------|
| API Keys | Stripe, Twilio | Vault / Cloud Secrets |
| DB Credentials | Connection strings | Vault / Cloud Secrets |
| JWT Secrets | Signing keys | Vault / Env vars |
| OAuth Secrets | Client secrets | Cloud Secrets |
| Encryption Keys | AES keys | KMS / HSM |
| Certificates | TLS certs | Cert Manager |

## Cloud Provider Solutions

### AWS Secrets Manager

```typescript
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";

async function getSecret(secretName: string): Promise<string> {
  const client = new SecretsManagerClient({ region: "us-east-1" });
  const response = await client.send(
    new GetSecretValueCommand({ SecretId: secretName })
  );
  return response.SecretString!;
}
```

### Azure Key Vault

```csharp
var client = new SecretClient(
    new Uri("https://myvault.vault.azure.net/"),
    new DefaultAzureCredential()
);
KeyVaultSecret secret = await client.GetSecretAsync("my-secret");
```

### Google Secret Manager

```python
from google.cloud import secretmanager

def get_secret(secret_id: str) -> str:
    client = secretmanager.SecretManagerServiceClient()
    name = f"projects/my-project/secrets/{secret_id}/versions/latest"
    response = client.access_secret_version(request={"name": name})
    return response.payload.data.decode("UTF-8")
```

## CI/CD Secrets

### GitHub Actions

```yaml
# Set in: Settings > Secrets and variables > Actions

jobs:
  deploy:
    environment: production  # Environment-specific secrets
    steps:
      - name: Deploy
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          API_KEY: ${{ secrets.API_KEY }}
        run: ./deploy.sh
```

### GitLab CI

```yaml
# Set in: Settings > CI/CD > Variables
# Mark as "Protected" and "Masked"

deploy:
  script:
    - echo "$DATABASE_URL"  # Available as env var
  environment:
    name: production
```

## Docker & Kubernetes

### Docker Secrets

```yaml
# docker-compose.yml
services:
  app:
    secrets:
      - db_password
    environment:
      - DB_PASSWORD_FILE=/run/secrets/db_password

secrets:
  db_password:
    file: ./secrets/db_password.txt
```

### Kubernetes Secrets

```yaml
# sealed-secret.yaml (encrypted, safe to commit)
apiVersion: bitnami.com/v1alpha1
kind: SealedSecret
metadata:
  name: my-secret
spec:
  encryptedData:
    password: AgBy3i4OJSWK+...

# Usage in pod
env:
  - name: DB_PASSWORD
    valueFrom:
      secretKeyRef:
        name: my-secret
        key: password
```

## Validation at Startup

```typescript
// Validate required secrets exist at startup
const requiredSecrets = [
  'DATABASE_URL',
  'JWT_SECRET',
  'REDIS_URL',
];

for (const secret of requiredSecrets) {
  if (!process.env[secret]) {
    throw new Error(`Missing required secret: ${secret}`);
  }
}
```

## Secret Rotation

1. **Generate new secret**
2. **Deploy with both old and new** (accept both)
3. **Update all consumers** to use new
4. **Remove old secret** from config
5. **Revoke old secret** in provider

## Audit Checklist

- [ ] No secrets in code or commits
- [ ] All secrets in gitignore
- [ ] Secrets encrypted at rest
- [ ] Access logged and auditable
- [ ] Rotation policy in place
- [ ] Secrets validated at startup
- [ ] Different secrets per environment
- [ ] Backup/recovery procedure documented

## Anti-patterns

- Committing `.env` with real secrets
- Using same secrets across environments
- Sharing secrets via Slack/email
- Hardcoding secrets in Dockerfiles
- Not rotating compromised secrets immediately
- Logging secrets (even accidentally)
- Storing secrets in plain text files on servers
