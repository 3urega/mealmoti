# Definición de los conceptos del dominio

Este documento describe la lógica de negocio real implementada en Mealmoti.

---

## Taxonomía de clasificación de productos (3 niveles jerárquicos)

Los productos se organizan mediante una estructura de **Familia → Subfamilia → Variedad**. Un producto puede estar asignado a una o varias familias, subfamilias y variedades (relaciones muchos-a-muchos).

### Familia (ProductFamily)

- **Nivel**: 1 (más alto)
- **Descripción**: Categoría amplia de productos alimentarios (ej: Lácteos, Carnes, Panadería)
- **Dependencias**: Ninguna. Es el nivel raíz de la taxonomía
- **Contiene**: Subfamilias
- **Visibilidad**: `isGeneral` (general = todos los usuarios; particular = solo el creador)
- **Unicidad**: `[name, isGeneral, createdById]`

### Subfamilia (ProductSubfamily)

- **Nivel**: 2
- **Descripción**: Subcategoría dentro de una familia (ej: dentro de Lácteos → Leche, Quesos, Yogures)
- **Dependencias**: Pertenece a una Familia (`familyId`)
- **Hereda**: `isGeneral` de la familia padre
- **Contiene**: Variedades
- **Unicidad**: `[name, familyId]`

### Variedad (ProductVariety)

- **Nivel**: 3 (más específico)
- **Descripción**: Variante concreta dentro de una subfamilia (ej: dentro de Leche → Entera, Desnatada, Semidesnatada)
- **Dependencias**: Pertenece a una Subfamilia (`subfamilyId`)
- **Hereda**: `isGeneral` de la subfamilia → familia
- **Unicidad**: `[name, subfamilyId]`

### Diagrama de la taxonomía

```
ProductFamily (ej: Lácteos)
  └── ProductSubfamily (ej: Leche)
        └── ProductVariety (ej: Entera, Desnatada)
```

---

## Producto (Product)

Concepto genérico que agrupa alimentos con propiedades comunes significativas.

**Ejemplos**: Tortillas, Pan, Anchoas, Paella marinera, Helado de vainilla

### Características

- **Clasificación**: Un producto puede estar asignado a varias familias, subfamilias y variedades simultáneamente (many-to-many)
- **Tags**: Además puede tener ProductTags (etiquetas planas, no jerárquicas)
- **Relación con artículos**: Un producto tiene muchos artículos; cada artículo pertenece a un único producto
- **Visibilidad**: `isGeneral` (general = todos; particular = solo el creador)

### Relaciones

| Relación | Tipo | Descripción |
|----------|------|-------------|
| articles | 1:N | Artículos que son variantes de este producto |
| families | N:M | Familias a las que pertenece |
| subfamilies | N:M | Subfamilias a las que pertenece |
| varieties | N:M | Variedades a las que pertenece |
| tags | N:M | Etiquetas asociadas |
| ingredients | N:M | Ingredientes que componen el producto |

### Nota sobre recetas

Un producto puede aparecer en una receta como ingrediente. Al pasar la receta a la lista de la compra, debe especificarse qué artículos concretos se van a comprar, ya que **solo los artículos** pueden estar en la lista.

---

## Artículo (Article)

Variante específica de un producto que responde a: ¿cuánto cuesta?, ¿dónde lo compro?, ¿qué ingredientes tiene?, ¿de qué marca es?

**Ejemplos**:
- Tortillas de maíz → Tortillas de maíz Hacendado o Tortillas de maíz (genérico)
- Pan de molde → Pan de molde integral Bimbo
- Anchoas → Anchoas en lata del Cantábrico

### Características

- **Producto**: Cada artículo pertenece a un único producto
- **Marca**: Siempre tiene marca; por defecto "genérico"
- **Variant**: Especificación adicional (ej: "5L", "integral", "500g")
- **weightInGrams**: Peso del contenido en gramos
- **suggestedPrice**: Precio orientativo (no es el precio de compra real)
- **Visibilidad**: `isGeneral` (particular = solo el creador; general = todos)

### Relaciones

| Relación | Descripción |
|----------|-------------|
| product | Producto al que pertenece |
| items | Apariciones en listas de la compra |
| stores | Comercios donde se encuentra (ArticleStore, con precio y disponibilidad) |
| ingredients | Ingredientes del artículo (pueden diferir entre artículos del mismo producto) |

### Regla importante

Un artículo es lo que aparece en la lista de la compra. **Solo los artículos** pueden estar en listas de compra, nunca los productos directamente.

---

## Ingrediente (Ingredient)

Unidad mínima de composición. Puede ser:
- **chemical**: Sustancias que aparecen en el envase (E-355, grasas saturadas…)
- **generic**: Ingredientes genéricos (sémola, azúcar, carne de cerdo…)
- **product**: Referencia a un producto cuando el ingrediente es un producto completo

### Dónde se usan

- **ProductIngredient**: Los productos pueden tener ingredientes (composición típica)
- **ArticleIngredient**: Los artículos tienen sus propios ingredientes (pueden diferir entre artículos del mismo producto)

**Ejemplo**: Sopa deshidratada como producto; dos marcas (artículos) pueden tener ingredientes distintos (una lleva zanahoria, otra no).

---

## Item (Item de lista)

Representación de un artículo dentro de una lista de la compra.

### Características

- **Relación**: Un item referencia un artículo y una lista (unívoco)
- **Regla**: Un artículo solo puede aparecer una vez por lista (`@@unique([shoppingListId, articleId])`)
- **quantity**: Cantidad a comprar
- **unitId**: Unidad de medida
- **price**: Precio real de compra (cuando se compra)
- **purchasedQuantity**: Cantidad realmente comprada
- **checked**: Estado comprado / no comprado
- **storeId**: Comercio donde se compró
- **purchasedAt**: Fecha de compra

### Flujo

Artículo → Item (en lista) → PurchaseItem (cuando se registra la compra)

---

## Lista de compra (ShoppingList)

Conjunto de ítems que representan artículos a comprar, con estado comprado/no comprado.

### Características

- **Estados**: draft, active, completed, archived, periodica, disused
- **Plantillas**: `isTemplate` permite usar listas como base para compras repetidas
- **Recetas**: `recipeId` permite crear listas desde una receta
- **Compartir**: Via ShoppingListShare con permisos (canEdit)
- **Historial**: Purchase registra cada compra realizada

---

## Comercio (Store)

Lugar donde se compran artículos. Los artículos pueden estar asociados a comercios (ArticleStore) con precio y disponibilidad. Los ítems pueden indicar en qué comercio se compró.

---

## Unidad (Unit)

Unidades de medida (kg, gr, unidades, etc.) usadas en ítems, recetas e ingredientes.

---

## Receta (Recipe)

Conjunto de ingredientes (RecipeIngredient) que pueden referenciar productos o artículos específicos. Al pasar a lista de compra, el usuario elige qué artículos concretos usar (RecipeArticleSelection).

---

## ProductTag

Etiquetas planas para productos (independientes de la taxonomía Familia/Subfamilia/Variedad). Un producto puede tener múltiples tags.

---

## Visibilidad: general vs particular

Varios conceptos comparten la distinción:
- **general**: Visible y usable por todos los usuarios
- **particular**: Creado por un usuario, solo él puede verlo y usarlo

Aplica a: Product, Article, ProductFamily, ProductTag, Store
