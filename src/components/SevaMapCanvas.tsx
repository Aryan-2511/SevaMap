import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  APIProvider,
  Map as GoogleMap,
  AdvancedMarker,
  InfoWindow,
  useMap,
  useApiLoadingStatus,
  APILoadingStatus,
  useAdvancedMarkerRef,
  CollisionBehavior,
} from '@vis.gl/react-google-maps';
import {
  Navigation,
  HeartHandshake,
  Sparkles,
  Plus,
  Minus,
  LocateFixed,
  ShieldCheck,
  X,
} from 'lucide-react';
import { CATEGORY_META, ModalTab, NgoOrganization } from '../types';
import { CategoryPinSvg } from './CategoryPinSvg';

interface SevaMapCanvasProps {
  apiKey: string;
  quotaExceeded: boolean;
  organizations: NgoOrganization[];
  center: { lat: number; lng: number };
  selectedOrgId: string | null;
  hoveredOrgId: string | null;
  onSelectOrg: (id: string | null, openInfoWindow?: boolean) => void;
  onHoverOrg: (id: string | null) => void;
  onOpenModal: (org: NgoOrganization, tab: ModalTab) => void;
  languageCode: string;
}

type MarkerInstance = ReturnType<typeof useAdvancedMarkerRef>[1];

interface MarkerWithRefProps {
  org: NgoOrganization;
  selected: boolean;
  hovered: boolean;
  zIndex: number;
  onRegisterMarker: (id: string, marker: MarkerInstance) => void;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
}

function MarkerWithRef({
  org,
  selected,
  hovered,
  zIndex,
  onRegisterMarker,
  onSelect,
  onHover,
}: MarkerWithRefProps) {
  const [markerRef, marker] = useAdvancedMarkerRef();

  useEffect(() => {
    onRegisterMarker(org.id, marker);
    return () => onRegisterMarker(org.id, null);
  }, [org.id, marker, onRegisterMarker]);

  return (
    <AdvancedMarker
      ref={markerRef}
      position={{ lat: org.lat, lng: org.lng }}
      zIndex={zIndex}
      collisionBehavior={CollisionBehavior.OPTIONAL_AND_HIDES_LOWER_PRIORITY}
      title={org.name}
      onClick={() => onSelect(org.id)}
      onMouseEnter={() => onHover(org.id)}
      onMouseLeave={() => onHover(null)}
    >
      <CategoryPinSvg
        category={org.category}
        selected={selected}
        hovered={hovered}
      />
    </AdvancedMarker>
  );
}

function MapCameraController({
  center,
  selectedOrg,
}: {
  center: { lat: number; lng: number };
  selectedOrg: NgoOrganization | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    if (selectedOrg) {
      map.panTo({ lat: selectedOrg.lat, lng: selectedOrg.lng });
      const currentZoom = map.getZoom() ?? 12;
      if (currentZoom < 13) {
        map.setZoom(14);
      }
    }
  }, [map, selectedOrg]);

  useEffect(() => {
    if (!map) return;
    map.panTo(center);
    map.setZoom(12);
  }, [map, center]);

  return null;
}

