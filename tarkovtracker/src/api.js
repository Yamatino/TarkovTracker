export async function runQuery(query, variables = {}) {
  try {
    const response = await fetch('https://api.tarkov.dev/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        query: query,
        variables: variables,
      }),
    });
    const json = await response.json();
    return json.data;
  } catch (error) {
    console.error("API Error:", error);
    return null;
  }
}