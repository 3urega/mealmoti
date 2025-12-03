# Guía de Migración a la Nueva Arquitectura

Este documento explica cómo migrar desde la estructura actual (con `ListItem`) a la nueva arquitectura completa (con `Product`, `Article`, `Item`).

## ⚠️ Importante

**Esta migración requiere atención especial** porque cambia la estructura fundamental de los datos. Se recomienda:

1. **Hacer backup de la base de datos** antes de proceder
2. **Probar en un entorno de desarrollo** primero
3. **Migrar los datos existentes** antes de eliminar las tablas antiguas

## 📋 Cambios Principales

### Estructura Antigua
- `ListItem` con campo `name` (texto libre)
- `ShoppingList` sin estado ni plantillas

### Estructura Nueva
- `Product` → `Article` → `Item` (jerarquía completa)
- `ShoppingList` con `status`, `statusDate`, `totalCost`, `isTemplate`, `templateId`
- Nuevas entidades: `Ingredient`, `Store`, `ArticleStore`, etc.

## 🔄 Proceso de Migración

### Opción 1: Migración con Datos Existentes (Recomendado)

Si tienes datos en producción que quieres preservar:

#### Paso 1: Backup de la Base de Datos

```bash
# Crear backup
pg_dump -U postgres mealmoti > backup_antes_migracion.sql
```

#### Paso 2: Crear Script de Migración de Datos

Crear un script temporal `prisma/migrate-data.ts`:

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateData() {
  console.log('🔄 Iniciando migración de datos...\n');

  // 1. Obtener todos los ListItem existentes
  const oldItems = await prisma.listItem.findMany({
    include: {
      shoppingList: true,
    },
  });

  console.log(`📦 Encontrados ${oldItems.length} ítems antiguos\n`);

  // 2. Agrupar por nombre único para crear productos y artículos
  const uniqueNames = [...new Set(oldItems.map(item => item.name))];
  
  console.log(`📝 Creando ${uniqueNames.length} productos y artículos...\n`);

  for (const name of uniqueNames) {
    // Crear producto genérico
    const product = await prisma.product.upsert({
      where: { id: `migrated-product-${name.toLowerCase().replace(/\s+/g, '-')}` },
      update: {},
      create: {
        id: `migrated-product-${name.toLowerCase().replace(/\s+/g, '-')}`,
        name: name,
        isGeneral: true,
      },
    });

    // Crear artículo genérico para ese producto
    const article = await prisma.article.upsert({
      where: { id: `migrated-article-${name.toLowerCase().replace(/\s+/g, '-')}` },
      update: {},
      create: {
        id: `migrated-article-${name.toLowerCase().replace(/\s+/g, '-')}`,
        name: name,
        productId: product.id,
        brand: 'genérico',
        isGeneral: true,
      },
    });

    console.log(`✅ Creado: ${name} → Producto y Artículo`);
  }

  // 3. Migrar ShoppingList: agregar campos nuevos
  const lists = await prisma.shoppingList.findMany();
  
  for (const list of lists) {
    await prisma.shoppingList.update({
      where: { id: list.id },
      data: {
        status: 'active', // O 'completed' si todos los items están checked
        statusDate: list.updatedAt,
        isTemplate: false,
      },
    });
  }

  console.log(`\n✅ Actualizadas ${lists.length} listas de compra\n`);

  // 4. Migrar ListItem a Item
  console.log('🔄 Migrando ítems...\n');

  for (const oldItem of oldItems) {
    const articleId = `migrated-article-${oldItem.name.toLowerCase().replace(/\s+/g, '-')}`;
    
    // Verificar que el artículo existe
    const article = await prisma.article.findUnique({
      where: { id: articleId },
    });

    if (!article) {
      console.warn(`⚠️  Artículo no encontrado para: ${oldItem.name}`);
      continue;
    }

    // Convertir quantity de String a Float
    const quantity = oldItem.quantity ? parseFloat(oldItem.quantity) : 1;

    // Crear nuevo Item
    await prisma.item.create({
      data: {
        shoppingListId: oldItem.shoppingListId,
        articleId: article.id,
        quantity: quantity,
        unit: oldItem.unit || 'unidades',
        checked: oldItem.checked,
        notes: oldItem.notes,
        addedById: oldItem.addedById,
        // Si estaba checked, establecer purchasedQuantity
        purchasedQuantity: oldItem.checked ? quantity : null,
      },
    });
  }

  console.log(`✅ Migrados ${oldItems.length} ítems\n`);

  // 5. (Opcional) Eliminar tabla ListItem después de verificar
  // NO EJECUTAR hasta verificar que todo funciona correctamente
  // await prisma.$executeRaw`DROP TABLE IF EXISTS "ListItem" CASCADE;`;

  console.log('🎉 Migración completada!');
  console.log('\n⚠️  IMPORTANTE: Verifica que todos los datos se migraron correctamente');
  console.log('   antes de eliminar la tabla ListItem antigua.');
}

