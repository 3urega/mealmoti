'use client';

import { useState } from 'react';

interface ListItemProps {
  id: string;
  name: string;
  quantity?: string | null;
  unit?: string | null;
  checked: boolean;
  notes?: string | null;
  addedBy?: {
    id: string;
    name: string;
  } | null;
  canEdit: boolean;
  onUpdate: (id: string, updates: Partial<ListItemProps>) => void;
  onDelete: (id: string) => void;
}

export default function ListItem({
  id,
  name,
  quantity,
  unit,
  checked,
  notes,
  addedBy,
  canEdit,
  onUpdate,
  onDelete,
}: ListItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(name);
  const [editQuantity, setEditQuantity] = useState(quantity || '');
  const [editUnit, setEditUnit] = useState(unit || '');
  const [editNotes, setEditNotes] = useState(notes || '');
  const [updating, setUpdating] = useState(false);

  const handleToggleChecked = async () => {
    if (!canEdit) return;
    onUpdate(id, { checked: !checked });
  };

  const handleSave = async () => {
    if (!canEdit) return;
    setUpdating(true);
    onUpdate(id, {
      name: editName,
      quantity: editQuantity || undefined,
      unit: editUnit || undefined,
      notes: editNotes || undefined,
    });
    setIsEditing(false);
    setUpdating(false);
  };

  const handleDelete = () => {
    if (!canEdit) return;
    if (confirm('¿Estás seguro de eliminar este item?')) {
      onDelete(id);
    }
  };

  if (isEditing) {
    return (
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
        <div className="space-y-3">
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
            placeholder="Nombre del item"
          />
          <div className="flex gap-2">
            <input
              type="text"
              value={editQuantity}
              onChange={(e) => setEditQuantity(e.target.value)}
              className="flex-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
              placeholder="Cantidad"
            />
            <input
              type="text"
              value={editUnit}
              onChange={(e) => setEditUnit(e.target.value)}
              className="w-24 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
              placeholder="Unidad"
            />
          </div>
          <textarea
            value={editNotes}
            onChange={(e) => setEditNotes(e.target.value)}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
            placeholder="Notas (opcional)"
            rows={2}
          />
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={updating || !editName.trim()}
              className="rounded-md bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
            >
              Guardar
            </button>
            <button
              onClick={() => {
                setIsEditing(false);
                setEditName(name);
                setEditQuantity(quantity || '');
                setEditUnit(unit || '');
                setEditNotes(notes || '');
              }}
              className="rounded-md bg-gray-200 px-3 py-1 text-sm text-gray-700 hover:bg-gray-300"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex items-start gap-3 rounded-lg border border-gray-200 bg-white p-4 ${
        checked ? 'opacity-60' : ''
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={handleToggleChecked}
        disabled={!canEdit}
        className="mt-1 h-4 w-4 cursor-pointer rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:cursor-not-allowed"
      />
      <div className="flex-1">
        <div className="flex items-start justify-between">
          <div>
            <span
              className={`text-sm font-medium ${
                checked ? 'line-through text-gray-500' : 'text-gray-900'
              }`}
            >
              {name}
            </span>
            {(quantity || unit) && (
              <span className="ml-2 text-sm text-gray-500">
                {quantity} {unit}
              </span>
            )}
          </div>
          {canEdit && (
            <div className="flex gap-1">
              <button
                onClick={() => setIsEditing(true)}
                className="rounded px-2 py-1 text-xs text-gray-600 hover:bg-gray-100"
              >
                Editar
              </button>
              <button
                onClick={handleDelete}
                className="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50"
              >
                Eliminar
              </button>
            </div>
          )}
        </div>
        {notes && (
          <p className="mt-1 text-xs text-gray-500">{notes}</p>
        )}
        {addedBy && (
          <p className="mt-1 text-xs text-gray-400">
            Agregado por {addedBy.name}
          </p>
        )}
      </div>
    </div>
  );
}


