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

### 🎯 Siguiente Paso
- **Fase 3: Gestión de Artículos (Marcas)**
  - Pendiente: Implementar todas las APIs y crear frontend

### 📋 Requisitos a Implementar

1. Añadir ingrediente
2. Crear producto
3. Crear/asignar marca a un producto
4. Asignar/editar ingredientes de una marca
5. Crear comercio/tienda
6. Asignar una/varias marca/s a un comercio
7. Asignar precio a una marca para un comercio
8. Recuperar marcas a partir de un producto
9. Crear ítem a partir de una relación (marca/comercio)

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
Permitir crear ítems en listas de compra a partir de un artículo y opcionalmente un comercio.

### Tareas

#### 8.1 API: Crear Ítem desde Artículo
**Endpoint:** `POST /api/lists/[id]/items`

**Funcionalidad:**
- Crear un ítem en una lista de compra a partir de un artículo
- Opcionalmente puede incluir el comercio donde se comprará

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
- `articleId`: requerido, debe existir
- `quantity`: requerido, debe ser un número positivo
- `unit`: opcional, default "unidades"
- `storeId`: opcional, si se proporciona debe existir y el artículo debe estar disponible en ese comercio
- Un artículo solo puede aparecer una vez por lista (unique constraint)

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
    }
  }
}
```

#### 8.2 API: Crear Ítem desde Artículo-Comercio (Endpoint Alternativo)
**Endpoint:** `POST /api/lists/[id]/items/from-store`

**Funcionalidad:**
- Crear ítem específicamente desde la relación artículo-comercio
- Útil cuando se selecciona desde la vista de comercio

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
- `storeId`: requerido en este endpoint
- Verificar que el artículo esté disponible en el comercio
- Usar el precio del comercio como referencia (no se asigna automáticamente, se asigna al comprar)

#### 8.3 Mejora: Sugerir Precio al Crear Ítem
**Funcionalidad:**
- Si se proporciona `storeId`, sugerir el precio del `ArticleStore`
- El precio real se establece al marcar como comprado

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

### Fase 3: Artículos (Marcas)
- `POST /api/articles` - Crear artículo
- `GET /api/articles` - Listar artículos
- `GET /api/articles/[id]` - Obtener artículo
- `PUT /api/articles/[id]` - Actualizar artículo
- `DELETE /api/articles/[id]` - Eliminar artículo

### Fase 4: Ingredientes de Artículos
- `POST /api/articles/[id]/ingredients` - Asignar ingredientes
- `PUT /api/articles/[id]/ingredients/[ingredientId]` - Actualizar ingrediente
- `DELETE /api/articles/[id]/ingredients/[ingredientId]` - Eliminar ingrediente
- `GET /api/articles/[id]/ingredients` - Listar ingredientes

### Fase 5: Comercios
- `POST /api/stores` - Crear comercio
- `GET /api/stores` - Listar comercios
- `GET /api/stores/[id]` - Obtener comercio
- `PUT /api/stores/[id]` - Actualizar comercio
- `DELETE /api/stores/[id]` - Eliminar comercio

### Fase 6: Artículos en Comercios
- `POST /api/articles/[id]/stores` - Asignar artículo a comercio
- `PUT /api/articles/[id]/stores/[storeId]` - Actualizar precio/disponibilidad
- `DELETE /api/articles/[id]/stores/[storeId]` - Eliminar asociación
- `GET /api/articles/[id]/stores` - Listar comercios del artículo
- `GET /api/stores/[id]/articles` - Listar artículos del comercio

### Fase 7: Artículos por Producto
- `GET /api/products/[id]/articles` - Obtener artículos de un producto

### Fase 8: Crear Ítem
- `POST /api/lists/[id]/items` - Crear ítem desde artículo
- `POST /api/lists/[id]/items/from-store` - Crear ítem desde artículo-comercio

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
3. Fase 3: Gestión de Artículos
4. Fase 4: Ingredientes de Artículos

### Sprint 3: Comercios
5. Fase 5: Gestión de Comercios
6. Fase 6: Artículos en Comercios

### Sprint 4: Integración
7. Fase 7: Recuperar Artículos por Producto
8. Fase 8: Crear Ítem desde Artículo-Comercio

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

### Fase 3: Artículos
- [ ] POST /api/articles
- [ ] GET /api/articles
- [ ] GET /api/articles/[id]
- [ ] PUT /api/articles/[id]
- [ ] DELETE /api/articles/[id]
- [ ] Validaciones y tests

### Fase 4: Ingredientes de Artículos
- [ ] POST /api/articles/[id]/ingredients
- [ ] PUT /api/articles/[id]/ingredients/[ingredientId]
- [ ] DELETE /api/articles/[id]/ingredients/[ingredientId]
- [ ] GET /api/articles/[id]/ingredients
- [ ] Validaciones y tests

### Fase 5: Comercios
- [ ] POST /api/stores
- [ ] GET /api/stores
- [ ] GET /api/stores/[id]
- [ ] PUT /api/stores/[id]
- [ ] DELETE /api/stores/[id]
- [ ] Validaciones y tests

### Fase 6: Artículos en Comercios
- [ ] POST /api/articles/[id]/stores
- [ ] PUT /api/articles/[id]/stores/[storeId]
- [ ] DELETE /api/articles/[id]/stores/[storeId]
- [ ] GET /api/articles/[id]/stores
- [ ] GET /api/stores/[id]/articles
- [ ] Validaciones y tests

### Fase 7: Artículos por Producto
- [ ] GET /api/products/[id]/articles
- [ ] Integración en GET /api/products/[id]
- [ ] Validaciones y tests

### Fase 8: Crear Ítem
- [ ] POST /api/lists/[id]/items (actualizar para usar articleId)
- [ ] POST /api/lists/[id]/items/from-store
- [ ] Validaciones y tests
- [ ] Actualizar frontend para usar nuevos endpoints

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

