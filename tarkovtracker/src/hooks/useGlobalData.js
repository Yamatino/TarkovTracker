import { useState, useEffect } from 'react';
import { fetchTarkovData } from '../api'; // Use the new function we created

// Bump cache to v18 (new API shape) and use dynamic keys based on game mode
const CACHE_VERSION = 'v18';
const CACHE_DURATION = 24 * 60 * 60 * 1000;

export function useGlobalData(gameMode = 'regular') {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState("Checking local cache...");
    const [retryCount, setRetryCount] = useState(0);
    const retry = () => setRetryCount(c => c + 1);

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
                    } catch { console.warn(`Cache for ${gameMode} corrupt, reloading.`); }
                }

                // 2. Fetch API Data in parallel
                setStatus(`Fetching Tarkov.dev ${gameMode.toUpperCase()} Database...`);

                const [itemsData, tasksData, hideoutData, tradersData] = await Promise.all([
                    fetchTarkovData({ endpoint: 'items', gameMode }),
                    fetchTarkovData({ endpoint: 'tasks', gameMode }),
                    fetchTarkovData({ endpoint: 'hideout', gameMode }),
                    fetchTarkovData({ endpoint: 'traders', gameMode })
                ]);

                if (!itemsData || !tasksData || !hideoutData || !tradersData) {
                    throw new Error("API fetch failed for one or more endpoints");
                }

                setStatus("Processing Items...");

                // Traders come back keyed by their own id, so the response doubles as a lookup map.
                const traderMap = tradersData;

                const itemsList = Object.values(itemsData.items);
                const tasksList = Object.values(tasksData.tasks);
                const hideoutList = Object.values(hideoutData);

                const itemMap = {};
                const keysList = [];

                itemsList.forEach(i => {
                    // The API no longer returns a resolved sellFor array - build it from the
                    // flea price plus each trader offer (bare trader ids resolved via traderMap).
                    const sellFor = [];
                    if (i.lastLowPrice) {
                        sellFor.push({ price: i.lastLowPrice, currency: 'RUB', vendor: { name: 'Flea Market' } });
                    }
                    (i.sellToTrader || []).forEach(offer => {
                        sellFor.push({
                            price: offer.price,
                            currency: offer.currency,
                            vendor: { name: traderMap[offer.trader]?.name || 'Unknown' }
                        });
                    });

                    itemMap[i.id] = { ...i, sellFor, questDetails: [], hideoutDetails: [] };

                    const nameLower = i.name.toLowerCase();
                    const looksLikeKey = (i.types?.includes('keys') || i.types?.includes('key') || nameLower.includes('key'));
                    const isWeaponPart = i.types?.includes('modification') || i.types?.includes('preset');
                    const isFalsePositive = nameLower.includes('keymod') || nameLower.includes('keyslot') || nameLower.includes('keymount');
                    const isTrash = i.types?.includes('barter') && !nameLower.includes('key');

                    if (looksLikeKey && !isWeaponPart && !isFalsePositive && !isTrash) {
                        keysList.push(itemMap[i.id]);
                    }
                });

                keysList.sort((a, b) => a.name.localeCompare(b.name));

                // Link Quests (with Duplicate Fix)
                tasksList.forEach(task => {
                    task.trader = { id: task.trader, name: traderMap[task.trader]?.name };
                    (task.taskRequirements || []).forEach(req => {
                        req.task = { id: req.task };
                    });

                    const taskItems = {};
                    if (task.objectives) {
                        task.objectives.forEach(obj => {
                            // giveItem/findItem/plantItem objectives use a plural `items` id array now.
                            const objItemIds = obj.items || (obj.item ? [obj.item] : []);
                            objItemIds.forEach(iid => {
                                if (!itemMap[iid]) return;
                                if (!taskItems[iid]) taskItems[iid] = { give:0, find:0, plant:0, fir:false };
                                const c = obj.count || 1;
                                if (obj.type === 'giveItem') taskItems[iid].give += c;
                                if (obj.type === 'findItem') taskItems[iid].find += c;
                                if (obj.type === 'plantItem') taskItems[iid].plant += c;
                                if (obj.foundInRaid) taskItems[iid].fir = true;
                            });
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
                hideoutList.forEach(station => {
                    if (station.levels) {
                        station.levels.forEach(lvl => {
                            if (lvl.itemRequirements) {
                                lvl.itemRequirements.forEach(req => {
                                    if (req.item && itemMap[req.item]) {
                                        itemMap[req.item].hideoutDetails.push({
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
                    tasks: tasksList,
                    hideoutStations: hideoutList,
                    keys: keysList
                };

                try {
                    localStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: Date.now(), data: globalData }));
                } catch { console.warn("Quota exceeded."); }

                setData(globalData);
                setLoading(false);

            } catch (e) {
                console.error("Global Data Error:", e);
                setStatus(`Error: ${e.message}`);
                setLoading(false);
            }
        };

        load();
    }, [gameMode, retryCount]); // Re-run effect whenever gameMode changes or retry() is called

    return { data, loading, status, retry };
}
