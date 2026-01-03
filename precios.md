Revisando cómo se manejan los precios en el código:


[5 tools called]


Revisando cómo se muestran y usan los precios en el frontend:


[5 tools called]


## Estado actual del sistema de precios

### 1. **Artículo (`Article`) - Precio orientativo**
- Campo: `suggestedPrice` (Float?, opcional)
- Ubicación: `prisma/schema.prisma` línea 111
- Propósito: Precio orientativo/referencia del artículo
- Uso:
  - Se muestra como "Precio sugerido" en la página de detalle del artículo
  - Se muestra en búsquedas de artículos
  - No se usa para cálculos de compra

### 2. **Artículo en Comercio (`ArticleStore`) - Precio por comercio**
- Campo: `price` (Float?, opcional)
- Ubicación: `prisma/schema.prisma` línea 174
- Propósito: Precio del artículo en un comercio específico
- Uso:
  - Se asocia a un artículo y un comercio
  - Puede variar por comercio
  - Se muestra en la página de detalle del artículo
  - No se usa directamente en listas de compra

### 3. **Item (`Item`) - Precio real de compra**
- Campo: `price` (Float?, opcional) - comentado como "Precio de compra real"
- Ubicación: `prisma/schema.prisma` línea 223
- Propósito: Precio real pagado al comprar el item
- Uso:
  - Se edita en el componente `ListItem.tsx` cuando el item está marcado como comprado
  - Se muestra en la lista: `€{price.toFixed(2)} × ${purchasedQuantity} = €${(price * purchasedQuantity).toFixed(2)}`
  - Se usa para calcular el total de la compra

### 4. **PurchaseItem - Precio unitario en compra registrada**
- Campo: `price` (Float, requerido) - "Precio unitario pagado"
- Ubicación: `prisma/schema.prisma` línea 273
- Propósito: Precio unitario pagado en una compra registrada (historial)
- Uso:
  - Se guarda cuando se registra una compra completa
  - Se usa para estadísticas y comparaciones de precios
  - Se calcula el `subtotal = purchasedQuantity * price`

## Flujo actual

1. Al crear un artículo: se puede establecer un `suggestedPrice` (orientativo).
2. Al asociar un artículo a un comercio: se puede establecer un `price` específico para ese comercio.
3. Al agregar un artículo a una lista: se crea un `Item` sin precio inicial.
4. Al marcar un item como comprado: se puede editar el `price` del item (precio real pagado).
5. Al registrar una compra: se crean `PurchaseItem` con el precio unitario para el historial.

## Observaciones

1. El `suggestedPrice` del artículo es orientativo y no se usa en cálculos.
2. El `price` de `ArticleStore` es por comercio pero no se transfiere automáticamente al item.
3. El `price` del `Item` se introduce manualmente al comprar.
4. No hay conexión automática entre el precio del comercio y el precio del item.

¿Quieres que proponga mejoras para clarificar y automatizar este flujo?