# Plan de Desarrollo - Mealmoti

Este documento describe el plan de desarrollo para implementar los requisitos funcionales del sistema Mealmoti, basado en la arquitectura definida y el dominio del negocio.

## 📊 Estado Actual del Proyecto

### ✅ Completado
- **Fase 1: Gestión de Ingredientes** - COMPLETA
  - ✅ Backend: Todas las APIs implementadas (GET, POST, PUT, DELETE)
  - ✅ Frontend: Página completa con lista, búsqueda, filtros, modales de crear/editar/eliminar
  - ✅ Validaciones Zod implementadas
  - ✅ Integración completa frontend-backend

- **Fase 2: Gestión de Productos** - COMPLETA
  - ✅ Backend: Todas las APIs implementadas (GET, POST, PUT, DELETE)
  - ✅ Backend: APIs de ingredientes de productos (GET, POST, PUT, DELETE)
  - ✅ Frontend: Página completa con lista, búsqueda, filtros, modales de crear/editar/eliminar
  - ✅ Validaciones Zod implementadas
  - ✅ Permisos y validaciones de integridad
  - ✅ Integración completa frontend-backend

- **Fase 3: Gestión de Artículos (Marcas)** - COMPLETA
  - ✅ Backend: Todas las APIs implementadas (GET, POST, PUT, DELETE)
  - ✅ Frontend: Página completa con lista, búsqueda, filtros múltiples, modales de crear/editar/eliminar
  - ✅ Validaciones Zod implementadas
  - ✅ Asignación opcional de ingredientes en creación
  - ✅ Select de productos e ingredientes en modal
  - ✅ Permisos y validaciones de integridad
  - ✅ Integración completa frontend-backend

- **Fase 4: Gestión de Ingredientes de Artículos** - COMPLETA
  - ✅ Backend: Todas las APIs implementadas (GET, POST, PUT, DELETE)
  - ✅ Validaciones Zod implementadas
  - ✅ Permisos y validaciones de integridad

- **Fase 5: Gestión de Comercios** - COMPLETA
  - ✅ Backend: Todas las APIs implementadas (GET, POST, PUT, DELETE)
  - ✅ Frontend: Página completa con lista, búsqueda, filtros, modales de crear/editar/eliminar
  - ✅ Validaciones Zod implementadas
  - ✅ Permisos y validaciones de integridad
  - ✅ Integración completa frontend-backend

- **Fase 6: Artículos en Comercios** - COMPLETA
  - ✅ Backend: Todas las APIs implementadas (GET, POST, PUT, DELETE)
  - ✅ Frontend: Páginas de detalle de artículo y comercio con gestión completa
  - ✅ Modal para asignar/editar artículo en comercio
  - ✅ Validaciones Zod implementadas
  - ✅ Permisos y validaciones de integridad
  - ✅ Integración completa frontend-backend

- **Fase 7: Recuperar Artículos por Producto** - COMPLETA
  - ✅ Backend: Endpoint GET /api/products/[id]/articles implementado
  - ✅ Filtros avanzados: storeId, general, search, paginación
  - ✅ Incluye información de comercios, precios e ingredientes
  - ✅ Validaciones y permisos implementados

- **Fase 9: Gestión de Listas de Compra** - COMPLETA
  - ✅ Backend: Todas las APIs implementadas (GET, POST, PUT, DELETE)
  - ✅ Backend: APIs de compartir listas (POST, DELETE)
  - ✅ Validaciones Zod implementadas
  - ✅ Permisos y control de acceso (owner, shared users)
  - ✅ Frontend: Páginas de listas con gestión completa

- **Fase 8: Crear Ítem desde Artículo-Comercio** - COMPLETA
  - ✅ Backend: Endpoint POST /api/lists/[id]/items actualizado para usar articleId
  - ✅ Backend: Endpoint POST /api/lists/[id]/items/from-store implementado
  - ✅ Validaciones según schema de Prisma implementadas
  - ✅ Frontend actualizado para usar nuevos endpoints

- **Fase 10: Gestión Avanzada de Ítems** - COMPLETA
  - ✅ Backend: PUT /api/lists/[id]/items/[itemId] soporta purchasedQuantity, price, purchasedAt, storeId
  - ✅ Validaciones: purchasedQuantity <= quantity
  - ✅ Lógica de compra: actualizar purchasedAt automáticamente
  - ✅ Frontend actualizado con campos avanzados

- **Fase 11: Estados y Plantillas de Listas** - COMPLETA
  - ✅ Backend: PUT /api/lists/[id] permite cambiar status
  - ✅ Cálculo automático de totalCost al completar
  - ✅ POST /api/lists?fromTemplate=[id] implementado
  - ✅ PUT /api/lists/[id] permite marcar como plantilla (isTemplate)
  - ✅ Frontend con selector de estado y gestión de plantillas

### 🎯 Siguiente Paso
- **Fase 12: Historial y Estadísticas** (opcional, futuro)
- **Fase 13: Gestión de Recetas** (nueva funcionalidad)

### 📋 Requisitos a Implementar

1. ✅ Añadir ingrediente - **COMPLETO**
2. ✅ Crear producto - **COMPLETO**
3. ✅ Crear/asignar marca a un producto - **COMPLETO**
4. ✅ Asignar/editar ingredientes de una marca - **COMPLETO**
5. ✅ Crear comercio/tienda - **COMPLETO**
6. ✅ Asignar una/varias marca/s a un comercio - **COMPLETO**
7. ✅ Asignar precio a una marca para un comercio - **COMPLETO**
8. ✅ Recuperar marcas a partir de un producto - **COMPLETO**
9. ✅ Crear ítem a partir de una relación (marca/comercio) - **COMPLETO**
10. ✅ Gestión avanzada de ítems (precio, cantidad comprada) - **COMPLETO**
11. ✅ Estados y plantillas de listas - **COMPLETO**
12. 🎯 Historial y estadísticas - **PENDIENTE** (opcional, futuro)
13. 🎯 Gestión de recetas - **PENDIENTE** (nueva funcionalidad)

---

## 🎯 Fase 1: Gestión de Ingredientes

### Objetivo
Permitir la creación y gestión de ingredientes en el sistema.

### Tareas

#### 1.1 API: Crear Ingrediente
**Endpoint:** `POST /api/ingredients`

**Funcionalidad:**
- Crear un nuevo ingrediente en el sistema
- Soporta tipos: `chemical`, `generic`, `product`
- Puede estar asociado a un producto si `type = "product"`

**Request Body:**
```json
{
  "name": "E-355",
  "type": "chemical",
  "description": "Ácido adípico",
  "allergenInfo": "Puede causar reacciones alérgicas",
  "productId": null
}
```

**Validaciones:**
- `name`: requerido, mínimo 1 carácter
- `type`: debe ser uno de: `"chemical"`, `"generic"`, `"product"`
- `productId`: requerido si `type = "product"`, debe existir

**Response:**
```json
{
  "ingredient": {
    "id": "...",
    "name": "E-355",
    "type": "chemical",
    "description": "Ácido adípico",
    "allergenInfo": "Puede causar reacciones alérgicas",
    "createdAt": "2024-01-15T10:00:00Z"
  }
}
```

#### 1.2 API: Listar Ingredientes
**Endpoint:** `GET /api/ingredients`

**Query Params:**
- `type`: Filtrar por tipo (`chemical`, `generic`, `product`)
- `search`: Búsqueda por nombre
- `limit`: Límite de resultados (default: 50)
- `offset`: Paginación (default: 0)

**Response:**
```json
{
  "ingredients": [
    {
      "id": "...",
      "name": "E-355",
      "type": "chemical",
      "description": "..."
    }
  ],
  "total": 100,
  "limit": 50,
  "offset": 0
}
```

#### 1.3 API: Obtener Ingrediente
**Endpoint:** `GET /api/ingredients/[id]`

