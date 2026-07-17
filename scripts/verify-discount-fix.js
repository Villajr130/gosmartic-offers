// Script temporal de verificación: corre la función extractDiscountPct() REAL
// de check-offers.js (no una reimplementación) contra el JSON crudo de SerpApi
// para un set fijo de ASINs, y compara el resultado con lo esperado.
// No escribe ningún archivo ni toca offers.json/catalogo.json.
const { getConfirmedDiscountField, extractDiscountPct } = require('./check-offers.js');

const API_KEY = process.env.SERPAPI_KEY;

const CASES = [
  { asin: 'B0GQRWYXXG', label: 'id 23 actual (ThinkPad E14 Gen 7) - debe dar 0% (bug corregido)', expectZero: true },
  { asin: 'B0GQZ33PG3', label: 'id 26 anterior (IdeaPad Flex 5, ASIN viejo) - debe dar 0% (bug corregido)', expectZero: true },
  { asin: 'B0F1W3GJ1J', label: 'id 12 (Hisense TV) - descuento real confirmado, NO debe caer a 0%', expectZero: false }
];

if (!API_KEY) {
  console.error('Falta SERPAPI_KEY en el entorno.');
  process.exit(1);
}

async function fetchRaw(asin) {
  const url = `https://serpapi.com/search.json?engine=amazon_product&asin=${encodeURIComponent(asin)}&amazon_domain=amazon.it&api_key=${API_KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  return { ok: res.ok, status: res.status, data };
}

async function main() {
  const results = [];

  for (const { asin, label, expectZero } of CASES) {
    console.log('\n' + '='.repeat(80));
    console.log(`ASIN: ${asin}`);
    console.log(label);
    console.log('='.repeat(80));

    try {
      const { ok, status, data } = await fetchRaw(asin);
      if (!ok) {
        console.log(`HTTP status: ${status} (respuesta no OK)`);
        results.push({ asin, label, status: 'ERROR HTTP' });
        continue;
      }

      const product = data.product_results;
      const discountField = getConfirmedDiscountField(data);
      const pct = extractDiscountPct(data);

      console.log(`extracted_price:        ${product?.extracted_price ?? '(ninguno)'}`);
      console.log(`extracted_old_price:     ${product?.extracted_old_price ?? '(ninguno)'}`);
      console.log(`product_results.discount:              ${product?.discount ?? '(ausente)'}`);
      console.log(`purchase_options.single_offer.discount: ${data?.purchase_options?.single_offer?.discount ?? '(ausente)'}`);
      console.log(`--> getConfirmedDiscountField(): ${discountField ?? '(null, no hay badge confirmado)'}`);
      console.log(`--> extractDiscountPct(): ${pct}%`);

      const pass = expectZero ? pct === 0 : pct > 0;
      console.log(`RESULTADO: ${pass ? 'PASS ✓' : 'FAIL ✗'} (esperado: ${expectZero ? '0%' : '> 0%, un descuento real'})`);

      results.push({ asin, label, pct, discountField, pass });
    } catch (err) {
      console.error(`Error consultando ASIN ${asin}:`, err.message);
      results.push({ asin, label, status: 'ERROR', error: err.message });
    }

    await new Promise(r => setTimeout(r, 500));
  }

  console.log('\n' + '='.repeat(80));
  console.log('RESUMEN');
  console.log('='.repeat(80));
  for (const r of results) {
    console.log(`${r.asin}: ${r.pass === true ? 'PASS ✓' : r.pass === false ? 'FAIL ✗' : (r.status || 'desconocido')} ${r.pct !== undefined ? `(${r.pct}%)` : ''}`);
  }

  const anyFail = results.some(r => r.pass === false || r.status === 'ERROR' || r.status === 'ERROR HTTP');
  if (anyFail) process.exit(1);
}

main().catch(err => { console.error(err); process.exit(1); });
