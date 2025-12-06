import { useState, useEffect } from 'react';
import { runQuery } from '../api';

// Bump to v18 to force a clean reload of the logic
const CACHE_KEY = 'tarkov_global_cache_v18';
const CACHE_DURATION = 24 * 60 * 60 * 1000; 

export function useGlobalData() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState("Checking local cache...");

    useEffect(() => {
        const load = async () => {
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
                    } catch(e) { console.warn("Cache corrupt"); }
                }

                setStatus("Fetching Tarkov Database...");
                
                const apiQuery = `
                {
                    items(limit: 4800) { 
                        id name shortName iconLink wikiLink types avg24hPrice 
                        sellFor { price currency vendor { name } }
                        usedInTasks { id name trader { name } map { id } } 
                    }
                    tasks {
                        id name trader { name } map { id }
                        minPlayerLevel kappaRequired wikiLink
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
                const itemMap = {};
                const keysList = [];

                // 1. Init Items & Keys List
                apiData.items.forEach(i => {
                    itemMap[i.id] = { ...i, questDetails: [], hideoutDetails: [] };
                    
                    const n = i.name.toLowerCase();
                    const t = i.types || [];
                    const isKey = (t.includes('keys') || t.includes('key') || n.includes('key')) 
                                  && !t.includes('modification') 
                                  && !t.includes('preset') 
                                  && !n.includes('keymod') 
                                  && !n.includes('keyslot')
                                  && (!t.includes('barter') || n.includes('key'));

                    if (isKey) keysList.push(i);
                });
                
                keysList.sort((a, b) => a.name.localeCompare(b.name));

                // 2. Process Quest Requirements (Merge "UsedIn" and "Objectives")
                
                // A. "Used In Tasks" (Keys/Tools)
                apiData.items.forEach(i => {
                    if (i.usedInTasks) {
                        i.usedInTasks.forEach(t => {
                            // Prevent duplicates later
                            const existing = itemMap[i.id].questDetails.find(q => q.id === t.id);
                            if (!existing) {
                                itemMap[i.id].questDetails.push({
                                    id: t.id,
                                    name: t.name,
                                    trader: t.trader?.name || "?",
                                    count: 1, // Keys usually count as 1
                                    fir: false,
                                    isKey: true
                                });
                            }
                        });
                    }
                });

                // B. "Objectives" (Find/Handover)
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
                            const existingIndex = itemMap[iid].questDetails.findIndex(q => q.id === task.id);
                            
                            if (existingIndex > -1) {
                                // If it exists (e.g. was added as a Key), update it with objective info
                                // Prioritize the Objective count if it's higher (e.g. need 2 keys?)
                                // Usually keys are 1, but if it's a handover, we update status
                                const ex = itemMap[iid].questDetails[existingIndex];
                                ex.count = Math.max(ex.count, count);
                                if (t.fir) ex.fir = true;
                            } else {
                                itemMap[iid].questDetails.push({
                                    id: task.id,
                                    name: task.name,
                                    trader: task.trader?.name || "?",
                                    count: count,
                                    fir: t.fir
                                });
                            }
                        }
                    });
                });

                // 3. Link Hideout
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
                    itemMap: itemMap, // Map for fast lookup
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