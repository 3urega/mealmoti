# Mealmoti - Listas de Compra Compartidas

Aplicación web para crear y compartir listas de la compra con familia y amigos.

## 🚀 Inicio Rápido

### Prerrequisitos

- Node.js 18+ 
- PostgreSQL

### Instalación

1. Clonar el repositorio
2. Instalar dependencias:
```bash
npm install
```

3. Configurar variables de entorno:
```bash
# Crear archivo .env con:
DATABASE_URL="postgresql://usuario:password@localhost:5432/mealmoti?schema=public"
NODE_ENV="development"
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN="tu_token_de_mapbox_aqui"
```

**Nota sobre Mapbox:** Para usar el selector de ubicación en los comercios, necesitas un token de acceso de Mapbox:
- Regístrate en [Mapbox](https://account.mapbox.com/)
- Crea un token de acceso público en [tus tokens](https://account.mapbox.com/access-tokens/)
- Copia el token y añádelo a tu archivo `.env` como `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN`

4. Configurar base de datos:
```bash
# Opción 1: Usar db:push (desarrollo rápido)
npm run dev:setup

# Opción 2: Usar migraciones (recomendado para producción)
npm run db:migrate
npm run db:seed
```

5. Iniciar servidor de desarrollo:
```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:3000`

## 👤 Usuario de Prueba (Desarrollo)

En modo desarrollo, puedes usar estas credenciales:

- **Email:** `test@mealmoti.com`
- **Contraseña:** `password123`

Este usuario se crea automáticamente al ejecutar `npm run db:seed` o `npm run dev:setup`.

## 📜 Scripts Disponibles

- `npm run dev` - Inicia servidor de desarrollo
- `npm run build` - Construye la aplicación para producción
- `npm run start` - Inicia servidor de producción
- `npm run lint` - Ejecuta el linter

### Scripts de Base de Datos

- `npm run db:generate` - Genera Prisma Client
- `npm run db:push` - Sincroniza schema sin migraciones (desarrollo)
- `npm run db:migrate` - Crea y aplica migraciones
- `npm run db:studio` - Abre Prisma Studio (interfaz visual de BD)
- `npm run db:seed` - Ejecuta el seed (crea usuario de prueba)
- `npm run dev:setup` - Configuración rápida: push + seed

## 🏗️ Estructura del Proyecto

```
mealmoti/
├── app/
│   ├── api/          # API Routes
│   ├── app/          # Páginas privadas
│   ├── login/        # Página de login
│   ├── register/     # Página de registro
│   └── page.tsx       # Landing page
├── components/       # Componentes React
├── lib/              # Utilidades y helpers
├── prisma/           # Schema y migraciones
└── middleware.ts      # Middleware de Next.js
```

## 🔐 Autenticación

La aplicación usa cookies httpOnly para manejar sesiones. Las contraseñas se hashean con bcryptjs.

## 📝 Funcionalidades

- ✅ Registro y autenticación de usuarios
- ✅ Crear listas de compra
- ✅ Agregar, editar y eliminar items
- ✅ Marcar items como completados
- ✅ Compartir listas con otros usuarios
- ✅ Control de permisos (solo lectura / edición)
- ✅ Selección de ubicación de comercios con Mapbox

## 🛠️ Stack Tecnológico

- **Framework:** Next.js 16+ (App Router)
- **Base de Datos:** PostgreSQL
- **ORM:** Prisma
- **Autenticación:** Cookies con sesiones
- **Estilos:** Tailwind CSS
- **Validación:** Zod
- **Hash de contraseñas:** bcryptjs
- **Mapas:** Mapbox GL JS (para selección de ubicación de comercios)

## 📚 Documentación

Para más detalles sobre la implementación, consulta `mealmoti.md`.
