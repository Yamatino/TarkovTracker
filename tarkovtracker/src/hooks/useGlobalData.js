import { useState, useEffect } from 'react';
import { runQuery } from '../api';

// Bump to v17 to force fresh download with new Key data
const CACHE_KEY = 'tarkov_global_cache_v17';
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
                        id name shortName iconLink wikiLink types avg24hPrice 
                        sellFor { price currency vendor { name } }
                        # NEW: Fetch tasks this item is used in (covers Keys!)
                        usedInTasks {
                            id
                            name
                            trader { name }
                            map { id }
                        }
                    }
                    tasks {
                        id 
                        name 
                        trader { name }
                        map { id }
                        minPlayerLevel
                        kappaRequired
                        wikiLink
                        taskRequirements { task { id } }
                        objectives { 
                            type 
                            ... on TaskObjectiveItem { count foundInRaid item { id } } 
                        }
                    }
                    hideoutStations {
                        name imageLink
                        levels { level itemRequirements { count item { id } } }
                    }
                }`;
                
                const apiData = await runQuery(apiQuery);
                if (!apiData || !apiData.items) throw new Error("API fetch failed");

                setStatus("Processing Items...");
                const itemMap = {};
                const keysList = [];

                // Initialize Items & Process "Used In Tasks" (Keys)
                apiData.items.forEach(i => {
                    itemMap[i.id] = { ...i, questDetails: [], hideoutDetails: [] };
                    
                    // A. KEY FILTERING LIST (for Keyring Tab)
                    const nameLower = i.name.toLowerCase();
                    const looksLikeKey = (i.types?.includes('keys') || i.types?.includes('key') || nameLower.includes('key'));
                    const isWeaponPart = i.types?.includes('modification') || i.types?.includes('preset');
                    const isFalsePositive = nameLower.includes('keymod') || nameLower.includes('keyslot') || nameLower.includes('keymount');
                    const isTrash = i.types?.includes('barter') && !nameLower.includes('key');

                    if (looksLikeKey && !isWeaponPart && !isFalsePositive && !isTrash) {
                        keysList.push(i);
                    }

                    // B. PROCESS "USED IN TASKS" (This catches Keys!)
                    if (i.usedInTasks && i.usedInTasks.length > 0) {
                        i.usedInTasks.forEach(task => {
                            // We use a count of 1 for keys/tools
                            itemMap[i.id].questDetails.push({
                                id: task.id,
                                name: task.name,
                                trader: task.trader?.name || "?",
                                count: 1, 
                                fir: false, // Keys usually don't need to be FIR for access
                                isKey: true // Flag for UI differentiation if needed
                            });
                        });
                    }
                });
                
                keysList.sort((a, b) => a.name.localeCompare(b.name));

                // Process Direct Objectives (Find/Handover)
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
                        
                        // Only add if we haven't already added this task via "usedInTasks"
                        // (Avoids duplicates if an item is both a key AND a handover)
                        const existing = itemMap[iid].questDetails.find(q => q.id === task.id);
                        
                        if (count > 0) {
                            if (existing) {
                                // Update existing entry (Handover is more specific than generic usage)
                                existing.count = count;
                                existing.fir = t.fir;
                            } else {
                                itemMap[iid].questDetails.push({
                                    id: task.id, 
                                    name: task.name, 
                                    trader: task.trader?.name || "?", 
                                    count, 
                                    fir: t.fir 
                                });
                            }
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