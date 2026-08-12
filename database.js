/**
 * database.js — capa de datos con lowdb (JSON persistente, sin compilación nativa)
 * Todos los IDs son autoincrementales gestionados por _seq.
 */

const low     = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const bcrypt  = require('bcryptjs');
const path    = require('path');
const { app } = require('electron');

let db;

// ─────────────────────────────────────────────────────────────────────────────
function initDB() {
  const dbPath  = path.join(app.getPath('userData'), 'barpos.json');
  const adapter = new FileSync(dbPath);
  db            = low(adapter);

  db.defaults({
    users:      [],
    categories: [],
    products:   [],
    tables:     [],
    orders:     [],
    orderItems: [],
    voids:      [],
    _seq: { users: 0, categories: 0, products: 0, tables: 0, orders: 0, orderItems: 0, voids: 0 },
    _catalogVersion: 0
  }).write();

  // Bases creadas antes de que existieran las anulaciones
  if (!db.has('voids').value())     db.set('voids', []).write();
  if (!db.has('_seq.voids').value()) db.set('_seq.voids', 0).write();

  if (db.get('users').size().value() === 0) seedData();

  syncCatalog();
}

function nextId(col) {
  const n = db.get(`_seq.${col}`).value() + 1;
  db.set(`_seq.${col}`, n).write();
  return n;
}

const now = () => new Date().toISOString();

// ── Catálogo base ─────────────────────────────────────────────────────────────
// Carta completa de bar deportivo + restaurante. `syncCatalog()` la aplica de
// forma incremental: agrega lo que falta y nunca pisa un precio ya editado.
// Subir CATALOG_VERSION vuelve a correr la sincronización una sola vez.
const CATALOG_VERSION = 2;

const CATALOG = [
  // ── Bebidas ──────────────────────────────────────────────────────────────
  { name: 'Cervezas', type: 'bebida', products: [
    { name: 'Gallo Vidrio',            price: 15  },
    { name: 'Gallo Lata',              price: 15  },
    { name: 'Gallo Litro',             price: 30  },
    { name: 'Cabro Vidrio',            price: 15  },
    { name: 'Dorada Vidrio',           price: 15  },
    { name: 'Montecarlo Vidrio',       price: 18  },
    { name: 'Corona Vidrio',           price: 25  },
    { name: 'Corona Lata',             price: 25  },
    { name: 'Modelo Especial Lata',    price: 28  },
    { name: 'Heineken Vidrio',         price: 28  },
    { name: 'Stella Artois Vidrio',    price: 30  },
    { name: 'Michelob Ultra Lata',     price: 25  },
    { name: 'Miller Lite Lata',        price: 25  },
    { name: 'Salva Vida Vidrio',       price: 20  },
    { name: 'Cubeta 5 Gallo',          price: 70  },
    { name: 'Cubeta 5 Corona',         price: 115 },
    { name: 'Jarra de Cerveza',        price: 65  },
  ]},

  { name: 'Micheladas', type: 'bebida', products: [
    { name: 'Michelada Gallo',         price: 25 },
    { name: 'Michelada Litro',         price: 45 },
    { name: 'Michelada Corona',        price: 35 },
    { name: 'Michelada Preparada',     price: 35 },
    { name: 'Ojo Rojo',                price: 30 },
  ]},

  { name: 'Licores y Tragos', type: 'bebida', products: [
    { name: 'Ron con Cola',            price: 30 },
    { name: 'Cuba Libre',              price: 32 },
    { name: 'Vodka con Jugo',          price: 35 },
    { name: 'Vodka Tonic',             price: 35 },
    { name: 'Whisky en las Rocas',     price: 45 },
    { name: 'Whisky con Soda',         price: 45 },
    { name: 'Gin Tonic',               price: 45 },
    { name: 'Shot de Tequila',         price: 30 },
    { name: 'Shot de Mezcal',          price: 40 },
    { name: 'Shot de Ron',             price: 20 },
    { name: 'Shot de Quetzalteca',     price: 18 },
  ]},

  { name: 'Botellas', type: 'bebida', products: [
    { name: 'Botella Quetzalteca',       price: 120 },
    { name: 'Botella Venado',            price: 130 },
    { name: 'Botella Botran Añejo',      price: 350 },
    { name: 'Botella Smirnoff',          price: 300 },
    { name: 'Botella Jose Cuervo',       price: 400 },
    { name: 'Botella Johnnie Walker Red', price: 450 },
    { name: 'Botella Zacapa 23',         price: 850 },
  ]},

  { name: 'Cocteles', type: 'bebida', products: [
    { name: 'Margarita',               price: 40 },
    { name: 'Mojito',                  price: 40 },
    { name: 'Piña Colada',             price: 45 },
    { name: 'Daiquiri de Fresa',       price: 40 },
    { name: 'Tequila Sunrise',         price: 42 },
    { name: 'Jarra de Sangría',        price: 90 },
    { name: 'Jarra de Margarita',      price: 110 },
  ]},

  { name: 'Refrescos', type: 'bebida', products: [
    { name: 'Coca-Cola',               price: 12 },
    { name: 'Coca-Cola Litro',         price: 25 },
    { name: 'Sprite',                  price: 12 },
    { name: 'Fanta',                   price: 12 },
    { name: 'Agua Pura',               price: 10 },
    { name: 'Agua Mineral',            price: 15 },
    { name: 'Té Frío',                 price: 15 },
    { name: 'Bebida Energética',       price: 25 },
  ]},

  { name: 'Jugos y Frescos', type: 'bebida', products: [
    { name: 'Jugo Natural',            price: 18 },
    { name: 'Jugo de Naranja',         price: 20 },
    { name: 'Limonada',                price: 15 },
    { name: 'Limonada con Soda',       price: 20 },
    { name: 'Jarra de Limonada',       price: 45 },
    { name: 'Licuado de Fresa',        price: 25 },
    { name: 'Fresco del Día',          price: 15 },
  ]},

  { name: 'Café y Calientes', type: 'bebida', products: [
    { name: 'Café Americano',          price: 15 },
    { name: 'Café con Leche',          price: 18 },
    { name: 'Espresso',                price: 15 },
    { name: 'Capuchino',               price: 25 },
    { name: 'Té Caliente',             price: 12 },
    { name: 'Chocolate Caliente',      price: 22 },
  ]},

  // ── Boquitas ─────────────────────────────────────────────────────────────
  { name: 'Boquitas Frías', type: 'boquita', products: [
    { name: 'Nachos con Guacamole',    price: 45 },
    { name: 'Guacamole con Totopos',   price: 40 },
    { name: 'Tabla de Quesos',         price: 85 },
    { name: 'Tabla de Embutidos',      price: 95 },
    { name: 'Ceviche de Camarón',      price: 65 },
    { name: 'Ceviche de Pescado',      price: 55 },
    { name: 'Cóctel de Camarón',       price: 70 },
  ]},

  { name: 'Boquitas Calientes', type: 'boquita', products: [
    { name: 'Alitas BBQ (8)',          price: 65 },
    { name: 'Alitas Búfalo (8)',       price: 65 },
    { name: 'Alitas de Pollo',         price: 65 },
    { name: 'Papas Fritas',            price: 30 },
    { name: 'Papas con Queso',         price: 45 },
    { name: 'Aros de Cebolla',         price: 35 },
    { name: 'Dedos de Queso',          price: 45 },
    { name: 'Nachos Supremos',         price: 65 },
    { name: 'Chicharrones',            price: 40 },
    { name: 'Camarones al Ajillo',     price: 75 },
    { name: 'Costillitas BBQ',         price: 95 },
    { name: 'Tostadas (3)',            price: 25 },
  ]},

  { name: 'Tablas para Compartir', type: 'boquita', products: [
    { name: 'Tabla Taberna (2 personas)',  price: 150 },
    { name: 'Tabla Deportiva (4 personas)', price: 250 },
    { name: 'Picadera Mixta',              price: 120 },
    { name: 'Combo Alitas + Cubeta',       price: 180 },
  ]},

  // ── Comida ───────────────────────────────────────────────────────────────
  { name: 'Entradas', type: 'comida', products: [
    { name: 'Sopa del Día',            price: 30 },
    { name: 'Sopa de Tortilla',        price: 35 },
    { name: 'Caldo de Res',            price: 45 },
    { name: 'Ensalada César',          price: 45 },
    { name: 'Ensalada César con Pollo', price: 60 },
    { name: 'Ensalada Mixta',          price: 35 },
  ]},

  { name: 'Hamburguesas y Sándwiches', type: 'comida', products: [
    { name: 'Hamburguesa Clásica',     price: 55 },
    { name: 'Hamburguesa con Queso',   price: 65 },
    { name: 'Hamburguesa BBQ',         price: 75 },
    { name: 'Hamburguesa Taberna',     price: 85 },
    { name: 'Sándwich de Pollo',       price: 55 },
    { name: 'Club Sándwich',           price: 65 },
    { name: 'Hot Dog Especial',        price: 40 },
  ]},

  { name: 'Platos Fuertes', type: 'comida', products: [
    { name: 'Churrasco a la Parrilla', price: 125 },
    { name: 'Lomito a la Pimienta',    price: 135 },
    { name: 'Puyazo a la Parrilla',    price: 130 },
    { name: 'Costillas a la BBQ',      price: 130 },
    { name: 'Pollo a la Plancha',      price: 85  },
    { name: 'Pechuga Empanizada',      price: 85  },
    { name: 'Filete de Pescado',       price: 110 },
    { name: 'Mojarra Frita',           price: 95  },
    { name: 'Camarones a la Plancha',  price: 140 },
    { name: 'Parrillada para 2',       price: 280 },
  ]},

  { name: 'Pastas y Pizzas', type: 'comida', products: [
    { name: 'Pasta Carbonara',         price: 75  },
    { name: 'Pasta Alfredo',           price: 75  },
    { name: 'Pasta Bolognesa',         price: 75  },
    { name: 'Pizza Pepperoni Personal', price: 60 },
    { name: 'Pizza Hawaiana Personal', price: 60  },
    { name: 'Pizza Suprema Familiar',  price: 150 },
  ]},

  { name: 'Comida Típica', type: 'comida', products: [
    { name: 'Pepián',                  price: 80 },
    { name: 'Hilachas',                price: 75 },
    { name: 'Carne Guisada',           price: 75 },
    { name: 'Chiles Rellenos',         price: 70 },
    { name: 'Tacos (3)',               price: 45 },
    { name: 'Desayuno Chapín',         price: 45 },
  ]},

  { name: 'Acompañamientos', type: 'comida', products: [
    { name: 'Arroz',                   price: 15 },
    { name: 'Frijoles Volteados',      price: 15 },
    { name: 'Puré de Papa',            price: 20 },
    { name: 'Papas al Horno',          price: 25 },
    { name: 'Plátanos Fritos',         price: 20 },
    { name: 'Ensalada de Repollo',     price: 15 },
    { name: 'Tortillas (5)',           price: 8  },
  ]},

  { name: 'Postres', type: 'comida', products: [
    { name: 'Flan',                    price: 30 },
    { name: 'Cheesecake',              price: 40 },
    { name: 'Pastel de Chocolate',     price: 40 },
    { name: 'Tres Leches',             price: 35 },
    { name: 'Helado (2 bolas)',        price: 25 },
    { name: 'Banana Split',            price: 45 },
  ]},
];

