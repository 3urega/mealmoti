import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Iniciando migración de unidades...\n');

  // Primero, crear las unidades si no existen
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

  console.log('✅ Unidades creadas/verificadas\n');

  // Función para mapear string a unitId
  const mapUnitToId = (unit: string | null): string => {
    if (!unit) return unitUnidades.id;
    
    const unitLower = unit.toLowerCase().trim();
    
    // Mapear variaciones comunes
    if (unitLower.includes('kg') || unitLower.includes('kilogramo')) {
      return unitKg.id;
    }
    if (unitLower.includes('gr') || unitLower.includes('g ') || unitLower === 'g' || unitLower.includes('gramo')) {
      return unitGr.id;
    }
    // Por defecto, unidades
    return unitUnidades.id;
  };

  // Migrar Items - usar raw query porque unit ya no existe en el tipo
  console.log('📦 Migrando Items...');
  const items = await prisma.$queryRaw<Array<{ id: string; unit: string | null }>>`
    SELECT id, unit FROM "Item" WHERE "unitId" IS NULL
  `;

  for (const item of items) {
    const unitId = mapUnitToId(item.unit);
    await prisma.item.update({
      where: { id: item.id },
      data: { unitId },
    });
    console.log(`   ✓ Item ${item.id}: "${item.unit || 'null'}" -> ${unitId}`);
  }

  console.log(`✅ ${items.length} items migrados\n`);

  // Migrar RecipeIngredients
  console.log('📝 Migrando RecipeIngredients...');
  const recipeIngredients = await prisma.$queryRaw<Array<{ id: string; unit: string | null }>>`
    SELECT id, unit FROM "RecipeIngredient" WHERE "unitId" IS NULL
  `;

  for (const ingredient of recipeIngredients) {
    const unitId = mapUnitToId(ingredient.unit);
    await prisma.recipeIngredient.update({
      where: { id: ingredient.id },
      data: { unitId },
    });
    console.log(`   ✓ RecipeIngredient ${ingredient.id}: "${ingredient.unit || 'null'}" -> ${unitId}`);
  }

  console.log(`✅ ${recipeIngredients.length} recipe ingredients migrados\n`);

  console.log('🎉 Migración completada exitosamente!');
}

main()
  .catch((e) => {
    console.error('❌ Error en migración:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

