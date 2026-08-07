import { JSONPath } from 'jsonpath-plus';

const BASE_URL = 'https://json.tarkov.dev';

// Endpoints whose raw response contains translation-key placeholders (see `translations`
// in the response envelope) instead of real text, resolved via a second `<path>_<lang>` request.
const LOCALIZED_ENDPOINTS = new Set(['items', 'tasks', 'hideout', 'traders']);

async function fetchJson(path) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
}

export async function fetchTarkovData({ endpoint, gameMode = 'regular', itemId = null, lang = 'en' }) {
  try {
    let path = '';

    // Handle special cases based on the provided endpoint list
    if (endpoint === 'status') {
      path = '/status';
    } else if (endpoint === 'price history' || endpoint === 'prices') {
      if (!itemId) throw new Error("itemId is required for price history");
      path = `/${gameMode}/prices/${itemId}`;
    } else {
      // Default path for items, tasks, hideout, traders, maps, etc.
      path = `/${gameMode}/${endpoint}`;
    }

    const needsTranslation = lang && LOCALIZED_ENDPOINTS.has(endpoint);

    const [response, translationData] = await Promise.all([
      fetchJson(path),
      needsTranslation ? fetchJson(`${path}_${lang}`) : Promise.resolve(null),
    ]);

    // Response envelope is { data, translations }. `translations` lists JSONPath
    // expressions pointing at every placeholder that needs substituting with real text.
    if (translationData && Array.isArray(response.translations)) {
      for (const jsonPath of response.translations) {
        try {
          JSONPath({
            path: jsonPath,
            json: response,
            resultType: 'all',
            callback: (result) => {
              const { value, parent, parentProperty } = result;
              parent[parentProperty] = translationData.data?.[value] ?? value;
            },
          });
        } catch (pathError) {
          console.error(`Translation merge error for ${jsonPath}:`, pathError);
        }
      }
    }

    return response.data;
  } catch (error) {
    console.error(`API Error fetching ${endpoint}:`, error);
    return null;
  }
}