const norm = s => String(s || '').trim().toLowerCase();

/**
 * Aplica CATALOG sobre la base existente sin destruir nada:
 * agrega categorías y productos que falten, y rellena el precio solo
 * cuando todavía está en 0 (el seed viejo dejaba todo en 0).
 */
function syncCatalog() {
  if (db.get('_catalogVersion').value() >= CATALOG_VERSION) return;

  const cats     = db.get('categories').value();
  const products = db.get('products').value();

  const catByName  = new Map(cats.map(c => [norm(c.name), c]));
  const prodByName = new Map(products.map(p => [norm(p.name), p]));

  for (const entry of CATALOG) {
    let cat = catByName.get(norm(entry.name));
    if (!cat) {
      cat = { id: nextId('categories'), name: entry.name, type: entry.type };
      db.get('categories').push(cat).write();
      catByName.set(norm(entry.name), cat);
    }

    for (const p of entry.products) {
      const existing = prodByName.get(norm(p.name));
      if (existing) {
        if (!existing.price) db.get('products').find({ id: existing.id }).assign({ price: p.price }).write();
        continue;
      }
      const created = {
        id: nextId('products'), name: p.name, price: p.price,
        category_id: cat.id, available: true
      };
      db.get('products').push(created).write();
      prodByName.set(norm(p.name), created);
    }
  }

  db.set('_catalogVersion', CATALOG_VERSION).write();
}