**Response:**
```json
{
  "ingredient": {
    "id": "...",
    "name": "E-355",
    "type": "chemical",
    "description": "...",
    "allergenInfo": "...",
    "product": null,
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

#### 1.4 API: Actualizar Ingrediente
**Endpoint:** `PUT /api/ingredients/[id]`

**Funcionalidad:**
- Actualizar información de un ingrediente existente

#### 1.5 API: Eliminar Ingrediente
**Endpoint:** `DELETE /api/ingredients/[id]`

**Validaciones:**
- No se puede eliminar si está asociado a productos o artículos
- Verificar relaciones antes de eliminar

---

## 🎯 Fase 2: Gestión de Productos

### Objetivo
Permitir la creación y gestión de productos genéricos.

### Tareas

#### 2.1 API: Crear Producto
**Endpoint:** `POST /api/products`

**Funcionalidad:**
- Crear un nuevo producto (particular del usuario o general)
- Los productos generales son visibles para todos
- Los productos particulares solo son visibles para su creador

**Request Body:**
```json
{
  "name": "Tortillas",
  "description": "Tortillas de maíz",
  "isGeneral": false
}
```

**Validaciones:**
- `name`: requerido, mínimo 1 carácter
- `isGeneral`: boolean, default `false`
- Si `isGeneral = true`, el producto es visible para todos
- Si `isGeneral = false`, solo visible para el usuario creador

**Response:**
```json
{
  "product": {
    "id": "...",
    "name": "Tortillas",
    "description": "Tortillas de maíz",
    "isGeneral": false,
    "createdById": "...",
    "createdAt": "2024-01-15T10:00:00Z"
  }
}
```

#### 2.2 API: Listar Productos
**Endpoint:** `GET /api/products`

**Query Params:**
- `general`: boolean - Solo productos generales
- `search`: string - Búsqueda por nombre
- `limit`: number - Límite de resultados
- `offset`: number - Paginación

**Funcionalidad:**
- Retorna productos generales + productos particulares del usuario autenticado
- Incluye conteo de artículos asociados

**Response:**
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
  "total": 50
}
```

#### 2.3 API: Obtener Producto
**Endpoint:** `GET /api/products/[id]`

**Funcionalidad:**
- Obtener un producto específico con sus artículos e ingredientes
- Verificar permisos (solo si es general o del usuario)

**Response:**
```json
{
  "product": {
    "id": "...",
    "name": "Tortillas",
    "description": "...",
    "isGeneral": true,
    "articles": [
      {
        "id": "...",
        "name": "Tortillas de maíz Hacendado",
        "brand": "Hacendado",
        "variant": "de maíz"
      }
    ],
    "ingredients": [
      {
        "id": "...",
        "name": "Harina de maíz",
        "isOptional": false
      }
    ]
  }
}
```

#### 2.4 API: Actualizar Producto
**Endpoint:** `PUT /api/products/[id]`

**Validaciones:**
- Solo el creador puede actualizar productos particulares
- No se puede cambiar `isGeneral` de `true` a `false` si tiene artículos generales asociados

#### 2.5 API: Eliminar Producto
**Endpoint:** `DELETE /api/products/[id]`

**Validaciones:**
- No se puede eliminar si tiene artículos asociados (onDelete: Restrict)
- Solo el creador puede eliminar productos particulares

#### 2.6 API: Gestión de Ingredientes de Productos

**Endpoints:**
- `GET /api/products/[id]/ingredients` - Listar ingredientes del producto
- `POST /api/products/[id]/ingredients` - Asignar ingredientes al producto
- `PUT /api/products/[id]/ingredients/[ingredientId]` - Actualizar relación (isOptional)
- `DELETE /api/products/[id]/ingredients/[ingredientId]` - Eliminar ingrediente del producto

**Funcionalidad:**
- Permite asociar ingredientes a productos genéricos
- Cada relación puede marcar el ingrediente como opcional o no
- Solo el creador puede modificar ingredientes de productos particulares

**Request Body (POST):**
```json
{
  "ingredientIds": ["...", "..."],
  "isOptional": false
}
```

**Request Body (PUT):**
```json
{
  "isOptional": true
}
```

**Validaciones:**
- Todos los IDs de ingredientes deben existir
- Solo el creador puede modificar productos particulares
- La relación es única (productId + ingredientId)

---

## 🎯 Fase 3: Gestión de Artículos (Marcas)

### Objetivo
Permitir crear y gestionar artículos (marcas) asociados a productos.

### Tareas

#### 3.1 API: Crear Artículo (Marca)
**Endpoint:** `POST /api/articles`

**Funcionalidad:**
- Crear un nuevo artículo (marca) asociado a un producto
- Un artículo siempre tiene una marca (por defecto "genérico")
- Puede ser particular del usuario o general

**Request Body:**
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

**Validaciones:**
- `name`: requerido
- `productId`: requerido, debe existir
- `brand`: requerido, mínimo 1 carácter (default: "genérico")
- `suggestedPrice`: opcional, debe ser positivo si se proporciona
- `ingredientIds`: array opcional de IDs de ingredientes

**Response:**
```json
{
  "article": {
    "id": "...",
    "name": "Tortillas de maíz Hacendado",
    "product": {
      "id": "...",
      "name": "Tortillas"
    },
    "brand": "Hacendado",
    "variant": "de maíz",
    "suggestedPrice": 1.50,
    "isGeneral": false,
    "ingredients": [
      {
        "id": "...",
        "name": "Harina de maíz",
        "isOptional": false
      }
    ]
  }
}
```

#### 3.2 API: Listar Artículos
**Endpoint:** `GET /api/articles`

**Query Params:**
- `productId`: Filtrar por producto
- `general`: boolean - Solo artículos generales
- `search`: string - Búsqueda por nombre/marca
- `brand`: string - Filtrar por marca
- `limit`: number
- `offset`: number

**Response:**
```json
{
  "articles": [
    {
      "id": "...",
      "name": "Tortillas de maíz Hacendado",
      "product": {
        "id": "...",
        "name": "Tortillas"
      },
      "brand": "Hacendado",
      "variant": "de maíz",
      "suggestedPrice": 1.50,
      "stores": [
        {
          "id": "...",
          "name": "Mercadona",
          "price": 1.45
        }
      ]
    }
  ],
  "total": 100
}
```

#### 3.3 API: Obtener Artículo
**Endpoint:** `GET /api/articles/[id]`

**Funcionalidad:**
- Obtener un artículo con todos sus detalles: ingredientes, comercios, precios

**Response:**
```json
{
  "article": {
    "id": "...",
    "name": "Tortillas de maíz Hacendado",
    "product": {
      "id": "...",
      "name": "Tortillas"
    },
    "brand": "Hacendado",
    "variant": "de maíz",
    "suggestedPrice": 1.50,
    "ingredients": [
      {
        "id": "...",
        "name": "Harina de maíz",
        "isOptional": false
      }
    ],
    "stores": [
      {
        "id": "...",
        "name": "Mercadona",
        "price": 1.45,
        "available": true
      }
    ]
  }
}
```

#### 3.4 API: Actualizar Artículo
**Endpoint:** `PUT /api/articles/[id]`

**Funcionalidad:**
- Actualizar información del artículo
- Solo el creador puede actualizar artículos particulares

#### 3.5 API: Eliminar Artículo
**Endpoint:** `DELETE /api/articles/[id]`

**Validaciones:**
- No se puede eliminar si tiene ítems asociados (onDelete: Restrict)
- Solo el creador puede eliminar artículos particulares

---

## 🎯 Fase 4: Gestión de Ingredientes de Artículos

### Objetivo
Permitir asignar y editar ingredientes de un artículo (marca).

### Tareas

#### 4.1 API: Asignar Ingredientes a Artículo
**Endpoint:** `POST /api/articles/[id]/ingredients`

**Funcionalidad:**
- Asignar uno o varios ingredientes a un artículo
- Si el ingrediente ya existe, actualiza `isOptional`

**Request Body:**
```json
{
  "ingredientIds": ["...", "..."],
  "isOptional": false
}
```

