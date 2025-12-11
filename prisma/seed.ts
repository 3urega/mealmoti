import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../lib/auth';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed de base de datos...\n');

  // Crear unidades base
  const unitKg = await prisma.unit.upsert({
    where: { id: 'unit-kg' },
    update: {},
    create: {
      id: 'unit-kg',
      name: 'kilogramos',
      symbol: 'kg',
      description: 'Kilogramos',
    },
  });

  const unitUnidades = await prisma.unit.upsert({
    where: { id: 'unit-unidades' },
    update: {},
    create: {
      id: 'unit-unidades',
      name: 'unidades',
      symbol: 'un',
      description: 'Unidades o piezas',
    },
  });

  const unitGr = await prisma.unit.upsert({
    where: { id: 'unit-gr' },
    update: {},
    create: {
      id: 'unit-gr',
      name: 'gramos',
      symbol: 'gr',
      description: 'Gramos',
    },
  });

  console.log('✅ Unidades creadas:', [unitKg.symbol, unitUnidades.symbol, unitGr.symbol].join(', '));

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

  console.log('✅ Usuario de prueba creado:');
  console.log('   Email: test@mealmoti.com');
  console.log('   Contraseña: password123\n');

  // Crear productos de ejemplo
  const productLeche = await prisma.product.upsert({
    where: { id: 'product-leche' },
    update: {},
    create: {
      id: 'product-leche',
      name: 'Leche',
      description: 'Producto lácteo',
      isGeneral: true,
    },
  });

  const productPan = await prisma.product.upsert({
    where: { id: 'product-pan' },
    update: {},
    create: {
      id: 'product-pan',
      name: 'Pan',
      description: 'Producto de panadería',
      isGeneral: true,
    },
  });

  const productHuevos = await prisma.product.upsert({
    where: { id: 'product-huevos' },
    update: {},
    create: {
      id: 'product-huevos',
      name: 'Huevos',
      description: 'Huevos de gallina',
      isGeneral: true,
    },
  });

  const productTomates = await prisma.product.upsert({
    where: { id: 'product-tomates' },
    update: {},
    create: {
      id: 'product-tomates',
      name: 'Tomates',
      description: 'Tomates frescos',
      isGeneral: true,
    },
  });

  console.log('✅ Productos creados:', [productLeche.name, productPan.name, productHuevos.name, productTomates.name].join(', '));

  // Crear familias de productos predefinidas (generales)
  const families = [
    { id: 'family-yogur', name: 'Yogur', description: 'Productos lácteos fermentados' },
    { id: 'family-carne', name: 'Carne', description: 'Carnes y derivados' },
    { id: 'family-pescado', name: 'Pescado', description: 'Pescados y mariscos' },
    { id: 'family-frutas', name: 'Frutas', description: 'Frutas frescas' },
    { id: 'family-verduras', name: 'Verduras', description: 'Verduras y hortalizas' },
    { id: 'family-lacteos', name: 'Lácteos', description: 'Productos lácteos' },
    { id: 'family-panaderia', name: 'Panadería', description: 'Productos de panadería' },
    { id: 'family-bebidas', name: 'Bebidas', description: 'Bebidas y refrescos' },
    { id: 'family-cereales', name: 'Cereales', description: 'Cereales y granos' },
    { id: 'family-aceites', name: 'Aceites', description: 'Aceites y grasas' },
  ];

  const createdFamilies = [];
  for (const family of families) {
    const created = await prisma.productFamily.upsert({
      where: { id: family.id },
      update: {},
      create: {
        id: family.id,
        name: family.name,
        description: family.description,
        isGeneral: true,
      },
    });
    createdFamilies.push(created);
  }

  console.log('✅ Familias de productos creadas:', createdFamilies.map(f => f.name).join(', '));

  // Crear artículos de ejemplo
  const articleLeche = await prisma.article.upsert({
    where: { id: 'article-leche' },
    update: {},
    create: {
      id: 'article-leche',
      name: 'Leche entera',
      productId: productLeche.id,
      brand: 'genérico',
      variant: 'entera',
      suggestedPrice: 1.20,
      isGeneral: true,
    },
  });

  const articlePan = await prisma.article.upsert({
    where: { id: 'article-pan' },
    update: {},
    create: {
      id: 'article-pan',
      name: 'Pan de molde',
      productId: productPan.id,
      brand: 'genérico',
      variant: 'de molde',
      suggestedPrice: 0.95,
      isGeneral: true,
    },
  });

  const articleHuevos = await prisma.article.upsert({
    where: { id: 'article-huevos' },
    update: {},
    create: {
      id: 'article-huevos',
      name: 'Huevos de gallina',
      productId: productHuevos.id,
      brand: 'genérico',
      variant: 'talla L',
      suggestedPrice: 2.50,
      isGeneral: true,
    },
  });

  const articleTomates = await prisma.article.upsert({
    where: { id: 'article-tomates' },
    update: {},
    create: {
      id: 'article-tomates',
      name: 'Tomates pera',
      productId: productTomates.id,
      brand: 'genérico',
      variant: 'pera',
      suggestedPrice: 2.80,
      isGeneral: true,
    },
  });

  console.log('✅ Artículos creados:', [articleLeche.name, articlePan.name, articleHuevos.name, articleTomates.name].join(', '));

  // Crear una lista de ejemplo con algunos items (solo si no existe)
  const existingList = await prisma.shoppingList.findFirst({
    where: {
      ownerId: user.id,
      name: 'Compra Semanal',
    },
  });

  if (!existingList) {
    const list = await prisma.shoppingList.create({
      data: {
        name: 'Compra Semanal',
        description: 'Lista de ejemplo para desarrollo',
        ownerId: user.id,
        status: 'active',
        items: {
          create: [
            {
              articleId: articleLeche.id,
              quantity: 2,
              unitId: unitUnidades.id, // 2 unidades de leche
              checked: false,
              addedById: user.id,
            },
            {
              articleId: articlePan.id,
              quantity: 1,
              unitId: unitUnidades.id,
              checked: true,
              price: 0.95,
              purchasedQuantity: 1,
              addedById: user.id,
            },
            {
              articleId: articleHuevos.id,
              quantity: 12,
              unitId: unitUnidades.id,
              checked: false,
              addedById: user.id,
            },
            {
              articleId: articleTomates.id,
              quantity: 500,
              unitId: unitGr.id,
              checked: false,
              notes: 'Bien maduros',
              addedById: user.id,
            },
          ],
        },
      },
      include: {
        items: {
          include: {
            article: {
              include: {
                product: true,
              },
            },
          },
        },
      },
    });

    console.log('\n✅ Lista de ejemplo creada:');
    console.log(`   Nombre: ${list.name}`);
    console.log(`   Estado: ${list.status}`);
    console.log(`   Items: ${list.items.length}`);
    console.log(`   Items comprados: ${list.items.filter((i: typeof list.items[0]) => i.checked).length}\n`);
  } else {
    console.log('ℹ️  Lista de ejemplo ya existe, omitiendo creación\n');
  }

  // Crear algunos ingredientes de ejemplo
  const ingredientAzucar = await prisma.ingredient.upsert({
    where: { id: 'ingredient-azucar' },
    update: {},
    create: {
      id: 'ingredient-azucar',
      name: 'Azúcar',
      type: 'generic',
      description: 'Azúcar común',
    },
  });

  const ingredientSal = await prisma.ingredient.upsert({
    where: { id: 'ingredient-sal' },
    update: {},
    create: {
      id: 'ingredient-sal',
      name: 'Sal',
      type: 'generic',
      description: 'Sal común',
    },
  });

  console.log('✅ Ingredientes creados:', [ingredientAzucar.name, ingredientSal.name].join(', '));

  // Crear store "Genérico" por defecto
  const storeGenerico = await prisma.store.upsert({
    where: { id: 'store-generico' },
    update: {},
    create: {
      id: 'store-generico',
      name: 'Genérico',
      type: 'other',
      isGeneral: true,
    },
  });

  console.log('✅ Store genérico creado:', storeGenerico.name);

  // Crear un comercio de ejemplo
  const storeMercadona = await prisma.store.upsert({
    where: { id: 'store-mercadona' },
    update: {},
    create: {
      id: 'store-mercadona',
      name: 'Mercadona',
      type: 'supermarket',
      address: 'Calle Principal 123',
      isGeneral: true,
    },
  });

  console.log('✅ Comercio creado:', storeMercadona.name);

  // Asociar algunos artículos al comercio
  await prisma.articleStore.upsert({
    where: {
      articleId_storeId: {
        articleId: articleLeche.id,
        storeId: storeMercadona.id,
      },
    },
    update: {},
    create: {
      articleId: articleLeche.id,
      storeId: storeMercadona.id,
      price: 1.15,
      available: true,
    },
  });

  await prisma.articleStore.upsert({
    where: {
      articleId_storeId: {
        articleId: articlePan.id,
        storeId: storeMercadona.id,
      },
    },
    update: {},
    create: {
      articleId: articlePan.id,
      storeId: storeMercadona.id,
      price: 0.90,
      available: true,
    },
  });

  console.log('✅ Artículos asociados a comercio\n');

  console.log('🎉 Seed completado exitosamente!');
  console.log('\n📝 Credenciales para desarrollo:');
  console.log('   Email: test@mealmoti.com');
  console.log('   Contraseña: password123');
  console.log('\n📦 Datos creados:');
  console.log('   - 4 Productos');
  console.log('   - 4 Artículos');
  console.log('   - 1 Lista de compra con 4 ítems');
  console.log('   - 2 Ingredientes');
  console.log('   - 1 Comercio');
  console.log(`   - ${createdFamilies.length} Familias de productos`);
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

