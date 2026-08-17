'use client';

import { useEffect, useRef } from 'react';
import Box from '@mui/material/Box';
import {
  Map as MapLibreMap,
  NavigationControl,
  type GeoJSONSource,
  type LngLatBoundsLike,
} from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useColorScheme, useTheme } from '@mui/material/styles';
import { modeTone } from '@/theme/tokens';
import type { Itinerary } from '@/lib/types';

// OpenFreeMap serves OSM vector tiles with no key and no usage cap. Not Google
// — see PLAN.md §5 for why that route is closed. Phase 1 swaps this for
// self-hosted Protomaps .pmtiles on R2.
const STYLE = {
  light: 'https://tiles.openfreemap.org/styles/bright',
  dark: 'https://tiles.openfreemap.org/styles/dark',
};

const DHAKA: [number, number] = [90.4074, 23.7806];

const ROUTE_SOURCE = 'poth-route';
const CASING_LAYER = 'poth-route-casing';
const LINE_LAYER = 'poth-route-line';
const STOP_SOURCE = 'poth-stops';
const STOP_LAYER = 'poth-stops-layer';

function legFeatures(itinerary: Itinerary, scheme: 'light' | 'dark') {
  return itinerary.legs
    .filter((leg) => leg.geometry.length >= 2)
    .map((leg) => ({
      type: 'Feature' as const,
      properties: {
        color: modeTone[leg.mode]?.[scheme] ?? '#888888',
        // Transit runs on its own alignment; street legs are drawn solid.
        dashed: leg.mode === 'walk' || leg.mode === 'metro',
        mode: leg.mode,
      },
      geometry: { type: 'LineString' as const, coordinates: leg.geometry },
    }));
}

function stopFeatures(itinerary: Itinerary) {
  const points: { coord: number[]; label: string; kind: string }[] = [];
  itinerary.legs.forEach((leg, i) => {
    if (i === 0) {
      points.push({
        coord: [leg.from_point.lng, leg.from_point.lat],
        label: leg.from_name,
        kind: 'origin',
      });
    }
    points.push({
      coord: [leg.to_point.lng, leg.to_point.lat],
      label: leg.to_name,
      kind: i === itinerary.legs.length - 1 ? 'destination' : 'transfer',
    });
  });
  return points.map((p) => ({
    type: 'Feature' as const,
    properties: { label: p.label, kind: p.kind },
    geometry: { type: 'Point' as const, coordinates: p.coord },
  }));
}

function boundsOf(features: ReturnType<typeof legFeatures>): LngLatBoundsLike | null {
  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;
  for (const f of features) {
    for (const [lng, lat] of f.geometry.coordinates) {
      minLng = Math.min(minLng, lng);
      minLat = Math.min(minLat, lat);
      maxLng = Math.max(maxLng, lng);
      maxLat = Math.max(maxLat, lat);
    }
  }
  if (!Number.isFinite(minLng)) return null;
  return [
    [minLng, minLat],
    [maxLng, maxLat],
  ];
}

export default function JourneyMap({
  itinerary,
  height = 420,
}: {
  itinerary?: Itinerary;
  height?: number | string;
}) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<MapLibreMap | null>(null);
  const ready = useRef(false);
  const theme = useTheme();
  const { mode, systemMode } = useColorScheme();
  const scheme = (mode === 'system' ? systemMode ?? 'light' : mode ?? 'light') as 'light' | 'dark';

  // Create the map once; style changes are handled separately.
  useEffect(() => {
    if (!container.current || map.current) return;
    const m = new MapLibreMap({
      container: container.current,
      style: STYLE[scheme],
      center: DHAKA,
      zoom: 11,
      attributionControl: { compact: true },
    });
    m.addControl(new NavigationControl({ showCompass: false }), 'top-right');
    m.on('load', () => {
      ready.current = true;
      draw(m);
    });
    map.current = m;

    // Cards expand with an animated height, so the container is the wrong size
    // when the map is created. Without this the canvas stays letterboxed.
    const observer = new ResizeObserver(() => m.resize());
    observer.observe(container.current);

    return () => {
      observer.disconnect();
      m.remove();
      map.current = null;
      ready.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Swap basemap style with the theme, then re-add our layers.
  useEffect(() => {
    const m = map.current;
    if (!m || !ready.current) return;
    ready.current = false;
    m.setStyle(STYLE[scheme]);
    m.once('styledata', () => {
      ready.current = true;
      draw(m);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scheme]);

  useEffect(() => {
    const m = map.current;
    if (m && ready.current) draw(m);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itinerary?.id, scheme]);

  function draw(m: MapLibreMap) {
    const features = itinerary ? legFeatures(itinerary, scheme) : [];
    const stops = itinerary ? stopFeatures(itinerary) : [];

    const routeData = { type: 'FeatureCollection' as const, features };
    const stopData = { type: 'FeatureCollection' as const, features: stops };

    const routeSrc = m.getSource(ROUTE_SOURCE) as GeoJSONSource | undefined;
    if (routeSrc) {
      routeSrc.setData(routeData);
    } else {
      m.addSource(ROUTE_SOURCE, { type: 'geojson', data: routeData });
      m.addLayer({
        id: CASING_LAYER,
        type: 'line',
        source: ROUTE_SOURCE,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': scheme === 'dark' ? '#000000' : '#FFFFFF',
          'line-width': 9,
          'line-opacity': 0.75,
        },
      });
      m.addLayer({
        id: LINE_LAYER,
        type: 'line',
        source: ROUTE_SOURCE,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': ['get', 'color'],
          'line-width': 5,
          'line-dasharray': ['case', ['get', 'dashed'], ['literal', [1.6, 1.4]], ['literal', [1, 0]]],
        },
      });
    }

    const stopSrc = m.getSource(STOP_SOURCE) as GeoJSONSource | undefined;
    if (stopSrc) {
      stopSrc.setData(stopData);
    } else {
      m.addSource(STOP_SOURCE, { type: 'geojson', data: stopData });
      m.addLayer({
        id: STOP_LAYER,
        type: 'circle',
        source: STOP_SOURCE,
        paint: {
          'circle-radius': ['match', ['get', 'kind'], 'transfer', 5, 7],
          'circle-color': [
            'match',
            ['get', 'kind'],
            'origin', theme.palette.primary.main,
            'destination', theme.palette.error.main,
            scheme === 'dark' ? '#FFFFFF' : '#FFFFFF',
          ],
          'circle-stroke-width': 2.5,
          'circle-stroke-color': scheme === 'dark' ? '#101413' : '#FFFFFF',
        },
      });
    }

    const bounds = boundsOf(features);
    if (bounds) {
      m.fitBounds(bounds, { padding: 56, maxZoom: 15, duration: 600 });
    }
  }

  return (
    <Box
      ref={container}
      sx={{
        height,
        width: '100%',
        borderRadius: 4,
        overflow: 'hidden',
        border: '1px solid',
        borderColor: 'divider',
        '& .maplibregl-ctrl-attrib': { fontSize: 10 },
      }}
    />
  );
}