**Validaciones:**
- `ingredientIds`: array requerido, mínimo 1 elemento
- Todos los IDs deben existir
- Si la relación ya existe, se actualiza

**Response:**
```json
{
  "articleIngredients": [
    {
      "id": "...",
      "ingredient": {
        "id": "...",
        "name": "Harina de maíz"
      },
      "isOptional": false
    }
  ]
}
```

#### 4.2 API: Actualizar Ingrediente de Artículo
**Endpoint:** `PUT /api/articles/[id]/ingredients/[ingredientId]`

**Funcionalidad:**
- Actualizar si un ingrediente es opcional o no

**Request Body:**
```json
{
  "isOptional": true
}
```

#### 4.3 API: Eliminar Ingrediente de Artículo
**Endpoint:** `DELETE /api/articles/[id]/ingredients/[ingredientId]`

**Funcionalidad:**
- Remover un ingrediente de un artículo

#### 4.4 API: Listar Ingredientes de Artículo
**Endpoint:** `GET /api/articles/[id]/ingredients`

**Response:**
```json
{
  "ingredients": [
    {
      "id": "...",
      "name": "Harina de maíz",
      "type": "generic",
      "isOptional": false
    }
  ]
}
```

---

## 🎯 Fase 5: Gestión de Comercios

### Objetivo
Permitir crear y gestionar comercios/tiendas.

### Tareas

#### 5.1 API: Crear Comercio
**Endpoint:** `POST /api/stores`

**Funcionalidad:**
- Crear un nuevo comercio (particular del usuario o general)

**Request Body:**
```json
{
  "name": "Mercadona",
  "type": "supermarket",
  "address": "Calle Principal 123",
  "isGeneral": false
}
```

**Validaciones:**
- `name`: requerido, mínimo 1 carácter
- `type`: debe ser uno de: `"supermarket"`, `"specialty"`, `"online"`, `"other"`
- `isGeneral`: boolean, default `false`

**Response:**
```json
{
  "store": {
    "id": "...",
    "name": "Mercadona",
    "type": "supermarket",
    "address": "Calle Principal 123",
    "isGeneral": false,
    "createdAt": "2024-01-15T10:00:00Z"
  }
}
```

#### 5.2 API: Listar Comercios
**Endpoint:** `GET /api/stores`

**Query Params:**
- `type`: Filtrar por tipo
- `search`: Búsqueda por nombre
- `general`: boolean - Solo comercios generales

**Response:**
```json
{
  "stores": [
    {
      "id": "...",
      "name": "Mercadona",
      "type": "supermarket",
      "address": "Calle Principal 123",
      "articlesCount": 15
    }
  ],
  "total": 20
}
```

#### 5.3 API: Obtener Comercio
**Endpoint:** `GET /api/stores/[id]`

**Funcionalidad:**
- Obtener un comercio con sus artículos disponibles y precios

**Response:**
```json
{
  "store": {
    "id": "...",
    "name": "Mercadona",
    "type": "supermarket",
    "address": "Calle Principal 123",
    "articles": [
      {
        "id": "...",
        "name": "Tortillas de maíz Hacendado",
        "brand": "Hacendado",
        "price": 1.45,
        "available": true
      }
    ]
  }
}
```

#### 5.4 API: Actualizar Comercio
**Endpoint:** `PUT /api/stores/[id]`

#### 5.5 API: Eliminar Comercio
**Endpoint:** `DELETE /api/stores/[id]`

**Validaciones:**
- No se puede eliminar si tiene artículos o ítems asociados

---

## 🎯 Fase 6: Asignar Artículos a Comercios

### Objetivo
Permitir asignar artículos (marcas) a comercios y establecer precios.

### Tareas

#### 6.1 API: Asignar Artículo a Comercio
**Endpoint:** `POST /api/articles/[id]/stores`

**Funcionalidad:**
- Asociar un artículo a un comercio con precio y disponibilidad
- Si la relación ya existe, se actualiza

**Request Body:**
```json
{
  "storeId": "...",
  "price": 1.45,
  "available": true
}
```

**Validaciones:**
- `storeId`: requerido, debe existir
- `price`: opcional, debe ser positivo si se proporciona
- `available`: boolean, default `true`

**Response:**
```json
{
  "articleStore": {
    "id": "...",
    "article": {
      "id": "...",
      "name": "Tortillas de maíz Hacendado",
      "brand": "Hacendado"
    },
    "store": {
      "id": "...",
      "name": "Mercadona"
    },
    "price": 1.45,
    "available": true,
    "lastCheckedAt": null
  }
}
```

#### 6.2 API: Actualizar Precio/Disponibilidad
**Endpoint:** `PUT /api/articles/[id]/stores/[storeId]`

**Funcionalidad:**
- Actualizar precio y/o disponibilidad de un artículo en un comercio
- Actualiza automáticamente `lastCheckedAt`

**Request Body:**
```json
{
  "price": 1.50,
  "available": true
}
```

#### 6.3 API: Eliminar Asociación Artículo-Comercio
**Endpoint:** `DELETE /api/articles/[id]/stores/[storeId]`

**Funcionalidad:**
- Remover un artículo de un comercio

#### 6.4 API: Listar Comercios de un Artículo
**Endpoint:** `GET /api/articles/[id]/stores`

**Response:**
```json
{
  "stores": [
    {
      "id": "...",
      "name": "Mercadona",
      "type": "supermarket",
      "price": 1.45,
      "available": true,
      "lastCheckedAt": "2024-01-15T10:00:00Z"
    }
  ]
}
```

#### 6.5 API: Listar Artículos de un Comercio
**Endpoint:** `GET /api/stores/[id]/articles`

**Response:**
```json
{
  "articles": [
    {
      "id": "...",
      "name": "Tortillas de maíz Hacendado",
      "brand": "Hacendado",
      "product": {
        "id": "...",
        "name": "Tortillas"
      },
      "price": 1.45,
      "available": true
    }
  ]
}
```

---

## 🎯 Fase 7: Recuperar Artículos por Producto

### Objetivo
Permitir obtener todos los artículos (marcas) asociados a un producto.

### Tareas

#### 7.1 API: Obtener Artículos de un Producto
**Endpoint:** `GET /api/products/[id]/articles`

**Funcionalidad:**
- Retorna todos los artículos (marcas) asociados a un producto
- Incluye información de comercios y precios

**Query Params:**
- `storeId`: Filtrar artículos disponibles en un comercio específico
- `general`: boolean - Solo artículos generales
- `search`: string - Búsqueda por nombre/marca

**Response:**
```json
{
  "articles": [
    {
      "id": "...",
      "name": "Tortillas de maíz Hacendado",
      "brand": "Hacendado",
      "variant": "de maíz",
      "suggestedPrice": 1.50,
      "isGeneral": true,
      "stores": [
        {
          "id": "...",
          "name": "Mercadona",
          "price": 1.45,
          "available": true
        }
      ],
      "ingredients": [
        {
          "id": "...",
          "name": "Harina de maíz"
        }
      ]
    }
  ],
  "total": 5
}
```

#### 7.2 Integración en API de Producto
**Endpoint:** `GET /api/products/[id]`

**Funcionalidad:**
- Ya incluye los artículos en la respuesta (ver Fase 2.3)

---

## 🎯 Fase 8: Crear Ítem desde Artículo-Comercio

### Objetivo
Permitir crear ítems en listas de compra a partir de un artículo y opcionalmente un comercio. Actualizar el endpoint actual para usar `articleId` según el schema de Prisma.

### Estado Actual
El endpoint actual `POST /api/lists/[id]/items` usa `name` como campo, pero el schema de Prisma requiere `articleId` y una relación con el modelo `Article`. Es necesario actualizar la implementación.

### Tareas

#### 8.1 API: Crear Ítem desde Artículo
**Endpoint:** `POST /api/lists/[id]/items`

