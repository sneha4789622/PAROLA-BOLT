# Parola Bolt — Deployment Guide

## Option A: Deploy with Docker Compose (recommended)

### Prerequisites
- Docker & Docker Compose installed on your server
- Domain name (e.g. `parolabolt.com`) with DNS pointing to your server
- Cloudinary account (for media storage)

### 1 — Clone and configure

```bash
git clone https://github.com/your-org/parola-bolt.git
cd parola-bolt
cp server/.env.example server/.env
# Edit server/.env with production values (see below)
```

### 2 — Create docker-compose.yml

```yaml
version: '3.9'
services:
  mongo:
    image: mongo:7
    restart: always
    volumes:
      - mongo_data:/data/db
    environment:
      MONGO_INITDB_DATABASE: parola_bolt

  server:
    build: ./server
    restart: always
    environment:
      NODE_ENV: production
      MONGO_URI: mongodb://mongo:27017/parola_bolt
      PORT: 5000
      # Copy remaining vars from server/.env
    env_file: ./server/.env
    depends_on:
      - mongo
    ports:
      - "5000:5000"

  client:
    build: ./client
    restart: always
    ports:
      - "80:80"
      - "443:443"
    depends_on:
      - server

volumes:
  mongo_data:
```

### 3 — Add Dockerfiles

**server/Dockerfile**
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 5000
CMD ["node", "server.js"]
```

**client/Dockerfile**
```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

**client/nginx.conf**
```nginx
server {
  listen 80;
  root /usr/share/nginx/html;
  index index.html;

  location /api/ {
    proxy_pass http://server:5000/api/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
  }

  location /socket.io/ {
    proxy_pass http://server:5000/socket.io/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
  }

  location / {
    try_files $uri $uri/ /index.html;
  }
}
```

### 4 — Start

```bash
docker compose up -d --build
```

---

## Option B: Deploy to Render.com (no DevOps)

### Backend (Web Service)
1. New Web Service → connect your repo → select `server/` as root
2. Build command: `npm install`
3. Start command: `node server.js`
4. Add all environment variables from `server/.env.example`

### Frontend (Static Site)
1. New Static Site → connect repo → select `client/` as root
2. Build command: `npm install && npm run build`
3. Publish directory: `dist`
4. Add rewrite rule: `/* → /index.html` (200)
5. Set env var: `VITE_API_URL=https://your-backend.onrender.com`

Update `client/src/api/axios.js` to use:
```js
baseURL: import.meta.env.VITE_API_URL || '/api',
```

### MongoDB
Use [MongoDB Atlas](https://www.mongodb.com/atlas) free tier.
Set `MONGO_URI` in your backend environment vars.

---

## Option C: Deploy to a VPS (DigitalOcean / AWS / Hetzner)

### 1 — Server setup (Ubuntu 22.04)

```bash
apt update && apt upgrade -y
apt install -y curl git nginx certbot python3-certbot-nginx

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Install PM2
npm install -g pm2

# Install MongoDB 7
wget -qO- https://www.mongodb.org/static/pgp/server-7.0.asc | sudo tee /etc/apt/trusted.gpg.d/server-7.0.asc
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | \
  sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
apt update && apt install -y mongodb-org
systemctl start mongod && systemctl enable mongod
```

### 2 — Deploy code

```bash
git clone https://github.com/your-org/parola-bolt.git /var/www/parola-bolt

# Backend
cd /var/www/parola-bolt/server
npm ci --only=production
cp .env.example .env       # edit .env
pm2 start server.js --name parola-bolt-api
pm2 save && pm2 startup

# Frontend
cd /var/www/parola-bolt/client
npm ci
npm run build              # outputs to dist/
```

### 3 — Nginx config

```nginx
# /etc/nginx/sites-available/parolabolt.com
server {
  server_name parolabolt.com www.parolabolt.com;

  # Serve frontend build
  root /var/www/parola-bolt/client/dist;
  index index.html;

  location / {
    try_files $uri $uri/ /index.html;
  }

  # Proxy API
  location /api/ {
    proxy_pass http://localhost:5000/api/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
  }

  # Proxy Socket.IO (WebSocket upgrade)
  location /socket.io/ {
    proxy_pass http://localhost:5000/socket.io/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
  }
}
```

```bash
ln -s /etc/nginx/sites-available/parolabolt.com /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

# SSL
certbot --nginx -d parolabolt.com -d www.parolabolt.com
```

---

## Production environment variables checklist

| Variable | Example value |
|----------|--------------|
| `NODE_ENV` | `production` |
| `PORT` | `5000` |
| `MONGO_URI` | `mongodb+srv://user:pass@cluster.mongodb.net/parola_bolt` |
| `JWT_SECRET` | 64+ character random string |
| `JWT_EXPIRES_IN` | `7d` |
| `JWT_COOKIE_EXPIRES_DAYS` | `7` |
| `CLIENT_URL` | `https://parolabolt.com` |
| `CLOUDINARY_CLOUD_NAME` | from Cloudinary dashboard |
| `CLOUDINARY_API_KEY` | from Cloudinary dashboard |
| `CLOUDINARY_API_SECRET` | from Cloudinary dashboard |
| `SMS_FALLBACK_MODE` | `simulated` (or `twilio` when live) |

---

## Upgrading SMS fallback to production (Twilio)

Replace the body of `server/utils/smsFallback.js` `sendSimulatedSMS` function:

```js
const twilio = require('twilio');
const client = twilio(process.env.SMS_PROVIDER_SID, process.env.SMS_PROVIDER_AUTH_TOKEN);

const sendSimulatedSMS = async ({ toMobileNumber, body }) => {
  const message = await client.messages.create({
    body,
    from: process.env.SMS_FROM_NUMBER,
    to: toMobileNumber,
  });
  return { status: message.status, sid: message.sid, sentAt: new Date() };
};
```

Add `twilio` to `server/package.json` dependencies.

---

## Upgrading biometric to production

The mock `faceCaptureToken` on the client should be replaced with:
- **Web**: [WebAuthn / FIDO2 API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Authentication_API)
- **React Native**: `react-native-biometrics` or `expo-local-authentication`

The server-side hash-and-store pattern stays identical — only the token source changes.

---

## Upgrading AI content moderation

Replace `server/utils/contentModeration.js` `analyzeText()` with a call to:
- [Google Cloud Natural Language API](https://cloud.google.com/natural-language)
- [OpenAI Moderation API](https://platform.openai.com/docs/guides/moderation)
- [AWS Comprehend](https://aws.amazon.com/comprehend/)

The function signature (takes text string, returns `{ status, isPositive, spamScore, ... }`) stays the same.
