# Mealmoti - Guía de Implementación Fase Inicial

## Descripción del Proyecto

Mealmoti es una aplicación web que permite a los usuarios crear listas de la compra y compartirlas con otros usuarios registrados. La aplicación tendrá una parte pública (accesible sin registro) y una parte privada (requiere autenticación).

## Stack Tecnológico

- **Framework**: Next.js 16+ (App Router)
- **Base de Datos**: PostgreSQL
- **ORM**: Prisma
- **Autenticación**: Cookies con sesiones
- **Estilos**: Tailwind CSS
- **Validación**: Zod
- **Hash de contraseñas**: bcryptjs

## Fase Inicial: Objetivos

1. ✅ Parte pública accesible sin registro
2. ✅ Sistema de registro y autenticación de usuarios
3. ✅ Parte privada protegida para usuarios registrados
4. ✅ Creación de listas de la compra
5. ✅ Compartir listas con otros usuarios

---

## Paso 1: Configuración Inicial del Proyecto

### 1.1 Crear el proyecto Next.js

```bash
npx create-next-app@latest mealmoti --typescript --tailwind --app --no-src-dir
cd mealmoti
```

### 1.2 Instalar dependencias necesarias

```bash
npm install @prisma/client bcryptjs zod
npm install -D prisma @types/bcryptjs tsx
```

### 1.3 Configurar variables de entorno

Crear archivo `.env`:

```env
DATABASE_URL="postgresql://usuario:password@localhost:5432/mealmoti?schema=public"
NODE_ENV="development"
```

### 1.4 Inicializar Prisma

```bash
npx prisma init
```

---

## Paso 2: Diseño del Schema de Base de Datos

### 2.1 Modelo de Usuario

```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String
  password  String   // Hasheado con bcrypt
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  // Relaciones
  shoppingLists ShoppingList[] @relation("ListOwner")
  sharedLists   ShoppingListShare[]
  listItems     ListItem[]
}
```

### 2.2 Modelo de Lista de Compra

```prisma
model ShoppingList {
  id          String   @id @default(cuid())
  name        String
  description String?
  ownerId     String
  owner       User     @relation("ListOwner", fields: [ownerId], references: [id], onDelete: Cascade)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  // Relaciones
  items  ListItem[]
  shares ShoppingListShare[]
  
  @@index([ownerId])
}
```

### 2.3 Modelo de Item de Lista

```prisma
model ListItem {
  id             String        @id @default(cuid())
  name           String
  quantity       String?       // "2", "1kg", "500g", etc.
  unit           String?       // "unidades", "kg", "litros", etc.
  checked        Boolean       @default(false)
  notes          String?       // Notas adicionales
  shoppingListId String
  shoppingList   ShoppingList  @relation(fields: [shoppingListId], references: [id], onDelete: Cascade)
  addedById      String?       // Usuario que agregó el item
  addedBy        User?         @relation(fields: [addedById], references: [id], onDelete: SetNull)
  createdAt      DateTime      @default(now())
  updatedAt      DateTime      @updatedAt
  
  @@index([shoppingListId])
  @@index([checked])
}
```

### 2.4 Modelo de Compartir Lista

```prisma
model ShoppingListShare {
  id             String        @id @default(cuid())
  shoppingListId String
  shoppingList   ShoppingList  @relation(fields: [shoppingListId], references: [id], onDelete: Cascade)
  userId         String
  user           User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  canEdit        Boolean       @default(true) // Permiso para editar la lista
  createdAt      DateTime      @default(now())
  
  @@unique([shoppingListId, userId]) // Un usuario solo puede tener una relación con cada lista
  @@index([userId])
  @@index([shoppingListId])
}
```

### 2.5 Schema completo (prisma/schema.prisma)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String
  password  String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  shoppingLists ShoppingList[] @relation("ListOwner")
  sharedLists   ShoppingListShare[]
  listItems     ListItem[]
  
  @@index([email])
}

model ShoppingList {
  id          String   @id @default(cuid())
  name        String
  description String?
  ownerId     String
  owner       User     @relation("ListOwner", fields: [ownerId], references: [id], onDelete: Cascade)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  items  ListItem[]
  shares ShoppingListShare[]
  
  @@index([ownerId])
}

