const fs = require('fs');
const path = require('path');
const API_KEY = process.env.SERPAPI_KEY;
const CATALOGO_PATH = path.join(__dirname, '../data/catalogo.json');
const OFFERS_PATH = path.join(__dirname, '../data/offers.json');
const LAST_CHECKED_PATH = path.join(__dirname, '../data/last-checked.json');
const UMBRAL_DESCUENTO = 15;
const MAX_DESCUENTO_CONFIABLE = 50; // por encima de esto, se descarta por sospechoso
const WEEKLY_INTERVAL_DAYS = 7;

function readJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return fallback;
  }
}

function shouldCheckToday(item, lastChecked) {
  if (item.frecuencia !== 'weekly') return true;
  const last = lastChecked[item.id];
  if (!last) return true;
  const daysSince = (Date.now() - new Date(last).getTime()) / (1000 * 60 * 60 * 24);
  return daysSince >= WEEKLY_INTERVAL_DAYS;
}

async function fetchProductData(asin) {
  const url = `https://serpapi.com/search.json?engine=amazon_product&asin=${asin}&amazon_domain=amazon.it&api_key=${API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`SerpApi error ${res.status} para ASIN ${asin}`);
  const data = await res.json();
  return data.product_results || null;
}

function extractDiscountPct(product) {
  // Prioridad 1: el campo "discount" que Amazon muestra directamente en la página (ej. "-22%")
  if (product?.discount) {
    const match = String(product.discount).match(/(\d+)/);
    if (match) return parseInt(match[1], 10);
  }
  // Prioridad 2 (respaldo): calcularlo nosotros si no viene el campo anterior
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
  const lastChecked = readJson(LAST_CHECKED_PATH, {});

  let consultados = 0;
  let omitidos = 0;

  for (const item of catalogo) {
    if (!shouldCheckToday(item, lastChecked)) {
      omitidos++;
      console.log(`ID ${item.id}: omitido (frecuencia ${item.frecuencia}, aún no toca)`);
      continue;
    }

    try {
      const product = await fetchProductData(item.asin);
      consultados++;

      if (!product) {
        console.log(`ID ${item.id}: sin datos de producto`);
        if (item.frecuencia === 'weekly') lastChecked[item.id] = new Date().toISOString();
        continue;
      }

      const discountPct = extractDiscountPct(product);
      const imageUrl = extractImage(product);

      let isOnSale = false;
      let estado = 'sin oferta';

      if (discountPct > MAX_DESCUENTO_CONFIABLE) {
        estado = `descartado (${discountPct}% sospechoso)`;
      } else if (discountPct >= UMBRAL_DESCUENTO) {
        isOnSale = true;
        estado = `OFERTA -${discountPct}%`;
      }

      offers[item.id] = {
        is_on_sale: isOnSale,
        discount_percentage: isOnSale ? discountPct : 0,
        image_url: imageUrl,
        last_checked_at: new Date().toISOString()
      };

      if (item.frecuencia === 'weekly') lastChecked[item.id] = new Date().toISOString();

      console.log(`ID ${item.id}: ${estado} | imagen: ${imageUrl ? 'sí' : 'no'}`);
      await new Promise(r => setTimeout(r, 800));
    } catch (err) {
      console.error(`Error con ID ${item.id} (${item.asin}):`, err.message);
    }
  }

  offers._last_updated = new Date().toISOString();
  fs.writeFileSync(OFFERS_PATH, JSON.stringify(offers, null, 2));
  fs.writeFileSync(LAST_CHECKED_PATH, JSON.stringify(lastChecked, null, 2));

  console.log('offers.json actualizado.');
  console.log(`Resumen: ${consultados} productos consultados hoy, ${omitidos} omitidos | búsquedas SerpApi consumidas: ${consultados}`);
}

main().catch(err => { console.error(err); process.exit(1); });
