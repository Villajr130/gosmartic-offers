// Script temporal de debug: imprime el payload crudo de SerpApi (engine=amazon_product)
// para uno o más ASINs, sin escribir ningún archivo ni tocar offers.json/catalogo.json.
const API_KEY = process.env.SERPAPI_KEY;
const ASINS = (process.env.ASINS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

const PRICE_KEY_RE = /price|discount/i;

if (!API_KEY) {
  console.error('Falta SERPAPI_KEY en el entorno.');
  process.exit(1);
}

if (ASINS.length === 0) {
  console.error('No se recibió ningún ASIN (variable ASINS vacía).');
  process.exit(1);
}

async function fetchRaw(asin) {
  const url = `https://serpapi.com/search.json?engine=amazon_product&asin=${encodeURIComponent(asin)}&amazon_domain=amazon.it&api_key=${API_KEY}`;
  // Nunca se imprime `url` ni ninguna variante de API_KEY: solo se usa para el fetch.
  const res = await fetch(url);
  const data = await res.json();
  return { ok: res.ok, status: res.status, data };
}

// Recorre el objeto completo buscando cualquier campo relacionado a precio/descuento,
// para que sea fácil de ver aunque esté anidado (ej. dentro de variantes o buybox).
function collectPriceFields(obj, pathPrefix = '', out = []) {
  if (obj === null || typeof obj !== 'object') return out;
  for (const [key, value] of Object.entries(obj)) {
    const currentPath = pathPrefix ? `${pathPrefix}.${key}` : key;
    if (PRICE_KEY_RE.test(key) && (typeof value !== 'object' || value === null)) {
      out.push({ path: currentPath, value });
    }
    if (value && typeof value === 'object') {
      collectPriceFields(value, currentPath, out);
    }
  }
  return out;
}

async function main() {
  for (const asin of ASINS) {
    console.log('\n' + '='.repeat(80));
    console.log(`ASIN: ${asin}`);
    console.log('='.repeat(80));

    try {
      const { ok, status, data } = await fetchRaw(asin);

      if (!ok) {
        console.log(`HTTP status: ${status} (respuesta no OK)`);
      }

      console.log('\n--- Campos de precio/descuento encontrados (recursivo) ---');
      const priceFields = collectPriceFields(data.product_results || data);
      if (priceFields.length === 0) {
        console.log('(ninguno encontrado)');
      } else {
        for (const { path, value } of priceFields) {
          console.log(`${path}: ${JSON.stringify(value)}`);
        }
      }

      console.log('\n--- JSON completo de la respuesta de SerpApi ---');
      console.log(JSON.stringify(data, null, 2));
    } catch (err) {
      console.error(`Error consultando ASIN ${asin}:`, err.message);
    }

    await new Promise(r => setTimeout(r, 500));
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