function GoogleMapInner({
  organizations,
  center,
  selectedOrgId,
  hoveredOrgId,
  onSelectOrg,
  onHoverOrg,
  onOpenModal,
  onFallbackNeeded,
}: Omit<SevaMapCanvasProps, 'apiKey' | 'quotaExceeded' | 'languageCode'> & {
  onFallbackNeeded: () => void;
}) {
  const loadingStatus = useApiLoadingStatus();
  const [markerInstances, setMarkerInstances] = useState<
    Record<string, MarkerInstance>
  >({});

  useEffect(() => {
    if (
      loadingStatus === APILoadingStatus.FAILED ||
      loadingStatus === APILoadingStatus.AUTH_FAILURE
    ) {
      onFallbackNeeded();
    }
  }, [loadingStatus, onFallbackNeeded]);

  const handleRegisterMarker = useCallback(
    (id: string, marker: MarkerInstance) => {
      setMarkerInstances((prev) => {
        if (prev[id] === marker) return prev;
        return { ...prev, [id]: marker };
      });
    },
    []
  );

  // Sort northernmost first so southern markers render cleanly in front
  const sortedOrgs = [...organizations].sort((a, b) => b.lat - a.lat);
  const selectedOrg =
    organizations.find((o) => o.id === selectedOrgId) || null;
  const activeMarker = selectedOrgId ? markerInstances[selectedOrgId] : null;

  return (
    <div className="relative w-full h-full">
      <GoogleMap
        mapId="DEMO_MAP_ID"
        defaultCenter={center}
        defaultZoom={12}
        gestureHandling="greedy"
        disableDefaultUI={false}
        mapTypeControl={false}
        streetViewControl={false}
        fullscreenControl={false}
        internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
        style={{ width: '100%', height: '100%' }}
        onClick={() => onSelectOrg(null)}
      >
        <MapCameraController center={center} selectedOrg={selectedOrg} />

        {sortedOrgs.map((org, idx) => {
          const isSelected = org.id === selectedOrgId;
          const isHovered = org.id === hoveredOrgId;
          const zIndex = isSelected ? 1000 : isHovered ? 999 : idx;

          return (
            <MarkerWithRef
              key={org.id}
              org={org}
              selected={isSelected}
              hovered={isHovered}
              zIndex={zIndex}
              onRegisterMarker={handleRegisterMarker}
              onSelect={(id) => onSelectOrg(id, true)}
              onHover={onHoverOrg}
            />
          );
        })}

        {selectedOrg && activeMarker && (
          <InfoWindow
            anchor={activeMarker}
            maxWidth={300}
            pixelOffset={[0, -6]}
            onCloseClick={() => onSelectOrg(null)}
          >
            <div className="p-1 font-sans text-slate-900">
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 mb-1">
                <span
                  className="inline-block w-2 h-2 rounded-full shrink-0"
                  style={{
                    backgroundColor: CATEGORY_META[selectedOrg.category].color,
                  }}
                />
                <span>{CATEGORY_META[selectedOrg.category].shortLabel}</span>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums">
                  {selectedOrg.distance_km.toFixed(1)} km
                </span>
                {selectedOrg.verified && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="text-teal-700 font-semibold">Verified</span>
                  </>
                )}
              </div>
              <h4 className="text-sm font-bold text-slate-900 leading-snug mb-1">
                {selectedOrg.name}
              </h4>
              <p className="text-xs text-slate-600 line-clamp-2 mb-2.5">
                {selectedOrg.address}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onOpenModal(selectedOrg, 'donate')}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-md bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold transition-colors whitespace-nowrap"
                >
                  <HeartHandshake className="w-3.5 h-3.5" />
                  Donate
                </button>
                <button
                  type="button"
                  onClick={() => onOpenModal(selectedOrg, 'studio')}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition-colors whitespace-nowrap"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Studio
                </button>
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${selectedOrg.lat},${selectedOrg.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Get Directions"
                  className="inline-flex items-center justify-center p-1.5 rounded-md border border-slate-200 hover:bg-slate-50 text-slate-700 transition-colors"
                >
                  <Navigation className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>
    </div>
  );
}

// Interactive OpenStreetMap Web Mercator fallback when Maps key is unavailable or quota-limited
function InteractiveOsmFallbackMap({
  organizations,
  center,
  selectedOrgId,
  hoveredOrgId,
  onSelectOrg,
  onHoverOrg,
  onOpenModal,
}: Omit<SevaMapCanvasProps, 'apiKey' | 'quotaExceeded' | 'languageCode'>) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [viewCenter, setViewCenter] = useState(center);
  const [zoom, setZoom] = useState(12);
  const [size, setSize] = useState({ width: 800, height: 600 });
  const dragRef = useRef<{
    active: boolean;
    startX: number;
    startY: number;
    startCenter: { lat: number; lng: number };
  } | null>(null);

  useEffect(() => {
    setViewCenter(center);
    setZoom(12);
  }, [center]);

  useEffect(() => {
    if (!selectedOrgId) return;
    const target = organizations.find((o) => o.id === selectedOrgId);
    if (target) {
      setViewCenter({ lat: target.lat, lng: target.lng });
      setZoom((z) => (z < 13 ? 13 : z));
    }
  }, [selectedOrgId, organizations]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const updateSize = () => {
      setSize({ width: el.clientWidth || 800, height: el.clientHeight || 600 });
    };
    updateSize();
    const ro = new ResizeObserver(updateSize);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const latLngToWorldPx = (lat: number, lng: number, z: number) => {
    const scale = 256 * Math.pow(2, z);
    const siny = Math.min(
      Math.max(Math.sin((lat * Math.PI) / 180), -0.9999),
      0.9999
    );
    const x = ((lng + 180) / 360) * scale;
    const y =
      (0.5 - Math.log((1 + siny) / (1 - siny)) / (4 * Math.PI)) * scale;
    return { x, y };
  };

  const worldPxToLatLng = (x: number, y: number, z: number) => {
    const scale = 256 * Math.pow(2, z);
    const lng = (x / scale) * 360 - 180;
    const n = Math.PI - (2 * Math.PI * y) / scale;
    const lat = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
    return { lat, lng };
  };

  const centerWorld = latLngToWorldPx(viewCenter.lat, viewCenter.lng, zoom);
  const topLeftWorldX = centerWorld.x - size.width / 2;
  const topLeftWorldY = centerWorld.y - size.height / 2;

  const minTileX = Math.floor(topLeftWorldX / 256);
  const maxTileX = Math.floor((topLeftWorldX + size.width) / 256);
  const minTileY = Math.floor(topLeftWorldY / 256);
  const maxTileY = Math.floor((topLeftWorldY + size.height) / 256);
  const maxTileIdx = Math.pow(2, zoom);

  const tiles: Array<{ x: number; y: number; left: number; top: number }> = [];
  for (let tx = minTileX; tx <= maxTileX; tx++) {
    for (let ty = minTileY; ty <= maxTileY; ty++) {
      if (ty < 0 || ty >= maxTileIdx) continue;
      const wrappedX = ((tx % maxTileIdx) + maxTileIdx) % maxTileIdx;
      tiles.push({
        x: wrappedX,
        y: ty,
        left: tx * 256 - topLeftWorldX,
        top: ty * 256 - topLeftWorldY,
      });
    }
  }

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button, a')) return;
    dragRef.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      startCenter: viewCenter,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current?.active) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    const startWorld = latLngToWorldPx(
      dragRef.current.startCenter.lat,
      dragRef.current.startCenter.lng,
      zoom
    );
    setViewCenter(worldPxToLatLng(startWorld.x - dx, startWorld.y - dy, zoom));
  };

  const handlePointerUp = () => {
    dragRef.current = null;
  };

  const selectedOrg =
    organizations.find((o) => o.id === selectedOrgId) || null;

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      className="relative w-full h-full overflow-hidden bg-slate-200 select-none cursor-grab active:cursor-grabbing"
    >
      {/* OSM slippy map tiles */}
      <div className="absolute inset-0 pointer-events-none">
        {tiles.map((t) => (
          <img
            key={`${zoom}-${t.x}-${t.y}-${t.left}`}
            src={`https://tile.openstreetmap.org/${zoom}/${t.x}/${t.y}.png`}
            alt=""
            draggable={false}
            referrerPolicy="no-referrer"
            style={{
              position: 'absolute',
              left: `${t.left}px`,
              top: `${t.top}px`,
              width: '256px',
              height: '256px',
            }}
            className="max-w-none opacity-95"
          />
        ))}
      </div>

      {/* Category SVG Pins */}
      {organizations.map((org) => {
        const pt = latLngToWorldPx(org.lat, org.lng, zoom);
        const left = pt.x - topLeftWorldX;
        const top = pt.y - topLeftWorldY;
        const isSelected = org.id === selectedOrgId;
        const isHovered = org.id === hoveredOrgId;

        return (
          <button
            key={org.id}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelectOrg(org.id, true);
            }}
            onMouseEnter={() => onHoverOrg(org.id)}
            onMouseLeave={() => onHoverOrg(null)}
            style={{
              position: 'absolute',
              left: `${left}px`,
              top: `${top}px`,
              transform: 'translate(-50%, -100%)',
              zIndex: isSelected ? 40 : isHovered ? 30 : 10,
            }}
            aria-label={org.name}
          >
            <CategoryPinSvg
              category={org.category}
              selected={isSelected}
              hovered={isHovered}
            />
          </button>
        );
      })}

      {/* InfoWindow Card Overlay */}
      {selectedOrg && (
        <div
          className="absolute bottom-4 left-4 right-16 sm:right-auto sm:w-80 bg-white rounded-xl border border-slate-200 shadow-xl p-3.5 z-50"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
              <span
                className="inline-block w-2 h-2 rounded-full"
                style={{
                  backgroundColor: CATEGORY_META[selectedOrg.category].color,
                }}
              />
              <span>{CATEGORY_META[selectedOrg.category].shortLabel}</span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">
                {selectedOrg.distance_km.toFixed(1)} km
              </span>
              {selectedOrg.verified && (
                <>
                  <span aria-hidden="true">·</span>
                  <ShieldCheck className="w-3.5 h-3.5 text-teal-700" />
                </>
              )}
            </div>
            <button
              type="button"
              onClick={() => onSelectOrg(null)}
              className="p-1 text-slate-400 hover:text-slate-700 rounded"
              aria-label="Close popup"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <h4 className="text-sm font-bold text-slate-900 leading-snug mb-1">
            {selectedOrg.name}
          </h4>
          <p className="text-xs text-slate-600 line-clamp-2 mb-3">
            {selectedOrg.address}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onOpenModal(selectedOrg, 'donate')}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold transition-colors whitespace-nowrap"
            >
              <HeartHandshake className="w-3.5 h-3.5" />
              Donate
            </button>
            <button
              type="button"
              onClick={() => onOpenModal(selectedOrg, 'studio')}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition-colors whitespace-nowrap"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Studio
            </button>
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${selectedOrg.lat},${selectedOrg.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              title="Get Directions"
              className="inline-flex items-center justify-center p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 transition-colors"
            >
              <Navigation className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      )}

      {/* Map Zoom & Recenter Controls */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-1.5 z-40">
        <button
          type="button"
          onClick={() => setZoom((z) => Math.min(17, z + 1))}
          className="w-9 h-9 rounded-lg bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-700 hover:bg-slate-50"
          aria-label="Zoom in"
        >
          <Plus className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => setZoom((z) => Math.max(4, z - 1))}
          className="w-9 h-9 rounded-lg bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-700 hover:bg-slate-50"
          aria-label="Zoom out"
        >
          <Minus className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => {
            setViewCenter(center);
            setZoom(12);
          }}
          className="w-9 h-9 rounded-lg bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-700 hover:bg-slate-50"
          aria-label="Recenter map"
        >
          <LocateFixed className="w-4 h-4" />
        </button>
      </div>

      <div className="absolute bottom-1 left-2 text-[10px] text-slate-600 bg-white/85 px-1.5 py-0.5 rounded pointer-events-none">
        © OpenStreetMap contributors
      </div>
    </div>
  );
}

export function SevaMapCanvas(props: SevaMapCanvasProps) {
  const [useFallback, setUseFallback] = useState(false);

  const shouldRenderGoogleMaps =
    Boolean(props.apiKey) && !props.quotaExceeded && !useFallback;

  if (!shouldRenderGoogleMaps) {
    return (
      <InteractiveOsmFallbackMap
        organizations={props.organizations}
        center={props.center}
        selectedOrgId={props.selectedOrgId}
        hoveredOrgId={props.hoveredOrgId}
        onSelectOrg={props.onSelectOrg}
        onHoverOrg={props.onHoverOrg}
        onOpenModal={props.onOpenModal}
      />
    );
  }

  return (
    <APIProvider
      apiKey={props.apiKey}
      libraries={['marker']}
      language={props.languageCode}
      region="IN"
    >
      <GoogleMapInner
        organizations={props.organizations}
        center={props.center}
        selectedOrgId={props.selectedOrgId}
        hoveredOrgId={props.hoveredOrgId}
        onSelectOrg={props.onSelectOrg}
        onHoverOrg={props.onHoverOrg}
        onOpenModal={props.onOpenModal}
        onFallbackNeeded={() => setUseFallback(true)}
      />
    </APIProvider>
  );
}
