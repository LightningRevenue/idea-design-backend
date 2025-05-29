# Ghid de Deploy: Backend E-commerce (Express.js pe AWS EC2)

Acest `README` conține instrucțiuni detaliate pentru implementarea (deploy-ul) unui backend Express.js pe o instanță AWS EC2, configurarea Nginx ca reverse proxy și gestionarea aplicației cu PM2.

---

## Cuprins

1.  [Pre-requisite](#1-pre-requisite)
2.  [Configurarea Instanței AWS EC2](#2-configurarea-instanței-aws-ec2)
3.  [Configurarea Inițială a Serverului (Conectare SSH)](#3-configurarea-inițială-a-serverului-conectare-ssh)
4.  [Implementarea Aplicației Backend](#4-implementarea-aplicației-backend)
5.  [Configurarea Nginx (Server Web / Reverse Proxy)](#5-configurarea-nginx-server-web--reverse-proxy)
6.  [Pași Post-Deploy & Recomandări](#6-pași-post-deploy--recomandări)

---

## 1. Pre-requisite

Înainte de a începe, asigură-te că ai următoarele:

* Un cont AWS activ.
* Cheia SSH (`.pem`) pentru instanța EC2, cu permisiuni de `chmod 400`.
* Aplicația ta Express.js (backend) urcată într-un **repository privat** pe GitHub (sau alt serviciu Git).
* Fișierul `package.json` în rădăcina proiectului backend, cu un script `start` (ex: `"start": "node server.js"`).
* Un fișier `.env` (pe mașina ta locală) care conține variabilele de mediu (ex: `PORT`, `MONGODB_URI`, `JWT_SECRET`). **Acest fișier NU trebuie să fie în Git!**
* **Fișierul `ecosystem.config.js`** (cel de mai sus) adăugat la repository-ul tău GitHub (`git add`, `git commit`, `git push`).

---

## 2. Configurarea Instanței AWS EC2

La lansarea instanței EC2, alege următoarele:

* **AMI (Amazon Machine Image):** Ubuntu Server (versiunea LTS recomandată, ex: Ubuntu Server 22.04 LTS).
* **Instance Type:** `t2.medium` (2 vCPU, 4 GiB RAM). Acesta este un bun punct de plecare pentru trafic redus-mediu. Monitorizează-l și upgradează dacă e necesar.
* **Storage (EBS):**
    * Tip: `gp3`.
    * Dimensiune: 50 GiB (suficient pentru SO, aplicație și log-uri).
* **Auto-assign Public IP:** `Enable`.
* **Firewall (Security Groups):** Creează un nou Security Group și configurează următoarele reguli INBOUND:
    * **SSH (Port 22):**
        * Sursă: **Custom** (specifică **adresa IP publică a mașinii tale locale** sau a biroului tău, ex: `1.2.3.4/32`). **NU LĂSA `0.0.0.0/0` (Anywhere) PENTRU SSH ÎN PRODUCȚIE!**
    * **HTTP (Port 80):**
        * Sursă: `0.0.0.0/0` (Anywhere) - Necesită acces public pentru web.
    * **HTTPS (Port 443):**
        * Sursă: `0.0.0.0/0` (Anywhere) - Esențial pentru securitate (SSL/TLS).
* **Key pair (login):** Alege sau creează o pereche de chei existentă (`.pem`).

---

## 3. Configurarea Inițială a Serverului (Conectare SSH)

După ce instanța EC2 este `running`, conectează-te la ea.

1.  **Conectare prin SSH:**
    ```bash
    ssh -i /cale/catre/cheia-ta.pem ubuntu@ADRESA_IP_PUBLICA_EC2
    ```
    (Înlocuiește `/cale/catre/cheia-ta.pem` și `ADRESA_IP_PUBLICA_EC2`).

2.  **Actualizează pachetele sistemului de operare:**
    ```bash
    sudo apt update && sudo apt upgrade -y
    ```

3.  **Instalează Git:**
    ```bash
    sudo apt install git -y
    ```

4.  **Instalează Nginx:**
    ```bash
    sudo apt install nginx -y
    sudo systemctl start nginx
    sudo systemctl enable nginx
    ```

5.  **Instalează Node.js și npm (cu `nvm` - Recomandat):**
    ```bash
    curl -o- [https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.1/install.sh](https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.1/install.sh) | bash
    # Acum, închide și redeschide sesiunea SSH SAU rulează:
    source ~/.bashrc
    # Verifică dacă nvm funcționează:
    nvm --version
    # Instalează cea mai recentă versiune LTS și setează-o ca implicită:
    nvm install --lts
    nvm use --lts
    nvm alias default lts/*
    # Asigură-te că npm e la zi:
    npm install -g npm@latest
    ```

6.  **Instalează PM2 (Process Manager):**
    ```bash
    npm install -g pm2
    ```

---

## 4. Implementarea Aplicației Backend

1.  **Clonează repository-ul backend-ului:**
    ```bash
    cd ~ # Navighează în directorul home
    git clone [https://github.com/YOUR_GITHUB_USERNAME/YOUR_REPO_NAME.git](https://github.com/YOUR_GITHUB_USERNAME/YOUR_REPO_NAME.git)
    # Dacă repository-ul este privat și ai configurat SSH keys cu GitHub:
    # git clone git@github.com:YOUR_GITHUB_USERNAME/YOUR_REPO_NAME.git
    ```
    (Înlocuiește `<YOUR_GITHUB_USERNAME>` și `<YOUR_REPO_NAME>`).

2.  **Navighează în folderul clonat:**
    ```bash
    cd YOUR_REPO_NAME # Ex: cd idea-design-backend
    ```

3.  **Creează manual fișierul `.env` pe server:**
    * Acest fișier conține variabilele de mediu sensibile și nu este în Git.
    ```bash
    nano .env
    ```
    * Lipește conținutul fișierului tău `.env` local, **asigurându-te că valorile sunt cele pentru producție**:
        ```
        PORT=3000
        MONGODB_URI=mongodb+srv://user_prod:parola_prod@cluster.mongodb.net/database_prod?retryWrites=true&w=majority&appName=StelianaWorkflow
        JWT_SECRET=un_secret_foarte_lung_si_complex_pentru_productie
        # Adaugă orice alte variabile de mediu necesare
        ```
    * Salvează și închide (`Ctrl+O`, `Enter`, `Ctrl+X`).

4.  **Instalează dependențele Node.js ale aplicației tale:**
    ```bash
    npm install
    ```

5.  **Pornește aplicația Express cu PM2 (folosind `ecosystem.config.js`):**
    ```bash
    pm2 start ecosystem.config.js --env production
    ```
    * Verifică statusul: `pm2 list` (ar trebui să fie `online`).
    * Verifică log-urile pentru erori: `pm2 logs idea-design-backend`.

6.  **Configurează PM2 să pornească la boot (systemd):**
    * Obține calea Node.js (ex: `/home/ubuntu/.nvm/versions/node/v22.16.0/bin`):
        ```bash
        which node
        ```
    * Rulează comanda de startup (înlocuiește calea dacă e diferită):
        ```bash
        sudo env PATH=$PATH:/home/ubuntu/.nvm/versions/node/vYOUR_NODE_VERSION/bin pm2 startup systemd
        ```
        (Unde `vYOUR_NODE_VERSION` este versiunea reală, ex: `v22.16.0`).
    * **Urmează instrucțiunile afișate** de PM2 (de obicei o comandă `sudo systemctl enable pm2-root.service`).
    * Salvează lista de procese PM2 pentru repornire automată:
        ```bash
        pm2 save
        ```

---

## 5. Configurarea Nginx (Server Web / Reverse Proxy)

1.  **Editează fișierul de configurare `default` al Nginx:**
    ```bash
    sudo nano /etc/nginx/sites-available/default
    ```
2.  **Șterge TOT conținutul existent** și lipește următoarea configurație:
    ```nginx
    server {
        listen 80 default_server;
        listen [::]:80 default_server;
        server_name ADRESA_IP_PUBLICA_EC2; # <-- ÎNLOCUIEȘTE AICI cu IP-ul tău public EC2

        # Servire fișiere statice (imaginile tale de produse)
        location /public/ {
            alias /home/ubuntu/YOUR_REPO_NAME/public/; # <-- ASIGURĂ-TE CĂ ACEASTĂ CALE ESTE CORECTĂ!
            try_files $uri $uri/ =404;
            # expires 30d;
            # add_header Cache-Control "public, no-transform";
        }

        # Reverse Proxy către aplicația Express
        location / {
            proxy_pass https://idea-design-backend-fbfbcjg6grgvfght.westeurope-01.azurewebsites.net; # <-- ASIGURĂ-TE CĂ 3000 ESTE PORTUL PE CARE ASCULTĂ EXPRESS-UL TĂU!
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
    ```
    * **Asigură-te că ai înlocuit toate placeholder-urile:**
        * `ADRESA_IP_PUBLICA_EC2`
        * `/home/ubuntu/YOUR_REPO_NAME/public/` (înlocuiește `YOUR_REPO_NAME` cu numele real al folderului clonat, ex: `idea-design-backend`)
        * Portul `3000` (dacă aplicația ta ascultă pe alt port).
    * Salvează și închide (`Ctrl+O`, `Enter`, `Ctrl+X`).

3.  **Verifică sintaxa Nginx și repornește-l:**
    ```bash
    sudo nginx -t
    sudo systemctl restart nginx
    ```

---

## 6. Pași Post-Deploy & Recomandări

1.  **Testare Inițială:**
    * Accesează `http://ADRESA_IP_PUBLICA_EC2/` în browser.
    * Testează un endpoint API (ex: `http://ADRESA_IP_PUBLICA_EC2/api/produse`).
    * Testează o imagine statică (ex: `http://ADRESA_IP_PUBLICA_EC2/public/nume_imagine.jpg`).

2.  **CORS (Cross-Origin Resource Sharing):**
    * Probabil vei primi erori CORS când frontend-ul tău încearcă să acceseze backend-ul.
    * Instalează `cors` în backend: `npm install cors`.
    * În fișierul principal Express (`server.js`), adaugă:
        ```javascript
        const cors = require('cors');
        app.use(cors({
            origin: 'https://idea-design-backend-fbfbcjg6grgvfght.westeurope-01.azurewebsites.net' // Pentru dezvoltare frontend
            // SAU: origin: '[https://numeletaufrontend.com](https://numeletaufrontend.com)' // Pentru producție frontend
        }));
        ```
    * **Repornește Express cu PM2:** `pm2 restart idea-design-backend`.

3.  **HTTPS (SSL/TLS) - **CRITIC PENTRU UN MAGAZIN E-COMMERCE!****
    * Frontend-ul tău va rula pe HTTPS, iar backend-ul **trebuie** să fie pe HTTPS pentru a evita erorile "mixed content".
    * **Instalează Certbot (de la Let's Encrypt):**
        ```bash
        sudo snap install core; sudo snap refresh core
        sudo snap install --classic certbot
        sudo ln -s /snap/bin/certbot /usr/bin/certbot
        sudo certbot --nginx # Urmează instrucțiunile pentru a obține și instala certificatul
        ```
    * Asta va configura automat Nginx pentru HTTPS și redirecționare de la HTTP la HTTPS.
    * Asigură-te că portul **443 (HTTPS)** este deschis în Security Group.

4.  **Domeniu Personalizat (Recomandat):**
    * Alocă o **adresă IP Elastică (EIP)** instanței tale EC2 (o IP statică care nu se schimbă la repornire).
    * Configurează un record **A** în DNS-ul domeniului tău (ex: `api.domeniultau.com`) care să pointeze către IP-ul Elastic.
    * Actualizează `server_name` în Nginx cu numele domeniului.

5.  **Externalizarea Imaginilor (Amazon S3) - **RECOMANDARE PUTERNICĂ****
    * Pentru scalabilitate și durabilitate, **NU stoca imagini de produse pe discul EC2**.
    * Adaptează backend-ul să uploadeze imaginile direct în **Amazon S3** și să stocheze URL-urile lor în baza de date.
    * Folosește **Amazon CloudFront** pentru a servi imaginile de pe S3 rapid la nivel global.

6.  **Automatizarea Deploy-ului (CI/CD):**
    * Odată ce ai o configurație funcțională, automatizează tot procesul cu AWS CodePipeline, CodeBuild și CodeDeploy. Asta va face update-urile mult mai ușoare și mai sigure.

Mult succes! Ai un ghid complet acum.