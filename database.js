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
    _seq: { users: 0, categories: 0, products: 0, tables: 0, orders: 0, orderItems: 0 }
  }).write();

  if (db.get('users').size().value() === 0) seedData();
}

function nextId(col) {
  const n = db.get(`_seq.${col}`).value() + 1;
  db.set(`_seq.${col}`, n).write();
  return n;
}

const now = () => new Date().toISOString();

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

  // Categorías
  const cats = [
    { name: 'Cervezas',            type: 'bebida'  },
    { name: 'Licores y Tragos',    type: 'bebida'  },
    { name: 'Refrescos',           type: 'bebida'  },
    { name: 'Boquitas Frías',      type: 'boquita' },
    { name: 'Boquitas Calientes',  type: 'boquita' },
    { name: 'Entradas',            type: 'comida'  },
    { name: 'Platos Fuertes',      type: 'comida'  },
    { name: 'Cocteles',            type: 'bebida'  },
  ];
  const catIds = {};
  cats.forEach(c => {
    const id = nextId('categories');
    catIds[c.name] = id;
    db.get('categories').push({ id, ...c }).write();
  });

  // Cervezas — La Taberna
  const cervezas = [
    { name: 'Gallo Vidrio',         price: 0, category_id: catIds['Cervezas'] },
    { name: 'Gallo Litro',          price: 0, category_id: catIds['Cervezas'] },
    { name: 'Corona Vidrio',        price: 0, category_id: catIds['Cervezas'] },
    { name: 'Corona Lata',          price: 0, category_id: catIds['Cervezas'] },
    { name: 'Heineken Vidrio',      price: 0, category_id: catIds['Cervezas'] },
    { name: 'Montecarlo Vidrio',    price: 0, category_id: catIds['Cervezas'] },
    { name: 'Stella Artois Vidrio', price: 0, category_id: catIds['Cervezas'] },
    { name: 'Michelob Ultra Lata',  price: 0, category_id: catIds['Cervezas'] },
  ];
  cervezas.forEach(p =>
    db.get('products').push({ id: nextId('products'), ...p, available: true }).write()
  );

  // Otros productos
  const products = [
    { name: 'Ron con Cola',            price: 0,  category_id: catIds['Licores y Tragos']   },
    { name: 'Vodka con Jugo',          price: 0,  category_id: catIds['Licores y Tragos']   },
    { name: 'Whisky en las Rocas',     price: 0,  category_id: catIds['Licores y Tragos']   },
    { name: 'Margarita',               price: 0,  category_id: catIds['Licores y Tragos']   },
    { name: 'Coca-Cola',               price: 0,  category_id: catIds['Refrescos']          },
    { name: 'Agua Mineral',            price: 0,  category_id: catIds['Refrescos']          },
    { name: 'Jugo Natural',            price: 0,  category_id: catIds['Refrescos']          },
    { name: 'Nachos con Guacamole',    price: 0,  category_id: catIds['Boquitas Frías']     },
    { name: 'Tabla de Quesos',         price: 0,  category_id: catIds['Boquitas Frías']     },
    { name: 'Alitas de Pollo',         price: 0,  category_id: catIds['Boquitas Calientes'] },
    { name: 'Camarones al Ajillo',     price: 0,  category_id: catIds['Boquitas Calientes'] },
    { name: 'Papas Fritas',            price: 0,  category_id: catIds['Boquitas Calientes'] },
    { name: 'Sopa del Día',            price: 0,  category_id: catIds['Entradas']           },
    { name: 'Ensalada César',          price: 0,  category_id: catIds['Entradas']           },
    { name: 'Churrasco a la Parrilla', price: 0,  category_id: catIds['Platos Fuertes']     },
    { name: 'Filete de Pescado',       price: 0,  category_id: catIds['Platos Fuertes']     },
    { name: 'Pollo a la Plancha',      price: 0,  category_id: catIds['Platos Fuertes']     },
    { name: 'Pasta Carbonara',         price: 0,  category_id: catIds['Platos Fuertes']     },
  ];
  products.forEach(p =>
    db.get('products').push({ id: nextId('products'), ...p, available: true }).write()
  );

  // Mesas y barras
  for (let i = 1; i <= 8; i++)
    db.get('tables').push({ id: nextId('tables'), name: `Mesa ${i}`, capacity: 4, status: 'libre' }).write();
  db.get('tables').push({ id: nextId('tables'), name: 'Barra 1', capacity: 2, status: 'libre' }).write();
  db.get('tables').push({ id: nextId('tables'), name: 'Barra 2', capacity: 2, status: 'libre' }).write();
  db.get('tables').push({ id: nextId('tables'), name: 'Terraza', capacity: 6, status: 'libre' }).write();
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

