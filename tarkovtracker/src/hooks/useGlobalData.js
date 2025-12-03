import { useState, useEffect } from 'react';
import { runQuery } from '../api';

// v10: Cleaned up (No Maps)
const CACHE_KEY = 'tarkov_global_cache_v10';
const CACHE_DURATION = 24 * 60 * 60 * 1000; 

export function useGlobalData() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState("Checking local cache...");

    useEffect(() => {
        const load = async () => {
            // 1. Check Cache
            try {
                const cached = localStorage.getItem(CACHE_KEY);
                if (cached) {
                    const parsed = JSON.parse(cached);
                    if (Date.now() - parsed.timestamp < CACHE_DURATION) {
                        setData(parsed.data);
                        setLoading(false);
                        return;
                    }
                }
            } catch (e) {
                console.warn("Cache error, reloading...");
            }

            // 2. Download API Data ONLY
            try {
                setStatus("Fetching Tarkov Database...");
                
                // Query Items, Quests, and Hideout
                const apiQuery = `
                {
                    items(limit: 4000) { 
                        id name shortName iconLink types avg24hPrice 
                        sellFor { price currency vendor { name } }
                    }
                    tasks {
                        id name trader { name }
                        objectives { type ... on TaskObjectiveItem { count foundInRaid item { id } } }
                    }
                    hideoutStations {
                        name imageLink
                        levels { level itemRequirements { count item { id } } }
                    }
                }`;
                
                const apiData = await runQuery(apiQuery);

                setStatus("Processing Data...");

                // --- PROCESS DATA ---
                const itemMap = {};
                
                // Initialize Items
                apiData.items.forEach(i => {
                    itemMap[i.id] = { ...i, questDetails: [], hideoutDetails: [] };
                });

                // Link Quests to Items
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

                // Link Hideout to Items
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

                // Keys List
                const keysList = apiData.items.filter(i => 
                    (i.types?.includes('key') || i.name.toLowerCase().includes('key')) && 
                    !i.types?.includes('barter')
                ).sort((a, b) => a.name.localeCompare(b.name));

                // Final Payload
                const globalData = {
                    items: Object.values(itemMap),
                    itemMap: itemMap,
                    tasks: apiData.tasks,
                    hideoutStations: apiData.hideoutStations,
                    keys: keysList
                };

                // Save
                localStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: Date.now(), data: globalData }));

                setData(globalData);
                setLoading(false);

            } catch (e) {
                console.error(e);
                setStatus("Error loading data. Please refresh.");
            }
        };

        load();
    }, []);

    return { data, loading, status };
}