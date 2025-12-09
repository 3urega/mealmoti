'use client';

import { ReactNode } from 'react';
import Link from 'next/link';

interface CategoryCardProps {
  title: string;
  description: string;
  count: number;
  color: string;
  icon?: ReactNode;
  href: string;
}

export default function CategoryCard({
  title,
  description,
  count,
  color,
  icon,
  href,
}: CategoryCardProps) {
  return (
    <Link href={href} className="block">
      <div
        className={`group relative overflow-hidden rounded-xl border-2 border-transparent bg-gradient-to-br ${color} p-6 shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl min-h-[160px] flex flex-col`}
      >
        {/* Overlay oscuro para mejorar contraste del texto */}
        <div className="absolute inset-0 bg-black/10 pointer-events-none" />
        
        <div className="relative z-10 flex flex-col h-full">
          <div className="mb-4 flex items-center justify-between">
            {icon && (
              <div className="rounded-lg bg-white/20 p-3 backdrop-blur-sm flex-shrink-0 shadow-md">
                {icon}
              </div>
            )}
            <div className="rounded-full bg-white/30 px-3 py-1.5 text-sm font-bold text-white backdrop-blur-sm flex-shrink-0 ml-auto shadow-md">
              {count}
            </div>
          </div>
          <div className="flex-1 flex flex-col justify-center">
            <h3 className="mb-2 text-2xl font-bold text-white drop-shadow-lg">
              {title || 'Sin título'}
            </h3>
            <p className="text-sm text-white/95 drop-shadow-md leading-relaxed">
              {description || 'Sin descripción'}
            </p>
          </div>
        </div>
        <div className="absolute inset-0 bg-gradient-to-br from-white/0 to-black/10 opacity-0 transition-opacity duration-300 group-hover:opacity-100 pointer-events-none" />
      </div>
    </Link>
  );
}

