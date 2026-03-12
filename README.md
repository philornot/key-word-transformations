# Key Word Transformations

A web application for creating and solving Cambridge B2/C1 Key Word Transformation exercises. Teachers upload a
worksheet photo, OCR detects the questions automatically, and students receive a shareable interactive test link.

## Tech stack

- [SvelteKit](https://kit.svelte.dev) — full-stack framework
- [Bun](https://bun.sh) — runtime and package manager
- [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) — embedded database
- [Tesseract.js](https://tesseract.projectnaptha.com) — OCR engine
- [PM2](https://pm2.keymetrics.io) — process manager on the server
- [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/) — HTTPS without
  port forwarding (recommended)

---

## Local development

**Requirements:** [Bun](https://bun.sh) installed locally.

```bash
git clone https://github.com/your-org/kwt.git
cd kwt
bun install
bun run dev
```

The app runs at `http://localhost:5173`.

To enable the admin panel locally, create a `.env` file:

```env
ADMIN_PASSWORD=any_local_password
```

---

## Deployment

The project deploys to a Linux server (tested on Raspberry Pi 4) using two scripts. **Both scripts are run on your local
machine** — they connect to the server over SSH.

### Architecture

```
Local machine (Windows / macOS / Linux)
  │
  │  bun run build        → produces build/
  │  rsync build/ ...     → sends artefacts to server
  │  ssh server           → installs deps, restarts PM2
  │
  └─▶ Server (RPi4 / any Linux)
        /home/pi/kwt-build/   ← deployed artefacts
        /home/pi/kwt-data/    ← database + backups (persists across deploys)
        PM2                      ← keeps the app running
        Nginx                    ← reverse proxy
        Cloudflare Tunnel        ← HTTPS, no router config needed
```

### Prerequisites

Install [yq](https://github.com/mikefarah/yq) on your local machine (used to read `deploy.config.yaml`):

| Platform | Command                                               |
|----------|-------------------------------------------------------|
| macOS    | `brew install yq`                                     |
| Windows  | `winget install MikeFarah.yq` (then restart Git Bash) |
| Linux    | `snap install yq`                                     |

Make sure your SSH alias works before running any script:

```bash
ssh rpi
```

### One-time setup

```bash
bash scripts/setup.sh
```

The script will:

1. Walk you through filling in `deploy.config.yaml` interactively.
2. Add `deploy.config.yaml` to `.gitignore` (it contains your admin password).
3. Connect to the server and install Bun and PM2.
4. Create the deploy and data directories.
5. Write the `.env` file on the server.

You can also edit `deploy.config.yaml` directly at any time instead of re-running setup.

```yaml
# deploy.config.yaml
project:
  name: kwt

remote:
  ssh_alias: rpi
  deploy_path: /home/pi/kwt-build
  data_path: /home/pi/kwt-data

app:
  port: 3000
  origin: "https://kwt.example.com"
  admin_password: "your_password"

backup:
  enabled: true
  keep_days: 7
```

### Deploying

```bash
bash scripts/deploy.sh
```

Each deploy:

1. Builds the app locally with `bun run build`.
2. Creates a timestamped backup of the database on the server.
3. Rsyncs `build/`, `package.json`, and `bun.lockb` to the server.
4. Installs production dependencies on the server.
5. Restarts the PM2 process (or starts it if it is not running yet).
6. Performs an HTTP health check against `app.origin`.

**Options:**

```bash
bash scripts/deploy.sh --sync   # skip the local build step
bash scripts/deploy.sh --check  # dry run, nothing is changed
```

### After the first deploy — Nginx and HTTPS

After the first successful deploy you need to set up a reverse proxy and HTTPS. The recommended approach is Cloudflare
Tunnel, which requires no router configuration and provides HTTPS automatically.

**Install Cloudflare Tunnel on the server:**

```bash
ssh rpi

curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64 \
  -o cloudflared
sudo mv cloudflared /usr/local/bin && sudo chmod +x /usr/local/bin/cloudflared

cloudflared tunnel login
cloudflared tunnel create kwt
cloudflared tunnel route dns kwt your-domain.com
```

Create `~/.cloudflared/config.yml` on the server:

```yaml
tunnel: <tunnel-id>
credentials-file: /home/pi/.cloudflared/<tunnel-id>.json

ingress:
  - hostname: your-domain.com
    service: http://localhost:3000
  - service: http_status:404
```

```bash
cloudflared service install
sudo systemctl enable cloudflared
sudo systemctl start cloudflared
```

**Or use Nginx** (if you prefer to manage TLS yourself via Certbot):

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $remote_addr;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        client_max_body_size 25M;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/kwt /etc/nginx/sites-enabled/
sudo certbot --nginx -d your-domain.com
```

### Checking logs

```bash
ssh rpi 'pm2 logs kwt'        # live log stream
ssh rpi 'pm2 status'          # process status
ssh rpi 'pm2 restart kwt'     # manual restart
```

---

## Database

The SQLite database lives at `data_path/worksheet.db` on the server (default: `/home/pi/kwt-data/worksheet.db`). It
persists across deploys because it is outside the deploy directory.

Backups are created automatically before each deploy and stored in `data_path/backups/`. The number of backups retained
is controlled by `backup.keep_days` in `deploy.config.yaml`.

To copy the production database locally:

```bash
scp rpi:/home/pi/kwt-data/worksheet.db ./worksheet.db
```