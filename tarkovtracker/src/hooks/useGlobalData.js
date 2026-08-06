import { useState, useEffect } from 'react';
import { fetchTarkovData } from '../api'; // Use the new function we created

// Bump cache to v17 and use dynamic keys based on game mode
const CACHE_VERSION = 'v17';
const CACHE_DURATION = 24 * 60 * 60 * 1000; 

export function useGlobalData(gameMode = 'regular') {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState("Checking local cache...");

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            const CACHE_KEY = `tarkov_global_cache_${CACHE_VERSION}_${gameMode}`;

            try {
                // 1. Check Cache for the specific game mode
                const cached = localStorage.getItem(CACHE_KEY);
                if (cached) {
                    try {
                        const parsed = JSON.parse(cached);
                        if (Date.now() - parsed.timestamp < CACHE_DURATION) {
                            setData(parsed.data);
                            setLoading(false);
                            return;
                        }
                    } catch(e) { console.warn(`Cache for ${gameMode} corrupt, reloading.`); }
                }

                // 2. Fetch API Data in parallel
                setStatus(`Fetching Tarkov.dev ${gameMode.toUpperCase()} Database...`);
                
                const [itemsData, tasksData, hideoutData] = await Promise.all([
                    fetchTarkovData({ endpoint: 'items', gameMode }),
                    fetchTarkovData({ endpoint: 'tasks', gameMode }),
                    fetchTarkovData({ endpoint: 'hideout', gameMode })
                ]);

                if (!itemsData || !tasksData || !hideoutData) {
                    throw new Error("API fetch failed for one or more endpoints");
                }

                setStatus("Processing Items...");
                const itemMap = {};
                const keysList = [];

                itemsData.forEach(i => {
                    itemMap[i.id] = { ...i, questDetails: [], hideoutDetails: [] };
                    
                    const nameLower = i.name.toLowerCase();
                    const looksLikeKey = (i.types?.includes('keys') || i.types?.includes('key') || nameLower.includes('key'));
                    const isWeaponPart = i.types?.includes('modification') || i.types?.includes('preset');
                    const isFalsePositive = nameLower.includes('keymod') || nameLower.includes('keyslot') || nameLower.includes('keymount');
                    const isTrash = i.types?.includes('barter') && !nameLower.includes('key');

                    if (looksLikeKey && !isWeaponPart && !isFalsePositive && !isTrash) {
                        keysList.push(i);
                    }
                });
                
                keysList.sort((a, b) => a.name.localeCompare(b.name));

                // Link Quests (with Duplicate Fix)
                tasksData.forEach(task => {
                    const taskItems = {};
                    if (task.objectives) {
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
                    }
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
                hideoutData.forEach(station => {
                    if (station.levels) {
                        station.levels.forEach(lvl => {
                            if (lvl.itemRequirements) {
                                lvl.itemRequirements.forEach(req => {
                                    if (req.item && itemMap[req.item.id]) {
                                        itemMap[req.item.id].hideoutDetails.push({
                                            station: station.name, level: lvl.level, count: req.count
                                        });
                                    }
                                });
                            }
                        });
                    }
                });

                const globalData = {
                    items: Object.values(itemMap),
                    itemMap: itemMap,
                    tasks: tasksData,
                    hideoutStations: hideoutData,
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
    }, [gameMode]); // Re-run effect whenever gameMode changes

    return { data, loading, status };
}