model ListItem {
  id             String        @id @default(cuid())
  name           String
  quantity       String?
  unit           String?
  checked        Boolean       @default(false)
  notes          String?
  shoppingListId String
  shoppingList   ShoppingList  @relation(fields: [shoppingListId], references: [id], onDelete: Cascade)
  addedById      String?
  addedBy        User?         @relation(fields: [addedById], references: [id], onDelete: SetNull)
  createdAt      DateTime      @default(now())
  updatedAt      DateTime      @updatedAt
  
  @@index([shoppingListId])
  @@index([checked])
}

model ShoppingListShare {
  id             String        @id @default(cuid())
  shoppingListId String
  shoppingList   ShoppingList  @relation(fields: [shoppingListId], references: [id], onDelete: Cascade)
  userId         String
  user           User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  canEdit        Boolean       @default(true)
  createdAt      DateTime      @default(now())
  
  @@unique([shoppingListId, userId])
  @@index([userId])
  @@index([shoppingListId])
}
```

### 2.6 Generar Prisma Client y crear migración

```bash
npx prisma generate
npx prisma migrate dev --name init
```

---

## Paso 3: Configuración de Librerías Base

### 3.1 Crear lib/prisma.ts

```typescript
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```

### 3.2 Crear lib/auth.ts

```typescript
import bcrypt from 'bcryptjs';

export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}
```

### 3.3 Crear lib/session.ts

```typescript
import { cookies } from 'next/headers';

const SESSION_COOKIE_NAME = 'mealmoti_session';
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 días

export async function createSession(userId: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, userId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE,
    path: '/',
  });
}

export async function getSession(): Promise<string | null> {
  const cookieStore = await cookies();
  const session = cookieStore.get(SESSION_COOKIE_NAME);
  return session?.value || null;
}

export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}
```

### 3.4 Crear lib/get-session.ts

```typescript
import { getSession } from './session';
import { prisma } from './prisma';

export async function getCurrentUser(): Promise<{
  id: string;
  email: string;
  name: string;
} | null> {
  try {
    const userId = await getSession();
    if (!userId) return null;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true },
    });

    return user;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}
```

---

## Paso 4: Sistema de Autenticación

### 4.1 API de Registro: `app/api/auth/register/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';
import { createSession } from '@/lib/session';
import { z } from 'zod';

const registerSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  password: z.string().min(6),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, name, password } = registerSchema.parse(body);

    // Verificar si el usuario ya existe
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 400 }
      );
    }

    // Crear usuario
    const hashedPassword = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase().trim(),
        name,
        password: hashedPassword,
      },
    });

    // Crear sesión
    await createSession(user.id);

    return NextResponse.json(
      {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error in register:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
```

### 4.2 API de Login: `app/api/auth/login/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassword } from '@/lib/auth';
import { createSession } from '@/lib/session';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = loginSchema.parse(body);

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user || !(await verifyPassword(password, user.password))) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    await createSession(user.id);

    return NextResponse.json(
      {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in login:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
```

### 4.3 API de Logout: `app/api/auth/logout/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { deleteSession } from '@/lib/session';

export async function POST() {
  try {
    await deleteSession();
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error in logout:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
```

### 4.4 API de Usuario Actual: `app/api/auth/me/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/get-session';

export async function GET() {
  try {
    const user = await getCurrentUser();
    return NextResponse.json({ user }, { status: 200 });
  } catch (error) {
    console.error('Error in /api/auth/me:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
```

---

## Paso 5: Middleware de Protección de Rutas

### 5.1 Crear middleware.ts

```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const SESSION_COOKIE_NAME = 'mealmoti_session';

export function middleware(request: NextRequest) {
  const session = request.cookies.get(SESSION_COOKIE_NAME);
  const isAuthRoute = request.nextUrl.pathname.startsWith('/app');
  const isPublicAuthRoute = 
    request.nextUrl.pathname === '/login' || 
    request.nextUrl.pathname === '/register';

  // Si es ruta protegida y no hay sesión, redirigir a login
  if (isAuthRoute && (!session || !session.value)) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Si está autenticado y trata de acceder a login/register, redirigir a app
  if (session && session.value && isPublicAuthRoute) {
    return NextResponse.redirect(new URL('/app', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/app/:path*', '/login', '/register'],
};
```

---

## Paso 6: Estructura de Páginas Públicas

### 6.1 Página de Inicio: `app/page.tsx`

- Landing page con información sobre la app
- Botones para "Registrarse" y "Iniciar Sesión"
- Si el usuario está autenticado, mostrar botón para ir a la app

### 6.2 Página de Login: `app/login/page.tsx`

- Formulario de login (email, password)
- Enlace a registro
- Redirección a `/app` después del login exitoso

### 6.3 Página de Registro: `app/register/page.tsx`

- Formulario de registro (nombre, email, password, confirmar password)
- Enlace a login
- Redirección a `/app` después del registro exitoso

---

## Paso 7: Estructura de Páginas Privadas

### 7.1 Layout de App: `app/app/layout.tsx`

- Layout protegido que requiere autenticación
- Header con nombre de usuario y botón de logout
- Navegación principal

### 7.2 Dashboard: `app/app/page.tsx`

- Vista principal de la app
- Lista de listas de compra del usuario (propias y compartidas)
- Botón para crear nueva lista

### 7.3 Lista de Compra: `app/app/lists/[id]/page.tsx`

- Vista detallada de una lista de compra
- Mostrar items con checkboxes
- Agregar nuevos items
- Compartir lista con otros usuarios
- Editar/eliminar items

---

## Paso 8: APIs para Listas de Compra

### 8.1 GET `/api/lists` - Obtener listas del usuario

- Listas propias
- Listas compartidas con el usuario
- Incluir información de items y compartidos

### 8.2 POST `/api/lists` - Crear nueva lista

- Validar que el usuario esté autenticado
- Crear lista con ownerId = usuario actual

### 8.3 GET `/api/lists/[id]` - Obtener lista específica

- Verificar que el usuario tenga acceso (owner o compartida)
- Incluir items y usuarios compartidos

### 8.4 PUT `/api/lists/[id]` - Actualizar lista

- Solo owner puede actualizar nombre/descripción
- Usuarios compartidos pueden actualizar items si tienen permiso

### 8.5 DELETE `/api/lists/[id]` - Eliminar lista

- Solo owner puede eliminar

### 8.6 POST `/api/lists/[id]/share` - Compartir lista

- Owner puede compartir con otros usuarios
- Especificar permisos (canEdit)

### 8.7 DELETE `/api/lists/[id]/share/[userId]` - Dejar de compartir

- Owner puede remover acceso

---

## Paso 9: APIs para Items de Lista

### 9.1 POST `/api/lists/[id]/items` - Agregar item

- Verificar acceso a la lista
- Crear item asociado a la lista

### 9.2 PUT `/api/lists/[id]/items/[itemId]` - Actualizar item

- Marcar como checked/unchecked
- Actualizar cantidad, nombre, notas

### 9.3 DELETE `/api/lists/[id]/items/[itemId]` - Eliminar item

- Verificar acceso a la lista

---

## Paso 10: Componentes Principales

### 10.1 Header Component

- Logo/nombre de la app
- Navegación pública (Inicio, Login, Register)
- Si autenticado: nombre de usuario, enlace a app, logout

### 10.2 ShoppingListCard Component

- Tarjeta que muestra información de una lista
- Nombre, cantidad de items, items completados
- Acciones rápidas

### 10.3 ListItem Component

- Item individual de la lista
- Checkbox para marcar como completado
- Editar cantidad, nombre, notas
- Eliminar item

### 10.4 ShareListModal Component

- Modal para compartir lista
- Buscar usuarios por email
- Seleccionar permisos (solo ver / editar)

---

## Paso 11: Scripts de Package.json

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "db:generate": "prisma generate",
    "db:push": "prisma db push",
    "db:migrate": "prisma migrate dev",
    "db:studio": "prisma studio",
    "db:seed": "tsx prisma/seed.ts"
  }
}
```

---

## Paso 12: Seed Inicial (Opcional)

Crear `prisma/seed.ts` con un usuario de prueba:

```typescript
import { PrismaClient } from '@prisma/client';
import { hashPassword } from './src/lib/auth';

const prisma = new PrismaClient();

async function main() {
  // Crear usuario de prueba
  const hashedPassword = await hashPassword('password123');
  
  const user = await prisma.user.upsert({
    where: { email: 'test@mealmoti.com' },
    update: {},
    create: {
      email: 'test@mealmoti.com',
      name: 'Usuario de Prueba',
      password: hashedPassword,
    },
  });

  console.log('Usuario de prueba creado:', user);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

---

## Checklist de Implementación

### Fase 1: Setup Base
- [ ] Crear proyecto Next.js
- [ ] Instalar dependencias
- [ ] Configurar Prisma y base de datos
- [ ] Crear schema de base de datos
- [ ] Generar Prisma Client
- [ ] Crear migraciones

### Fase 2: Autenticación
- [ ] Crear lib/prisma.ts
- [ ] Crear lib/auth.ts
- [ ] Crear lib/session.ts
- [ ] Crear lib/get-session.ts
- [ ] Crear API de registro
- [ ] Crear API de login
- [ ] Crear API de logout
- [ ] Crear API de usuario actual
- [ ] Crear middleware de protección

### Fase 3: Páginas Públicas
- [ ] Página de inicio (landing)
- [ ] Página de login
- [ ] Página de registro
- [ ] Header público

### Fase 4: Páginas Privadas
- [ ] Layout de app protegido
- [ ] Dashboard principal
- [ ] Vista de lista de compra
- [ ] Header privado con logout

### Fase 5: APIs de Listas
- [ ] GET /api/lists
- [ ] POST /api/lists
- [ ] GET /api/lists/[id]
- [ ] PUT /api/lists/[id]
- [ ] DELETE /api/lists/[id]
- [ ] POST /api/lists/[id]/share
- [ ] DELETE /api/lists/[id]/share/[userId]

### Fase 6: APIs de Items
- [ ] POST /api/lists/[id]/items
- [ ] PUT /api/lists/[id]/items/[itemId]
- [ ] DELETE /api/lists/[id]/items/[itemId]

### Fase 7: Componentes UI
- [ ] Header component
- [ ] ShoppingListCard component
- [ ] ListItem component
- [ ] ShareListModal component
- [ ] Formularios de login/registro

---

## Notas Importantes

1. **Seguridad**:
   - Las contraseñas siempre deben estar hasheadas
   - Validar todos los inputs con Zod
   - Verificar permisos en cada operación
   - Usar cookies httpOnly para sesiones

2. **Permisos**:
   - Owner puede hacer todo (editar, eliminar, compartir)
   - Usuarios compartidos pueden editar items si `canEdit = true`
   - Usuarios compartidos NO pueden eliminar la lista ni cambiar permisos

3. **UX**:
   - Feedback visual al marcar items como completados
   - Actualización en tiempo real cuando varios usuarios editan
   - Indicadores de quién agregó cada item

4. **Próximas Fases**:
   - Notificaciones cuando se comparte una lista
   - Historial de cambios
   - Categorías de items
   - Plantillas de listas
   - App móvil

---

## Estructura de Carpetas Final

```
mealmoti/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── login/
│   │   │   ├── register/
│   │   │   ├── logout/
│   │   │   └── me/
│   │   └── lists/
│   │       ├── [id]/
│   │       │   ├── items/
│   │       │   └── share/
│   │       └── route.ts
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── lists/
│   │       └── [id]/
│   │           └── page.tsx
│   ├── login/
│   │   └── page.tsx
│   ├── register/
│   │   └── page.tsx
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── Header.tsx
│   ├── ShoppingListCard.tsx
│   ├── ListItem.tsx
│   └── ShareListModal.tsx
├── lib/
│   ├── prisma.ts
│   ├── auth.ts
│   ├── session.ts
│   └── get-session.ts
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── middleware.ts
├── .env
└── package.json
```

---

## Comandos de Desarrollo

```bash
# Desarrollo
npm run dev

# Base de datos
npm run db:generate  # Generar Prisma Client
npm run db:migrate   # Crear migración
npm run db:push      # Sincronizar schema sin migración
npm run db:studio    # Abrir Prisma Studio

# Producción
npm run build
npm run start
```

---

## Próximos Pasos Después de la Fase Inicial

1. Sistema de notificaciones
2. Búsqueda de usuarios para compartir
3. Categorías y agrupación de items
4. Plantillas de listas
5. Historial y actividad
6. Exportar lista (PDF, texto)
7. Modo offline
8. App móvil (React Native)

