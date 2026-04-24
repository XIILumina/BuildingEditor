# BuildingEditor Project Setup

This document explains how to run the project locally and on a VPS.

## 1. Requirements

- PHP 8.2+
- Composer 2+
- Node.js 20+ and npm
- MySQL 8+
- Git

## 2. Local Setup (Laragon: Apache + PHP + MySQL)

1. Clone project:

```bash
git clone https://github.com/XIILumina/BuildingEditor.git BuildingEditor
cd BuildingEditor
```

2. Install dependencies:

```bash
composer install
npm install
```

3. Environment file:

```bash
copy .env.example .env
php artisan key:generate
```

4. Configure `.env`:

- Set `APP_URL` to your local URL (example: `http://buildingeditor.test`)
- Set DB values for Laragon MySQL:

```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=BuildingEditor
DB_USERNAME=root
DB_PASSWORD=
```

- Set OpenAI key:

```env
OPENAI_API_KEY=your_key_here
```
i wont give you mine tho, go make it for your self openai.
5. Run migrations:

```bash
php artisan migrate
```

6. Start app:

- Use Laragon Apache for PHP serving
- Start frontend dev server:

```bash
npm run dev
```

7. Optional cache cleanup when config changes:

```bash
php artisan config:clear
php artisan route:clear
php artisan cache:clear
```

## 3. VPS Setup (Nginx + PHP-FPM + MySQL)

## 3.1 Install packages (Ubuntu example)

```bash
sudo apt update
sudo apt install -y nginx mysql-server php-fpm php-mysql php-xml php-curl php-mbstring php-zip unzip git composer
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

## 3.2 Deploy code

```bash
cd /var/www
sudo git clone <your-repo-url> BuildingEditor
cd BuildingEditor
sudo composer install --no-dev --optimize-autoloader
sudo npm install
sudo npm run build
sudo cp .env.example .env
sudo php artisan key:generate
```

Update `.env` with production values:

- `APP_ENV=production`
- `APP_DEBUG=false`
- `APP_URL=https://your-domain.com`
- MySQL credentials
- `OPENAI_API_KEY=...`

Run database and optimization commands:

```bash
sudo php artisan migrate --force
sudo php artisan config:cache
sudo php artisan route:cache
sudo php artisan view:cache
```

## 3.3 Nginx server block example

Create `/etc/nginx/sites-available/buildingeditor`:

```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /var/www/BuildingEditor/public;

    index index.php;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \.php$ {
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:/run/php/php8.2-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
    }

    location ~ /\.ht {
        deny all;
    }
}
```

Enable config:

```bash
sudo ln -s /etc/nginx/sites-available/buildingeditor /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 3.4 Permissions

```bash
sudo chown -R www-data:www-data /var/www/BuildingEditor
sudo chmod -R 775 /var/www/BuildingEditor/storage /var/www/BuildingEditor/bootstrap/cache
```

## 4. MySQL Setup (local and VPS)

```sql
CREATE DATABASE BuildingEditor CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'buildingeditor'@'localhost' IDENTIFIED BY 'strong_password_here';
GRANT ALL PRIVILEGES ON BuildingEditor.* TO 'buildingeditor'@'localhost';
FLUSH PRIVILEGES;
```

Use the same values in `.env`.

## 5. Common Error Codes and Fixes

- 404 Not Found:
  - Verify route exists.
  - Verify Nginx `try_files` points to `index.php`.

- 419 Session Expired / CSRF mismatch:
  - Refresh page and login again.
  - Clear config/cache: `php artisan optimize:clear`.
  - Ensure `APP_URL` is correct and session cookies are valid.

- 500 Server Error:
  - Check logs: `storage/logs/laravel.log`.
  - Verify `.env` values and DB connection.
  - Run `composer install` and `php artisan migrate --force`.

## 6. Quick Health Check

```bash
php artisan about
php artisan route:list
php artisan migrate:status
```

If all commands work and `npm run dev` (local) or `npm run build` (VPS) succeeds, setup is complete.
