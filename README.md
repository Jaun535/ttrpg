# ⚔️ TTRPG Portal

Portal colaborativo para campañas de rol de mesa. Alternativa a ObsidianPortal que corre completamente en tu servidor local dentro de Docker.

---

## Funcionalidades

- **Múltiples campañas** — cada usuario puede ser GM en una campaña y jugador en otra
- **Sistema de roles por campaña** — Admin (sitio) · GM · Co-GM · Jugador · Espectador
- **Códigos de invitación** — comparte un link para que los jugadores se unan fácilmente
- **Personajes y NPCs** — fichas completas con retrato, estadísticas, trasfondo y notas privadas de GM
- **Wiki colaborativa** — artículos estilo Wikipedia con editor rico, categorías, tags e historial de revisiones
- **Crónicas de sesión** — log numerado de sesiones con editor rico y tags
- **Biblioteca de documentos** — sube mapas, PDFs, imágenes y cualquier archivo hasta 50 MB
- **Búsqueda global** — busca en wiki, personajes, logs y documentos desde la portada de la campaña
- **Contenido GM-only** — artículos, logs y documentos invisibles para jugadores
- **Almacenamiento persistente** — todo guardado en tu servidor (PostgreSQL + volumen local)

---

## Requisitos

- Docker Engine 24+
- Docker Compose v2+
- ~500 MB de espacio en disco para imágenes base (más tus datos)

---

## Instalación

### 1. Clona o copia el proyecto

```bash
# Si tienes git
git clone <tu-repo> ttrpg-portal
cd ttrpg-portal

# O simplemente coloca la carpeta en tu servidor
cd ttrpg-portal
```

### 2. Configura las variables de entorno

```bash
cp .env.example .env
nano .env        # o vim .env, o cualquier editor
```

Edita los tres valores importantes:

```env
DB_PASSWORD=una_contrasena_larga_y_segura
SECRET_KEY=una_clave_aleatoria_de_minimo_32_caracteres
PORT=3000        # Puerto donde quedará disponible la app
```

> **Importante:** Cambia `DB_PASSWORD` y `SECRET_KEY` antes de iniciar. Una vez levantada la base de datos, no cambies `DB_PASSWORD` sin migrar los datos.

### 3. Levanta el stack

```bash
docker compose up -d --build
```

La primera vez tarda 3–5 minutos mientras construye las imágenes.

### 4. Accede al portal

Abre tu navegador en:
```
http://localhost:3000
```
(o el puerto que hayas configurado en `.env`)

**Credenciales iniciales del administrador:**
```
Usuario: admin
Contraseña: admin123
```

> ⚠️ **Cambia la contraseña del admin** inmediatamente desde Perfil → Nueva contraseña.

---

## Estructura de directorios

```
ttrpg-portal/
├── docker-compose.yml        # Orquestación de servicios
├── .env.example              # Plantilla de variables de entorno
├── nginx/
│   └── nginx.conf            # Reverse proxy (enruta /api → Flask, / → React)
├── backend/                  # API REST en Flask + SQLAlchemy
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── run.py
│   └── app/
│       ├── models/           # User, Campaign, Character, WikiArticle, LogEntry, Document
│       ├── routes/           # auth, campaigns, characters, wiki, logs_docs, search, users
│       └── utils/            # auth decorators, file upload helper
├── frontend/                 # SPA en React 18 + Vite
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       ├── pages/            # HomePage, CampaignPage, CharactersPage, WikiPage, etc.
│       ├── components/       # Layout, RichEditor, UI components
│       ├── context/          # AuthContext (JWT)
│       └── api.js            # Cliente Axios con todos los endpoints
└── data/
    ├── postgres/             # Volumen de la base de datos (auto-generado)
    └── uploads/              # Archivos subidos (imágenes, docs, etc.)
```

---

## Gestión de Docker

```bash
# Ver estado de los contenedores
docker compose ps

# Ver logs en tiempo real
docker compose logs -f

# Ver logs solo del backend
docker compose logs -f backend

# Detener sin borrar datos
docker compose stop

# Reiniciar
docker compose restart

# Actualizar tras cambios en el código
docker compose up -d --build

# Detener y eliminar contenedores (los datos en ./data se conservan)
docker compose down
```

