import { useState, useEffect } from 'react';
import { fetchTarkovData } from '../api';
import mapsCalibration from '../data/mapsCalibration.json';

const CACHE_VERSION = 'v1';
const CACHE_DURATION = 24 * 60 * 60 * 1000;

// Lazy, separate from useGlobalData: most sessions never open the Maps tab, so
// this only fetches once `enabled` (driven by first tab visit) is true.
export function useMapsData(gameMode = 'regular', enabled = false) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');

  useEffect(() => {
    if (!enabled) return;

    const load = async () => {
      setLoading(true);
      const CACHE_KEY = `tarkov_maps_cache_${CACHE_VERSION}_${gameMode}`;

      try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (Date.now() - parsed.timestamp < CACHE_DURATION) {
              setData(parsed.data);
              setLoading(false);
              return;
            }
          } catch { console.warn('Maps cache corrupt, reloading.'); }
        }

        setStatus('Fetching map data...');
        const mapsResponse = await fetchTarkovData({ endpoint: 'maps', gameMode });
        if (!mapsResponse) throw new Error('API fetch failed for maps');

        const rawMaps = Object.values(mapsResponse.maps);
        const mapsById = {};

        rawMaps.forEach((map) => {
          const calibration = mapsCalibration.find(
            (c) => c.key === map.normalizedName || c.altMaps.includes(map.normalizedName)
          );
          if (!calibration) return; // no vendored SVG/calibration for this map (e.g. The Lab)

          mapsById[map.id] = {
            id: map.id,
            name: map.name,
            normalizedName: map.normalizedName,
            extracts: map.extracts || [],
            calibration,
          };
        });

        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: Date.now(), data: mapsById }));
        } catch { console.warn('Quota exceeded.'); }

        setData(mapsById);
        setLoading(false);
      } catch (e) {
        console.error('Maps Data Error:', e);
        setStatus(`Error: ${e.message}`);
        setLoading(false);
      }
    };

    load();
  }, [gameMode, enabled]);

  return { data, loading, status };
}
