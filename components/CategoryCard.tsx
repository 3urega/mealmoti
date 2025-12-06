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
    <Link href={href}>
      <div
        className={`group relative overflow-hidden rounded-xl border-2 border-transparent bg-gradient-to-br ${color} p-6 shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl`}
      >
        <div className="relative z-10">
          <div className="mb-4 flex items-center justify-between">
            {icon && (
              <div className="rounded-lg bg-white/20 p-3 backdrop-blur-sm">
                {icon}
              </div>
            )}
            <div className="rounded-full bg-white/30 px-3 py-1 text-sm font-bold text-white backdrop-blur-sm">
              {count}
            </div>
          </div>
          <h3 className="mb-2 text-2xl font-bold text-white">{title}</h3>
          <p className="text-sm text-white/90">{description}</p>
        </div>
        <div className="absolute inset-0 bg-gradient-to-br from-white/0 to-black/10 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      </div>
    </Link>
  );
}

