#!/bin/bash
# InvoiceFlow — GCP e2-micro setup script
# Run this on a fresh Ubuntu 24.04 LTS VM as a non-root user with sudo access
# Usage: bash setup-gcp.sh

set -e

echo "==> Updating system packages..."
sudo apt-get update -y && sudo apt-get upgrade -y

echo "==> Installing Docker..."
sudo apt-get install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update -y
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Allow running docker without sudo
sudo usermod -aG docker "$USER"
echo "==> Docker installed."

echo "==> Installing Nginx and Certbot..."
sudo apt-get install -y nginx certbot python3-certbot-nginx

echo ""
echo "========================================================"
echo "  Setup complete! Next steps:"
echo "========================================================"
echo ""
echo "1. Clone your repo:"
echo "   git clone https://github.com/krishnaglj/invoiceflow.git"
echo "   cd invoiceflow"
echo ""
echo "2. Create your .env file:"
echo "   cp .env.example .env"
echo "   nano .env   # fill in your values"
echo ""
echo "3. Point your domain's DNS A record to this VM's external IP."
echo "   (Find the IP on GCP Console → Compute Engine → VM instances)"
echo ""
echo "4. Set up Nginx + SSL (replace yourdomain.com):"
echo "   sudo nano /etc/nginx/sites-available/invoiceflow"
echo "   --- paste this ---"
echo "   server {"
echo "       listen 80;"
echo "       server_name yourdomain.com;"
echo "       location / {"
echo "           proxy_pass http://localhost:8080;"
echo "           proxy_http_version 1.1;"
echo "           proxy_set_header Host \$host;"
echo "           proxy_set_header X-Real-IP \$remote_addr;"
echo "       }"
echo "   }"
echo "   ------------------"
echo "   sudo ln -s /etc/nginx/sites-available/invoiceflow /etc/nginx/sites-enabled/"
echo "   sudo nginx -t && sudo systemctl reload nginx"
echo "   sudo certbot --nginx -d yourdomain.com"
echo ""
echo "5. Build and start the app:"
echo "   newgrp docker   # or log out and back in for docker group"
echo "   docker compose build"
echo "   docker compose up -d db"
echo "   docker compose --profile migrate run --rm migrate"
echo "   docker compose up -d app"
echo ""
echo "6. Visit https://yourdomain.com — done!"
echo ""
echo "To update the app in future:"
echo "   git pull && docker compose build && docker compose restart app"
echo ""