// ─────────────────────────────────────────────────────────────────────────────
function seedData() {
  // Usuarios por defecto
  db.get('users').push({
    id: nextId('users'), username: 'admin',
    password: bcrypt.hashSync('admin123', 10),
    full_name: 'Administrador', role: 'admin', active: true, created_at: now()
  }).write();

  db.get('users').push({
    id: nextId('users'), username: 'mesero',
    password: bcrypt.hashSync('user123', 10),
    full_name: 'Mesero', role: 'user', active: true, created_at: now()
  }).write();

  // Categorías y productos los siembra syncCatalog() a partir de CATALOG.

  // Mesas, barras y áreas
  const areas = [
    ...Array.from({ length: 10 }, (_, i) => ({ name: `Mesa ${i + 1}`, capacity: 4 })),
    { name: 'Barra 1',    capacity: 2 },
    { name: 'Barra 2',    capacity: 2 },
    { name: 'Barra 3',    capacity: 2 },
    { name: 'Terraza 1',  capacity: 6 },
    { name: 'Terraza 2',  capacity: 6 },
    { name: 'Pantalla 1', capacity: 8 },
    { name: 'Pantalla 2', capacity: 8 },
    { name: 'VIP',        capacity: 10 },
    { name: 'Para Llevar', capacity: 1 },
  ];
  areas.forEach(t =>
    db.get('tables').push({ id: nextId('tables'), ...t, status: 'libre' }).write()
  );
}

// ── Auth ──────────────────────────────────────────────────────────────────────
function login(username, password) {
  const user = db.get('users').find({ username, active: true }).value();
  if (!user || !bcrypt.compareSync(password, user.password)) return null;
  const { password: _, ...safe } = user;
  return safe;
}

// ── Users ─────────────────────────────────────────────────────────────────────
function getUsers() {
  return db.get('users').map(u => {
    const { password, ...safe } = u;
    return safe;
  }).value();
}

function createUser(data) {
  if (db.get('users').find({ username: data.username }).value())
    return { success: false, error: 'El nombre de usuario ya existe' };
  const id = nextId('users');
  db.get('users').push({
    id,
    username:  data.username,
    password:  bcrypt.hashSync(data.password, 10),
    full_name: data.full_name,
    role:      data.role,
    active:    true,
    created_at: now()
  }).write();
  return { success: true, id };
}

function updateUser(id, data) {
  const user = db.get('users').find({ id }).value();
  if (!user) return { success: false, error: 'Usuario no encontrado' };
  const updates = { full_name: data.full_name, role: data.role, active: data.active };
  if (data.password) updates.password = bcrypt.hashSync(data.password, 10);
  db.get('users').find({ id }).assign(updates).write();
  return { success: true };
}

function deleteUser(id) {
  db.get('users').remove({ id }).write();
  return { success: true };
}

/**
 * Cambio de contraseña por el propio usuario: a diferencia de updateUser
 * (herramienta de admin, no pide la contraseña vieja), esta exige probar
 * que se conoce la actual. Solo toca el password, nunca nombre/rol/estado.
 */
function changePassword(userId, currentPassword, newPassword) {
  const user = db.get('users').find({ id: userId }).value();
  if (!user) return { success: false, error: 'Usuario no encontrado' };
  if (!bcrypt.compareSync(String(currentPassword || ''), user.password))
    return { success: false, error: 'La contraseña actual no es correcta' };

  const nueva = String(newPassword || '');
  if (nueva.length < 4) return { success: false, error: 'La nueva contraseña debe tener al menos 4 caracteres' };

  db.get('users').find({ id: userId }).assign({ password: bcrypt.hashSync(nueva, 10) }).write();
  return { success: true };
}

// ── Categories ────────────────────────────────────────────────────────────────
const CATEGORY_TYPES = ['bebida', 'boquita', 'comida'];

function getCategories() {
  const products = db.get('products').value();
  return db.get('categories')
    .map(c => ({ ...c, product_count: products.filter(p => p.category_id === c.id).length }))
    .sortBy(['type', 'name'])
    .value();
}

function createCategory(data) {
  const name = String(data.name || '').trim();
  const type = CATEGORY_TYPES.includes(data.type) ? data.type : 'bebida';
  if (!name) return { success: false, error: 'El nombre es obligatorio' };
  if (db.get('categories').find(c => norm(c.name) === norm(name)).value())
    return { success: false, error: 'Ya existe una categoría con ese nombre' };

  const id = nextId('categories');
  db.get('categories').push({ id, name, type }).write();
  return { success: true, id };
}

function updateCategory(id, data) {
  const cat = db.get('categories').find({ id }).value();
  if (!cat) return { success: false, error: 'Categoría no encontrada' };

  const name = String(data.name || '').trim();
  const type = CATEGORY_TYPES.includes(data.type) ? data.type : cat.type;
  if (!name) return { success: false, error: 'El nombre es obligatorio' };
  if (db.get('categories').find(c => c.id !== id && norm(c.name) === norm(name)).value())
    return { success: false, error: 'Ya existe una categoría con ese nombre' };

  db.get('categories').find({ id }).assign({ name, type }).write();
  return { success: true };
}

function deleteCategory(id) {
  const used = db.get('products').filter({ category_id: id }).size().value();
  if (used) return { success: false, error: `La categoría tiene ${used} producto${used !== 1 ? 's' : ''}. Muévalos o elimínelos primero.` };
  db.get('categories').remove({ id }).write();
  return { success: true };
}

// ── Products ──────────────────────────────────────────────────────────────────
function getProducts() {
  const cats = db.get('categories').value();
  return db.get('products').map(p => {
    const cat = cats.find(c => c.id === p.category_id);
    return { ...p, category_name: cat?.name || '—', category_type: cat?.type || '—' };
  }).sortBy(['category_type', 'category_name', 'name']).value();
}

function createProduct(data) {
  const id = nextId('products');
  db.get('products').push({
    id,
    name:        data.name,
    price:       parseFloat(data.price),
    category_id: parseInt(data.category_id),
    available:   true
  }).write();
  return { success: true, id };
}

function updateProduct(id, data) {
  db.get('products').find({ id }).assign({
    name:        data.name,
    price:       parseFloat(data.price),
    category_id: parseInt(data.category_id),
    available:   data.available
  }).write();
  return { success: true };
}

function deleteProduct(id) {
  db.get('products').remove({ id }).write();
  return { success: true };
}

// ── Tables ────────────────────────────────────────────────────────────────────
function getTables() {
  return db.get('tables').sortBy('name').value();
}

function createTable(data) {
  const id = nextId('tables');
  db.get('tables').push({ id, name: data.name, capacity: parseInt(data.capacity) || 4, status: 'libre' }).write();
  return { success: true, id };
}

function updateTable(id, data) {
  db.get('tables').find({ id }).assign({ name: data.name, capacity: parseInt(data.capacity) || 4 }).write();
  return { success: true };
}

function deleteTable(id) {
  const open = db.get('orders').find({ table_id: id, status: 'abierta' }).value();
  if (open) return { success: false, error: 'La mesa tiene una orden abierta' };
  db.get('tables').remove({ id }).write();
  return { success: true };
}