// ── Categories ────────────────────────────────────────────────────────────────
function getCategories() {
  return db.get('categories').sortBy(['type', 'name']).value();
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
function getOpenOrders() {
  const orders   = db.get('orders').filter({ status: 'abierta' }).value();
  const tables   = db.get('tables').value();
  const users    = db.get('users').value();
  const allItems = db.get('orderItems').value();
  return orders.map(o => {
    const items = allItems.filter(i => i.order_id === o.id);
    const total = items.reduce((s, i) => s + i.unit_price * i.quantity, 0);
    return {
      ...o,
      table_name: tables.find(t => t.id === o.table_id)?.name  || '?',
      user_name:  users.find(u => u.id === o.user_id)?.full_name || '?',
      item_count: items.reduce((s, i) => s + i.quantity, 0),
      total
    };
  });
}

function getOrderWithItems(orderId) {
  const order = db.get('orders').find({ id: orderId }).value();
  if (!order) return null;

  const tables   = db.get('tables').value();
  const users    = db.get('users').value();
  const products = db.get('products').value();
  const items    = db.get('orderItems').filter({ order_id: orderId }).value();

  const enrichedItems = items.map(item => ({
    ...item,
    product_name: products.find(p => p.id === item.product_id)?.name || '?'
  }));

  const total = enrichedItems.reduce((s, i) => s + i.unit_price * i.quantity, 0);

  return {
    ...order,
    table_name: tables.find(t => t.id === order.table_id)?.name  || '?',
    user_name:  users.find(u => u.id === order.user_id)?.full_name || '?',
    items: enrichedItems,
    total
  };
}

function createOrder(tableId, userId) {
  const existing = db.get('orders').find({ table_id: tableId, status: 'abierta' }).value();
  if (existing) return { success: false, error: 'La mesa ya tiene una orden abierta', orderId: existing.id };

  const id = nextId('orders');
  db.get('orders').push({ id, table_id: tableId, user_id: userId, status: 'abierta', created_at: now() }).write();
  db.get('tables').find({ id: tableId }).assign({ status: 'ocupada' }).write();
  return { success: true, orderId: id };
}

function addOrderItem(orderId, productId, qty) {
  const existing = db.get('orderItems').find({ order_id: orderId, product_id: productId }).value();
  if (existing) {
    db.get('orderItems').find({ id: existing.id }).assign({ quantity: existing.quantity + qty }).write();
  } else {
    const product = db.get('products').find({ id: productId }).value();
    db.get('orderItems').push({
      id: nextId('orderItems'),
      order_id:   orderId,
      product_id: productId,
      quantity:   qty,
      unit_price: product.price
    }).write();
  }
  return { success: true };
}

function updateOrderItem(itemId, qty) {
  if (qty <= 0) {
    db.get('orderItems').remove({ id: itemId }).write();
  } else {
    db.get('orderItems').find({ id: itemId }).assign({ quantity: qty }).write();
  }
  return { success: true };
}

function removeOrderItem(itemId) {
  db.get('orderItems').remove({ id: itemId }).write();
  return { success: true };
}

function closeOrder(orderId) {
  const order = db.get('orders').find({ id: orderId }).value();
  if (!order) return { success: false, error: 'Orden no encontrada' };
  db.get('orders').find({ id: orderId }).assign({ status: 'cobrada', closed_at: now() }).write();
  db.get('tables').find({ id: order.table_id }).assign({ status: 'libre' }).write();
  return { success: true };
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
        product_name: products.find(p => p.id === i.product_id)?.name || '?'
      }));
    const total = items.reduce((s, i) => s + i.unit_price * i.quantity, 0);
    return {
      ...o,
      table_name: tables.find(t => t.id === o.table_id)?.name || '?',
      user_name:  users.find(u => u.id === o.user_id)?.full_name || '?',
      items,
      total
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
        items_qty: 0
      };
    }
    const items = allItems
      .filter(i => i.order_id === o.id)
      .map(i => ({
        ...i,
        product_name: products.find(p => p.id === i.product_id)?.name || '?'
      }));
    const total = items.reduce((s, i) => s + i.unit_price * i.quantity, 0);
    byUser[o.user_id].orders.push({
      ...o,
      table_name: tables.find(t => t.id === o.table_id)?.name || '?',
      items,
      total
    });
    byUser[o.user_id].total     += total;
    byUser[o.user_id].items_qty += items.reduce((s, i) => s + i.quantity, 0);
  }

  return Object.values(byUser).sort((a, b) => b.total - a.total);
}

module.exports = {
  initDB,
  login,
  getUsers, createUser, updateUser, deleteUser,
  getCategories,
  getProducts, createProduct, updateProduct, deleteProduct,
  getTables, createTable, updateTable, deleteTable,
  getOpenOrders, getOrderWithItems, createOrder,
  addOrderItem, updateOrderItem, removeOrderItem, closeOrder,
  cancelOrder, deleteOrder, getOrderHistory, getWaiterHistory
};
