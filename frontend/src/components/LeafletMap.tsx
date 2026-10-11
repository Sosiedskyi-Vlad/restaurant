import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// Безпечне налаштування іконок Leaflet без падіння при повторному імпорті
try {
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
        iconUrl: markerIcon,
        iconRetinaUrl: markerIcon2x,
        shadowUrl: markerShadow,
    });
} catch (e) {
    console.warn('Leaflet icon initialization warning:', e);
}

interface LeafletMapProps {
    lat?: number | null;
    lng?: number | null;
    zoom?: number;
    title?: string;
    address?: string;
    readOnly?: boolean;
    height?: string;
    onPositionChange?: (lat: number, lng: number) => void;
}

export default function LeafletMap({
    lat,
    lng,
    zoom = 16,
    title,
    address,
    readOnly = true,
    height = '240px',
    onPositionChange
}: LeafletMapProps) {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<L.Map | null>(null);
    const markerRef = useRef<L.Marker | null>(null);

    // Валідація та дефолтні координати (Київ)
    const validLat = typeof lat === 'number' && !isNaN(lat) && isFinite(lat) ? lat : 50.4485;
    const validLng = typeof lng === 'number' && !isNaN(lng) && isFinite(lng) ? lng : 30.5186;

    useEffect(() => {
        if (!mapContainerRef.current) return;

        // Захист від повторної ініціалізації контейнера Leaflet (React StrictMode fix)
        if ((mapContainerRef.current as any)._leaflet_id) {
            delete (mapContainerRef.current as any)._leaflet_id;
        }

        if (mapInstanceRef.current) {
            try {
                mapInstanceRef.current.remove();
            } catch (e) {}
            mapInstanceRef.current = null;
        }

        let map: L.Map;
        try {
            map = L.map(mapContainerRef.current, {
                scrollWheelZoom: !readOnly,
                zoomControl: true,
            }).setView([validLat, validLng], zoom);
            mapInstanceRef.current = map;
        } catch (e) {
            console.error('Failed to create Leaflet map:', e);
            return;
        }

        // OpenStreetMap тайли
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 19
        }).addTo(map);

        // Маркер закладу
        const marker = L.marker([validLat, validLng], { draggable: !readOnly }).addTo(map);
        markerRef.current = marker;

        if (title || address) {
            const popupContent = `
                <div style="font-family: inherit; font-size: 13px; line-height: 1.4;">
                    ${title ? `<strong>${title}</strong><br/>` : ''}
                    ${address ? `<span style="color: #64748b;">${address}</span>` : ''}
                </div>
            `;
            marker.bindPopup(popupContent);
        }

        // Обробка переміщення маркера (для адміна)
        if (!readOnly && onPositionChange) {
            marker.on('dragend', () => {
                const pos = marker.getLatLng();
                onPositionChange(pos.lat, pos.lng);
            });

            map.on('click', (e: L.LeafletMouseEvent) => {
                marker.setLatLng(e.latlng);
                onPositionChange(e.latlng.lat, e.latlng.lng);
            });
        }

        // Примусовий ресайз після рендеру контейнера
        const resizeTimer = setTimeout(() => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.invalidateSize();
            }
        }, 250);

        return () => {
            clearTimeout(resizeTimer);
            if (mapInstanceRef.current) {
                try {
                    mapInstanceRef.current.remove();
                } catch (e) {}
                mapInstanceRef.current = null;
            }
            if (mapContainerRef.current && (mapContainerRef.current as any)._leaflet_id) {
                delete (mapContainerRef.current as any)._leaflet_id;
            }
            markerRef.current = null;
        };
    }, []);

    // Оновлення позиції при зміні координат ззовні
    useEffect(() => {
        if (mapInstanceRef.current && markerRef.current) {
            const currentPos = markerRef.current.getLatLng();
            if (Math.abs(currentPos.lat - validLat) > 0.00001 || Math.abs(currentPos.lng - validLng) > 0.00001) {
                markerRef.current.setLatLng([validLat, validLng]);
                mapInstanceRef.current.panTo([validLat, validLng]);
            }
        }
    }, [validLat, validLng]);

    return (
        <div 
            ref={mapContainerRef} 
            style={{ height, width: '100%' }}
            className="rounded-2xl overflow-hidden shadow-inner border border-slate-200 dark:border-slate-700 z-10 relative"
        />
    );
}
