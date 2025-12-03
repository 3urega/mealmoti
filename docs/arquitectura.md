# Arquitectura del Sistema Mealmoti

## 1. Visión General

Este documento describe la arquitectura del sistema Mealmoti, diseñada para soportar el dominio completo de gestión de productos, artículos, ingredientes, ítems y listas de compra.

### 1.1 Principios Arquitectónicos

- **Separación de responsabilidades**: Cada entidad tiene un propósito claro y bien definido
- **Normalización de datos**: Evitar redundancia manteniendo relaciones claras
- **Escalabilidad**: Diseño que permite crecimiento futuro
- **Integridad referencial**: Relaciones bien definidas con cascadas apropiadas
- **Flexibilidad**: Soporte para artículos con y sin marca, particulares y generales

### 1.2 Stack Tecnológico

- **Framework**: Next.js 16+ (App Router)
- **Base de Datos**: PostgreSQL
- **ORM**: Prisma
- **Validación**: Zod
- **Autenticación**: Cookies con sesiones

---

## 2. Modelo de Dominio

### 2.1 Jerarquía de Conceptos

```
Producto (concepto genérico)
  └── Artículo (variante específica con marca/variedad)
        └── Item (instancia en lista de compra)
```

**Ingredientes** pueden formar tanto **Productos** como **Artículos**, y pueden ser también **Productos** ellos mismos.

---

## 3. Entidades del Sistema

### 3.1 User (Usuario)

Representa a un usuario del sistema.

**Atributos:**
- `id`: Identificador único
- `email`: Email único del usuario
- `name`: Nombre del usuario
- `password`: Contraseña hasheada
- `createdAt`: Fecha de creación
- `updatedAt`: Fecha de última actualización

**Relaciones:**
- Propietario de listas de compra
- Puede tener listas compartidas
- Puede crear artículos particulares
- Puede agregar ítems a listas

### 3.2 Product (Producto)

Concepto genérico que agrupa alimentos con propiedades comunes significativas. Es la cúspide de la pirámide organizativa.

**Atributos:**
- `id`: Identificador único
- `name`: Nombre del producto (ej: "Tortillas", "Pan", "Anchoas")
- `description`: Descripción opcional
- `isGeneral`: Si es `true`, es un producto general visible para todos; si es `false`, es particular del usuario
- `createdById`: Usuario que creó el producto (null si es general)
- `createdBy`: Relación con el usuario creador
- `createdAt`: Fecha de creación
- `updatedAt`: Fecha de última actualización

**Características:**
- Un producto puede estar en recetas, pero al pasar a lista de compra debe especificarse como artículo
- No tiene precio, marca ni lugar de compra
- Puede tener múltiples artículos asociados

**Relaciones:**
- Muchos artículos pueden pertenecer a un producto
- Puede tener ingredientes asociados
- Puede ser ingrediente de otros productos/artículos

### 3.3 Article (Artículo)

Variante específica de un producto suficientemente específica para responder: precio, dónde comprarlo, ingredientes/alergias, marca.

**Atributos:**
- `id`: Identificador único
- `name`: Nombre del artículo (ej: "Tortillas de maíz Hacendado")
- `description`: Descripción opcional
- `productId`: Producto al que pertenece
- `product`: Relación con el producto
- `brand`: Marca del artículo (puede ser "genérico" si no tiene marca conocida)
- `variant`: Variedad específica (ej: "5L", "integral", "del Cantábrico")
- `suggestedPrice`: Precio orientativo (opcional)
- `isGeneral`: Si es `true`, es un artículo general visible para todos; si es `false`, es particular del usuario
- `createdById`: Usuario que creó el artículo (null si es general)
- `createdBy`: Relación con el usuario creador
- `createdAt`: Fecha de creación
- `updatedAt`: Fecha de última actualización

**Características:**
- Un artículo debe tener una marca (puede ser "genérico")
- Puede tener precio orientativo
- Puede estar asociado a comercios donde se encuentra
- Puede tener ingredientes específicos
- Solo los artículos pueden estar en listas de compra (a través de ítems)

**Relaciones:**
- Pertenece a un producto
- Puede tener múltiples ítems en diferentes listas
- Puede estar disponible en múltiples comercios
- Puede tener ingredientes asociados