**Funcionalidad:**
- Crear un ítem en una lista de compra a partir de un artículo
- Opcionalmente puede incluir el comercio donde se comprará
- **Cambio requerido:** Actualizar para usar `articleId` en lugar de `name`

**Request Body:**
```json
{
  "articleId": "...",
  "quantity": 2,
  "unit": "paquetes",
  "storeId": "...",
  "notes": "Preferiblemente sin azúcar"
}
```

**Validaciones:**
- `articleId`: requerido, debe existir y ser accesible por el usuario
- `quantity`: requerido, debe ser un número positivo (Float según schema)
- `unit`: opcional, default "unidades"
- `storeId`: opcional, si se proporciona debe existir y el artículo debe estar disponible en ese comercio
- Un artículo solo puede aparecer una vez por lista (unique constraint: `shoppingListId + articleId`)

**Cambios de Implementación:**
- Actualizar schema Zod: reemplazar `name` por `articleId`
- Cambiar `quantity` de `String` a `Float` según schema
- Verificar que el artículo existe antes de crear
- Verificar unique constraint antes de crear
- Incluir relación con `article` (y `store` si se proporciona) en la respuesta

**Response:**
```json
{
  "item": {
    "id": "...",
    "article": {
      "id": "...",
      "name": "Tortillas de maíz Hacendado",
      "brand": "Hacendado",
      "product": {
        "id": "...",
        "name": "Tortillas"
      }
    },
    "quantity": 2,
    "unit": "paquetes",
    "checked": false,
    "store": {
      "id": "...",
      "name": "Mercadona"
    },
    "notes": "Preferiblemente sin azúcar",
    "addedBy": {
      "id": "...",
      "name": "Usuario de Prueba"
    },
    "createdAt": "2024-01-15T10:00:00Z"
  }
}
```

#### 8.2 API: Crear Ítem desde Artículo-Comercio (Endpoint Alternativo)
**Endpoint:** `POST /api/lists/[id]/items/from-store`

**Funcionalidad:**
- Crear ítem específicamente desde la relación artículo-comercio
- Útil cuando se selecciona desde la vista de comercio
- Verificar que el artículo esté disponible en el comercio

**Request Body:**
```json
{
  "articleId": "...",
  "storeId": "...",
  "quantity": 2,
  "unit": "paquetes",
  "notes": "..."
}
```

**Validaciones:**
- `articleId`: requerido, debe existir
- `storeId`: requerido, debe existir
- Verificar que existe `ArticleStore` con `articleId` y `storeId`
- Verificar que `available = true` en `ArticleStore`
- `quantity`: requerido, número positivo
- Unique constraint: un artículo solo una vez por lista

**Response:**
```json
{
  "item": {
    "id": "...",
    "article": {
      "id": "...",
      "name": "Tortillas de maíz Hacendado",
      "brand": "Hacendado"
    },
    "quantity": 2,
    "unit": "paquetes",
    "store": {
      "id": "...",
      "name": "Mercadona",
      "price": 1.45
    },
    "checked": false,
    "addedBy": {...}
  }
}
```

#### 8.3 Mejora: Sugerir Precio al Crear Ítem
**Funcionalidad:**
- Si se proporciona `storeId`, incluir el precio sugerido del `ArticleStore` en la respuesta
- El precio real se establece al marcar como comprado (Fase 10)
- Mostrar precio sugerido en el frontend para referencia

---

## 🎯 Fase 9: Gestión de Listas de Compra

### Objetivo
Permitir crear y gestionar listas de compra, incluyendo compartir con otros usuarios.

### Tareas

#### 9.1 API: Listar Listas de Compra
**Endpoint:** `GET /api/lists`

**Funcionalidad:**
- Retorna listas propias del usuario y listas compartidas con él
- Incluye información de items, owner y usuarios compartidos

**Response:**
```json
{
  "lists": [
    {
      "id": "...",
      "name": "Compra semanal",
      "description": "...",
      "owner": {
        "id": "...",
        "name": "Usuario",
        "email": "usuario@example.com"
      },
      "items": [...],
      "shares": [
        {
          "user": {
            "id": "...",
            "name": "Usuario Compartido",
            "email": "compartido@example.com"
          },
          "canEdit": true
        }
      ],
      "createdAt": "2024-01-15T10:00:00Z",
      "updatedAt": "2024-01-15T10:00:00Z"
    }
  ]
}
```

#### 9.2 API: Crear Lista de Compra
**Endpoint:** `POST /api/lists`

**Funcionalidad:**
- Crear una nueva lista de compra
- El usuario autenticado se convierte en el owner

**Request Body:**
```json
{
  "name": "Compra semanal",
  "description": "Lista para la compra de la semana"
}
```

**Validaciones:**
- `name`: requerido, mínimo 1 carácter
- `description`: opcional

**Response:**
```json
{
  "list": {
    "id": "...",
    "name": "Compra semanal",
    "description": "...",
    "owner": {
      "id": "...",
      "name": "Usuario",
      "email": "usuario@example.com"
    },
    "items": [],
    "shares": [],
    "createdAt": "2024-01-15T10:00:00Z"
  }
}
```

#### 9.3 API: Obtener Lista de Compra
**Endpoint:** `GET /api/lists/[id]`

**Funcionalidad:**
- Obtener una lista específica con todos sus detalles
- Verificar que el usuario tenga acceso (owner o compartida)

**Response:**
```json
{
  "list": {
    "id": "...",
    "name": "Compra semanal",
    "description": "...",
    "owner": {
      "id": "...",
      "name": "Usuario",
      "email": "usuario@example.com"
    },
    "items": [
      {
        "id": "...",
        "name": "...",
        "quantity": "...",
        "unit": "...",
        "checked": false,
        "notes": "...",
        "addedBy": {
          "id": "...",
          "name": "Usuario"
        }
      }
    ],
    "shares": [...],
    "createdAt": "2024-01-15T10:00:00Z",
    "updatedAt": "2024-01-15T10:00:00Z"
  }
}
```

#### 9.4 API: Actualizar Lista de Compra
**Endpoint:** `PUT /api/lists/[id]`

**Funcionalidad:**
- Actualizar nombre y descripción de la lista
- Solo el owner puede actualizar estos campos

**Request Body:**
```json
{
  "name": "Compra mensual",
  "description": "Lista actualizada"
}
```

**Validaciones:**
- Solo el owner puede actualizar nombre y descripción
- Usuarios compartidos con `canEdit: true` pueden modificar items pero no la lista en sí

#### 9.5 API: Eliminar Lista de Compra
**Endpoint:** `DELETE /api/lists/[id]`

**Funcionalidad:**
- Eliminar una lista de compra
- Solo el owner puede eliminar

**Validaciones:**
- Solo el owner puede eliminar
- Se eliminan automáticamente todos los items asociados (onDelete: Cascade)

#### 9.6 API: Compartir Lista con Usuario
**Endpoint:** `POST /api/lists/[id]/share`

**Funcionalidad:**
- Compartir una lista con otro usuario por email
- Especificar permisos de edición

**Request Body:**
```json
{
  "email": "usuario@example.com",
  "canEdit": true
}
```

**Validaciones:**
- Solo el owner puede compartir
- El email debe corresponder a un usuario existente
- No se puede compartir consigo mismo
- Si ya existe el share, se actualiza

**Response:**
```json
{
  "share": {
    "id": "...",
    "user": {
      "id": "...",
      "name": "Usuario Compartido",
      "email": "usuario@example.com"
    },
    "canEdit": true,
    "createdAt": "2024-01-15T10:00:00Z"
  }
}
```

#### 9.7 API: Remover Acceso a Lista
**Endpoint:** `DELETE /api/lists/[id]/share/[userId]`

**Funcionalidad:**
- Remover el acceso de un usuario a una lista compartida
- Solo el owner puede remover acceso

**Validaciones:**
- Solo el owner puede remover acceso

---

## 🎯 Fase 10: Gestión Avanzada de Ítems

### Objetivo
Permitir gestionar ítems con información completa de compra: precio real, cantidad comprada, fecha de compra.

