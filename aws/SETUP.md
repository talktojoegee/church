# AWS setup — paggglobal (your account)

## Your resources

| Resource | Value |
|----------|--------|
| **EC2** | `paggglobal` — `t3.small`, `32.196.184.5` (Elastic IP) |
| **Region** | `us-east-1` |
| **Key pair** | `paggglobal_instance.pem` |
| **RDS** | `chms` — MySQL, `db.t4g.micro`, private (no public internet) |
| **VPC** | `vpc-058d685e1ec501cdb` |

**Do not use Hostinger Node.js settings on AWS.** AWS uses Docker on EC2 (see below).

---

## 1. Security groups (critical)

### RDS security group (`chms-rds-sg`)

| Type | Port | Source |
|------|------|--------|
| MySQL/Aurora | 3306 | **EC2 security group** (not 0.0.0.0/0) |

### EC2 security group (`chms-ec2-sg`)

| Type | Port | Source |
|------|------|--------|
| SSH | 22 | **Your IP only** |
| HTTP | 80 | 0.0.0.0/0 |
| HTTPS | 443 | 0.0.0.0/0 |

EC2 and RDS must be in the **same VPC**.

---

## 2. RDS connection string

RDS → `chms` → **Connectivity & security** → copy **Endpoint**.

```env
DATABASE_URL=mysql://USERNAME:PASSWORD@chms.xxxxx.us-east-1.rds.amazonaws.com:3306/chms
```

URL-encode special characters in the password (`@` → `%40`, `#` → `%23`).

---

## 3. DNS

Point these **A records** to `32.196.184.5`:

| Host | Domain |
|------|--------|
| `@` | `paggglobal.org` |
| `www` | `paggglobal.org` |
| `api` | `api.paggglobal.org` |

Caddy on EC2 will obtain Let's Encrypt certificates automatically.

---

## 4. First-time deploy (from your Mac)

```bash
# 1. Key permissions
chmod 400 ~/.ssh/paggglobal_instance.pem

# 2. Configure deploy
cp deploy.env.aws.example deploy.env
# edit DEPLOY_SSH_KEY path if needed

# 3. Create docker/.env locally (uploaded on --setup)
cp docker/.env.aws.example docker/.env
nano docker/.env
# Fill: DATABASE_URL, JWT secrets, SUPER_ADMIN_*, etc.
# Generate secrets: openssl rand -base64 48

# 4. Bootstrap EC2 + first deploy
bash deploy-aws.sh --setup
bash deploy-aws.sh --seed
```

---

## 5. Routine deploys

```bash
git push origin main
bash deploy-aws.sh
```

---

## 6. Verify

```bash
curl https://api.paggglobal.org/api/health
# {"status":"ok","database":"up",...}

curl -I https://paggglobal.org
```

---

## 7. SSH & logs

```bash
ssh -i ~/.ssh/paggglobal_instance.pem ubuntu@32.196.184.5

cd /opt/chms
docker compose -f docker/docker-compose.aws.yml logs -f api web caddy
docker compose -f docker/docker-compose.aws.yml ps
```

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| API `database: down` | RDS SG must allow EC2 SG on 3306; check `DATABASE_URL` |
| SSL fails | DNS must point to `32.196.184.5`; ports 80/443 open |
| Build OOM on EC2 | `t3.small` is minimum; retry or use `t3.medium` |
| CORS errors | `CORS_ORIGINS=https://paggglobal.org,https://www.paggglobal.org` |

See also [DEPLOYMENT.md](./DEPLOYMENT.md) for SES email and backups.
