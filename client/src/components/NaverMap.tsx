import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

declare global {
  interface Window {
    naver?: {
      maps: any;
    };
  }
}

interface NaverMapViewProps {
  className?: string;
  initialCenter?: { lat: number; lng: number };
  initialZoom?: number;
  onMapReady?: (map: any) => void;
}

export function NaverMapView({
  className,
  initialCenter = { lat: 37.4979, lng: 127.0276 },
  initialZoom = 13,
  onMapReady,
}: NaverMapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);

  useEffect(() => {
    // 네이버 지도 스크립트 로드
    const script = document.createElement("script");
    script.src = "https://oapi.map.naver.com/openapi/v3/maps.js?ncpClientId=YOUR_NAVER_CLIENT_ID";
    script.async = true;
    script.onload = () => {
      if (!mapContainer.current) return;

      const mapOptions = {
        center: new window.naver!.maps.LatLng(initialCenter.lat, initialCenter.lng),
        zoom: initialZoom,
        minZoom: 6,
        maxZoom: 21,
        mapTypeControl: true,
        zoomControl: true,
        logoControl: true,
        scaleControl: true,
      };

      map.current = new window.naver!.maps.Map(mapContainer.current, mapOptions);

      if (onMapReady) {
        onMapReady(map.current);
      }
    };
    script.onerror = () => {
      console.error("Failed to load Naver Maps script");
    };
    document.head.appendChild(script);

    return () => {
      script.remove();
    };
  }, [initialCenter, initialZoom, onMapReady]);

  return (
    <div ref={mapContainer} className={cn("w-full h-[500px]", className)} />
  );
}

/**
 * 네이버 지도 마커 추가 헬퍼 함수
 */
export function addNaverMarker(
  map: any,
  position: { lat: number; lng: number },
  title: string,
  index: number
) {
  const marker = new window.naver!.maps.Marker({
    position: new window.naver!.maps.LatLng(position.lat, position.lng),
    map: map,
    title: title,
  });

  // 커스텀 마커 텍스트
  const customOverlay = new window.naver!.maps.CustomOverlay({
    position: new window.naver!.maps.LatLng(position.lat, position.lng),
    content: `<div style="background: #DC143C; color: white; padding: 4px 8px; border-radius: 50%; font-weight: bold; text-align: center; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-size: 12px;">${index}</div>`,
    map: map,
  });

  return { marker, customOverlay };
}

/**
 * 네이버 지도 경계 조정
 */
export function fitNaverMapBounds(map: any, positions: Array<{ lat: number; lng: number }>) {
  if (!positions || positions.length === 0) return;

  const bounds = new window.naver!.maps.LatLngBounds();
  positions.forEach((pos) => {
    bounds.extend(new window.naver!.maps.LatLng(pos.lat, pos.lng));
  });

  map.fitBounds(bounds);
}