### 3.4 Ingredient (Ingrediente)

Unidad más pequeña y primordial. Puede ser elemento químico, sustancia o concepto genérico.

**Atributos:**
- `id`: Identificador único
- `name`: Nombre del ingrediente (ej: "E-355", "sémola de arroz", "azúcar", "carne de cerdo")
- `type`: Tipo de ingrediente: `"chemical"` (elemento químico), `"generic"` (genérico como "azúcar"), `"product"` (también es un producto)
- `description`: Descripción opcional
- `allergenInfo`: Información sobre alergias (opcional)
- `createdAt`: Fecha de creación
- `updatedAt`: Fecha de última actualización

**Características:**
- Los ingredientes definen al artículo, no necesariamente al producto
- Un ingrediente puede ser también un producto
- Pueden ser elementos químicos (E-355) o genéricos (carne de cerdo)

**Relaciones:**
- Puede estar en múltiples productos
- Puede estar en múltiples artículos
- Puede tener relación con un producto (si type = "product")

### 3.5 Store (Comercio)

Lugar físico o virtual donde se pueden comprar artículos.

**Atributos:**
- `id`: Identificador único
- `name`: Nombre del comercio (ej: "Mercadona", "Carrefour", "Carnicería del barrio")
- `type`: Tipo de comercio: `"supermarket"`, `"specialty"`, `"online"`, `"other"`
- `address`: Dirección opcional
- `isGeneral`: Si es `true`, es un comercio general; si es `false`, es particular del usuario
- `createdById`: Usuario que creó el comercio (null si es general)
- `createdBy`: Relación con el usuario creador
- `createdAt`: Fecha de creación
- `updatedAt`: Fecha de última actualización

**Relaciones:**
- Puede tener múltiples artículos disponibles
- Puede tener múltiples precios de artículos

### 3.6 ArticleStore (Artículo en Comercio)

Relación entre un artículo y un comercio, incluyendo información de disponibilidad y precio.

**Atributos:**
- `id`: Identificador único
- `articleId`: Artículo
- `article`: Relación con el artículo
- `storeId`: Comercio
- `store`: Relación con el comercio
- `price`: Precio del artículo en este comercio (opcional)
- `available`: Si está disponible actualmente
- `lastCheckedAt`: Fecha de última verificación de disponibilidad/precio
- `createdAt`: Fecha de creación
- `updatedAt`: Fecha de última actualización

**Relaciones:**
- Relación many-to-many entre Artículo y Comercio

### 3.7 ShoppingList (Lista de Compra)

Conjunto de ítems que representan artículos. Puede usarse como plantilla para compras periódicas.

**Atributos:**
- `id`: Identificador único
- `name`: Nombre de la lista
- `description`: Descripción opcional
- `ownerId`: Usuario propietario
- `owner`: Relación con el usuario propietario
- `status`: Estado de la lista: `"draft"` (borrador), `"active"` (activa), `"completed"` (comprada), `"archived"` (archivada)
- `statusDate`: Fecha del último cambio de estado
- `totalCost`: Coste total de la compra (calculado cuando status = "completed")
- `isTemplate`: Si es `true`, es una plantilla reutilizable
- `templateId`: Si fue creada desde una plantilla, referencia a la plantilla original
- `createdAt`: Fecha de creación
- `updatedAt`: Fecha de última actualización

**Características:**
- Una lista completada puede usarse como plantilla para crear nuevas listas
- Al completarse, se calcula el coste total
- Mantiene historial de estados

**Relaciones:**
- Tiene múltiples ítems
- Puede ser compartida con múltiples usuarios
- Puede ser creada desde una plantilla

### 3.8 Item (Ítem)

Abstracción de un artículo una vez que pasa a la lista de compra. Representa las entidades físicas finales que serán compradas.

