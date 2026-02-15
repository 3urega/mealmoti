'use client';

interface ViewToggleProps {
  view: 'list' | 'grid';
  onViewChange: (view: 'list' | 'grid') => void;
}

export default function ViewToggle({ view, onViewChange }: ViewToggleProps) {
  return (
    <div className="inline-flex rounded-md border border-gray-300 bg-white shadow-sm">
      <button
        onClick={() => onViewChange('list')}
        className={`px-3 py-2 text-sm font-medium transition-colors ${
          view === 'list'
            ? 'bg-blue-600 text-white'
            : 'text-gray-700 hover:bg-gray-50'
        }`}
        title="Vista de lista"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </button>
      <button
        onClick={() => onViewChange('grid')}
        className={`px-3 py-2 text-sm font-medium transition-colors ${
          view === 'grid'
            ? 'bg-blue-600 text-white'
            : 'text-gray-700 hover:bg-gray-50'
        }`}
        title="Vista de grid"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
          />
        </svg>
      </button>
    </div>
  );
}

