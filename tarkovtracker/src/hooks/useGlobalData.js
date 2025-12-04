import { useState, useEffect } from 'react';
import { runQuery } from '../api';

// Bump cache version to v14 to force a re-download with new fields
const CACHE_KEY = 'tarkov_global_cache_v14';
const CACHE_DURATION = 24 * 60 * 60 * 1000; 

export function useGlobalData() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState("Checking local cache...");

    useEffect(() => {
        const load = async () => {
            try {
                // 1. Check Cache
                const cached = localStorage.getItem(CACHE_KEY);
                if (cached) {
                    try {
                        const parsed = JSON.parse(cached);
                        if (Date.now() - parsed.timestamp < CACHE_DURATION) {
                            setData(parsed.data);
                            setLoading(false);
                            return;
                        }
                    } catch(e) { console.warn("Cache corrupt, reloading."); }
                }

                // 2. Fetch API Data
                setStatus("Fetching Tarkov.dev Database...");
                
                const apiQuery = `
                {
                    items(limit: 4500) { 
                        id name shortName iconLink types avg24hPrice 
                        sellFor { price currency vendor { name } }
                    }
                    tasks {
                        id 
                        name 
                        kappaRequired   # <--- NEW FIELD
                        wikiLink        # <--- NEW FIELD
                        trader { name }
                        minPlayerLevel
                        taskRequirements { task { id } }
                        objectives { type ... on TaskObjectiveItem { count foundInRaid item { id } } }
                    }
                    hideoutStations {
                        name imageLink
                        levels { level itemRequirements { count item { id } } }
                    }
                }`;
                
                const apiData = await runQuery(apiQuery);
                if (!apiData || !apiData.items) throw new Error("API fetch failed");

                setStatus("Processing Items...");
                
                // ... (Keep the rest of the processing logic exactly the same) ...
                const itemMap = {};
                const keysList = [];

                apiData.items.forEach(i => {
                    itemMap[i.id] = { ...i, questDetails: [], hideoutDetails: [] };
                    if ((i.types?.includes('key') || i.name.toLowerCase().includes('key')) && !i.types?.includes('barter')) {
                        keysList.push(i);
                    }
                });
                
                keysList.sort((a, b) => a.name.localeCompare(b.name));

                // Link Quests
                apiData.tasks.forEach(task => {
                    const taskItems = {};
                    task.objectives.forEach(obj => {
                        if (obj.item && itemMap[obj.item.id]) {
                            const iid = obj.item.id;
                            if (!taskItems[iid]) taskItems[iid] = { give:0, find:0, plant:0, fir:false };
                            const c = obj.count || 1;
                            if (obj.type === 'giveItem') taskItems[iid].give += c;
                            if (obj.type === 'findItem') taskItems[iid].find += c;
                            if (obj.type === 'plantItem') taskItems[iid].plant += c;
                            if (obj.foundInRaid) taskItems[iid].fir = true;
                        }
                    });
                    Object.keys(taskItems).forEach(iid => {
                        const t = taskItems[iid];
                        const count = Math.max(t.give, t.find) + t.plant;
                        if (count > 0) {
                            itemMap[iid].questDetails.push({
                                id: task.id, name: task.name, trader: task.trader?.name, count, fir: t.fir
                            });
                        }
                    });
                });

                // Link Hideout
                apiData.hideoutStations.forEach(station => {
                    station.levels.forEach(lvl => {
                        lvl.itemRequirements.forEach(req => {
                            if (req.item && itemMap[req.item.id]) {
                                itemMap[req.item.id].hideoutDetails.push({
                                    station: station.name, level: lvl.level, count: req.count
                                });
                            }
                        });
                    });
                });

                const globalData = {
                    items: Object.values(itemMap),
                    itemMap: itemMap,
                    tasks: apiData.tasks,
                    hideoutStations: apiData.hideoutStations,
                    keys: keysList
                };

                try {
                    localStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: Date.now(), data: globalData }));
                } catch (e) { console.warn("Quota exceeded."); }

                setData(globalData);
                setLoading(false);

            } catch (e) {
                console.error("Global Data Error:", e);
                setStatus(`Error: ${e.message}`);
            }
        };

        load();
    }, []);

    return { data, loading, status };
}