// ── Orders ────────────────────────────────────────────────────────────────────
// IVA guatemalteco: va incluido en el precio de venta, así que no se suma al
// total — se desglosa en el recibo a partir de lo que el cliente ya paga.
const TAX_RATE = 0.12;

const PAYMENT_METHODS = ['efectivo', 'tarjeta', 'transferencia'];
const PAYMENT_LABELS   = {
  efectivo:      'Efectivo',
  tarjeta:       'Tarjeta',
  transferencia: 'Transferencia'
};

// A dónde se imprime cada ítem de la comanda. La barra despacha bebida;
// todo lo que se cocina va a cocina.
const destinoDe = categoryType => (categoryType === 'bebida' ? 'Barra' : 'Cocina');

// Ciclo de vida de un ítem, del pedido a la mesa.
// 'enviado' es el nombre viejo de 'en_espera'; se normaliza al leer.
const ITEM_ESTADOS   = ['pendiente', 'en_espera', 'preparando', 'listo', 'entregado'];
const ESTADOS_ACTIVOS = ['en_espera', 'preparando', 'listo'];   // lo que vive en la pantalla de cocina
const SIGUIENTE_ESTADO = { en_espera: 'preparando', preparando: 'listo', listo: 'entregado' };
const SELLO_ESTADO     = { preparando: 'started_at', listo: 'ready_at', entregado: 'delivered_at' };

const ESTADO_LABEL = {
  pendiente:  'Sin enviar',
  en_espera:  'En espera',
  preparando: 'Preparando',
  listo:      'Listo',
  entregado:  'Entregado'
};

const normEstado = s => (!s || s === 'enviado') ? 'en_espera' : s;
const yaEnviado  = s => normEstado(s) !== 'pendiente';

const round2 = n => Math.round((Number(n) || 0) * 100) / 100;

/** Subtotal, descuento, propina y total de una orden a partir de sus ítems. */
function computeTotals(order, items) {
  const subtotal = round2(items.reduce((s, i) => s + i.unit_price * i.quantity, 0));

  let discount = 0;
  if (order.discount_type === 'porcentaje') {
    discount = round2(subtotal * (Number(order.discount_value) || 0) / 100);
  } else if (order.discount_type === 'monto') {
    discount = round2(Number(order.discount_value) || 0);
  }
  discount = Math.min(discount, subtotal);   // nunca deja el subtotal en negativo

  const tip   = round2(order.tip);
  const total = round2(subtotal - discount + tip);

  return {
    subtotal,
    discount,
    tip,
    total,
    tax: round2(total - total / (1 + TAX_RATE)),   // IVA contenido en el total
    tax_base: round2(total / (1 + TAX_RATE))
  };
}

function enrichItems(items) {
  const products   = db.get('products').value();
  const categories = db.get('categories').value();
  return items.map(item => {
    const p   = products.find(x => x.id === item.product_id);
    const cat = p ? categories.find(c => c.id === p.category_id) : null;
    const status = normEstado(item.status);
    return {
      ...item,
      note:          item.note || '',
      status,                                   // ítems previos a la comanda ya cuentan como despachados
      status_label:  ESTADO_LABEL[status] || status,
      product_name:  p?.name || '?',
      category_name: cat?.name || '—',
      destino:       destinoDe(cat?.type)
    };
  });
}

function getOpenOrders() {
  const orders   = db.get('orders').filter({ status: 'abierta' }).value();
  const tables   = db.get('tables').value();
  const users    = db.get('users').value();
  const allItems = db.get('orderItems').value();
  return orders.map(o => {
    const items = allItems.filter(i => i.order_id === o.id);
    return {
      ...o,
      table_name: tables.find(t => t.id === o.table_id)?.name  || '?',
      user_name:  users.find(u => u.id === o.user_id)?.full_name || '?',
      item_count: items.reduce((s, i) => s + i.quantity, 0),
      pending_count: items.filter(i => normEstado(i.status) === 'pendiente').reduce((s, i) => s + i.quantity, 0),
      ready_count:   items.filter(i => normEstado(i.status) === 'listo').reduce((s, i) => s + i.quantity, 0),
      guests: o.guests || 0,
      ...computeTotals(o, items)
    };
  });
}

function getOrderWithItems(orderId) {
  const order = db.get('orders').find({ id: orderId }).value();
  if (!order) return null;

  const tables = db.get('tables').value();
  const users  = db.get('users').value();
  const items  = enrichItems(db.get('orderItems').filter({ order_id: orderId }).value());
  const voids  = db.get('voids').filter({ order_id: orderId }).value();

  return {
    ...order,
    guests:        order.guests || 0,
    discount_type: order.discount_type || null,
    tip:           round2(order.tip),
    table_name:    tables.find(t => t.id === order.table_id)?.name  || '?',
    user_name:     users.find(u => u.id === order.user_id)?.full_name || '?',
    items,
    voids,
    pending_count: items.filter(i => i.status === 'pendiente').reduce((s, i) => s + i.quantity, 0),
    ...computeTotals(order, items)
  };
}

function createOrder(tableId, userId, guests) {
  const existing = db.get('orders').find({ table_id: tableId, status: 'abierta' }).value();
  if (existing) return { success: false, error: 'La mesa ya tiene una orden abierta', orderId: existing.id };

  const id = nextId('orders');
  db.get('orders').push({
    id, table_id: tableId, user_id: userId,
    status: 'abierta', created_at: now(),
    guests: parseInt(guests) || 0,
    discount_type: null, discount_value: 0, tip: 0,
    payment_method: null, amount_paid: 0, change_given: 0
  }).write();
  db.get('tables').find({ id: tableId }).assign({ status: 'ocupada' }).write();
  return { success: true, orderId: id };
}

function setOrderGuests(orderId, guests) {
  const n = parseInt(guests);
  if (!Number.isFinite(n) || n < 0) return { success: false, error: 'Número de comensales inválido' };
  const order = db.get('orders').find({ id: orderId }).value();
  if (!order) return { success: false, error: 'Orden no encontrada' };
  db.get('orders').find({ id: orderId }).assign({ guests: n }).write();
  return { success: true };
}

/** Cambia la orden de mesa. La mesa vieja queda libre y la nueva ocupada. */
function transferOrder(orderId, newTableId) {
  const order = db.get('orders').find({ id: orderId }).value();
  if (!order) return { success: false, error: 'Orden no encontrada' };
  if (order.status !== 'abierta') return { success: false, error: 'La orden ya fue cobrada' };
  if (order.table_id === newTableId) return { success: false, error: 'La orden ya está en esa mesa' };

  const destino = db.get('tables').find({ id: newTableId }).value();
  if (!destino) return { success: false, error: 'Mesa destino no encontrada' };

  const ocupada = db.get('orders').find({ table_id: newTableId, status: 'abierta' }).value();
  if (ocupada) return { success: false, error: `${destino.name} ya tiene una orden abierta` };

  const anterior = order.table_id;
  db.get('orders').find({ id: orderId }).assign({ table_id: newTableId }).write();
  db.get('tables').find({ id: anterior }).assign({ status: 'libre' }).write();
  db.get('tables').find({ id: newTableId }).assign({ status: 'ocupada' }).write();
  return { success: true, table_name: destino.name };
}