migrateData()
  .catch((e) => {
    console.error('❌ Error en migración:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

#### Paso 3: Aplicar Nuevo Schema

```bash
# Generar cliente de Prisma con nuevo schema
npm run db:generate

# Aplicar cambios (esto creará las nuevas tablas pero NO eliminará las antiguas)
npm run db:push
```

#### Paso 4: Ejecutar Script de Migración

```bash
# Ejecutar el script de migración de datos
tsx prisma/migrate-data.ts
```

#### Paso 5: Verificar Datos

```bash
# Abrir Prisma Studio para verificar
npm run db:studio
```

Verificar:
- ✅ Todos los productos y artículos creados
- ✅ Todos los ítems migrados correctamente
- ✅ Las listas tienen los nuevos campos

#### Paso 6: Eliminar Tabla Antigua (Solo después de verificar)

```bash
# Conectarse a PostgreSQL
psql -U postgres mealmoti

# Eliminar tabla antigua
DROP TABLE IF EXISTS "ListItem" CASCADE;

# Salir
\q
```

### Opción 2: Migración Limpia (Sin Datos)

Si no tienes datos importantes o quieres empezar desde cero:

#### Paso 1: Resetear Base de Datos

```bash
# Resetear completamente (CUIDADO: elimina todos los datos)
npx prisma migrate reset
```

#### Paso 2: Aplicar Nuevo Schema

```bash
# Generar cliente
npm run db:generate

# Crear migración inicial
npm run db:migrate
# Nombre: "init_new_architecture"

# O usar push para desarrollo
npm run db:push
```

#### Paso 3: Ejecutar Seed

```bash
npm run db:seed
```

## 🔍 Verificación Post-Migración

### Verificar Estructura

```bash
# Ver todas las tablas
psql -U postgres mealmoti -c "\dt"

# Deberías ver:
# - User
# - Product
# - Article
# - Ingredient
# - ProductIngredient
# - ArticleIngredient
# - Store
# - ArticleStore
# - ShoppingList
# - Item
# - ShoppingListShare
```

### Verificar Datos

```bash
# Contar registros
psql -U postgres mealmoti -c "
SELECT 
  (SELECT COUNT(*) FROM \"Product\") as products,
  (SELECT COUNT(*) FROM \"Article\") as articles,
  (SELECT COUNT(*) FROM \"Item\") as items,
  (SELECT COUNT(*) FROM \"ShoppingList\") as lists;
"
```

### Verificar Relaciones

```bash
# Verificar que los ítems apuntan a artículos válidos
psql -U postgres mealmoti -c "
SELECT COUNT(*) 
FROM \"Item\" i
LEFT JOIN \"Article\" a ON i.\"articleId\" = a.id
WHERE a.id IS NULL;
"
# Debe devolver 0 (ningún ítem huérfano)
```

## 🐛 Solución de Problemas

### Error: "Foreign key constraint fails"

- Verifica que todos los productos y artículos se crearon antes de migrar ítems
- Verifica que los IDs de artículos coinciden

### Error: "Unique constraint violation"

- Los artículos ya existen, el script debería usar `upsert` (ya incluido)

### Error: "Column does not exist"

- Verifica que el nuevo schema se aplicó correctamente
- Ejecuta `npm run db:generate` y `npm run db:push` nuevamente

### Datos Perdidos

- Restaura desde el backup: `psql -U postgres mealmoti < backup_antes_migracion.sql`
- Revisa los logs del script de migración

## 📝 Notas Importantes

1. **ListItem → Item**: El campo `quantity` cambió de `String?` a `Float` (requerido)
2. **Nuevos campos requeridos**: `Item` ahora requiere `articleId` y `quantity` (Float)
3. **Artículos genéricos**: Todos los artículos migrados tendrán marca "genérico"
4. **Productos genéricos**: Se crean productos genéricos para cada nombre único de ListItem

## ✅ Checklist de Migración

- [ ] Backup de base de datos creado
- [ ] Nuevo schema aplicado (`db:push` o `db:migrate`)
- [ ] Script de migración de datos ejecutado
- [ ] Datos verificados en Prisma Studio
- [ ] Relaciones verificadas (sin ítems huérfanos)
- [ ] Aplicación funciona correctamente
- [ ] Tabla `ListItem` antigua eliminada (solo después de verificar)

## 🚀 Después de la Migración

Una vez completada la migración:

1. Actualizar las APIs para usar `Article` en lugar de `name` en `ListItem`
2. Actualizar los componentes del frontend
3. Implementar las nuevas funcionalidades (productos, ingredientes, comercios)
4. Eliminar referencias al modelo antiguo `ListItem`

