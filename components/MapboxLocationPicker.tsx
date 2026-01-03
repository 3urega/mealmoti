'use client';

import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder';

// Importar estilos
import 'mapbox-gl/dist/mapbox-gl.css';
import '@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css';

interface MapboxLocationPickerProps {
  initialLatitude?: number | null;
  initialLongitude?: number | null;
  initialAddress?: string | null;
  onLocationChange: (latitude: number | null, longitude: number | null, address: string | null) => void;
  disabled?: boolean;
}

export default function MapboxLocationPicker({
  initialLatitude,
  initialLongitude,
  initialAddress,
  onLocationChange,
  disabled = false,
}: MapboxLocationPickerProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);
  const geocoder = useRef<MapboxGeocoder | null>(null);
  const geocoderResultHandler = useRef<((e: any) => void) | null>(null);
  const markerDragHandler = useRef<(() => void) | null>(null);
  const mapClickHandler = useRef<((e: mapboxgl.MapMouseEvent) => void) | null>(null);
  const onLocationChangeRef = useRef(onLocationChange);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [searchValue, setSearchValue] = useState(initialAddress || '');

  // Mantener la referencia de onLocationChange actualizada
  useEffect(() => {
    onLocationChangeRef.current = onLocationChange;
  }, [onLocationChange]);

  // Asegurar que el componente esté montado antes de inicializar el mapa
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

    if (!mapContainer.current) return;
    
    // Si el mapa ya existe, no crear otro
    if (map.current) return;

    mapboxgl.accessToken = token;

    // Coordenadas iniciales o por defecto (centro de España)
    const defaultLat = initialLatitude || 40.4168;
    const defaultLng = initialLongitude || -3.7038;

    // Crear mapa
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [defaultLng, defaultLat],
      zoom: initialLatitude && initialLongitude ? 15 : 6,
    });

    // Crear marcador
    if (initialLatitude && initialLongitude) {
      marker.current = new mapboxgl.Marker({
        draggable: !disabled,
      })
        .setLngLat([initialLongitude, initialLatitude])
        .addTo(map.current);
    } else {
      marker.current = new mapboxgl.Marker({
        draggable: !disabled,
      })
        .setLngLat([defaultLng, defaultLat])
        .addTo(map.current);
    }

    // Geocoder para búsqueda de direcciones
    geocoder.current = new MapboxGeocoder({
      accessToken: token,
      mapboxgl: mapboxgl,
      marker: false, // Usamos nuestro propio marcador
      placeholder: 'Buscar dirección...',
      language: 'es',
      countries: 'es', // Limitar a España (puedes cambiar o quitar)
    });

    // Añadir geocoder al mapa
    if (mapContainer.current) {
      const geocoderElement = geocoder.current.onAdd(map.current);
      mapContainer.current.appendChild(geocoderElement);
    }

    // Función para actualizar ubicación y hacer geocoding inverso
    const updateLocation = async (lat: number, lng: number, address?: string) => {
      if (!map.current || !marker.current) return;

      // Validar coordenadas
      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        console.error('Coordenadas inválidas:', { lat, lng });
        return;
      }

      // Actualizar marcador
      marker.current.setLngLat([lng, lat]);

      // Centrar mapa en la nueva ubicación
      map.current.flyTo({
        center: [lng, lat],
        zoom: 15,
      });

      // Si no tenemos dirección, hacer geocoding inverso
      let finalAddress = address || null;
      if (!finalAddress) {
        try {
          const response = await fetch(
            `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${token}&language=es`
          );
          const data = await response.json();
          if (data.features && data.features.length > 0) {
            finalAddress = data.features[0].place_name;
            setSearchValue(finalAddress);
          }
        } catch (err) {
          console.error('Error en geocoding inverso:', err);
        }
      } else {
        setSearchValue(finalAddress);
      }

      // Notificar cambio usando la referencia
      onLocationChangeRef.current(lat, lng, finalAddress);
    };

    // Eventos del mapa
    map.current.on('load', () => {
      setMapLoaded(true);
    });

    // Click en mapa para cambiar ubicación
    mapClickHandler.current = (e: mapboxgl.MapMouseEvent) => {
      if (disabled) return;
      const { lng, lat } = e.lngLat;
      updateLocation(lat, lng);
    };
    map.current.on('click', mapClickHandler.current);

    // Evento cuando se selecciona una dirección del geocoder
    geocoderResultHandler.current = (e: any) => {
      const { center, place_name } = e.result;
      const [lng, lat] = center;
      updateLocation(lat, lng, place_name);
    };
    geocoder.current.on('result', geocoderResultHandler.current);

    // Evento cuando se arrastra el marcador
    markerDragHandler.current = () => {
      if (!marker.current) return;
      const lngLat = marker.current.getLngLat();
      updateLocation(lngLat.lat, lngLat.lng);
    };
    marker.current.on('dragend', markerDragHandler.current);

    // Guardar referencia a updateLocation para usarla en los eventos
    (map.current as any).__updateLocation = updateLocation;

    // Cleanup
    return () => {
      if (marker.current && markerDragHandler.current) {
        marker.current.off('dragend', markerDragHandler.current);
        marker.current.remove();
        marker.current = null;
      }
      if (geocoder.current && geocoderResultHandler.current) {
        geocoder.current.off('result', geocoderResultHandler.current);
        geocoder.current = null;
      }
      if (map.current) {
        if (mapClickHandler.current) {
          map.current.off('click', mapClickHandler.current);
        }
        map.current.remove();
        map.current = null;
      }
      setMapLoaded(false);
    };
  }, [disabled, isMounted]);

  // Actualizar cuando cambian las props iniciales
  useEffect(() => {
    if (!map.current || !marker.current || !mapLoaded) return;

    if (initialLatitude && initialLongitude) {
      // Si hay coordenadas, actualizar marcador y centrar mapa
      marker.current.setLngLat([initialLongitude, initialLatitude]);
      map.current.flyTo({
        center: [initialLongitude, initialLatitude],
        zoom: 15,
      });
      if (initialAddress) {
        setSearchValue(initialAddress);
      }
    } else {
      // Si no hay coordenadas, centrar en España y actualizar marcador a posición por defecto
      const defaultLat = 40.4168;
      const defaultLng = -3.7038;
      marker.current.setLngLat([defaultLng, defaultLat]);
      map.current.flyTo({
        center: [defaultLng, defaultLat],
        zoom: 6,
      });
      if (initialAddress) {
        setSearchValue(initialAddress);
      } else {
        setSearchValue('');
      }
    }
  }, [initialLatitude, initialLongitude, initialAddress, mapLoaded]);

  return (
    <div className="w-full">
      <div className="mb-2">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Ubicación
        </label>
        <p className="text-xs text-gray-500 mb-2">
          Busca una dirección o haz click en el mapa para seleccionar una ubicación.
          Puedes arrastrar el marcador para ajustar la posición.
        </p>
      </div>
      <div
        ref={mapContainer}
        className="w-full h-96 rounded-md border border-gray-300 overflow-hidden"
        style={{ minHeight: '384px' }}
      />
      {disabled && (
        <p className="mt-2 text-xs text-gray-500">
          La edición de ubicación está deshabilitada
        </p>
      )}
    </div>
  );
}