**Atributos:**
- `id`: Identificador único
- `shoppingListId`: Lista de compra a la que pertenece
- `shoppingList`: Relación con la lista de compra
- `articleId`: Artículo que representa
- `article`: Relación con el artículo
- `quantity`: Cantidad a comprar (número)
- `unit`: Unidad de medida (ej: "kg", "litros", "unidades", "paquetes")
- `purchasedQuantity`: Cantidad comprada (puede ser menor que quantity)
- `price`: Precio de compra real (se establece al comprar)
- `checked`: Si está marcado como comprado
- `storeId`: Comercio donde se compró (opcional)
- `store`: Relación con el comercio
- `notes`: Notas adicionales
- `addedById`: Usuario que agregó el ítem
- `addedBy`: Relación con el usuario
- `purchasedAt`: Fecha de compra (cuando checked = true)
- `createdAt`: Fecha de creación
- `updatedAt`: Fecha de última actualización

**Características:**
- Un ítem está unívocamente relacionado con un artículo y una lista
- Tiene precio de compra (no solo orientativo)
- Puede tener cantidad diferente de la planificada
- Solo existe en el contexto de una lista de compra

**Relaciones:**
- Pertenece a una lista de compra
- Representa un artículo
- Puede estar asociado a un comercio donde se compró
- Fue agregado por un usuario

### 3.9 ShoppingListShare (Compartir Lista)

Relación que permite compartir listas de compra entre usuarios.

**Atributos:**
- `id`: Identificador único
- `shoppingListId`: Lista compartida
- `shoppingList`: Relación con la lista
- `userId`: Usuario con quien se comparte
- `user`: Relación con el usuario
- `canEdit`: Permiso para editar la lista
- `createdAt`: Fecha de compartir

**Relaciones:**
- Relación many-to-many entre Lista de Compra y Usuario

### 3.10 ProductIngredient (Producto-Ingrediente)

Relación many-to-many entre Productos e Ingredientes.

**Atributos:**
- `id`: Identificador único
- `productId`: Producto
- `product`: Relación con el producto
- `ingredientId`: Ingrediente
- `ingredient`: Relación con el ingrediente
- `isOptional`: Si el ingrediente es opcional
- `createdAt`: Fecha de creación

### 3.11 ArticleIngredient (Artículo-Ingrediente)

Relación many-to-many entre Artículos e Ingredientes.

**Atributos:**
- `id`: Identificador único
- `articleId`: Artículo
- `article`: Relación con el artículo
- `ingredientId`: Ingrediente
- `ingredient`: Relación con el ingrediente
- `isOptional`: Si el ingrediente es opcional
- `createdAt`: Fecha de creación

---

## 4. Esquema de Base de Datos (Prisma Schema)

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
  
  // Relaciones
  shoppingLists     ShoppingList[]     @relation("ListOwner")
  sharedLists       ShoppingListShare[]
  listItems         Item[]
  createdProducts   Product[]          @relation("ProductCreator")
  createdArticles   Article[]          @relation("ArticleCreator")
  createdStores     Store[]            @relation("StoreCreator")
  
  @@index([email])
}

model Product {
  id          String   @id @default(cuid())
  name        String
  description String?
  isGeneral   Boolean  @default(false) // false = particular, true = general
  createdById String?
  createdBy   User?    @relation("ProductCreator", fields: [createdById], references: [id], onDelete: SetNull)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  // Relaciones
  articles     Article[]
  ingredients  ProductIngredient[]
  asIngredient Ingredient?
  
  @@index([name])
  @@index([isGeneral, createdById])
}

model Ingredient {
  id           String   @id @default(cuid())
  name         String
  type         String   @default("generic") // "chemical", "generic", "product"
  description  String?
  allergenInfo String?
  productId    String?  @unique // Si type = "product", referencia al producto
  product      Product? @relation(fields: [productId], references: [id], onDelete: SetNull)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  
  // Relaciones
  products ProductIngredient[]
  articles ArticleIngredient[]
  
  @@index([name])
  @@index([type])
}

model ProductIngredient {
  id          String   @id @default(cuid())
  productId   String
  product     Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  ingredientId String
  ingredient  Ingredient @relation(fields: [ingredientId], references: [id], onDelete: Cascade)
  isOptional  Boolean  @default(false)
  createdAt   DateTime @default(now())
  
  @@unique([productId, ingredientId])
  @@index([productId])
  @@index([ingredientId])
}