### Tareas

#### 10.1 API: Actualizar Ítem Completo
**Endpoint:** `PUT /api/lists/[id]/items/[itemId]`

**Funcionalidad:**
- Actualizar todos los campos de un ítem, incluyendo información de compra
- Marcar como comprado y registrar datos de compra

**Request Body:**
```json
{
  "checked": true,
  "quantity": 2,
  "purchasedQuantity": 2,
  "price": 1.45,
  "storeId": "...",
  "purchasedAt": "2024-01-15T10:00:00Z",
  "notes": "Actualizado"
}
```

**Validaciones:**
- `purchasedQuantity`: debe ser <= `quantity`
- `price`: debe ser positivo si se proporciona
- `storeId`: debe existir si se proporciona
- Solo usuarios con acceso y permiso de edición pueden actualizar

**Response:**
```json
{
  "item": {
    "id": "...",
    "article": {
      "id": "...",
      "name": "Tortillas de maíz Hacendado",
      "brand": "Hacendado",
      "product": {
        "id": "...",
        "name": "Tortillas"
      }
    },
    "quantity": 2,
    "purchasedQuantity": 2,
    "unit": "paquetes",
    "checked": true,
    "price": 1.45,
    "store": {
      "id": "...",
      "name": "Mercadona"
    },
    "purchasedAt": "2024-01-15T10:00:00Z",
    "notes": "Actualizado",
    "addedBy": {
      "id": "...",
      "name": "Usuario"
    }
  }
}
```

#### 10.2 Lógica de Compra
**Funcionalidad:**
- Cuando `checked = true` y se proporciona `price`, registrar la compra
- `purchasedAt` se establece automáticamente si no se proporciona
- Si `purchasedQuantity < quantity`, el ítem queda parcialmente comprado
- Actualizar `totalCost` de la lista cuando se completa

---

## 🎯 Fase 11: Estados y Plantillas de Listas

### Objetivo
Gestionar estados de listas de compra y permitir crear plantillas reutilizables.

### Tareas

#### 11.1 API: Actualizar Estado de Lista
**Endpoint:** `PUT /api/lists/[id]`

**Funcionalidad:**
- Permitir cambiar el estado de la lista: `draft`, `active`, `completed`, `archived`
- Actualizar `statusDate` automáticamente
- Calcular `totalCost` cuando se marca como `completed`

**Request Body:**
```json
{
  "status": "completed"
}
```

**Estados:**
- `draft`: Lista en borrador, aún no activa
- `active`: Lista activa, lista de compra en uso
- `completed`: Lista completada, compra finalizada
- `archived`: Lista archivada, histórica

**Validaciones:**
- Solo el owner puede cambiar el estado
- Al marcar como `completed`, calcular `totalCost` sumando `price * purchasedQuantity` de todos los items comprados
- Actualizar `statusDate` al cambiar estado

#### 11.2 API: Crear Lista desde Plantilla
**Endpoint:** `POST /api/lists?fromTemplate=[templateId]`

**Funcionalidad:**
- Crear una nueva lista copiando items de una plantilla
- Los items se copian pero son independientes

**Query Params:**
- `fromTemplate`: ID de la lista plantilla

**Request Body:**
```json
{
  "name": "Compra semanal - Semana 2",
  "description": "Copia de plantilla"
}
```

**Validaciones:**
- La plantilla debe existir y ser accesible
- La plantilla debe tener `isTemplate = true`
- Los items copiados no mantienen relación con la plantilla

#### 11.3 API: Marcar Lista como Plantilla
**Endpoint:** `PUT /api/lists/[id]`

**Funcionalidad:**
- Marcar una lista como plantilla para reutilización
- Las plantillas pueden usarse para crear nuevas listas

**Request Body:**
```json
{
  "isTemplate": true
}
```

**Validaciones:**
- Solo el owner puede marcar como plantilla
- Una plantilla puede tener `status` pero normalmente será `draft` o `archived`

#### 11.4 Cálculo Automático de Total
**Funcionalidad:**
- Al marcar lista como `completed`, calcular automáticamente `totalCost`
- Sumar `price * purchasedQuantity` de todos los items con `checked = true` y `price` definido
- Actualizar `totalCost` en la lista

---

## 🎯 Fase 12: Historial y Estadísticas

### Objetivo
Proporcionar funcionalidades de historial y análisis de compras.

### Tareas

#### 12.1 API: Listar Listas Completadas
**Endpoint:** `GET /api/lists?status=completed`

**Funcionalidad:**
- Obtener historial de listas completadas
- Incluir información de totalCost y fecha de finalización

**Query Params:**
- `status`: Filtrar por estado (`completed`, `archived`)
- `limit`: Límite de resultados
- `offset`: Paginación

**Response:**
```json
{
  "lists": [
    {
      "id": "...",
      "name": "Compra semanal",
      "status": "completed",
      "totalCost": 45.50,
      "statusDate": "2024-01-15T10:00:00Z",
      "items": [...]
    }
  ],
  "total": 10
}
```

#### 12.2 API: Estadísticas de Compras
**Endpoint:** `GET /api/stats/purchases`

**Funcionalidad:**
- Obtener estadísticas agregadas de compras del usuario

**Query Params:**
- `startDate`: Fecha de inicio (opcional)
- `endDate`: Fecha de fin (opcional)

**Response:**
```json
{
  "totalSpent": 450.75,
  "totalLists": 15,
  "averageListCost": 30.05,
  "mostPurchasedArticles": [
    {
      "article": {
        "id": "...",
        "name": "Tortillas de maíz Hacendado"
      },
      "timesPurchased": 12,
      "totalSpent": 17.40
    }
  ],
  "period": {
    "startDate": "2024-01-01T00:00:00Z",
    "endDate": "2024-01-31T23:59:59Z"
  }
}
```

#### 12.3 Comparación de Precios Históricos
**Funcionalidad:**
- Comparar precios de un artículo a lo largo del tiempo
- Identificar tendencias de precios
- Sugerir mejor momento para comprar

**Nota:** Esta funcionalidad requiere almacenar historial de precios, que puede implementarse en el futuro.

---

## 🎯 Fase 13: Gestión de Recetas

### Objetivo
Permitir crear y gestionar recetas como conjuntos de ingredientes a comprar. Las recetas se crean usando SOLO productos (no artículos), ya que los artículos son demasiado específicos para recetas.

### Concepto
En esta fase, una receta es simplemente un **conjunto de ingredientes a comprar**. 

**Ejemplo:**
- ✅ Receta contiene: "6 huevos" (producto)
- ❌ NO contiene: "6 huevos ecológicos tamaño M marca X" (artículo)

**Características:**
- Las recetas contienen SOLO productos como ingredientes
- Los artículos son demasiado específicos para recetas
- Información opcional (descripción, instrucciones, tiempos) puede existir pero no es prioritaria
- El foco está en los ingredientes a comprar

### Tareas

#### 13.1 Schema: Modelos de Receta
**Modelos Prisma:**

```prisma
model Recipe {
  id          String   @id @default(cuid())
  name        String
  description String?
  instructions String?
  servings    Int?
  prepTime    Int?    // minutos
  cookTime    Int?    // minutos
  isGeneral   Boolean  @default(false)
  createdById String?
  createdBy   User?    @relation("RecipeCreator", fields: [createdById], references: [id], onDelete: SetNull)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  ingredients RecipeIngredient[]

  @@index([name])
  @@index([isGeneral, createdById])
}

model RecipeIngredient {
  id          String   @id @default(cuid())
  recipeId    String
  recipe      Recipe   @relation(fields: [recipeId], references: [id], onDelete: Cascade)
  productId   String
  product     Product  @relation(fields: [productId], references: [id], onDelete: Restrict)
  quantity    Float
  unit        String   @default("unidades")
  isOptional  Boolean  @default(false)
  notes       String?
  order       Int      @default(0)
  createdAt   DateTime @default(now())

  @@index([recipeId])
  @@index([productId])
}
```

