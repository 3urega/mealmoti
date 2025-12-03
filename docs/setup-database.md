# Guía de Configuración de Base de Datos

Esta guía te ayudará a configurar la base de datos PostgreSQL y crear el usuario de prueba.

## 📋 Prerrequisitos

1. **PostgreSQL instalado y ejecutándose**
2. **Node.js 18+ instalado**
3. **Dependencias del proyecto instaladas** (`npm install`)

## 🔧 Paso 1: Configurar Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto con la siguiente configuración:

```env
DATABASE_URL="postgresql://usuario:password@localhost:5432/mealmoti?schema=public"
NODE_ENV="development"
```

**Reemplaza los valores:**
- `usuario`: Tu usuario de PostgreSQL (por defecto suele ser `postgres`)
- `password`: Tu contraseña de PostgreSQL
- `localhost:5432`: Host y puerto (ajusta si es necesario)
- `mealmoti`: Nombre de la base de datos (puedes cambiarlo)

**Ejemplo:**
```env
DATABASE_URL="postgresql://postgres:mipassword@localhost:5432/mealmoti?schema=public"
NODE_ENV="development"
```

## 🗄️ Paso 2: Crear la Base de Datos

Si la base de datos no existe, créala manualmente:

```bash
# Conectarse a PostgreSQL
psql -U postgres

# Crear la base de datos
CREATE DATABASE mealmoti;

# Salir de psql
\q
```

O desde la línea de comandos:
```bash
createdb -U postgres mealmoti
```

## 🚀 Paso 3: Opciones para Subir la Estructura

Tienes dos opciones dependiendo de si es la primera vez o si ya tienes migraciones:

### Opción A: Primera Vez (Desarrollo Rápido) - Recomendado para empezar

Este método sincroniza el schema directamente sin crear migraciones:

```bash
# 1. Generar el cliente de Prisma
npm run db:generate

# 2. Sincronizar el schema con la base de datos
npm run db:push

# 3. Crear el usuario de prueba y datos de ejemplo
npm run db:seed
```

**O usa el comando combinado:**
```bash
npm run dev:setup
```

Este comando ejecuta `db:push` y `db:seed` en secuencia.

### Opción B: Con Migraciones (Recomendado para Producción)

Este método crea migraciones versionadas:

```bash
# 1. Generar el cliente de Prisma
npm run db:generate

# 2. Crear y aplicar la primera migración
npm run db:migrate

# Cuando te pregunte el nombre de la migración, usa: "init"

# 3. Crear el usuario de prueba y datos de ejemplo
npm run db:seed
```

## ✅ Paso 4: Verificar la Instalación

### Verificar que todo funcionó:

1. **Verificar el usuario de prueba:**
```bash
npm run db:studio
```

Esto abrirá Prisma Studio en tu navegador donde podrás ver:
- El usuario `test@mealmoti.com` en la tabla `User`
- La lista de ejemplo "Compra Semanal" en `ShoppingList`
- Los ítems de ejemplo en `ListItem`

2. **Probar el login:**
   - Ve a `http://localhost:3000/login`
   - Email: `test@mealmoti.com`
   - Contraseña: `password123`

## 📝 Scripts Disponibles

| Comando | Descripción |
|---------|-------------|
| `npm run db:generate` | Genera el cliente de Prisma |
| `npm run db:push` | Sincroniza schema sin migraciones (desarrollo) |
| `npm run db:migrate` | Crea y aplica migraciones |
| `npm run db:seed` | Ejecuta el seed (crea usuario de prueba) |
| `npm run db:studio` | Abre Prisma Studio (interfaz visual) |
| `npm run dev:setup` | Setup rápido: push + seed |

## 🔄 Si Necesitas Resetear la Base de Datos

Si quieres empezar de cero:

```bash
# Opción 1: Resetear y volver a crear todo
npx prisma migrate reset

# Opción 2: Eliminar y recrear manualmente
# 1. Eliminar la base de datos
dropdb -U postgres mealmoti

# 2. Crear de nuevo
createdb -U postgres mealmoti

# 3. Seguir desde el Paso 3
```

## 🐛 Solución de Problemas

### Error: "Can't reach database server"

- Verifica que PostgreSQL esté ejecutándose
- Verifica la URL en `.env`
- Verifica usuario y contraseña

### Error: "Database does not exist"

- Crea la base de datos manualmente (Paso 2)
- O verifica el nombre en `DATABASE_URL`

### Error: "relation already exists"

- La base de datos ya tiene tablas. Usa `prisma migrate reset` para resetear

### Error al ejecutar seed

- Verifica que `lib/auth.ts` exista y tenga la función `hashPassword`
- Verifica que las dependencias estén instaladas: `npm install`

## 📊 Estructura Creada

Después de ejecutar los comandos, tendrás:

- **Tabla `User`**: Usuarios del sistema
- **Tabla `ShoppingList`**: Listas de compra
- **Tabla `ListItem`**: Ítems de las listas
- **Tabla `ShoppingListShare`**: Compartir listas entre usuarios

**Datos de prueba:**
- 1 usuario: `test@mealmoti.com` / `password123`
- 1 lista: "Compra Semanal" con 4 ítems de ejemplo

## 🎯 Siguiente Paso

Una vez configurada la base de datos, puedes:

1. Iniciar el servidor de desarrollo: `npm run dev`
2. Acceder a la aplicación: `http://localhost:3000`
3. Hacer login con el usuario de prueba