model Article {
  id            String   @id @default(cuid())
  name          String
  description   String?
  productId     String
  product       Product  @relation(fields: [productId], references: [id], onDelete: Restrict)
  brand         String   @default("genérico") // Siempre tiene marca, por defecto "genérico"
  variant       String?  // Variedad específica (ej: "5L", "integral")
  suggestedPrice Float?
  isGeneral     Boolean  @default(false) // false = particular, true = general
  createdById   String?
  createdBy     User?    @relation("ArticleCreator", fields: [createdById], references: [id], onDelete: SetNull)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  // Relaciones
  items         Item[]
  stores        ArticleStore[]
  ingredients   ArticleIngredient[]
  
  @@index([name])
  @@index([productId])
  @@index([brand])
  @@index([isGeneral, createdById])
}

model ArticleIngredient {
  id          String   @id @default(cuid())
  articleId   String
  article     Article  @relation(fields: [articleId], references: [id], onDelete: Cascade)
  ingredientId String
  ingredient  Ingredient @relation(fields: [ingredientId], references: [id], onDelete: Cascade)
  isOptional  Boolean  @default(false)
  createdAt   DateTime @default(now())
  
  @@unique([articleId, ingredientId])
  @@index([articleId])
  @@index([ingredientId])
}

model Store {
  id        String   @id @default(cuid())
  name      String
  type      String   @default("other") // "supermarket", "specialty", "online", "other"
  address   String?
  isGeneral Boolean  @default(false) // false = particular, true = general
  createdById String?
  createdBy User?    @relation("StoreCreator", fields: [createdById], references: [id], onDelete: SetNull)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  // Relaciones
  articles ArticleStore[]
  items    Item[]
  
  @@index([name])
  @@index([isGeneral, createdById])
}

model ArticleStore {
  id            String   @id @default(cuid())
  articleId     String
  article       Article  @relation(fields: [articleId], references: [id], onDelete: Cascade)
  storeId       String
  store         Store    @relation(fields: [storeId], references: [id], onDelete: Cascade)
  price         Float?
  available     Boolean  @default(true)
  lastCheckedAt DateTime?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  @@unique([articleId, storeId])
  @@index([articleId])
  @@index([storeId])
}

model ShoppingList {
  id          String   @id @default(cuid())
  name        String
  description String?
  ownerId     String
  owner       User     @relation("ListOwner", fields: [ownerId], references: [id], onDelete: Cascade)
  status      String   @default("draft") // "draft", "active", "completed", "archived"
  statusDate  DateTime @default(now())
  totalCost   Float?
  isTemplate  Boolean  @default(false)
  templateId  String?  // Si fue creada desde plantilla
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  // Relaciones
  items   Item[]
  shares  ShoppingListShare[]
  
  @@index([ownerId])
  @@index([status])
  @@index([isTemplate])
}