**Actualizar modelo ShoppingList:**
```prisma
model ShoppingList {
  // ... campos existentes ...
  recipeId    String?  // Si fue creada desde una receta
  recipe      Recipe?   @relation(fields: [recipeId], references: [id], onDelete: SetNull)
}
```

#### 13.2 API: Crear Receta
**Endpoint:** `POST /api/recipes`

**Request Body:**
```json
{
  "name": "Paella marinera",
  "description": "Paella tradicional con marisco",
  "instructions": "1. Sofreír...",
  "servings": 4,
  "prepTime": 30,
  "cookTime": 45,
  "isGeneral": false,
  "ingredients": [
    {
      "productId": "...",
      "quantity": 500,
      "unit": "gr",
      "isOptional": false,
      "notes": "Arroz bomba preferiblemente",
      "order": 1
    },
    {
      "productId": "...",
      "quantity": 6,
      "unit": "unidades",
      "isOptional": false,
      "notes": "Huevos frescos",
      "order": 2
    }
  ]
}
```

**Validaciones:**
- `name`: requerido
- Al menos un ingrediente requerido
- Cada ingrediente debe tener `productId` (requerido, solo productos)
- `quantity` debe ser positivo
- `unit` requerido

**Response:**
```json
{
  "recipe": {
    "id": "...",
    "name": "Paella marinera",
    "description": "Paella tradicional con marisco",
    "servings": 4,
    "ingredients": [
      {
        "id": "...",
        "product": {
          "id": "...",
          "name": "Arroz"
        },
        "quantity": 500,
        "unit": "gr",
        "isOptional": false,
        "notes": "Arroz bomba preferiblemente"
      }
    ],
    "createdAt": "2024-01-15T10:00:00Z"
  }
}
```

#### 13.3 API: Listar Recetas
**Endpoint:** `GET /api/recipes`

**Query Params:**
- `search`: Búsqueda por nombre
- `general`: boolean - Solo recetas generales
- `limit`: number (default: 50)
- `offset`: number (default: 0)

**Response:** Incluye recetas generales + particulares del usuario

#### 13.4 API: Obtener Receta
**Endpoint:** `GET /api/recipes/[id]`

**Response:** Receta completa con ingredientes (productos)

#### 13.5 API: Actualizar Receta
**Endpoint:** `PUT /api/recipes/[id]`

**Funcionalidad:** Actualizar información de la receta e ingredientes

**Validaciones:** Solo el creador puede actualizar recetas particulares

#### 13.6 API: Eliminar Receta
**Endpoint:** `DELETE /api/recipes/[id]`

**Validaciones:** Solo el creador puede eliminar recetas particulares

#### 13.7 API: Gestión de Ingredientes de Receta
**Endpoints:**
- `GET /api/recipes/[id]/ingredients` - Listar ingredientes
- `POST /api/recipes/[id]/ingredients` - Agregar ingrediente
- `PUT /api/recipes/[id]/ingredients/[ingredientId]` - Actualizar ingrediente
- `DELETE /api/recipes/[id]/ingredients/[ingredientId]` - Eliminar ingrediente

---

## 🎯 Fase 14: Convertir Receta a Lista de Compra

### Objetivo
Permitir crear una lista de compra a partir de una receta, seleccionando artículos específicos para cada producto de la receta.

### Tareas

#### 14.1 API: Crear Lista desde Receta
**Endpoint:** `POST /api/lists?fromRecipe=[recipeId]`

**Funcionalidad:**
- Crear una nueva lista de compra desde una receta
- Para cada ingrediente (producto) de la receta, el usuario debe seleccionar un artículo
- Permitir ajustar cantidades según número de porciones
- Opcionalmente multiplicar cantidades si se especifica número de porciones diferente

**Request Body:**
```json
{
  "name": "Lista: Paella marinera",
  "description": "Lista generada desde receta",
  "servings": 4,
  "ingredientSelections": {
    "recipeIngredientId1": {
      "articleId": "articleId1",
      "quantity": 500,
      "unit": "gr"
    },
    "recipeIngredientId2": {
      "articleId": "articleId2",
      "quantity": 6,
      "unit": "unidades"
    }
  }
}
```

**Validaciones:**
- `recipeId` debe existir y ser accesible
- Todos los ingredientes de la receta deben tener un artículo seleccionado
- `articleId` debe existir y ser accesible
- `quantity` debe ser positivo
- Si se especifica `servings`, multiplicar cantidades proporcionalmente

**Response:**
```json
{
  "list": {
    "id": "...",
    "name": "Lista: Paella marinera",
    "recipeId": "...",
    "items": [
      {
        "id": "...",
        "article": {
          "id": "...",
          "name": "Arroz bomba Hacendado"
        },
        "quantity": 500,
        "unit": "gr"
      }
    ]
  }
}
```

#### 14.2 API: Obtener Artículos Disponibles para Producto
**Endpoint:** `GET /api/recipes/[id]/ingredients/[ingredientId]/articles`

**Funcionalidad:**
- Obtener artículos disponibles para un producto específico de la receta
- Útil para el frontend al mostrar selector de artículos

**Response:**
```json
{
  "product": {
    "id": "...",
    "name": "Arroz"
  },
  "articles": [
    {
      "id": "...",
      "name": "Arroz bomba Hacendado",
      "brand": "Hacendado",
      "suggestedPrice": 2.50,
      "stores": [
        {
          "id": "...",
          "name": "Mercadona",
          "price": 2.45
        }
      ]
    }
  ]
}
```

#### 14.3 Frontend: Selector de Artículos
**Funcionalidad:**
- Al crear lista desde receta, mostrar modal/página
- Para cada ingrediente (producto), mostrar selector de artículos disponibles
- Mostrar precios sugeridos de cada artículo
- Permitir ajustar cantidades
- Validar que todos los ingredientes tienen artículo seleccionado antes de crear lista
- Opcionalmente permitir ajustar número de porciones y recalcular cantidades

### Consideraciones Técnicas

1. **Validación de Ingredientes:**
   - Un RecipeIngredient debe tener `productId` (requerido, solo productos)
   - Validar que el producto existe y es accesible

2. **Conversión a Lista:**
   - Los ingredientes con `productId` requieren selección de artículo por el usuario
   - Mantener referencia a la receta original en la lista (`recipeId`)

3. **Escalado de Cantidades:**
   - Si la receta es para 4 personas y quiero hacer para 8, multiplicar cantidades por 2
   - Campo `servings` en Recipe y parámetro `servings` al crear lista

4. **Permisos:**
   - Recetas generales: visibles para todos
   - Recetas particulares: solo visibles para el creador
   - Misma lógica que productos/artículos

---

## 📊 Resumen de Endpoints por Fase

### Fase 1: Ingredientes
- `POST /api/ingredients` - Crear ingrediente
- `GET /api/ingredients` - Listar ingredientes
- `GET /api/ingredients/[id]` - Obtener ingrediente
- `PUT /api/ingredients/[id]` - Actualizar ingrediente
- `DELETE /api/ingredients/[id]` - Eliminar ingrediente

### Fase 2: Productos ✅ COMPLETA
- `POST /api/products` - Crear producto
- `GET /api/products` - Listar productos (con búsqueda, filtros, paginación)
- `GET /api/products/[id]` - Obtener producto (con artículos e ingredientes)
- `PUT /api/products/[id]` - Actualizar producto
- `DELETE /api/products/[id]` - Eliminar producto
- `GET /api/products/[id]/ingredients` - Listar ingredientes del producto
- `POST /api/products/[id]/ingredients` - Asignar ingredientes al producto
- `PUT /api/products/[id]/ingredients/[ingredientId]` - Actualizar relación ingrediente-producto
- `DELETE /api/products/[id]/ingredients/[ingredientId]` - Eliminar ingrediente del producto

