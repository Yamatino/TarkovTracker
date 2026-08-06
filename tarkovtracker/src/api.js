const BASE_URL = 'https://json.tarkov.dev';

export async function fetchTarkovData({ endpoint, gameMode = 'regular', itemId = null }) {
  try {
    let path = '';

    // Handle special cases based on the provided endpoint list
    if (endpoint === 'status') {
      path = '/status';
    } else if (endpoint === 'price history' || endpoint === 'prices') {
      if (!itemId) throw new Error("itemId is required for price history");
      path = `/${gameMode}/prices/${itemId}`;
    } else {
      // Default path for items, barters, tasks, traders, maps, etc.
      path = `/${gameMode}/${endpoint}`;
    }

    const response = await fetch(`${BASE_URL}${path}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const json = await response.json();
    return json;
  } catch (error) {
    console.error(`API Error fetching ${endpoint}:`, error);
    return null;
  }
}