/**
 * Los ítems nacen 'pendiente'. Solo se fusionan líneas del mismo producto que
 * compartan nota y que todavía no se hayan mandado: una vez impresa la comanda,
 * lo nuevo tiene que salir como línea aparte o la cocina no se entera.
 */
function addOrderItem(orderId, productId, qty, note) {
  const product = db.get('products').find({ id: productId }).value();
  if (!product) return { success: false, error: 'Producto no encontrado' };

  const nota = String(note || '').trim();
  const existing = db.get('orderItems')
    .find(i => i.order_id === orderId && i.product_id === productId &&
               (i.note || '') === nota && i.status === 'pendiente')
    .value();

  if (existing) {
    db.get('orderItems').find({ id: existing.id }).assign({ quantity: existing.quantity + qty }).write();
  } else {
    db.get('orderItems').push({
      id: nextId('orderItems'),
      order_id:   orderId,
      product_id: productId,
      quantity:   qty,
      unit_price: product.price,
      note:       nota,
      status:     'pendiente',
      sent_at:    null
    }).write();
  }
  return { success: true };
}

function setOrderItemNote(itemId, note) {
  const item = db.get('orderItems').find({ id: itemId }).value();
  if (!item) return { success: false, error: 'Ítem no encontrado' };
  db.get('orderItems').find({ id: itemId }).assign({ note: String(note || '').trim() }).write();
  return { success: true };
}

function updateOrderItem(itemId, qty) {
  const item = db.get('orderItems').find({ id: itemId }).value();
  if (!item) return { success: false, error: 'Ítem no encontrado' };

  // Bajar la cantidad de algo ya despachado es una anulación: exige motivo.
  if (qty < item.quantity && yaEnviado(item.status)) {
    return { success: false, error: 'Ya fue enviado a cocina. Use Anular para quitarlo.', needsVoid: true };
  }
  if (qty <= 0) {
    db.get('orderItems').remove({ id: itemId }).write();
  } else {
    db.get('orderItems').find({ id: itemId }).assign({ quantity: qty }).write();
  }
  return { success: true };
}

function removeOrderItem(itemId) {
  const item = db.get('orderItems').find({ id: itemId }).value();
  if (!item) return { success: false, error: 'Ítem no encontrado' };
  if (yaEnviado(item.status)) {
    return { success: false, error: 'Ya fue enviado a cocina. Use Anular para quitarlo.', needsVoid: true };
  }
  db.get('orderItems').remove({ id: itemId }).write();
  return { success: true };
}

/**
 * Quita un ítem ya despachado dejando rastro en `voids`. Sin motivo no se
 * anula: es el registro que separa un error de servicio de una fuga de caja.
 */
function voidOrderItem(itemId, reason, userId) {
  const motivo = String(reason || '').trim();
  if (!motivo) return { success: false, error: 'Indique el motivo de la anulación' };

  const item = db.get('orderItems').find({ id: itemId }).value();
  if (!item) return { success: false, error: 'Ítem no encontrado' };

  const product = db.get('products').find({ id: item.product_id }).value();
  const user    = db.get('users').find({ id: userId }).value();

  db.get('voids').push({
    id:           nextId('voids'),
    order_id:     item.order_id,
    product_id:   item.product_id,
    product_name: product?.name || '?',
    quantity:     item.quantity,
    unit_price:   item.unit_price,
    reason:       motivo,
    user_id:      userId,
    user_name:    user?.full_name || '?',
    created_at:   now()
  }).write();

  db.get('orderItems').remove({ id: itemId }).write();
  return { success: true };
}

/** Marca como enviados los ítems pendientes y devuelve la comanda por destino. */
function sendToKitchen(orderId) {
  const order = db.get('orders').find({ id: orderId }).value();
  if (!order) return { success: false, error: 'Orden no encontrada' };

  const pendientes = enrichItems(
    db.get('orderItems').filter(i => i.order_id === orderId && normEstado(i.status) === 'pendiente').value()
  );
  if (!pendientes.length) return { success: false, error: 'No hay ítems pendientes de enviar' };

  const sentAt = now();
  pendientes.forEach(i =>
    db.get('orderItems').find({ id: i.id })
      .assign({ status: 'en_espera', sent_at: sentAt, started_at: null, ready_at: null, delivered_at: null })
      .write()
  );

  const table = db.get('tables').find({ id: order.table_id }).value();
  const grupos = {};
  for (const i of pendientes) {
    (grupos[i.destino] = grupos[i.destino] || []).push(i);
  }

  return {
    success: true,
    sent_at: sentAt,
    table_name: table?.name || '?',
    order_id: orderId,
    comandas: Object.entries(grupos).map(([destino, items]) => ({ destino, items }))
  };
}

// ── Cocina y barra ────────────────────────────────────────────────────────────
// Una comanda es lo que salió junto en un envío: mismo pedido, misma hora,
// mismo destino. Es la unidad que el cocinero levanta y despacha.
const claveComanda = i => `${i.order_id}|${i.sent_at || ''}|${i.destino}`;

/**
 * Comandas vivas de cocina y barra, la más vieja primero.
 * El estado de la comanda es el del ítem menos avanzado: mientras algo siga
 * en la plancha, la comanda no está lista.
 */
function getKitchenTickets(destinoFiltro) {
  const abiertas = db.get('orders').filter({ status: 'abierta' }).value();
  const porId    = new Map(abiertas.map(o => [o.id, o]));
  const tables   = db.get('tables').value();
  const users    = db.get('users').value();

  const items = enrichItems(db.get('orderItems').filter(i => porId.has(i.order_id)).value())
    .filter(i => ESTADOS_ACTIVOS.includes(i.status))
    .filter(i => !destinoFiltro || i.destino === destinoFiltro);

  const grupos = new Map();
  for (const i of items) {
    const k = claveComanda(i);
    if (!grupos.has(k)) {
      const order = porId.get(i.order_id);
      grupos.set(k, {
        key:        k,
        order_id:   i.order_id,
        destino:    i.destino,
        sent_at:    i.sent_at || order.created_at,
        table_name: tables.find(t => t.id === order.table_id)?.name || '?',
        user_name:  users.find(u => u.id === order.user_id)?.full_name || '?',
        items:      []
      });
    }
    grupos.get(k).items.push(i);
  }

  return [...grupos.values()].map(t => {
    const menosAvanzado = t.items.reduce((peor, i) =>
      ESTADOS_ACTIVOS.indexOf(i.status) < ESTADOS_ACTIVOS.indexOf(peor) ? i.status : peor,
      'listo');
    return {
      ...t,
      status:       menosAvanzado,
      status_label: ESTADO_LABEL[menosAvanzado],
      next_status:  SIGUIENTE_ESTADO[menosAvanzado] || null,
      qty:          t.items.reduce((s, i) => s + i.quantity, 0),
      mixta:        new Set(t.items.map(i => i.status)).size > 1,
      // Lo que ya se puede llevar a la mesa aunque el resto siga en cocina
      ready_count:  t.items.filter(i => i.status === 'listo').length,
      ready_qty:    t.items.filter(i => i.status === 'listo').reduce((s, i) => s + i.quantity, 0)
    };
  }).sort((a, b) => String(a.sent_at).localeCompare(String(b.sent_at)));
}

