# SwingAQ Scanner — VPS Deployment Guide

> Panduan lengkap deploy SwingAQ Scanner ke VPS (Ubuntu/Debian).

---

## 📋 Prasyarat VPS

| Item | Minimum | Rekomendasi |
|------|---------|-------------|
| OS | Ubuntu 22.04 LTS | Ubuntu 24.04 LTS |
| RAM | 1 GB | 2 GB |
| CPU | 1 vCPU | 2 vCPU |
| Disk | 5 GB | 10 GB |
| Python | 3.11+ | 3.12+ |
| Akses | SSH root atau sudo | |

---

## 🚀 Step-by-Step Deployment

### Step 1: Upload project ke VPS

Dari **laptop lokal**, upload folder proyek ke VPS:

```bash
# Opsi A: rsync (paling cepat, skip venv)
rsync -avz --exclude='backend/venv' --exclude='__pycache__' \
  /Users/mhusnulaqib/Documents/APP/SwingAQ/ \
  user@YOUR_VPS_IP:/opt/swingaq/

# Opsi B: scp (alternatif)
scp -r /Users/mhusnulaqib/Documents/APP/SwingAQ/ user@YOUR_VPS_IP:/opt/swingaq/

# Opsi C: git (jika sudah di repository)
# Di VPS:
git clone https://github.com/YOUR_USERNAME/SwingAQ.git /opt/swingaq
```

> ⚠️ Jangan upload folder `backend/venv/` — akan dibuat ulang di VPS.

---

### Step 2: Install system dependencies

SSH ke VPS lalu jalankan:

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y python3 python3-pip python3-venv nginx certbot python3-certbot-nginx
```

---

### Step 3: Setup Python virtual environment

```bash
cd /opt/swingaq/backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

---

### Step 4: Test jalankan manual

```bash
cd /opt/swingaq/backend
source venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 8000
```

Buka `http://YOUR_VPS_IP:8000` di browser — pastikan halaman muncul.
Setelah yakin berjalan, `Ctrl+C` untuk stop.

---

### Step 5: Buat systemd service (auto-start)

```bash
sudo nano /etc/systemd/system/swingaq.service
```

Paste isi berikut:

```ini
[Unit]
Description=SwingAQ Scanner
After=network.target

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=/opt/swingaq/backend
ExecStart=/opt/swingaq/backend/venv/bin/uvicorn main:app --host 127.0.0.1 --port 8000 --workers 2
Restart=always
RestartSec=5
Environment="PATH=/opt/swingaq/backend/venv/bin"

[Install]
WantedBy=multi-user.target
```

Aktifkan service:

```bash
# Fix ownership
sudo chown -R www-data:www-data /opt/swingaq

# Enable & start
sudo systemctl daemon-reload
sudo systemctl enable swingaq
sudo systemctl start swingaq

# Cek status
sudo systemctl status swingaq
```

---

### Step 6: Setup Nginx reverse proxy

```bash
sudo nano /etc/nginx/sites-available/swingaq
```

Paste isi berikut:

```nginx
server {
    listen 80;
    server_name YOUR_DOMAIN_OR_IP;

    # Proxy ke Uvicorn
    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # SSE support — PENTING
    location /api/scan {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header Connection '';
        proxy_http_version 1.1;
        chunked_transfer_encoding off;
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 1800s;  # 30 menit timeout untuk scan panjang
    }
}
```

Aktifkan site:

```bash
sudo ln -s /etc/nginx/sites-available/swingaq /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default  # hapus default site
sudo nginx -t                              # test config
sudo systemctl restart nginx
```

---

### Step 7 (Opsional): HTTPS dengan Let's Encrypt

Jika sudah punya domain yang pointing ke VPS:

```bash
sudo certbot --nginx -d yourdomain.com
```

Ikuti prompt, certbot akan otomatis update nginx config untuk HTTPS.

---

## 🔧 Perintah Berguna

| Aksi | Perintah |
|------|----------|
| Cek status | `sudo systemctl status swingaq` |
| Restart app | `sudo systemctl restart swingaq` |
| Lihat log | `sudo journalctl -u swingaq -f` |
| Lihat log 100 baris | `sudo journalctl -u swingaq -n 100` |
| Stop app | `sudo systemctl stop swingaq` |
| Restart nginx | `sudo systemctl restart nginx` |
| Update code | `cd /opt/swingaq && git pull && sudo systemctl restart swingaq` |

---

## 🔄 Update Deployment

Setelah ada perubahan kode:

```bash
# Dari laptop lokal
rsync -avz --exclude='backend/venv' --exclude='__pycache__' \
  /Users/mhusnulaqib/Documents/APP/SwingAQ/ \
  user@YOUR_VPS_IP:/opt/swingaq/

# Di VPS
sudo systemctl restart swingaq
```

---

## ⚠️ Troubleshooting

### App tidak jalan
```bash
# Cek log error
sudo journalctl -u swingaq -n 50

# Test manual
cd /opt/swingaq/backend
source venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 8000
```

### SSE timeout / progress bar berhenti
- Pastikan nginx config sudah ada `proxy_buffering off` di `/api/scan`
- Pastikan `proxy_read_timeout` cukup besar (1800s = 30 menit)

### Port 8000 sudah dipakai
```bash
sudo lsof -i :8000
# Ganti port di swingaq.service jika perlu
```

### Permission denied
```bash
sudo chown -R www-data:www-data /opt/swingaq
```

---

## 📁 Struktur di VPS

```
/opt/swingaq/
├── backend/
│   ├── venv/              ← dibuat di VPS
│   ├── main.py
│   ├── scanner.py
│   ├── indicators.py
│   ├── stocks.py
│   └── requirements.txt
├── frontend/
│   ├── index.html
│   ├── style.css
│   └── app.js
└── planning/              ← opsional, bisa dihapus di prod
```

---

## 🔒 Security Checklist

- [ ] Firewall: hanya buka port 80 dan 443 (`sudo ufw allow 80,443/tcp`)
- [ ] Jangan buka port 8000 ke publik (hanya nginx yang akses)
- [ ] Update OS rutin (`sudo apt update && sudo apt upgrade`)
- [ ] Gunakan HTTPS jika ada domain
- [ ] (Opsional) Tambah rate limiting di nginx untuk `/api/scan`