### Fase 3: Artículos (Marcas) ✅ COMPLETA
- `POST /api/articles` - Crear artículo (con asignación opcional de ingredientes)
- `GET /api/articles` - Listar artículos (con filtros: productId, general, search, brand, paginación)
- `GET /api/articles/[id]` - Obtener artículo (con producto, ingredientes, comercios)
- `PUT /api/articles/[id]` - Actualizar artículo
- `DELETE /api/articles/[id]` - Eliminar artículo (con validación de items)

### Fase 4: Ingredientes de Artículos
- `POST /api/articles/[id]/ingredients` - Asignar ingredientes
- `PUT /api/articles/[id]/ingredients/[ingredientId]` - Actualizar ingrediente
- `DELETE /api/articles/[id]/ingredients/[ingredientId]` - Eliminar ingrediente
- `GET /api/articles/[id]/ingredients` - Listar ingredientes

### Fase 5: Comercios ✅ COMPLETA
- `POST /api/stores` - Crear comercio
- `GET /api/stores` - Listar comercios (con filtros: type, search, general, paginación)
- `GET /api/stores/[id]` - Obtener comercio (con artículos y precios)
- `PUT /api/stores/[id]` - Actualizar comercio
- `DELETE /api/stores/[id]` - Eliminar comercio (con validación de artículos e items)

### Fase 6: Artículos en Comercios
- `POST /api/articles/[id]/stores` - Asignar artículo a comercio
- `PUT /api/articles/[id]/stores/[storeId]` - Actualizar precio/disponibilidad
- `DELETE /api/articles/[id]/stores/[storeId]` - Eliminar asociación
- `GET /api/articles/[id]/stores` - Listar comercios del artículo
- `GET /api/stores/[id]/articles` - Listar artículos del comercio

### Fase 7: Artículos por Producto ✅ COMPLETA
- `GET /api/products/[id]/articles` - Obtener artículos de un producto (con filtros avanzados)

### Fase 8: Crear Ítem desde Artículo-Comercio
- `POST /api/lists/[id]/items` - Crear ítem desde artículo (actualizar para usar articleId)
- `POST /api/lists/[id]/items/from-store` - Crear ítem desde artículo-comercio

### Fase 9: Gestión de Listas de Compra ✅ COMPLETA
- `GET /api/lists` - Listar listas (propias y compartidas)
- `POST /api/lists` - Crear lista
- `GET /api/lists/[id]` - Obtener lista con items y shares
- `PUT /api/lists/[id]` - Actualizar lista (nombre, descripción)
- `DELETE /api/lists/[id]` - Eliminar lista (solo owner)
- `POST /api/lists/[id]/share` - Compartir lista con usuario
- `DELETE /api/lists/[id]/share/[userId]` - Remover acceso

### Fase 10: Gestión Avanzada de Ítems
- `PUT /api/lists/[id]/items/[itemId]` - Actualizar ítem completo (checked, purchasedQuantity, price, purchasedAt)

### Fase 11: Estados y Plantillas de Listas
- `PUT /api/lists/[id]` - Actualizar estado de lista (status, totalCost)
- `POST /api/lists?fromTemplate=[id]` - Crear lista desde plantilla
- `PUT /api/lists/[id]` - Marcar lista como plantilla (isTemplate)

### Fase 12: Historial y Estadísticas
- `GET /api/lists?status=completed` - Listar listas completadas
- `GET /api/stats/purchases` - Estadísticas de compras

### Fase 13: Gestión de Recetas
- `POST /api/recipes` - Crear receta
- `GET /api/recipes` - Listar recetas (con búsqueda, filtros, paginación)
- `GET /api/recipes/[id]` - Obtener receta (con ingredientes)
- `PUT /api/recipes/[id]` - Actualizar receta
- `DELETE /api/recipes/[id]` - Eliminar receta
- `GET /api/recipes/[id]/ingredients` - Listar ingredientes de la receta
- `POST /api/recipes/[id]/ingredients` - Agregar ingrediente a receta
- `PUT /api/recipes/[id]/ingredients/[ingredientId]` - Actualizar ingrediente
- `DELETE /api/recipes/[id]/ingredients/[ingredientId]` - Eliminar ingrediente

### Fase 14: Convertir Receta a Lista de Compra
- `POST /api/lists?fromRecipe=[recipeId]` - Crear lista desde receta
- `GET /api/recipes/[id]/ingredients/[ingredientId]/articles` - Obtener artículos disponibles para producto

---

## 🔒 Reglas de Negocio y Validaciones

### Permisos y Visibilidad

1. **Productos/Artículos Generales:**
   - Visibles para todos los usuarios
   - Solo administradores pueden crear productos/artículos generales (o todos según política)

2. **Productos/Artículos Particulares:**
   - Solo visibles para el usuario creador
   - Solo el creador puede editar/eliminar

3. **Comercios:**
   - Misma lógica: generales vs particulares

### Validaciones de Integridad

1. **Producto → Artículo:**
   - No se puede eliminar un producto si tiene artículos asociados
   - Un artículo siempre debe tener un producto

2. **Artículo → Ítem:**
   - No se puede eliminar un artículo si tiene ítems asociados
   - Un ítem siempre debe tener un artículo

3. **Artículo-Comercio:**
   - Un artículo puede estar en múltiples comercios
   - Un comercio puede tener múltiples artículos
   - Precio es opcional pero debe ser positivo si se proporciona

4. **Ítem:**
   - Un artículo solo puede aparecer una vez por lista (unique constraint)
   - `quantity` debe ser positivo
   - `purchasedQuantity` puede ser menor que `quantity`

---

## 🧪 Estrategia de Testing

### Tests Unitarios
- Validaciones de esquemas Zod
- Lógica de negocio (permisos, visibilidad)
- Cálculos (precios, totales)

### Tests de Integración
- Flujo completo: Producto → Artículo → Ítem
- Asociaciones: Artículo-Comercio
- Permisos y acceso

### Tests E2E
- Crear producto, artículo, asignar a comercio, crear ítem
- Flujo de usuario completo

---

## 📅 Orden de Implementación Recomendado

### Sprint 1: Fundamentos
1. ✅ Fase 1: Gestión de Ingredientes - **COMPLETA**
2. ✅ Fase 2: Gestión de Productos - **COMPLETA** (incluye gestión de ingredientes de productos)

### Sprint 2: Artículos y Relaciones
3. ✅ Fase 3: Gestión de Artículos - **COMPLETA**
4. ✅ Fase 4: Ingredientes de Artículos - **COMPLETA**

### Sprint 3: Comercios
5. ✅ Fase 5: Gestión de Comercios - **COMPLETA**
6. ✅ Fase 6: Artículos en Comercios - **COMPLETA**

### Sprint 4: Integración
7. ✅ Fase 7: Recuperar Artículos por Producto - **COMPLETA**
8. ✅ Fase 9: Gestión de Listas de Compra - **COMPLETA**
9. 🎯 Fase 8: Crear Ítem desde Artículo-Comercio - **SIGUIENTE PASO**

### Sprint 5: Gestión Avanzada
10. Fase 10: Gestión Avanzada de Ítems
11. Fase 11: Estados y Plantillas de Listas
12. Fase 12: Historial y Estadísticas (futuro)

---

## 📝 Notas de Implementación

### Consideraciones Técnicas

1. **Búsqueda:**
   - Implementar búsqueda full-text en PostgreSQL para nombres
   - Índices en campos de búsqueda frecuente

2. **Paginación:**
   - Todas las listas deben soportar paginación
   - Límites razonables (default: 50, max: 100)

3. **Caché:**
   - Cachear productos y artículos generales
   - Invalidar caché al actualizar

4. **Performance:**
   - Usar `include` selectivo en Prisma
   - Evitar N+1 queries
   - Agregaciones para conteos

### Mejoras Futuras

1. **Búsqueda Avanzada:**
   - Filtros combinados
   - Búsqueda por ingredientes
   - Búsqueda por rango de precios

2. **Comparación de Precios:**
   - Comparar precios de un artículo en diferentes comercios
   - Sugerir comercio más barato