/** Cuántas comandas hay en cada estado. Alimenta el contador de la navegación. */
function getKitchenCounts() {
  const tickets = getKitchenTickets(null);
  const conteo = { total: tickets.length, en_espera: 0, preparando: 0, listo: 0, Cocina: 0, Barra: 0 };
  for (const t of tickets) {
    conteo[t.status] = (conteo[t.status] || 0) + 1;
    conteo[t.destino] = (conteo[t.destino] || 0) + 1;
  }
  return conteo;
}

/**
 * Mueve solo los ítems de la comanda que están exactamente en `desde` hacia
 * `hacia`. Es la pieza clave para no arrastrar lo que ya avanzó: si una
 * comanda tiene un plato listo y otro todavía en la plancha, avanzar el
 * paso lento nunca debe tocar el que ya está listo.
 */
function moverPasoTicket(orderId, sentAt, destino, desde, hacia) {
  const objetivo = enrichItems(
    db.get('orderItems').filter(i => i.order_id === orderId).value()
  ).filter(i => (i.sent_at || '') === (sentAt || '') && i.destino === destino && i.status === desde);

  if (!objetivo.length) return { success: false, error: 'La comanda ya no está en ese paso' };

  const sello = SELLO_ESTADO[hacia];
  const marca = now();
  objetivo.forEach(i => {
    const cambio = { status: hacia };
    if (sello) cambio[sello] = marca;
    db.get('orderItems').find({ id: i.id }).assign(cambio).write();
  });

  return { success: true, status: hacia, label: ESTADO_LABEL[hacia], count: objetivo.length };
}

/**
 * Fuerza TODOS los ítems activos de una comanda a un estado, sin importar
 * en qué paso estén. Utilidad de bajo nivel para pruebas y corrección
 * manual; el flujo normal de la pantalla usa moverPasoTicket, que respeta
 * el progreso de cada plato.
 */
function setTicketStatus(orderId, sentAt, destino, status) {
  if (!ITEM_ESTADOS.includes(status) || status === 'pendiente')
    return { success: false, error: 'Estado inválido' };

  const objetivo = enrichItems(
    db.get('orderItems').filter(i => i.order_id === orderId).value()
  ).filter(i => (i.sent_at || '') === (sentAt || '') && i.destino === destino
             && ESTADOS_ACTIVOS.includes(i.status));

  if (!objetivo.length) return { success: false, error: 'La comanda ya no está activa' };

  const sello = SELLO_ESTADO[status];
  const marca = now();
  objetivo.forEach(i => {
    const cambio = { status };
    if (sello) cambio[sello] = marca;
    db.get('orderItems').find({ id: i.id }).assign(cambio).write();
  });

  return { success: true, status, label: ESTADO_LABEL[status], count: objetivo.length };
}

function encontrarTicket(orderId, sentAt, destino) {
  return getKitchenTickets(null)
    .find(t => t.order_id === orderId && (t.sent_at || '') === (sentAt || '') && t.destino === destino);
}

/** Avanza al siguiente paso solo los ítems que están en el paso actual de la comanda. */
function advanceTicket(orderId, sentAt, destino) {
  const ticket = encontrarTicket(orderId, sentAt, destino);
  if (!ticket)             return { success: false, error: 'La comanda ya no está activa' };
  if (!ticket.next_status) return { success: false, error: 'La comanda ya está lista' };
  return moverPasoTicket(orderId, sentAt, destino, ticket.status, ticket.next_status);
}

/** Regresa un paso, sin tocar los platos que ya avanzaron más allá. */
function retreatTicket(orderId, sentAt, destino) {
  const ticket = encontrarTicket(orderId, sentAt, destino);
  if (!ticket) return { success: false, error: 'La comanda ya no está activa' };
  const anterior = { preparando: 'en_espera', listo: 'preparando' }[ticket.status];
  if (!anterior) return { success: false, error: 'No se puede regresar desde este paso' };
  return moverPasoTicket(orderId, sentAt, destino, ticket.status, anterior);
}

/**
 * Entrega solo lo que ya está listo en una comanda, sin esperar al resto.
 * Si un pedido de varios platos se atrasa, lo que ya salió se lleva a la
 * mesa y el plato atrasado se queda en el tablero de cocina hasta que
 * también esté listo.
 */
function deliverReadyItems(orderId, sentAt, destino) {
  const res = moverPasoTicket(orderId, sentAt, destino, 'listo', 'entregado');
  if (!res.success) return { success: false, error: 'No hay ítems listos para entregar' };
  return res;
}

/** Cambia el estado de un solo ítem, para corregir sin mover toda la comanda. */
function setItemStatus(itemId, status) {
  if (!ITEM_ESTADOS.includes(status)) return { success: false, error: 'Estado inválido' };
  const item = db.get('orderItems').find({ id: itemId }).value();
  if (!item) return { success: false, error: 'Ítem no encontrado' };

  const cambio = { status };
  const sello = SELLO_ESTADO[status];
  if (sello) cambio[sello] = now();
  db.get('orderItems').find({ id: itemId }).assign(cambio).write();
  return { success: true, status, label: ESTADO_LABEL[status] };
}

// ── Historial de cocina y barra ──────────────────────────────────────────────
// Minutos totales aceptables entre enviar la comanda y entregarla. Sirve
// solo para marcar "tardía" en el historial; el tablero en vivo usa sus
// propios umbrales por paso (KDS_ALERTA).
const TARDIO_MIN = { Cocina: 20, Barra: 10 };

/**
 * Todo lo que se envió a cocina o barra, entregado o no, de cualquier orden
 * (abierta o ya cobrada) — a diferencia de getKitchenTickets, que solo
 * muestra lo que sigue vivo en el tablero. Es el registro permanente.
 */