model Item {
  id              String        @id @default(cuid())
  shoppingListId  String
  shoppingList    ShoppingList  @relation(fields: [shoppingListId], references: [id], onDelete: Cascade)
  articleId       String
  article         Article       @relation(fields: [articleId], references: [id], onDelete: Restrict)
  quantity        Float
  unit            String        @default("unidades")
  purchasedQuantity Float?
  price           Float?        // Precio de compra real
  checked         Boolean       @default(false)
  storeId         String?
  store           Store?        @relation(fields: [storeId], references: [id], onDelete: SetNull)
  notes           String?
  addedById       String?
  addedBy         User?         @relation(fields: [addedById], references: [id], onDelete: SetNull)
  purchasedAt     DateTime?
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
  
  @@unique([shoppingListId, articleId]) // Un artículo solo puede aparecer una vez por lista
  @@index([shoppingListId])
  @@index([articleId])
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

---

## 5. Relaciones Clave

### 5.1 Jerarquía Producto → Artículo → Ítem

```
Product (1) ──→ (N) Article ──→ (N) Item
```

- Un producto puede tener múltiples artículos
- Un artículo puede tener múltiples ítems en diferentes listas
- Un ítem pertenece a un único artículo y una única lista

### 5.2 Ingredientes

```
Product (N) ←──→ (N) Ingredient (through ProductIngredient)
Article (N) ←──→ (N) Ingredient (through ArticleIngredient)
```

- Los ingredientes pueden estar en múltiples productos
- Los ingredientes pueden estar en múltiples artículos
- Un ingrediente puede ser también un producto (type = "product")

### 5.3 Artículos y Comercios

```
Article (N) ←──→ (N) Store (through ArticleStore)
```

- Un artículo puede estar disponible en múltiples comercios
- Un comercio puede tener múltiples artículos
- Se almacena precio y disponibilidad por comercio

### 5.4 Listas de Compra

```
User (1) ──→ (N) ShoppingList ──→ (N) Item
User (N) ←──→ (N) ShoppingList (through ShoppingListShare)
```

- Un usuario puede tener múltiples listas
- Una lista puede ser compartida con múltiples usuarios
- Una lista tiene múltiples ítems

---

## 6. Métodos y APIs Propuestos

### 6.1 Gestión de Productos

#### GET `/api/products`
Obtener productos disponibles para el usuario (generales + particulares del usuario).

**Query params:**
- `general`: boolean - Solo productos generales
- `search`: string - Búsqueda por nombre
- `limit`: number - Límite de resultados
- `offset`: number - Paginación

**Respuesta:**
```json
{
  "products": [
    {
      "id": "...",
      "name": "Tortillas",
      "description": "...",
      "isGeneral": true,
      "articlesCount": 5
    }
  ],
  "total": 100
}
```

#### POST `/api/products`
Crear un nuevo producto (particular del usuario).

**Body:**
```json
{
  "name": "Tortillas",
  "description": "Tortillas de maíz",
  "isGeneral": false
}
```

#### GET `/api/products/[id]`
Obtener un producto específico con sus artículos e ingredientes.

#### PUT `/api/products/[id]`
Actualizar un producto (solo si es del usuario).

#### DELETE `/api/products/[id]`
Eliminar un producto (solo si es del usuario y no tiene artículos asociados).

### 6.2 Gestión de Artículos

#### GET `/api/articles`
Obtener artículos disponibles para el usuario.

**Query params:**
- `productId`: string - Filtrar por producto
- `general`: boolean - Solo artículos generales
- `search`: string - Búsqueda por nombre/marca
- `brand`: string - Filtrar por marca

**Respuesta:**
```json
{
  "articles": [
    {
      "id": "...",
      "name": "Tortillas de maíz Hacendado",
      "product": { "id": "...", "name": "Tortillas" },
      "brand": "Hacendado",
      "variant": "de maíz",
      "suggestedPrice": 1.50,
      "stores": [
        { "id": "...", "name": "Mercadona", "price": 1.45 }
      ]
    }
  ]
}
```

#### POST `/api/articles`
Crear un nuevo artículo.

**Body:**
```json
{
  "name": "Tortillas de maíz Hacendado",
  "productId": "...",
  "brand": "Hacendado",
  "variant": "de maíz",
  "suggestedPrice": 1.50,
  "isGeneral": false,
  "ingredientIds": ["...", "..."]
}
```

#### GET `/api/articles/[id]`
Obtener un artículo específico con ingredientes, comercios y precios.

#### PUT `/api/articles/[id]`
Actualizar un artículo.

#### DELETE `/api/articles/[id]`
Eliminar un artículo (solo si no tiene ítems asociados).

### 6.3 Gestión de Ingredientes

#### GET `/api/ingredients`
Obtener ingredientes disponibles.

**Query params:**
- `type`: string - Filtrar por tipo
- `search`: string - Búsqueda por nombre

#### POST `/api/ingredients`
Crear un nuevo ingrediente.

**Body:**
```json
{
  "name": "E-355",
  "type": "chemical",
  "description": "Ácido adípico",
  "allergenInfo": "Puede causar reacciones alérgicas"
}
```

#### GET `/api/ingredients/[id]`
Obtener un ingrediente específico.

### 6.4 Gestión de Comercios

#### GET `/api/stores`
Obtener comercios disponibles para el usuario.

#### POST `/api/stores`
Crear un nuevo comercio.

**Body:**
```json
{
  "name": "Mercadona",
  "type": "supermarket",
  "address": "Calle Principal 123",
  "isGeneral": false
}
```

#### GET `/api/stores/[id]`
Obtener un comercio con sus artículos disponibles.

### 6.5 Gestión de Artículos en Comercios

#### POST `/api/articles/[id]/stores`
Asociar un artículo a un comercio con precio.

**Body:**
```json
{
  "storeId": "...",
  "price": 1.45,
  "available": true
}
```

#### PUT `/api/articles/[id]/stores/[storeId]`
Actualizar precio/disponibilidad de un artículo en un comercio.

#### DELETE `/api/articles/[id]/stores/[storeId]`
Desasociar un artículo de un comercio.

### 6.6 Gestión de Listas de Compra

#### GET `/api/lists`
Obtener listas del usuario (propias y compartidas).

**Query params:**
- `status`: string - Filtrar por estado
- `isTemplate`: boolean - Solo plantillas

#### POST `/api/lists`
Crear una nueva lista de compra.

**Body:**
```json
{
  "name": "Compra semanal",
  "description": "Lista para la compra de la semana",
  "isTemplate": false,
  "templateId": null
}
```

#### POST `/api/lists/[id]/duplicate`
Duplicar una lista (crear nueva lista desde una existente o plantilla).

#### GET `/api/lists/[id]`
Obtener una lista específica con todos sus ítems y artículos.

#### PUT `/api/lists/[id]`
Actualizar una lista (nombre, descripción, estado).

**Body:**
```json
{
  "name": "Compra semanal actualizada",
  "status": "active"
}
```

#### PUT `/api/lists/[id]/complete`
Marcar una lista como completada y calcular coste total.

#### DELETE `/api/lists/[id]`
Eliminar una lista (solo el propietario).

### 6.7 Gestión de Ítems

#### POST `/api/lists/[id]/items`
Agregar un ítem a una lista.

**Body:**
```json
{
  "articleId": "...",
  "quantity": 2,
  "unit": "paquetes",
  "notes": "Preferiblemente sin azúcar"
}
```

#### GET `/api/lists/[id]/items`
Obtener todos los ítems de una lista.

#### PUT `/api/lists/[id]/items/[itemId]`
Actualizar un ítem.

**Body:**
```json
{
  "quantity": 3,
  "checked": true,
  "price": 1.45,
  "purchasedQuantity": 3,
  "storeId": "...",
  "purchasedAt": "2024-01-15T10:30:00Z"
}
```

#### DELETE `/api/lists/[id]/items/[itemId]`
Eliminar un ítem de una lista.

### 6.8 Compartir Listas

#### POST `/api/lists/[id]/share`
Compartir una lista con un usuario.

**Body:**
```json
{
  "userId": "...",
  "canEdit": true
}
```

#### GET `/api/lists/[id]/share`
Obtener usuarios con los que se comparte la lista.

#### DELETE `/api/lists/[id]/share/[userId]`
Dejar de compartir una lista con un usuario.

### 6.9 Búsqueda y Filtrado

#### GET `/api/search`
Búsqueda global de productos, artículos e ingredientes.

**Query params:**
- `q`: string - Término de búsqueda
- `type`: string - "product", "article", "ingredient", "all"

**Respuesta:**
```json
{
  "products": [...],
  "articles": [...],
  "ingredients": [...]
}
```

---

## 7. Reglas de Negocio

### 7.1 Productos

1. Un producto general puede ser creado por cualquier usuario, pero requiere aprobación o es visible para todos
2. Un producto particular solo es visible para su creador
3. No se puede eliminar un producto si tiene artículos asociados (onDelete: Restrict)
4. Un producto puede tener el mismo nombre que un artículo, pero son entidades distintas

### 7.2 Artículos

1. Un artículo siempre debe tener una marca (por defecto "genérico")
2. Un artículo debe estar asociado a un producto
3. No se puede eliminar un artículo si tiene ítems asociados (onDelete: Restrict)
4. Un artículo particular solo es visible para su creador
5. Un artículo general es visible para todos los usuarios

### 7.3 Ítems

1. Un ítem está unívocamente relacionado con un artículo y una lista
2. Un artículo solo puede aparecer una vez por lista (unique constraint)
3. El precio de un ítem se establece al comprarlo, no antes
4. La cantidad comprada puede ser diferente de la planificada
5. Al marcar como comprado, se puede especificar el comercio y fecha

### 7.4 Listas de Compra

1. Solo el propietario puede eliminar una lista
2. Solo el propietario puede cambiar permisos de compartir
3. Usuarios compartidos pueden editar ítems si tienen permiso (canEdit)
4. Al completar una lista, se calcula el coste total sumando precios de ítems comprados
5. Una lista completada puede usarse como plantilla para crear nuevas listas
6. Una lista puede tener estado: draft, active, completed, archived

### 7.5 Ingredientes

1. Un ingrediente puede ser también un producto (type = "product")
2. Los ingredientes definen al artículo, no necesariamente al producto
3. Un ingrediente puede estar en múltiples productos y artículos

### 7.6 Comercios

1. Un comercio general es visible para todos
2. Un comercio particular solo es visible para su creador
3. Un artículo puede estar disponible en múltiples comercios con precios diferentes

---

## 8. Consideraciones de Implementación

### 8.1 Migración desde el Sistema Actual

El sistema actual tiene:
- `User`, `ShoppingList`, `ListItem`, `ShoppingListShare`

Para migrar al nuevo sistema:
1. Los `ListItem` actuales deben convertirse en `Item` asociados a `Article`
2. Se deben crear `Article` genéricos para cada `ListItem.name` único
3. Se deben crear `Product` genéricos para agrupar artículos similares
4. Los artículos creados deben tener marca "genérico" inicialmente

### 8.2 Índices Recomendados

Además de los índices definidos en el schema, considerar:
- Índices compuestos para búsquedas frecuentes
- Índices full-text para búsqueda de nombres
- Índices en campos de fecha para consultas de historial

### 8.3 Validaciones

- Validar que `quantity` y `purchasedQuantity` sean números positivos
- Validar que `price` y `suggestedPrice` sean números positivos
- Validar que `unit` sea uno de los valores permitidos
- Validar que `status` sea uno de los valores permitidos
- Validar que `type` de ingrediente sea uno de los valores permitidos

### 8.4 Optimizaciones Futuras

1. **Caché**: Cachear productos y artículos generales frecuentemente consultados
2. **Búsqueda**: Implementar búsqueda full-text con PostgreSQL
3. **Agregaciones**: Pre-calcular estadísticas (artículos más comprados, precios promedio)
4. **Historial**: Tabla separada para historial de cambios en listas
5. **Notificaciones**: Sistema de notificaciones cuando se comparte una lista

---

## 9. Diagrama de Relaciones

```
┌─────────┐
│  User   │
└────┬────┘
     │
     ├─────────────────────────────────────┐
     │                                     │
     │                                     │
┌────▼──────────┐                  ┌──────▼──────────┐
│   Product     │                  │    Article       │
│               │                  │                  │
│ - name        │◄─────────────────┤ - productId      │
│ - isGeneral   │      1:N         │ - brand          │
│ - createdById │                  │ - variant        │
└────┬──────────┘                  │ - suggestedPrice │
     │                             │ - isGeneral      │
     │                             └──────┬───────────┘
     │                                    │
     │                                    │
┌────▼──────────┐                  ┌──────▼───────────┐
│  Ingredient   │                  │      Item        │
│               │                  │                  │
│ - name        │                  │ - articleId      │
│ - type        │                  │ - quantity       │
│ - productId?  │                  │ - price          │
└────┬──────────┘                  │ - checked        │
     │                             │ - storeId        │
     │                             └──────────────────┘
     │
     │
┌────▼──────────┐                  ┌──────────────────┐
│ ProductIngr.  │                  │  ShoppingList     │
│ ArticleIngr.  │                  │                   │
└───────────────┘                  │ - status          │
                                  │ - totalCost       │
                                  │ - isTemplate      │
                                  └───────────────────┘
```

---

## 10. Conclusión

Esta arquitectura proporciona una base sólida para implementar el dominio completo de Mealmoti, permitiendo:

- Gestión completa de productos, artículos e ingredientes
- Flexibilidad para artículos con y sin marca
- Soporte para artículos particulares y generales
- Trazabilidad desde producto hasta ítem comprado
- Reutilización de listas como plantillas
- Historial y estadísticas de compras
- Escalabilidad para futuras funcionalidades

La implementación debe realizarse de forma incremental, comenzando por las entidades base (Product, Article, Ingredient) y luego extendiendo hacia las funcionalidades más complejas (listas, ítems, compartir).

