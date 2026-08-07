const fs = require('fs');
const path = require('path');

// DEBITO TECNICO: data/catalogo.json ora duplica nombre+categoria che vivono anche in
// gosmartic-web/app.js (repo separato, fonte "visuale" del sito). Se un prodotto viene
// rinominato o ricategorizzato lì, va aggiornato a mano anche qui, altrimenti questo
// script genera bozze con nomi/categorie disallineati dal sito. Stesso tipo di debito
// dell'automazione immagini ancora mancante in check-offers.js (SERPAPI_KEY): in entrambi
// i casi conviene, prima o poi, rendere catalogo.json l'unica fonte di verità (o generarlo
// a partire da gosmartic-web/app.js) invece di mantenere i due repo sincronizzati a mano.
const CATALOGO_PATH = path.join(__dirname, '../data/catalogo.json');
const OFFERS_PATH = path.join(__dirname, '../data/offers.json');
const BLOG_POSTS_PATH = path.join(__dirname, '../data/blog-posts.json');
const DRAFTS_DIR = path.join(__dirname, '../drafts');

// Stesso ordine di visualizzazione usato in gosmartic-web/app.js (FEATURED_CATEGORY_ORDER).
const CATEGORY_ORDER = ['Telefoni', 'Smart TV', 'PC & Laptop', 'Accessori Tech'];
const MAX_PER_CATEGORY = 3;

const MESI_IT = [
  'gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
  'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'
];

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// offers.json contiene solo l'ultima rilevazione giornaliera (non uno storico del mese):
// il "roundup mensile" riflette quindi le migliori offerte attive al momento della
// generazione (il giorno 20), non un aggregato di tutto il mese. Il filtro anti-falso-
// sconto (discount confermato da old_price/extracted_old_price) è già applicato a monte
// da scripts/check-offers.js quando scrive is_on_sale/discount_percentage: qui ci si fida
// di quei due campi così come sono, senza rivalutare i dati grezzi di SerpApi.
function getOffersInSconto(catalogo, offers) {
  return catalogo
    .map((item) => {
      const offer = offers[item.id];
      if (!offer || !offer.is_on_sale || !offer.discount_percentage) return null;
      return {
        id: item.id,
        asin: item.asin,
        nombre: item.nombre || `Prodotto #${item.id}`,
        categoria: item.categoria || 'Accessori Tech',
        discount_percentage: offer.discount_percentage
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.discount_percentage - a.discount_percentage);
}

function groupByCategoria(items) {
  const perCategoria = {};
  for (const item of items) {
    perCategoria[item.categoria] = perCategoria[item.categoria] || [];
    if (perCategoria[item.categoria].length < MAX_PER_CATEGORY) {
      perCategoria[item.categoria].push(item);
    }
  }
  const ordinate = CATEGORY_ORDER.filter((c) => perCategoria[c]?.length)
    .concat(Object.keys(perCategoria).filter((c) => !CATEGORY_ORDER.includes(c)));
  return { perCategoria, ordinate };
}

function buildProductBlock(item) {
  const link = `https://www.amazon.it/dp/${item.asin}?tag=gosmartic-21`;
  return `<p><strong>${item.nombre}</strong> — sconto del ${item.discount_percentage}%. `
    + `[DA COMPLETARE: breve descrizione del prodotto e perché conviene] `
    + `Il <a href="${link}" target="_blank" rel="noopener noreferrer sponsored">${item.nombre}</a> è disponibile su Amazon.</p>`;
}

function buildContenidoHtml(perCategoria, ordinate, meseLabel) {
  let html = `<p>[DA COMPLETARE: introduzione] Ecco una selezione delle offerte più interessanti attive in questo momento sul nostro catalogo per ${meseLabel}, organizzate per categoria — controlla sempre il prezzo aggiornato nella scheda prodotto, perché le offerte possono cambiare rapidamente.</p>`;

  for (const categoria of ordinate) {
    html += `<h2>${categoria}</h2>`;
    for (const item of perCategoria[categoria]) {
      html += buildProductBlock(item);
    }
  }

  html += `<h2>Non perdere le prossime offerte</h2><p>Le offerte più aggressive e a tempo limitato le condividiamo in tempo reale sul nostro <a href="https://whatsapp.com/channel/0029Vb8JW5c8kyyNuVPTEZ1u" target="_blank" rel="noopener noreferrer">canale WhatsApp</a> — questo articolo raccoglie solo una selezione di quanto disponibile in questo momento.</p>`;

  return html;
}

function nextSuggestedId(blogPosts) {
  const ids = (blogPosts.posts || []).map((p) => p.id).filter((id) => typeof id === 'number');
  return ids.length ? Math.max(...ids) + 1 : 1;
}

function main() {
  const catalogo = JSON.parse(fs.readFileSync(CATALOGO_PATH, 'utf-8'));
  const offers = JSON.parse(fs.readFileSync(OFFERS_PATH, 'utf-8'));
  const blogPosts = JSON.parse(fs.readFileSync(BLOG_POSTS_PATH, 'utf-8'));

  const now = new Date();
  const meseLabel = capitalize(MESI_IT[now.getMonth()]);
  const anno = now.getFullYear();

  const inSconto = getOffersInSconto(catalogo, offers);

  if (inSconto.length === 0) {
    console.log('Nessuna offerta valida trovata (is_on_sale=true con sconto confermato): nessuna bozza generata questo mese.');
    return;
  }

  const { perCategoria, ordinate } = groupByCategoria(inSconto);
  const contenidoHtml = buildContenidoHtml(perCategoria, ordinate, `${meseLabel} ${anno}`);

  const draftPost = {
    id: nextSuggestedId(blogPosts),
    slug: `le-migliori-offerte-tech-di-${MESI_IT[now.getMonth()]}-${anno}`,
    titulo: `Le migliori offerte tech di ${meseLabel} ${anno}`,
    resumen: `[DA COMPLETARE] Una selezione delle offerte tech più interessanti del mese su Amazon: smartphone, Smart TV, laptop e accessori ai prezzi migliori del momento.`,
    contenido_html: contenidoHtml,
    imagenUrl: '[DA COMPLETARE: URL immagine, es. una foto Unsplash già usata in data/blog-posts.json]',
    fecha: now.toISOString().slice(0, 10),
    categoria: 'Accessori Tech',
    autor: 'GoSmArtic Team'
  };

  if (!fs.existsSync(DRAFTS_DIR)) fs.mkdirSync(DRAFTS_DIR);
  const outPath = path.join(DRAFTS_DIR, `deals-roundup-${anno}-${String(now.getMonth() + 1).padStart(2, '0')}.json`);

  fs.writeFileSync(outPath, JSON.stringify({
    _draft: true,
    _instructions: 'Bozza generata automaticamente dal workflow "Monthly Deals Roundup". NON è pubblicata: '
      + 'per pubblicarla, rivedi il contenuto, completa tutti i campi [DA COMPLETARE], scegli un id libero '
      + '(quello suggerito qui sotto è solo indicativo) e sposta l\'oggetto "post" dentro l\'array "posts" di '
      + 'data/blog-posts.json. Solo la modifica di data/blog-posts.json su main pubblica e notifica gli utenti.',
    post: draftPost
  }, null, 2));

  console.log(`Bozza generata: ${outPath}`);
  console.log(`Prodotti in sconto trovati: ${inSconto.length} | inclusi nella bozza: ${ordinate.reduce((n, c) => n + perCategoria[c].length, 0)}`);
}

if (require.main === module) {
  main();
}

module.exports = { getOffersInSconto, groupByCategoria };