3. **Historial de Precios:**
   - Guardar historial de cambios de precio
   - Gráficos de evolución de precios

4. **Notificaciones:**
   - Notificar cuando cambia el precio de un artículo seguido
   - Notificar cuando un artículo vuelve a estar disponible

---

## ✅ Checklist de Implementación

### Fase 1: Ingredientes ✅ COMPLETA
- [x] POST /api/ingredients
- [x] GET /api/ingredients
- [x] GET /api/ingredients/[id]
- [x] PUT /api/ingredients/[id]
- [x] DELETE /api/ingredients/[id]
- [x] Frontend completo (página, modales, búsqueda, filtros)
- [x] Validaciones Zod implementadas
- [ ] Tests (pendiente)

### Fase 2: Productos ✅ COMPLETA
- [x] GET /api/products (mejorado con búsqueda, filtros, articlesCount)
- [x] POST /api/products
- [x] GET /api/products/[id] (completo con artículos e ingredientes)
- [x] PUT /api/products/[id]
- [x] DELETE /api/products/[id]
- [x] Frontend completo (página, modales, búsqueda, filtros)
- [x] Validaciones Zod implementadas
- [x] APIs de ingredientes de productos:
  - [x] GET /api/products/[id]/ingredients
  - [x] POST /api/products/[id]/ingredients
  - [x] PUT /api/products/[id]/ingredients/[ingredientId]
  - [x] DELETE /api/products/[id]/ingredients/[ingredientId]
- [ ] Tests (pendiente)

### Fase 3: Artículos ✅ COMPLETA
- [x] POST /api/articles
- [x] GET /api/articles (con filtros: productId, general, search, brand, paginación)
- [x] GET /api/articles/[id] (completo con producto, ingredientes, comercios)
- [x] PUT /api/articles/[id]
- [x] DELETE /api/articles/[id]
- [x] Frontend completo (página, modales, búsqueda, filtros múltiples)
- [x] Validaciones Zod implementadas
- [x] Asignación opcional de ingredientes en creación
- [ ] Tests (pendiente)

### Fase 4: Ingredientes de Artículos ✅ COMPLETA
- [x] POST /api/articles/[id]/ingredients
- [x] PUT /api/articles/[id]/ingredients/[ingredientId]
- [x] DELETE /api/articles/[id]/ingredients/[ingredientId]
- [x] GET /api/articles/[id]/ingredients
- [x] Validaciones Zod implementadas
- [ ] Tests (pendiente)

### Fase 5: Comercios ✅ COMPLETA
- [x] POST /api/stores
- [x] GET /api/stores (con filtros: type, search, general, paginación)
- [x] GET /api/stores/[id] (completo con artículos y precios)
- [x] PUT /api/stores/[id]
- [x] DELETE /api/stores/[id]
- [x] Frontend completo (página, modales, búsqueda, filtros)
- [x] Validaciones Zod implementadas
- [ ] Tests (pendiente)

### Fase 6: Artículos en Comercios ✅ COMPLETA
- [x] POST /api/articles/[id]/stores
- [x] PUT /api/articles/[id]/stores/[storeId]
- [x] DELETE /api/articles/[id]/stores/[storeId]
- [x] GET /api/articles/[id]/stores
- [x] GET /api/stores/[id]/articles
- [x] Frontend: Página de detalle de artículo con gestión de comercios
- [x] Frontend: Página de detalle de comercio con lista de artículos
- [x] Frontend: Modal para asignar/editar artículo en comercio
- [x] Validaciones Zod implementadas
- [ ] Tests (pendiente)

### Fase 7: Artículos por Producto ✅ COMPLETA
- [x] GET /api/products/[id]/articles (implementado con filtros avanzados)
- [x] Integración en GET /api/products/[id]
- [x] Validaciones y permisos implementados
- [ ] Tests (pendiente)

### Fase 8: Crear Ítem desde Artículo-Comercio ✅ COMPLETA
- [x] POST /api/lists/[id]/items (actualizado para usar articleId en lugar de name)
- [x] POST /api/lists/[id]/items/from-store
- [x] Validaciones: articleId requerido, unique constraint, verificar existencia
- [x] Incluir relaciones con article y store en respuestas
- [x] Actualizar frontend para usar nuevos endpoints
- [ ] Tests (pendiente)

### Fase 9: Gestión de Listas de Compra ✅ COMPLETA
- [x] GET /api/lists (listar propias y compartidas)
- [x] POST /api/lists (crear lista)
- [x] GET /api/lists/[id] (obtener con items y shares)
- [x] PUT /api/lists/[id] (actualizar nombre, descripción)
- [x] DELETE /api/lists/[id] (eliminar, solo owner)
- [x] POST /api/lists/[id]/share (compartir con usuario)
- [x] DELETE /api/lists/[id]/share/[userId] (remover acceso)
- [x] Validaciones Zod implementadas
- [x] Permisos y control de acceso implementados
- [ ] Tests (pendiente)

### Fase 10: Gestión Avanzada de Ítems ✅ COMPLETA
- [x] PUT /api/lists/[id]/items/[itemId] (soporta purchasedQuantity, price, purchasedAt, storeId)
- [x] Validaciones: purchasedQuantity <= quantity
- [x] Incluir relaciones con article y store en respuestas
- [x] Lógica de compra: actualizar purchasedAt automáticamente
- [ ] Tests (pendiente)

### Fase 11: Estados y Plantillas de Listas ✅ COMPLETA
- [x] PUT /api/lists/[id] (permite cambiar status)
- [x] Calcular totalCost automáticamente al completar
- [x] POST /api/lists?fromTemplate=[id] (crear desde plantilla)
- [x] PUT /api/lists/[id] (marcar como plantilla)
- [x] Validaciones de estados y transiciones
- [ ] Tests (pendiente)

### Fase 12: Historial y Estadísticas
- [ ] GET /api/lists?status=completed (listar completadas)
- [ ] GET /api/stats/purchases (estadísticas agregadas)
- [ ] Comparación de precios históricos (futuro)
- [ ] Tests (pendiente)

### Fase 13: Gestión de Recetas
- [ ] Schema Prisma: Agregar modelos Recipe y RecipeIngredient
- [ ] POST /api/recipes (crear receta)
- [ ] GET /api/recipes (listar recetas)
- [ ] GET /api/recipes/[id] (obtener receta)
- [ ] PUT /api/recipes/[id] (actualizar receta)
- [ ] DELETE /api/recipes/[id] (eliminar receta)
- [ ] GET /api/recipes/[id]/ingredients (listar ingredientes)
- [ ] POST /api/recipes/[id]/ingredients (agregar ingrediente)
- [ ] PUT /api/recipes/[id]/ingredients/[ingredientId] (actualizar ingrediente)
- [ ] DELETE /api/recipes/[id]/ingredients/[ingredientId] (eliminar ingrediente)
- [ ] Frontend: Listar y ver recetas
- [ ] Frontend: Crear/editar recetas
- [ ] Tests (pendiente)

### Fase 14: Convertir Receta a Lista de Compra
- [ ] POST /api/lists?fromRecipe=[recipeId] (crear lista desde receta)
- [ ] GET /api/recipes/[id]/ingredients/[ingredientId]/articles (obtener artículos para producto)
- [ ] Frontend: Selector de artículos al convertir receta
- [ ] Frontend: Ajuste de cantidades y porciones
- [ ] Validaciones: todos los productos deben tener artículo seleccionado
- [ ] Tests (pendiente)

---

## 🎯 Métricas de Éxito

- ✅ Todos los endpoints implementados y funcionando
- ✅ Validaciones completas en todos los endpoints
- ✅ Tests con cobertura > 80%
- ✅ Documentación de APIs completa
- ✅ Performance: respuestas < 200ms para listas
- ✅ Sin errores de integridad referencial

---

Este plan de desarrollo proporciona una hoja de ruta clara para implementar todos los requisitos funcionales del sistema Mealmoti, siguiendo la arquitectura definida y respetando el dominio del negocio.

