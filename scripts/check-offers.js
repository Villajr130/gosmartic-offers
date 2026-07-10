const fs = require('fs');
const path = require('path');
const API_KEY = process.env.SERPAPI_KEY;
const CATALOGO_PATH = path.join(__dirname, '../data/catalogo.json');
const OFFERS_PATH = path.join(__dirname, '../data/offers.json');
const UMBRAL_DESCUENTO = 15;

async function fetchProductData(asin) {
  const url = `https://serpapi.com/search.json?engine=amazon_product&asin=${asin}&amazon_domain=amazon.it&api_key=${API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`SerpApi error ${res.status} para ASIN ${asin}`);
  const data = await res.json();
  return data.product_results || null;
}

function extractPricing(product) {
  const current = product?.extracted_price ?? null;
  const original = product?.extracted_old_price ?? null;
  return { current, original };
}

function extractImage(product) {
  if (Array.isArray(product?.thumbnails) && product.thumbnails.length > 0) {
    return product.thumbnails[0];
  }
  return null;
}

async function main() {
  const catalogo = JSON.parse(fs.readFileSync(CATALOGO_PATH, 'utf-8'));
  const offers = {};

  for (const item of catalogo) {
    try {
      const product = await fetchProductData(item.asin);
      if (!product) { console.log(`ID ${item.id}: sin datos de producto`); continue; }
      const { current, original } = extractPricing(product);
      const imageUrl = extractImage(product);
      let isOnSale = false;
      let discountPct = 0;
      if (current && original && original > current) {
        discountPct = Math.round(((original - current) / original) * 100);
        isOnSale = discountPct >= UMBRAL_DESCUENTO;
      }
      offers[item.id] = {
        is_on_sale: isOnSale,
        discount_percentage: discountPct,
        image_url: imageUrl,
        last_checked_at: new Date().toISOString()
      };
      console.log(`ID ${item.id}: ${isOnSale ? `OFERTA -${discountPct}%` : 'sin oferta'} | imagen: ${imageUrl ? 'sí' : 'no'}`);
      await new Promise(r => setTimeout(r, 800));
    } catch (err) {
      console.error(`Error con ID ${item.id} (${item.asin}):`, err.message);
    }
  }

  offers._last_updated = new Date().toISOString();
  fs.writeFileSync(OFFERS_PATH, JSON.stringify(offers, null, 2));
  console.log('offers.json actualizado.');
}

main().catch(err => { console.error(err); process.exit(1); });    try {
      const product = await fetchProductData(item.asin);
      if (!product) { console.log(`ID ${item.id}: sin datos de producto`); continue; }

      const { current, original } = extractPricing(product);
      const imageUrl = extractImage(product);

      let isOnSale = false;
      let discountPct = 0;

      if (current && original && original > current) {
        discountPct = Math.round(((original - current) / original) * 100);
        isOnSale = discountPct >= UMBRAL_DESCUENTO;
      }

      offers[item.id] = {
        is_on_sale: isOnSale,
        discount_percentage: discountPct,
        image_url: imageUrl,
        last_checked_at: new Date().toISOString()
      };

      console.log(`ID ${item.id}: ${isOnSale ? `OFERTA -${discountPct}%` : 'sin oferta'} | imagen: ${imageUrl ? 'sí' : 'no'}`);
      await new Promise(r => setTimeout(r, 800));
    } catch (err) {
      console.error(`Error con ID ${item.id} (${item.asin}):`, err.message);
    }
  }

  offers._last_updated = new Date().toISOString();
  fs.writeFileSync(OFFERS_PATH, JSON.stringify(offers, null, 2));
  console.log('offers.json actualizado.');
}

main().catch(err => { console.error(err); process.exit(1); });  for (const item of catalogo) {
    try {
      const product = await fetchProductData(item.asin);
      if (!product) { console.log(`ID ${item.id}: sin datos de producto`); continue; }

      const { current, original } = extractPricing(product);
      const imageUrl = extractImage(product);

      let isOnSale = false;
      let discountPct = 0;

      if (current && original && original > current) {
        discountPct = Math.round(((original - current) / original) * 100);
        isOnSale = discountPct >= UMBRAL_DESCUENTO;
      }

      offers[item.id] = {
        is_on_sale: isOnSale,
        discount_percentage: discountPct,
        image_url: imageUrl,
        last_checked_at: new Date().toISOString()
      };

      console.log(`ID ${item.id}: ${isOnSale ? `OFERTA -${discountPct}%` : 'sin oferta'} | imagen: ${imageUrl ? 'sí' : 'no'}`);
      await new Promise(r => setTimeout(r, 800));
    } catch (err) {
      console.error(`Error con ID ${item.id} (${item.asin}):`, err.message);
    }
  }

  offers._last_updated = new Date().toISOString();
  fs.writeFileSync(OFFERS_PATH, JSON.stringify(offers, null, 2));
  console.log('offers.json actualizado.');
}

main().catch(err => { console.error(err); process.exit(1); });
