'use client';

import Link from 'next/link';

interface ShoppingListCardProps {
  id: string;
  name: string;
  description?: string | null;
  itemCount: number;
  completedCount: number;
  isOwner: boolean;
}

export default function ShoppingListCard({
  id,
  name,
  description,
  itemCount,
  completedCount,
  isOwner,
}: ShoppingListCardProps) {
  const progress = itemCount > 0 ? (completedCount / itemCount) * 100 : 0;

  return (
    <Link href={`/app/lists/${id}`}>
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900">{name}</h3>
            {description && (
              <p className="mt-1 text-sm text-gray-600">{description}</p>
            )}
            <div className="mt-4 flex items-center gap-4 text-sm text-gray-500">
              <span>
                {completedCount} de {itemCount} items completados
              </span>
              {!isOwner && (
                <span className="rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-800">
                  Compartida
                </span>
              )}
            </div>
          </div>
        </div>
        {itemCount > 0 && (
          <div className="mt-4">
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full bg-blue-600 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </Link>
  );
}