function getKitchenHistory(dateFrom, dateTo) {
  const orders  = db.get('orders').value();
  const porId   = new Map(orders.map(o => [o.id, o]));
  const tables  = db.get('tables').value();
  const users   = db.get('users').value();

  let items = enrichItems(db.get('orderItems').value()).filter(i => i.sent_at);
  if (dateFrom) items = items.filter(i => i.sent_at >= dateFrom);
  if (dateTo)   items = items.filter(i => i.sent_at <= dateTo + 'T23:59:59.999Z');

  const grupos = new Map();
  for (const i of items) {
    const order = porId.get(i.order_id);
    if (!order) continue;   // la orden se eliminó del historial de ventas
    const k = claveComanda(i);
    if (!grupos.has(k)) {
      grupos.set(k, {
        key:            k,
        order_id:       i.order_id,
        destino:        i.destino,
        sent_at:        i.sent_at,
        table_name:     tables.find(t => t.id === order.table_id)?.name || '?',
        user_name:      users.find(u => u.id === order.user_id)?.full_name || '?',
        order_status:   order.status,
        order_closed_at: order.closed_at || null,
        items:          []
      });
    }
    grupos.get(k).items.push(i);
  }

  return [...grupos.values()].map(t => {
    const status = t.items.reduce((peor, i) =>
      ITEM_ESTADOS.indexOf(i.status) < ITEM_ESTADOS.indexOf(peor) ? i.status : peor,
      'entregado');
    const entregas = t.items.map(i => i.delivered_at).filter(Boolean).sort();
    const deliveredAt = status === 'entregado' ? entregas[entregas.length - 1] || null : null;

    // Si nunca se marcó como entregado y la cuenta ya se cerró, el cliente ya
    // se fue: el reloj no puede seguir corriendo en tiempo real para siempre.
    // Se congela en el momento del cobro, no en "ahora".
    const cerradaSinEntregar = !deliveredAt && t.order_status !== 'abierta';
    const referencia = deliveredAt || (cerradaSinEntregar ? t.order_closed_at : null) || now();
    const minutos = Math.round((new Date(referencia) - new Date(t.sent_at)) / 60000);

    // Qué plato específico frenó a los demás: si ya se entregó todo, es el que
    // salió último; si no, es el que se quedó más atrás de sus compañeros de
    // comanda. Cuando todos comparten la misma marca no hay un culpable único
    // — toda la comanda tardó por igual — así que la lista queda completa y el
    // frontend decide no señalar a nadie en ese caso.
    const culpableIds = status === 'entregado'
      ? t.items.filter(i => i.delivered_at === entregas[entregas.length - 1]).map(i => i.id)
      : t.items.filter(i => i.status === status).map(i => i.id);

    return {
      ...t,
      qty:          t.items.reduce((s, i) => s + i.quantity, 0),
      status,
      status_label: ESTADO_LABEL[status],
      delivered_at: deliveredAt,
      cerrada_sin_entregar: cerradaSinEntregar,
      minutos,      // preparación si ya entregó; si no, transcurrido hasta ahora o hasta el cobro
      tardio:       minutos > (TARDIO_MIN[t.destino] || 15),
      culprit_ids:  culpableIds
    };
  }).sort((a, b) => String(b.sent_at).localeCompare(String(a.sent_at)));   // más reciente primero
}

/** El historial agrupado por día de envío, para navegar fecha por fecha. */
function getKitchenHistoryByDay(dateFrom, dateTo) {
  const tickets = getKitchenHistory(dateFrom, dateTo);
  const porDia = new Map();

  for (const t of tickets) {
    const dia = t.sent_at.slice(0, 10);   // YYYY-MM-DD
    if (!porDia.has(dia)) {
      porDia.set(dia, { date: dia, tickets: [], qty: 0, entregados: 0, tardios: 0 });
    }
    const g = porDia.get(dia);
    g.tickets.push(t);
    g.qty += t.qty;
    if (t.status === 'entregado') g.entregados++;
    if (t.tardio) g.tardios++;
  }

  return [...porDia.values()].sort((a, b) => b.date.localeCompare(a.date));
}

function setOrderDiscount(orderId, type, value) {
  const order = db.get('orders').find({ id: orderId }).value();
  if (!order) return { success: false, error: 'Orden no encontrada' };

  if (!type) {
    db.get('orders').find({ id: orderId }).assign({ discount_type: null, discount_value: 0 }).write();
    return { success: true };
  }
  if (!['monto', 'porcentaje'].includes(type))
    return { success: false, error: 'Tipo de descuento inválido' };

  const v = Number(value);
  if (!Number.isFinite(v) || v < 0) return { success: false, error: 'Valor de descuento inválido' };
  if (type === 'porcentaje' && v > 100) return { success: false, error: 'El porcentaje no puede pasar de 100' };

  db.get('orders').find({ id: orderId }).assign({ discount_type: type, discount_value: v }).write();
  return { success: true };
}

/**
 * Cierra la orden con el detalle del pago. Guarda el desglose calculado para
 * que el historial no cambie si mañana se editan los precios del producto.
 */
function closeOrder(orderId, payment = {}) {
  const order = db.get('orders').find({ id: orderId }).value();
  if (!order) return { success: false, error: 'Orden no encontrada' };
  if (order.status === 'cobrada') return { success: false, error: 'La orden ya fue cobrada' };

  const items = db.get('orderItems').filter({ order_id: orderId }).value();
  if (!items.length) return { success: false, error: 'La orden está vacía' };

  const method = payment.method || 'efectivo';
  if (!PAYMENT_METHODS.includes(method)) return { success: false, error: 'Método de pago inválido' };

  const tip = round2(payment.tip);
  if (tip < 0) return { success: false, error: 'La propina no puede ser negativa' };

  const totals = computeTotals({ ...order, tip }, items);

  // En efectivo se exige cubrir el total; con tarjeta o transferencia el cobro
  // es exacto y el vuelto no aplica.
  let amountPaid = round2(payment.amountPaid);
  let change     = 0;
  if (method === 'efectivo') {
    if (!amountPaid) amountPaid = totals.total;
    if (amountPaid < totals.total)
      return { success: false, error: `Efectivo insuficiente: faltan Q${round2(totals.total - amountPaid).toFixed(2)}` };
    change = round2(amountPaid - totals.total);
  } else {
    amountPaid = totals.total;
  }

  db.get('orders').find({ id: orderId }).assign({
    status: 'cobrada',
    closed_at: now(),
    tip,
    payment_method: method,
    amount_paid: amountPaid,
    change_given: change,
    totals_snapshot: totals
  }).write();
  db.get('tables').find({ id: order.table_id }).assign({ status: 'libre' }).write();

  return { success: true, ...totals, payment_method: method, amount_paid: amountPaid, change_given: change };
}

