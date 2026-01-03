'use client';

import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

interface MapboxLocationViewerProps {
  latitude: number | null;
  longitude: number | null;
  address?: string | null;
}

export default function MapboxLocationViewer({
  latitude,
  longitude,
  address,
}: MapboxLocationViewerProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  // Asegurar que solo se renderice en el cliente
  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    
    const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
    
    if (!token) {
      console.error('NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN no está configurado');
      return;
    }

    if (!mapContainer.current || map.current) return;
    if (!latitude || !longitude) return;

    mapboxgl.accessToken = token;

    // Crear mapa
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [longitude, latitude],
      zoom: 15,
      interactive: true, // Permitir zoom y pan
    });

    // Crear marcador (no arrastrable)
    marker.current = new mapboxgl.Marker({
      draggable: false,
    })
      .setLngLat([longitude, latitude])
      .addTo(map.current);

    // Cleanup
    return () => {
      if (marker.current) {
        marker.current.remove();
      }
      if (map.current) {
        map.current.remove();
      }
    };
  }, [latitude, longitude, isMounted]);

  if (!latitude || !longitude) {
    return (
      <div className="w-full rounded-md border border-gray-300 bg-gray-50 p-8 text-center">
        <p className="text-sm text-gray-500">
          No hay ubicación disponible para este comercio
        </p>
      </div>
    );
  }

  // Renderizar placeholder durante SSR y antes de montar
  if (!isMounted) {
    return (
      <div className="w-full">
        {address && (
          <div className="mb-2">
            <p className="text-sm text-gray-600">{address}</p>
          </div>
        )}
        <div
          className="w-full h-96 rounded-md border border-gray-300 overflow-hidden bg-gray-100 flex items-center justify-center"
          style={{ minHeight: '384px' }}
        >
          <p className="text-sm text-gray-500">Cargando mapa...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {address && (
        <div className="mb-2">
          <p className="text-sm text-gray-600">{address}</p>
        </div>
      )}
      <div
        ref={mapContainer}
        className="w-full h-96 rounded-md border border-gray-300 overflow-hidden"
        style={{ minHeight: '384px' }}
      />
    </div>
  );
}

