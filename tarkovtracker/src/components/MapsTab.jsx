import React, { useEffect, useMemo, useRef, useState } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { projectToSvg } from '../utils/mapProjection';

// v1 scope: extraction points only. Not implemented (deliberately out of scope):
// floor-layer switching, transits, spawns, hazards, and linking quests to their
// map via task.map (see the comment in QuestsTab.jsx) once this tab exists.
const FACTION_COLORS = { pmc: 'var(--accent-color)', scav: '#ff9800' };

// Keyed by map id in the parent so switching maps remounts this (fresh svgDims)
// instead of needing to manually reset state inside an effect.
function MapCanvas({ map }) {
  const [svgDims, setSvgDims] = useState(null);
  const svgContainerRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    fetch(map.calibration.svgPath)
      .then((res) => res.text())
      .then((text) => {
        if (cancelled || !svgContainerRef.current) return;

        const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
        const svgEl = doc.documentElement;

        const viewBox = svgEl.getAttribute('viewBox');
        const parts = viewBox ? viewBox.trim().split(/\s+/).map(Number) : null;
        const width = parts ? parts[2] : (svgEl.width?.baseVal?.value || 1000);
        const height = parts ? parts[3] : (svgEl.height?.baseVal?.value || 1000);

        svgEl.setAttribute('width', '100%');
        svgEl.setAttribute('height', '100%');

        svgContainerRef.current.innerHTML = '';
        svgContainerRef.current.appendChild(svgEl);
        setSvgDims({ width, height });
      })
      .catch((err) => console.error('Failed to load map SVG:', err));

    return () => { cancelled = true; };
  }, [map]);

  const markerRadius = svgDims ? Math.max(1, svgDims.width * 0.008) : 1;

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={svgContainerRef} style={{ width: '100%', height: '100%' }} />
      {svgDims && (
        // Overlay SVG shares the source map's viewBox so projected extract
        // positions line up 1:1 without touching the source SVG's own <g>
        // layer structure. overflow:visible since border extracts can land
        // marginally outside the nominal bounds box - see mapProjection.js.
        <svg
          viewBox={`0 0 ${svgDims.width} ${svgDims.height}`}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible', pointerEvents: 'none' }}
        >
          {map.extracts.map((extract) => {
            const { x, y } = projectToSvg(extract.position, map.calibration, svgDims.width, svgDims.height);
            const color = FACTION_COLORS[extract.faction] || '#ffffff';
            return (
              <circle key={extract.id} cx={x} cy={y} r={markerRadius} fill={color} stroke="#000" strokeWidth={markerRadius * 0.2} style={{ pointerEvents: 'auto' }}>
                <title>{extract.name}{extract.switch ? ' (requires switch)' : ''}</title>
              </circle>
            );
          })}
        </svg>
      )}
    </div>
  );
}

export default function MapsTab({ mapsData, loading, status }) {
  const maps = useMemo(
    () => Object.values(mapsData || {}).sort((a, b) => a.name.localeCompare(b.name)),
    [mapsData]
  );

  const defaultMapId = useMemo(() => {
    if (maps.length === 0) return null;
    const factory = maps.find((m) => m.normalizedName === 'factory');
    return factory ? factory.id : maps[0].id;
  }, [maps]);

  const [explicitMapId, setExplicitMapId] = useState(null);
  const selectedMapId = explicitMapId ?? defaultMapId;
  const selectedMap = maps.find((m) => m.id === selectedMapId);

  if (loading) {
    return (
      <div className="tab-content" style={{ textAlign: 'center', padding: '40px', color: '#888' }}>
        {status || 'Loading map data...'}
      </div>
    );
  }

  if (!maps.length) {
    return (
      <div className="tab-content" style={{ textAlign: 'center', padding: '40px', color: '#888' }}>
        No map data available yet.
      </div>
    );
  }

  return (
    <div className="tab-content">
      <div className="filters">
        <span style={{ marginRight: '10px' }}>Select Map:</span>
        <select value={selectedMapId || ''} onChange={(e) => setExplicitMapId(e.target.value)}>
          {maps.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
        <span style={{ marginLeft: 'auto', display: 'flex', gap: '15px', fontSize: '0.85em', color: 'var(--text-secondary)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: FACTION_COLORS.pmc, display: 'inline-block' }} /> PMC
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: FACTION_COLORS.scav, display: 'inline-block' }} /> Scav
          </span>
        </span>
      </div>

      <div style={{ width: '100%', height: '70vh', border: '1px solid #333', borderRadius: '8px', background: '#1a1a1a', overflow: 'hidden' }}>
        <TransformWrapper minScale={0.5} maxScale={8} centerOnInit>
          <TransformComponent wrapperStyle={{ width: '100%', height: '100%' }} contentStyle={{ width: '100%', height: '100%' }}>
            {selectedMap && <MapCanvas key={selectedMap.id} map={selectedMap} />}
          </TransformComponent>
        </TransformWrapper>
      </div>

      <div style={{ marginTop: '10px', fontSize: '0.75em', color: 'var(--text-secondary)' }}>
        Map data & art ©{' '}
        <a href="https://github.com/the-hideout/tarkov-dev-svg-maps" target="_blank" rel="noreferrer" style={{ color: 'var(--accent-color)' }}>
          the-hideout/tarkov-dev-svg-maps
        </a>{', '}licensed CC BY-NC-SA 4.0.
      </div>
    </div>
  );
}
