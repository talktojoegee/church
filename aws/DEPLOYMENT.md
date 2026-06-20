# Deploying ChMS on AWS

Production architecture: **EC2 + RDS MySQL + Docker (Caddy, API, Web)**.

```
                    Route 53
        paggglobal.org / api.paggglobal.org
                        │
                        ▼
              ┌─────────────────┐
              │  EC2 (Ubuntu)   │
              │  Elastic IP     │
              │  ┌───────────┐  │
              │  │   Caddy   │  │ :443 HTTPS
              │  │ web :3000 │  │
              │  │ api :4000 │  │
              │  └─────┬─────┘  │
              └────────┼────────┘
                       │ :3306 (private)
                       ▼
              ┌─────────────────┐
              │  RDS MySQL 8    │
              │  (private VPC)  │
              └─────────────────┘
```

**Estimated monthly cost (us-east-1):** ~$35–55  
(EC2 `t3.small` + RDS `db.t3.micro` + 20GB storage + Elastic IP)

---

## Prerequisites

- AWS account
- Domain `paggglobal.org` (Route 53 or external DNS)
- SSH key pair (`.pem` file)
- GitHub repo access on EC2

---

## Part 1 — VPC & networking (default VPC is fine)

You can use the **default VPC** for a single-server setup.

Note your **VPC ID** and **subnet** (public subnet for EC2).

---

## Part 2 — RDS MySQL

1. **RDS** → **Create database**
2. Settings:

| Setting | Value |
|---------|--------|
| Engine | MySQL 8.4 |
| Template | Free tier (dev) or Production |
| DB instance | `db.t3.micro` (dev) / `db.t3.small` (prod) |
| DB identifier | `chms` |
| Master username | `chmsadmin` |
| Master password | *(strong password)* |
| Database name | `chms` |
| Public access | **No** |
| VPC security group | Create new: `chms-rds-sg` |

3. After creation, copy the **endpoint**, e.g.  
   `chms.c9akciq32.us-east-1.rds.amazonaws.com`

4. **Security group `chms-rds-sg`** — inbound rule:

| Type | Port | Source |
|------|------|--------|
| MySQL/Aurora | 3306 | `chms-ec2-sg` (created in Part 3) |

`DATABASE_URL` format:

```env
DATABASE_URL=mysql://chmsadmin:YOUR_PASSWORD@chms.xxxxx.us-east-1.rds.amazonaws.com:3306/chms
```

If the password contains special characters (`@`, `#`, `%`), URL-encode them.

---

## Part 3 — EC2 instance

1. **EC2** → **Launch instance**

| Setting | Value |
|---------|--------|
| Name | `chms-prod` |
| AMI | **Ubuntu Server 22.04 LTS** |
| Instance type | `t3.small` (2 vCPU, 2 GB) — use `t3.medium` if budget allows |
| Key pair | Create/select `.pem` |
| Security group | Create `chms-ec2-sg` |

2. **`chms-ec2-sg` inbound rules:**

| Type | Port | Source |
|------|------|--------|
| SSH | 22 | **Your IP** (not 0.0.0.0/0) |
| HTTP | 80 | 0.0.0.0/0 |
| HTTPS | 443 | 0.0.0.0/0 |

3. **Storage:** 30 GB gp3

4. **Advanced → User data** — paste contents of `aws/ec2-user-data.sh` (installs Docker).

5. Launch instance.

6. **Elastic IP** → Allocate → Associate with `chms-prod`.

7. Update RDS security group: allow port 3306 from `chms-ec2-sg`.

---

## Part 4 — DNS (Route 53)

If the domain is in Route 53:

1. **Hosted zone** → `paggglobal.org`
2. Create **A records** → Elastic IP:

| Name | Type | Value |
|------|------|-------|
| `@` | A | `x.x.x.x` (Elastic IP) |
| `www` | A | same |
| `api` | A | same |

If DNS is external (e.g. Hostinger), create the same A records there pointing to the Elastic IP.

---