// ── Cancel Order (liberar mesa) ───────────────────────────────────────────────
function cancelOrder(orderId) {
  const order = db.get('orders').find({ id: orderId }).value();
  if (!order) return { success: false, error: 'Orden no encontrada' };
  db.get('orderItems').remove({ order_id: orderId }).write();
  db.get('orders').remove({ id: orderId }).write();
  db.get('tables').find({ id: order.table_id }).assign({ status: 'libre' }).write();
  return { success: true };
}

// ── Delete Order (historial) ──────────────────────────────────────────────────
function deleteOrder(id) {
  const order = db.get('orders').find({ id }).value();
  if (!order) return { success: false, error: 'Orden no encontrada' };
  db.get('orderItems').remove({ order_id: id }).write();
  db.get('orders').remove({ id }).write();
  return { success: true };
}

// ── Order History ─────────────────────────────────────────────────────────────
function getOrderHistory(dateFrom, dateTo) {
  const tables   = db.get('tables').value();
  const users    = db.get('users').value();
  const products = db.get('products').value();
  const allItems = db.get('orderItems').value();

  let query = db.get('orders').filter({ status: 'cobrada' });

  if (dateFrom) {
    query = query.filter(o => (o.closed_at || '') >= dateFrom);
  }
  if (dateTo) {
    const toEnd = dateTo + 'T23:59:59.999Z';
    query = query.filter(o => (o.closed_at || '') <= toEnd);
  }

  return query.orderBy('closed_at', 'desc').map(o => {
    const items = allItems
      .filter(i => i.order_id === o.id)
      .map(i => ({
        ...i,
        note: i.note || '',
        product_name: products.find(p => p.id === i.product_id)?.name || '?'
      }));
    return {
      ...o,
      table_name: tables.find(t => t.id === o.table_id)?.name || '?',
      user_name:  users.find(u => u.id === o.user_id)?.full_name || '?',
      payment_method: o.payment_method || 'efectivo',
      payment_label:  PAYMENT_LABELS[o.payment_method] || 'Efectivo',
      guests: o.guests || 0,
      items,
      // Órdenes cobradas antes del desglose no tienen snapshot: se recalculan.
      ...(o.totals_snapshot || computeTotals(o, items))
    };
  }).value();
}

/** Corte por método de pago: lo que debe estar en caja vs lo que entró por banco. */
function getPaymentBreakdown(dateFrom, dateTo) {
  const orders = getOrderHistory(dateFrom, dateTo);
  const base = PAYMENT_METHODS.map(m => ({
    method: m, label: PAYMENT_LABELS[m], orders: 0, total: 0, tip: 0
  }));

  for (const o of orders) {
    const row = base.find(b => b.method === o.payment_method) || base[0];
    row.orders += 1;
    row.total  = round2(row.total + o.total);
    row.tip    = round2(row.tip + (o.tip || 0));
  }

  return {
    methods: base,
    total:   round2(base.reduce((s, b) => s + b.total, 0)),
    tips:    round2(base.reduce((s, b) => s + b.tip, 0)),
    orders:  orders.length
  };
}

/** Anulaciones del periodo: qué se quitó, quién y por qué. */
function getVoids(dateFrom, dateTo) {
  const tables = db.get('tables').value();
  const orders = db.get('orders').value();

  let list = db.get('voids');
  if (dateFrom) list = list.filter(v => (v.created_at || '') >= dateFrom);
  if (dateTo)   list = list.filter(v => (v.created_at || '') <= dateTo + 'T23:59:59.999Z');

  return list.orderBy('created_at', 'desc').map(v => {
    const order = orders.find(o => o.id === v.order_id);
    return {
      ...v,
      table_name: tables.find(t => t.id === order?.table_id)?.name || '?',
      amount: round2(v.unit_price * v.quantity)
    };
  }).value();
}

// ── Waiter History ────────────────────────────────────────────────────────────
function getWaiterHistory(dateFrom, dateTo) {
  const users    = db.get('users').value();
  const tables   = db.get('tables').value();
  const products = db.get('products').value();
  const allItems = db.get('orderItems').value();

  let query = db.get('orders').filter({ status: 'cobrada' });
  if (dateFrom) query = query.filter(o => (o.closed_at || '') >= dateFrom);
  if (dateTo)   query = query.filter(o => (o.closed_at || '') <= dateTo + 'T23:59:59.999Z');

  const orders = query.value();
  const byUser = {};

  for (const o of orders) {
    if (!byUser[o.user_id]) {
      const u = users.find(u => u.id === o.user_id);
      byUser[o.user_id] = {
        user_id:   o.user_id,
        user_name: u?.full_name || '?',
        orders:    [],
        total:     0,
        tips:      0,
        items_qty: 0
      };
    }
    const items = allItems
      .filter(i => i.order_id === o.id)
      .map(i => ({
        ...i,
        note: i.note || '',
        product_name: products.find(p => p.id === i.product_id)?.name || '?'
      }));
    const totals = o.totals_snapshot || computeTotals(o, items);
    byUser[o.user_id].orders.push({
      ...o,
      table_name: tables.find(t => t.id === o.table_id)?.name || '?',
      payment_label: PAYMENT_LABELS[o.payment_method] || 'Efectivo',
      items,
      ...totals
    });
    byUser[o.user_id].total     = round2(byUser[o.user_id].total + totals.total);
    byUser[o.user_id].tips      = round2((byUser[o.user_id].tips || 0) + totals.tip);
    byUser[o.user_id].items_qty += items.reduce((s, i) => s + i.quantity, 0);
  }

  return Object.values(byUser).sort((a, b) => b.total - a.total);
}

module.exports = {
  initDB,
  login,
  getUsers, createUser, updateUser, deleteUser, changePassword,
  getCategories, createCategory, updateCategory, deleteCategory,
  getProducts, createProduct, updateProduct, deleteProduct,
  getTables, createTable, updateTable, deleteTable,
  getOpenOrders, getOrderWithItems, createOrder,
  setOrderGuests, transferOrder, setOrderDiscount, sendToKitchen,
  addOrderItem, setOrderItemNote, updateOrderItem, removeOrderItem, voidOrderItem,
  getKitchenTickets, getKitchenCounts, setTicketStatus, advanceTicket, retreatTicket,
  deliverReadyItems, setItemStatus, getKitchenHistory, getKitchenHistoryByDay,
  closeOrder, cancelOrder, deleteOrder,
  getOrderHistory, getWaiterHistory, getPaymentBreakdown, getVoids,
  PAYMENT_METHODS, PAYMENT_LABELS, TAX_RATE, ESTADO_LABEL
};