---

## Backups

Los datos están en dos lugares:

| Qué | Dónde |
|-----|-------|
| Base de datos (usuarios, campañas, wiki, logs) | `./data/postgres/` |
| Archivos subidos (imágenes, docs) | `./data/uploads/` |

### Backup de la base de datos

```bash
# Exportar
docker compose exec db pg_dump -U ttrpg ttrpg > backup_$(date +%Y%m%d).sql

# Restaurar
cat backup_20240101.sql | docker compose exec -T db psql -U ttrpg ttrpg
```

### Backup completo (datos + archivos)

```bash
# Con rsync a otro directorio o servidor
rsync -av ./data/ /mnt/backup/ttrpg-data/

# O simplemente comprime la carpeta data/
tar -czf ttrpg-backup-$(date +%Y%m%d).tar.gz ./data/
```

---

## Roles y permisos

| Acción | Admin sitio | GM | Co-GM | Jugador | Espectador |
|--------|:-----------:|:--:|:-----:|:-------:|:----------:|
| Crear campaña | ✓ | ✓ | ✓ | ✓ | ✓ |
| Configurar campaña | ✓ | ✓ | ✓ | — | — |
| Gestionar miembros | ✓ | ✓ | ✓ | — | — |
| Crear/editar wiki | ✓ | ✓ | ✓ | ✓ | — |
| Crear NPCs | ✓ | ✓ | ✓ | — | — |
| Crear personaje (PJ) | ✓ | ✓ | ✓ | ✓ | — |
| Ver contenido GM-only | ✓ | ✓ | ✓ | — | — |
| Marcar contenido GM-only | ✓ | ✓ | ✓ | — | — |
| Subir documentos | ✓ | ✓ | ✓ | ✓ | — |
| Gestionar usuarios (sitio) | ✓ | — | — | — | — |

---

## Personalización

### Cambiar el puerto

Edita `.env`:
```env
PORT=8080
```
Luego `docker compose up -d`.

### Acceso desde la red local (LAN)

La app ya escucha en `0.0.0.0`. Accede desde otros dispositivos en tu red usando la IP de tu servidor:
```
http://192.168.1.X:3000
```

### HTTPS / dominio propio

Coloca un reverse proxy externo (Nginx, Caddy, Traefik) delante del puerto configurado. Ejemplo con Caddy:

```
ttrpg.midominio.com {
    reverse_proxy localhost:3000
}
```

### Aumentar límite de subida

En `.env` (en bytes, 52428800 = 50 MB):
```env
MAX_CONTENT_LENGTH=104857600   # 100 MB
```
Y en `nginx/nginx.conf`:
```nginx
client_max_body_size 100M;
```

---

## Solución de problemas

**El backend no arranca:**
```bash
docker compose logs backend
# Verifica que la DB esté sana
docker compose ps db
```

**Olvidé la contraseña del admin:**
```bash
# Conectarse a la base de datos
docker compose exec db psql -U ttrpg ttrpg

# Desde psql, actualizar el hash (contraseña: "nueva123")
UPDATE users SET password_hash = 'pbkdf2:sha256:...' WHERE username = 'admin';
# O más simple: resetear desde Python
```
```bash
docker compose exec backend python -c "
from app import create_app, db
from app.models.user import User
app = create_app()
with app.app_context():
    u = User.query.filter_by(username='admin').first()
    u.set_password('nuevacontrasena')
    db.session.commit()
    print('Contraseña actualizada')
"
```

**Las imágenes no se muestran:**
Verifica que `./data/uploads/` tenga permisos de escritura para el proceso Docker:
```bash
chmod -R 777 ./data/uploads/
```

---

## Stack técnico

| Capa | Tecnología |
|------|-----------|
| Frontend | React 18, Vite, TanStack Query, Tiptap (editor rico) |
| Backend | Flask 3, SQLAlchemy, Flask-JWT-Extended |
| Base de datos | PostgreSQL 16 |
| Proxy | Nginx (Alpine) |
| Contenedores | Docker Compose |
| Almacenamiento | Volúmenes locales (mapeados a `./data/`) |
