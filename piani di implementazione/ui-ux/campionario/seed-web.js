// Campionario di prova (ticket 03) - solo per sviluppo, NON fa parte dell'app.
// Da eseguire nella console della versione web (http://localhost:8081) con serve-seed.mjs acceso.
// Non sovrascrive: se lo spazio ha già prodotti si ferma, a meno di passare force = true.
async function seedCampionario(org = 'local', force = false) {
  const seed = await (await fetch('http://localhost:8765/seed.json')).json();
  const existing = JSON.parse(localStorage.getItem(`inventory:v1:${org}:products`) || '[]');
  if (existing.length && !force) return `fermo: lo spazio ${org} ha già ${existing.length} prodotti`;
  for (const [key, value] of Object.entries(seed)) {
    const k = key.includes('{org}') ? key.replace('{org}', org) : `${key}:${org}`;
    localStorage.setItem(k, JSON.stringify(value));
  }
  localStorage.setItem(`inventory:v1:${org}:alerts`, '[]');
  localStorage.setItem(`inventory:v1:${org}:deleted_product_ids`, '[]');
  location.reload(); // subito, prima che l'app riscriva lo storage con lo stato in memoria
  return 'ok';
}

// Per togliere il campionario: chiavi dello spazio "local" da cancellare
function clearCampionario(org = 'local') {
  ['furinventory_custom_fields', 'furinventory_layout_config'].forEach((k) => localStorage.removeItem(`${k}:${org}`));
  ['products', 'timeline', 'alerts', 'libraries', 'deleted_product_ids'].forEach((k) => localStorage.removeItem(`inventory:v1:${org}:${k}`));
  location.reload();
}
