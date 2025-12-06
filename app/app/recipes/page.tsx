'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface RecipeIngredient {
  id: string;
  product: {
    id: string;
    name: string;
  };
  quantity: number;
  unit: string;
  isOptional: boolean;
  notes?: string | null;
}

interface Recipe {
  id: string;
  name: string;
  description?: string | null;
  servings?: number | null;
  ingredients: RecipeIngredient[];
  createdBy: {
    id: string;
    name: string;
  };
}

export default function RecipesPage() {
  const router = useRouter();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchRecipes();
  }, [search]);

  const fetchRecipes = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (search) {
        queryParams.append('search', search);
      }

      const res = await fetch(`/api/recipes?${queryParams.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setRecipes(data.recipes || []);
      }
    } catch (err) {
      console.error('Error fetching recipes:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-600">Cargando...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Recetas</h1>
        <Link
          href="/app/recipes/new"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Nueva Receta
        </Link>
      </div>

      <div className="mb-6">
        <input
          type="text"
          placeholder="Buscar recetas..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-md border border-gray-300 bg-white px-4 py-2 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
        />
      </div>

      {recipes.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
          <p className="text-gray-600">
            No hay recetas todavía. Crea tu primera receta para comenzar.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {recipes.map((recipe) => (
            <Link
              key={recipe.id}
              href={`/app/recipes/${recipe.id}`}
              className="group rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
            >
              <h3 className="mb-2 text-xl font-semibold text-gray-900 group-hover:text-blue-600">
                {recipe.name}
              </h3>
              {recipe.description && (
                <p className="mb-4 text-sm text-gray-600 line-clamp-2">
                  {recipe.description}
                </p>
              )}
              <div className="flex items-center justify-between text-sm text-gray-500">
                <span>
                  {recipe.ingredients.length}{' '}
                  {recipe.ingredients.length === 1
                    ? 'ingrediente'
                    : 'ingredientes'}
                </span>
                {recipe.servings && (
                  <span>{recipe.servings} porciones</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

