'use client';

import { useState } from 'react';

interface Article {
  id: string;
  name: string;
  brand: string;
  variant?: string | null;
  product: {
    id: string;
    name: string;
  };
}

interface Store {
  id: string;
  name: string;
  type: string;
}

interface ListItemProps {
  id: string;
  articleId: string;
  article: Article;
  quantity: number;
  unit: string;
  checked: boolean;
  purchasedQuantity?: number | null;
  price?: number | null;
  purchasedAt?: string | null;
  storeId?: string | null;
  store?: Store | null;
  notes?: string | null;
  addedBy?: {
    id: string;
    name: string;
  } | null;
  canEdit: boolean;
  onUpdate: (id: string, updates: any) => void;
  onDelete: (id: string) => void;
}

export default function ListItem({
  id,
  article,
  quantity,
  unit,
  checked,
  purchasedQuantity,
  price,
  purchasedAt,
  store,
  notes,
  addedBy,
  canEdit,
  onUpdate,
  onDelete,
}: ListItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editQuantity, setEditQuantity] = useState(quantity.toString());
  const [editUnit, setEditUnit] = useState(unit || '');
  const [editPurchasedQuantity, setEditPurchasedQuantity] = useState(
    purchasedQuantity?.toString() || ''
  );
  const [editPrice, setEditPrice] = useState(price?.toString() || '');
  const [editNotes, setEditNotes] = useState(notes || '');
  const [updating, setUpdating] = useState(false);

  const handleToggleChecked = async () => {
    if (!canEdit) return;
    const newChecked = !checked;
    const updates: any = { checked: newChecked };
    if (newChecked && !purchasedAt) {
      updates.purchasedAt = new Date().toISOString();
    }
    onUpdate(id, updates);
  };

  const handleSave = async () => {
    if (!canEdit) return;
    setUpdating(true);

    const updates: any = {
      quantity: parseFloat(editQuantity) || quantity,
      unit: editUnit || unit,
      notes: editNotes || null,
    };

    if (editPurchasedQuantity) {
      updates.purchasedQuantity = parseFloat(editPurchasedQuantity);
    } else {
      updates.purchasedQuantity = null;
    }

    if (editPrice) {
      updates.price = parseFloat(editPrice);
    } else {
      updates.price = null;
    }

    onUpdate(id, updates);
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
          <div className="text-sm font-medium text-gray-900">
            {article.name} ({article.brand})
            <span className="ml-2 text-xs text-gray-500">
              {article.product.name}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-600">Cantidad</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={editQuantity}
                onChange={(e) => setEditQuantity(e.target.value)}
                className="w-full rounded-md border border-gray-300 bg-white px-2 py-1 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600">Unidad</label>
              <input
                type="text"
                value={editUnit}
                onChange={(e) => setEditUnit(e.target.value)}
                className="w-full rounded-md border border-gray-300 bg-white px-2 py-1 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
              />
            </div>
          </div>
          {checked && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-gray-600">
                  Cantidad comprada
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editPurchasedQuantity}
                  onChange={(e) => setEditPurchasedQuantity(e.target.value)}
                  className="w-full rounded-md border border-gray-300 bg-white px-2 py-1 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600">Precio (€)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editPrice}
                  onChange={(e) => setEditPrice(e.target.value)}
                  className="w-full rounded-md border border-gray-300 bg-white px-2 py-1 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                />
              </div>
            </div>
          )}
          <textarea
            value={editNotes}
            onChange={(e) => setEditNotes(e.target.value)}
            className="w-full rounded-md border border-gray-300 bg-white px-2 py-1 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
            placeholder="Notas (opcional)"
            rows={2}
          />
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={updating || !editQuantity}
              className="rounded-md bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
            >
              Guardar
            </button>
            <button
              onClick={() => {
                setIsEditing(false);
                setEditQuantity(quantity.toString());
                setEditUnit(unit || '');
                setEditPurchasedQuantity(purchasedQuantity?.toString() || '');
                setEditPrice(price?.toString() || '');
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
            <div className="flex items-center gap-2">
              <span
                className={`text-sm font-medium ${
                  checked ? 'line-through text-gray-500' : 'text-gray-900'
                }`}
              >
                {article.name}
              </span>
              <span className="text-xs text-gray-500">({article.brand})</span>
            </div>
            <div className="mt-1 text-xs text-gray-500">
              {article.product.name}
            </div>
            <div className="mt-1 text-sm text-gray-600">
              {quantity} {unit}
              {purchasedQuantity !== null &&
                purchasedQuantity !== undefined &&
                purchasedQuantity > 0 && (
                  <span className="ml-2 text-gray-500">
                    (Comprado: {purchasedQuantity} {unit})
                  </span>
                )}
            </div>
            {price !== null && price !== undefined && price > 0 && (
              <div className="mt-1 text-sm font-medium text-green-600">
                €{price.toFixed(2)}
                {purchasedQuantity &&
                  purchasedQuantity > 0 &&
                  ` (Total: €${(price * purchasedQuantity).toFixed(2)})`}
              </div>
            )}
            {store && (
              <div className="mt-1 text-xs text-gray-500">
                Comercio: {store.name}
              </div>
            )}
            {purchasedAt && (
              <div className="mt-1 text-xs text-gray-400">
                Comprado: {new Date(purchasedAt).toLocaleDateString()}
              </div>
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
        {notes && <p className="mt-1 text-xs text-gray-500">{notes}</p>}
        {addedBy && (
          <p className="mt-1 text-xs text-gray-400">
            Agregado por {addedBy.name}
          </p>
        )}
      </div>
    </div>
  );
}
