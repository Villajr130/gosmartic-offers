const fs = require('fs');
const path = require('path');
const API_KEY = process.env.SERPAPI_KEY;
const CATALOGO_PATH = path.join(__dirname, '../data/catalogo.json');
const OFFERS_PATH = path.join(__dirname, '../data/offers.json');
const MAX_DESCUENTO_CONFIABLE = 50; // por encima de esto, se descarta por sospechoso

function readJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return fallback;
  }
}

async function fetchProductData(asin) {
  const url = `https://serpapi.com/search.json?engine=amazon_product&asin=${asin}&amazon_domain=amazon.it&api_key=${API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`SerpApi error ${res.status} para ASIN ${asin}`);
  const data = await res.json();
  return data;
}

// SerpApi puede poblar "discount" (string tipo "-X%") desde módulos ajenos al
// precio de venta (ej. el trade-in "Rivendi e risparmia", cupones cruzados o
// descuentos de bundle) sin que exista un "old_price" real detrás. Por eso no
// basta con que "discount" esté presente: solo se confía en él si, en el MISMO
// bloque (product_results o purchase_options.single_offer), también aparece
// "old_price"/"extracted_old_price" respaldándolo.
function getConfirmedDiscountField(data) {
  const product = data?.product_results;
  if (product?.discount && (product?.old_price || product?.extracted_old_price)) {
    return product.discount;
  }

  const singleOffer = data?.purchase_options?.single_offer;
  if (singleOffer?.discount && (singleOffer?.old_price || singleOffer?.extracted_old_price)) {
    return singleOffer.discount;
  }

  return null;
}

function extractDiscountPct(data) {
  const discountField = getConfirmedDiscountField(data);
  if (!discountField) return 0;

  // Prioridad 1: el porcentaje que Amazon muestra directamente en la página (ej. "-22%")
  const match = String(discountField).match(/(\d+)/);
  if (match) return parseInt(match[1], 10);

  // Prioridad 2 (respaldo): calcularlo nosotros, solo porque ya confirmamos
  // arriba que hay un badge de descuento real acompañando al precio anterior.
  const product = data?.product_results;
  const current = product?.extracted_price ?? null;
  const original = product?.extracted_old_price ?? null;
  if (current && original && original > current) {
    return Math.round(((original - current) / original) * 100);
  }
  return 0;
}

function extractImage(product) {
  if (Array.isArray(product?.thumbnails) && product.thumbnails.length > 0) {
    return product.thumbnails[0];
  }
  return null;
}

async function main() {
  const catalogo = JSON.parse(fs.readFileSync(CATALOGO_PATH, 'utf-8'));
  const offers = readJson(OFFERS_PATH, {});

  let consultados = 0;

  for (const item of catalogo) {
    try {
      const data = await fetchProductData(item.asin);
      consultados++;

      const product = data?.product_results;
      if (!product) {
        console.log(`ID ${item.id}: sin datos de producto`);
        continue;
      }

      const discountPct = extractDiscountPct(data);
      const imageUrl = extractImage(product);

      let isOnSale = false;
      let estado = 'sin oferta';

      if (discountPct > MAX_DESCUENTO_CONFIABLE) {
        estado = `descartado (${discountPct}% sospechoso)`;
      } else if (discountPct > 0) {
        isOnSale = true;
        estado = `OFERTA -${discountPct}%`;
      }

      offers[item.id] = {
        is_on_sale: isOnSale,
        discount_percentage: isOnSale ? discountPct : 0,
        image_url: imageUrl,
        last_checked_at: new Date().toISOString()
      };

      console.log(`ID ${item.id}: ${estado} | imagen: ${imageUrl ? 'sí' : 'no'}`);
      await new Promise(r => setTimeout(r, 800));
    } catch (err) {
      console.error(`Error con ID ${item.id} (${item.asin}):`, err.message);
    }
  }

  offers._last_updated = new Date().toISOString();
  fs.writeFileSync(OFFERS_PATH, JSON.stringify(offers, null, 2));

  console.log('offers.json actualizado.');
  console.log(`Resumen: ${consultados} productos consultados | búsquedas SerpApi consumidas: ${consultados}`);
}

if (require.main === module) {
  main().catch(err => { console.error(err); process.exit(1); });
}

module.exports = { getConfirmedDiscountField, extractDiscountPct };