## Part 5 — Configure & start the app

SSH in:

```bash
chmod 400 ~/Downloads/your-key.pem
ssh -i ~/Downloads/your-key.pem ubuntu@YOUR_ELASTIC_IP
```

Clone and configure:

```bash
git clone https://github.com/talktojoegee/church.git /opt/chms
cd /opt/chms
cp docker/.env.aws.example docker/.env
nano docker/.env
```

Fill in:

- `DATABASE_URL` — RDS endpoint from Part 2
- `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` — `openssl rand -base64 48`
- `SUPER_ADMIN_*`, SMTP, Paystack keys

Start:

```bash
docker compose -f docker/docker-compose.aws.yml --env-file docker/.env up -d --build
```

First-time seed:

```bash
docker compose -f docker/docker-compose.aws.yml --env-file docker/.env \
  exec api sh -c 'cd /app && ./node_modules/.bin/tsx prisma/seed.ts'
```

Verify:

```bash
curl https://api.paggglobal.org/api/health
```

---

## Part 6 — Deploy from your Mac

```bash
cp deploy.env.example deploy.env
```

```env
DEPLOY_HOST=YOUR_ELASTIC_IP
DEPLOY_USER=ubuntu
DEPLOY_PATH=/opt/chms
DEPLOY_SSH_KEY=~/.ssh/your-key.pem
```

```bash
bash deploy-aws.sh
bash deploy-aws.sh --seed   # first time only
```

---

## Email with AWS SES (optional)

1. **SES** → verify domain `paggglobal.org`
2. Create SMTP credentials
3. In `docker/.env`:

```env
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_USER=your-ses-smtp-user
SMTP_PASSWORD=your-ses-smtp-password
MAIL_FROM=Power And Glory Generation <no-reply@paggglobal.org>
```

4. Restart API:  
   `docker compose -f docker/docker-compose.aws.yml restart api`

---

## File uploads on EBS

Uploads are stored in Docker volume `uploads_data` on the EC2 disk.

For production durability, consider later:

- Mount EBS volume at `/opt/chms/data/uploads`
- Or migrate to **S3** (code change required)

---

## Useful commands

```bash
# Logs
docker compose -f docker/docker-compose.aws.yml logs -f api web caddy

# Restart after .env change
docker compose -f docker/docker-compose.aws.yml --env-file docker/.env up -d --build

# Migrations only
docker compose -f docker/docker-compose.aws.yml exec api sh -c 'cd /app && ./node_modules/.bin/prisma migrate deploy'

# Stop
docker compose -f docker/docker-compose.aws.yml down
```

---

## Security checklist

- [ ] RDS: no public access
- [ ] RDS SG: only EC2 security group on 3306
- [ ] EC2 SSH: restricted to your IP
- [ ] Strong RDS password + JWT secrets
- [ ] `docker/.env` never committed to Git
- [ ] Enable RDS automated backups (7+ days)
- [ ] Optional: AWS CloudWatch agent for logs

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| API can't connect to RDS | Check RDS SG allows `chms-ec2-sg`; verify `DATABASE_URL` |
| SSL not working | DNS must point to Elastic IP; ports 80/443 open |
| CORS errors | `CORS_ORIGINS` must include `https://paggglobal.org` |
| Build fails on EC2 | Ensure instance has 2+ GB RAM; use `t3.small` minimum |
| `prisma migrate` fails | RDS user needs CREATE/ALTER privileges |

---

## AWS vs Hostinger VPS

| | Hostinger VPS | AWS |
|--|---------------|-----|
| Database | Container MySQL | **RDS** (managed backups) |
| Compose file | `docker-compose.prod.yml` | `docker-compose.aws.yml` |
| IP | VPS IP | **Elastic IP** |
| Email | Hostinger SMTP | **SES** (recommended) |

---

## Quick reference

```bash
# On EC2
docker compose -f docker/docker-compose.aws.yml --env-file docker/.env up -d --build

# From Mac
bash deploy-aws.sh
```
