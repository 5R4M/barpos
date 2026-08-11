/* ════════════════════════════════════════════════════════════
   BarPOS — renderer.js
   Toda la lógica del frontend (proceso renderer de Electron)
════════════════════════════════════════════════════════════ */

'use strict';

// ── Estado global ─────────────────────────────────────────────────────────────
const State = {
  user:           null,   // usuario logueado
  products:       [],
  categories:     [],
  tables:         [],
  openOrders:     [],
  currentOrderId: null,
  categoryFilter: null,   // null = todos
  openMenuCats:   new Set(),  // categorías desplegadas en el menú, por id. Arranca vacío:
                              // el menú abre colapsado y sobrevive al re-render de cada toque.
  menuSearch:     '',     // texto del buscador de la carta
  currentOrder:   null,   // última orden cargada, para los modales de la vista
  noteItem:       null,   // ítem cuya nota se está editando
  voidTarget:     null,   // ítem que se está anulando
  pago:           { method: 'efectivo', tip: 0, cash: null, chipsTotal: null },
  cocinaDestino:  null,   // null = Cocina y Barra juntas
  cocinaTickets:  [],
  editProduct:    null,
  editCategory:   null,
  editTable:      null,
  editUser:       null,
  pendingConfirm: null,
  historyOrders:  []
};

// ═══════════════════════════════════════════════════════════════════════════════
// AUTH
// ═══════════════════════════════════════════════════════════════════════════════
async function handleLogin(e) {
  e.preventDefault();
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;
  const errEl    = document.getElementById('login-error');
  const btn      = document.getElementById('login-btn');

  errEl.classList.add('hidden');
  btn.textContent = 'Verificando…';
  btn.disabled    = true;

  try {
    const user = await window.api.auth.login(username, password);

    if (!user) {
      errEl.textContent = 'Usuario o contraseña incorrectos.';
      errEl.classList.remove('hidden');
      return;
    }

    State.user = user;
    document.getElementById('sidebar-name').textContent = user.full_name;
    document.getElementById('sidebar-role').textContent = user.role === 'admin' ? 'Administrador' : 'Mesero';
    document.getElementById('user-avatar').textContent  = user.full_name.charAt(0).toUpperCase();

    // Mostrar/ocultar árbol admin según rol
    const isAdmin = user.role === 'admin';
    const adminTree   = document.getElementById('nav-admin-tree');
    const historyTree = document.getElementById('nav-history-tree');
    if (adminTree)   adminTree.style.display   = isAdmin ? 'block' : 'none';
    if (historyTree) historyTree.style.display = isAdmin ? 'block' : 'none';
    document.querySelectorAll('.admin-only')
      .forEach(el => el.style.display = isAdmin ? 'inline-flex' : 'none');

    await window.api.window.expand();
    showView('view-app');
    await loadBaseData();
    showMainView('tables');
    updateCocinaBadge();
    await window.api.window.show();

  } catch (err) {
    errEl.textContent = 'Error al conectar. Intente de nuevo.';
    errEl.classList.remove('hidden');
  } finally {
    btn.textContent = 'Iniciar Sesión';
    btn.disabled    = false;
  }
}

function logout() {
  State.user           = null;
  State.currentOrderId = null;
  State.products       = [];
  State.categories     = [];
  State.tables         = [];
  State.openOrders     = [];
  State.openMenuCats.clear();

  // Ocultar y colapsar árbol admin al cerrar sesión
  const adminTree = document.getElementById('nav-admin-tree');
  if (adminTree) adminTree.style.display = 'none';
  const historyTreeEl = document.getElementById('nav-history-tree');
  if (historyTreeEl) historyTreeEl.style.display = 'none';
  const children = document.getElementById('nav-admin-children');
  const chevron  = document.getElementById('nav-admin-chevron');
  if (children) children.classList.remove('open');
  if (chevron)  chevron.classList.remove('open');
  document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'none');

  // Colapsar árbol de historial
  const histChildren = document.getElementById('nav-history-children');
  const histChevron  = document.getElementById('nav-history-chevron');
  if (histChildren) histChildren.classList.remove('open');
  if (histChevron)  histChevron.classList.remove('open');

  document.getElementById('login-username').value = '';
  document.getElementById('login-password').value = '';
  document.getElementById('login-error').classList.add('hidden');

  showView('view-login');
  window.api.window.collapse();
  document.getElementById('login-username').focus();
}

// ── Vista base ─────────────────────────────────────────────────────────────────
function showView(id) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

async function loadBaseData() {
  [State.products, State.categories] = await Promise.all([
    window.api.products.list(),
    window.api.categories.list()
  ]);
}

// ═══════════════════════════════════════════════════════════════════════════════
// NAVEGACIÓN PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════
function toggleAdminMenu() {
  const children = document.getElementById('nav-admin-children');
  const chevron  = document.getElementById('nav-admin-chevron');
  const open = children.classList.toggle('open');
  chevron.classList.toggle('open', open);
}

// Mapa de rutas admin directas → tab
const ADMIN_ROUTES = {
  'admin-productos':  'productos',
  'admin-categorias': 'categorias',
  'admin-mesas':      'mesas',
  'admin-usuarios':   'usuarios'
};
const ADMIN_LABELS = {
  productos:  'Productos',
  categorias: 'Categorías',
  mesas:      'Mesas',
  usuarios:   'Usuarios'
};

// Tipos de categoría: etiqueta en singular (tablas/badges), en plural (filtros)
// y el orden en que se recorre la carta: se toma primero, se come después.
const TYPE_LABEL        = { bebida: 'Bebida',  boquita: 'Boquita',  comida: 'Comida' };
const TYPE_LABEL_PLURAL = { bebida: 'Bebidas', boquita: 'Boquitas', comida: 'Comida' };
const TYPE_ORDER        = { bebida: 0, boquita: 1, comida: 2 };

function showMainView(name) {
  // Historial y administración solo para admins
  const soloAdmin = name === 'history' || !!ADMIN_ROUTES[name];
  if (soloAdmin && State.user && State.user.role !== 'admin') return;

  document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));

  if (ADMIN_ROUTES[name]) {
    // Rutas admin directas
    document.getElementById('view-admin').classList.add('active');
    const nb = document.getElementById(`nav-${name}`);
    if (nb) nb.classList.add('active');
    const tab = ADMIN_ROUTES[name];
    document.getElementById('admin-section-title').textContent = ADMIN_LABELS[tab] || tab;
    switchAdminTab(tab, null);
  } else {
    document.getElementById(`view-${name}`).classList.add('active');
    const nb = document.getElementById(`nav-${name}`);
    if (nb) nb.classList.add('active');
    if (name === 'tables')  refreshTables();
    if (name === 'cocina')  loadCocina();
    if (name === 'history') initHistoryView();
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MESAS
// ═══════════════════════════════════════════════════════════════════════════════
async function refreshTables() {
  [State.tables, State.openOrders] = await Promise.all([
    window.api.tables.list(),
    window.api.orders.openList()
  ]);
  renderTables();
}

// ── Set de iconos (trazo Lucide, 24×24, currentColor) ─────────────────────────
const ICON_PATHS = {
  users:    '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  user:     '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  clock:    '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  arrow:    '<path d="M5 12h13"/><path d="m12 5 7 7-7 7"/>',
  back:     '<path d="M19 12H5"/><path d="m12 19-7-7 7-7"/>',
  chevron:  '<path d="m6 9 6 6 6-6"/>',
  plus:     '<path d="M12 5v14"/><path d="M5 12h14"/>',
  minus:    '<path d="M5 12h14"/>',
  pencil:   '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
  trash:    '<path d="M3 6h18"/><path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M10 11v6"/><path d="M14 11v6"/>',
  search:   '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  x:        '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  logout:   '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>',
  chart:    '<path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>',
  check:    '<path d="M20 6 9 17l-5-5"/>',
  alert:    '<path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/>',
  info:     '<circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><path d="M12 8h.01"/>',
  table:    '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M3 10h18"/>',
  receipt:  '<path d="M4 3v18l2.5-1.5L9 21l2.5-1.5L14 21l2.5-1.5L19 21V3l-2.5 1.5L14 3l-2.5 1.5L9 3 6.5 4.5Z"/><path d="M8 9h8"/><path d="M8 13h5"/>',
  send:     '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
  note:     '<path d="M4 5a2 2 0 0 1 2-2h8l6 6v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z"/><path d="M14 3v6h6"/><path d="M8 13h8"/><path d="M8 17h5"/>',
  ban:      '<circle cx="12" cy="12" r="9"/><path d="m5.6 5.6 12.8 12.8"/>',
  tag:      '<path d="M20.6 13.4 12 22l-9-9V3h10l7.6 7.6a2 2 0 0 1 0 2.8Z"/><circle cx="7.5" cy="7.5" r="1.2"/>',
  swap:     '<path d="M8 3 4 7l4 4"/><path d="M4 7h16"/><path d="m16 21 4-4-4-4"/><path d="M20 17H4"/>',
  cash:     '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/>',
  card:     '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>'
};

// Etiquetas de método de pago. El espejo del mapa en database.js.
const PAYMENT_LABELS = { efectivo: 'Efectivo', tarjeta: 'Tarjeta', transferencia: 'Transferencia' };
const PAYMENT_ICONS  = { efectivo: 'cash', tarjeta: 'card', transferencia: 'swap' };

// Sugerencias frecuentes para la nota de un ítem, para no teclear en la tablet.
const NOTE_SUGGESTIONS = [
  'Sin hielo', 'Sin cebolla', 'Sin picante', 'Término medio',
  'Bien cocido', 'Para llevar', 'Aparte', 'Poco sal'
];

function icon(name, size = 14, cls = '') {
  const p = ICON_PATHS[name];
  if (!p) return '';
  return `<svg class="ico ${cls}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
}

// Filtro activo de la vista de mesas: 'all' | 'libre' | 'ocupada'
let tableFilter = 'all';

function setTableFilter(value, btn) {
  tableFilter = value;
  document.querySelectorAll('.seg-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderTables();
}

// "hace X" desde la apertura de la orden
function elapsedLabel(iso) {
  if (!iso) return '—';
  const mins = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1)  return 'recién';
  if (mins < 60) return `${mins} min`;
  return `${Math.floor(mins / 60)} h ${mins % 60} min`;
}

function renderTables() {
  const grid = document.getElementById('tables-grid');
  if (!grid) return;

  const all      = State.tables;
  const ocupadas = all.filter(t => t.status === 'ocupada').length;
  const libres   = all.length - ocupadas;

  // Contadores de cabecera
  const setTxt = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  setTxt('cnt-all', all.length);
  setTxt('cnt-libre', libres);
  setTxt('cnt-ocupada', ocupadas);
  setTxt('tables-subtitle', all.length
    ? `${all.length} espacios · ${libres} disponibles · ${ocupadas} en servicio`
    : 'Sin espacios configurados');

  const list = tableFilter === 'all' ? all : all.filter(t => t.status === tableFilter);

  if (!list.length) {
    const msg = !all.length            ? 'No hay mesas configuradas.'
              : tableFilter === 'libre' ? 'Todas las mesas están ocupadas.'
              :                           'No hay mesas ocupadas.';
    grid.innerHTML = `<div class="tables-empty">${icon('table', 46)}<p>${msg}</p></div>`;
    return;
  }

  grid.innerHTML = list.map(t => {
    const isOcupada = t.status === 'ocupada';
    const n = t.name.toLowerCase();

    // Glifo: número de mesa, o inicial para barra/terraza
    let glyph;
    if (n.includes('barra'))        glyph = 'B';
    else if (n.includes('terraza')) glyph = 'T';
    else glyph = (t.name.match(/\d+/) || [''])[0] || t.name.charAt(0).toUpperCase();

    const order = isOcupada ? State.openOrders.find(o => o.table_id === t.id) : null;

    const foot = isOcupada
      ? `<div class="tc-foot">
           <span class="tc-time">${icon('clock', 13)}${esc(elapsedLabel(order && order.created_at))}</span>
           <button class="tc-free" onclick="event.stopPropagation(); confirmarLiberarMesa(${t.id})"
                   aria-label="Liberar ${esc(t.name)}">Liberar</button>
         </div>`
      : `<div class="tc-foot">
           <span class="tc-hint">Abrir orden ${icon('arrow', 13)}</span>
         </div>`;

    // Lo que ya consumió la mesa y lo que la cocina todavía no recibe
    const cuenta = isOcupada && order
      ? `<div class="tc-cuenta">
           <span class="tc-cuenta-total">${fmt(order.total)}</span>
           ${order.pending_count > 0
             ? `<span class="tc-pendiente">${icon('send', 12)}${order.pending_count} sin enviar</span>`
             : ''}
         </div>`
      : '';

    return `
      <div class="table-card ${t.status}" role="button" tabindex="0"
           aria-label="${esc(t.name)}, ${isOcupada ? 'ocupada' : 'libre'}"
           onclick="openTable(${t.id})"
           onkeydown="if(event.target===this&&(event.key==='Enter'||event.key===' ')){event.preventDefault();openTable(${t.id});}">
        <div class="tc-top">
          <span class="tc-tile">${esc(glyph)}</span>
          <span class="tc-state"><span class="tc-dot" aria-hidden="true"></span>${isOcupada ? 'Ocupada' : 'Libre'}</span>
        </div>
        <div class="tc-body">
          <div class="tc-name" title="${esc(t.name)}">${esc(t.name)}</div>
          <div class="tc-meta">${icon('users', 13)}${
            isOcupada && order && order.guests ? `${order.guests} de ${t.capacity}` : `${t.capacity} personas`
          }</div>
          ${cuenta}
        </div>
        ${foot}
      </div>`;
  }).join('');
}

// Refresca los tiempos transcurridos mientras la vista de mesas esté visible
setInterval(() => {
  const view = document.getElementById('view-tables');
  if (view && view.classList.contains('active') && State.tables.length) renderTables();
}, 60000);

async function openTable(tableId) {
  // ¿hay orden abierta?
  const existingOrder = State.openOrders.find(o => o.table_id === tableId);

  let orderId;
  if (existingOrder) {
    orderId = existingOrder.id;
  } else {
    const res = await window.api.orders.create(tableId, State.user.id);
    if (!res.success) {
      // Si ya existe (race condition) la devuelve igual
      if (res.orderId) { orderId = res.orderId; }
      else { showToast(res.error || 'No se pudo crear la orden', 'error'); return; }
    } else {
      orderId = res.orderId;
    }
  }

  State.currentOrderId = orderId;
  State.openMenuCats.clear();   // cada mesa empieza con el menú colapsado
  searchMenu('');               // y sin arrastrar la búsqueda de la mesa anterior
  await loadOrder();
  showContentSection('view-order');

  // navBtn
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
}

function backToTables() {
  State.currentOrderId = null;
  State.currentOrder   = null;
  State.categoryFilter = null;
  State.menuSearch     = '';
  State.openMenuCats.clear();
  showMainView('tables');
}

function confirmarLiberarMesa(tableId) {
  const order = State.openOrders.find(o => o.table_id === tableId);
  if (!order) { showToast('No se encontró la orden abierta', 'error'); return; }
  const hasItems = /* comprobamos en la orden actual */ true;
  document.getElementById('confirm-title').textContent   = 'Liberar Mesa';
  document.getElementById('confirm-message').textContent =
    'Se cancelará la orden de esta mesa y quedará libre. ¿Continuar?';
  const btn = document.getElementById('btn-confirm-ok');
  btn.onclick = async () => {
    closeModal('modal-confirm');
    const res = await window.api.orders.cancel(order.id);
    if (res && res.success === false) { showToast(res.error || 'Error al liberar', 'error'); return; }
    showToast('Mesa liberada', 'success');
    await refreshTables();
  };
  openModal('modal-confirm');
}

function confirmarLiberarDesdeOrden() {
  document.getElementById('confirm-title').textContent   = 'Liberar Mesa';
  document.getElementById('confirm-message').textContent =
    'Se cancelará esta orden y la mesa quedará libre. Los ítems no cobrados se perderán.';
  const btn = document.getElementById('btn-confirm-ok');
  btn.onclick = async () => {
    closeModal('modal-confirm');
    const res = await window.api.orders.cancel(State.currentOrderId);
    if (res && res.success === false) { showToast(res.error || 'Error al liberar', 'error'); return; }
    showToast('Mesa liberada', 'success');
    State.currentOrderId = null;
    State.categoryFilter = null;
    State.openMenuCats.clear();
    await refreshTables();
    showMainView('tables');
  };
  openModal('modal-confirm');
}

// ═══════════════════════════════════════════════════════════════════════════════
// ORDEN
// ═══════════════════════════════════════════════════════════════════════════════
async function loadOrder() {
  const order = await window.api.orders.get(State.currentOrderId);
  if (!order) { showToast('Orden no encontrada', 'error'); backToTables(); return; }

  // Cabecera
  document.getElementById('order-table-title').textContent = order.table_name;
  document.getElementById('order-id-tag').textContent      = `#${order.id}`;
  document.getElementById('order-time').textContent        = formatDate(order.created_at);

  State.currentOrder = order;
  renderOrderItems(order);
  renderOrderSummary(order);
  buildMenuFilters();
  renderMenuProducts();
}

// ── Comanda ───────────────────────────────────────────────────────────────────
async function enviarComanda() {
  const btn = document.getElementById('btn-enviar');
  btn.disabled = true;
  const res = await window.api.orders.send(State.currentOrderId);
  btn.disabled = false;

  if (!res.success) { showToast(res.error || 'No se pudo enviar', 'error'); return; }

  showToast('Comanda enviada', 'success');
  await loadOrder();
  updateCocinaBadge();
  showComanda(res);
}

function showComanda(res) {
  const bloques = res.comandas.map(c => `
    <div class="comanda-bloque">
      <div class="comanda-destino">${esc(c.destino)}</div>
      <table class="receipt-table">
        <tbody>
          ${c.items.map(i => `
            <tr>
              <td style="text-align:center;width:36px"><b>${i.quantity}</b></td>
              <td>
                ${esc(i.product_name)}
                ${i.note ? `<div class="comanda-nota">${esc(i.note)}</div>` : ''}
              </td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`).join('');

  document.getElementById('comanda-content').innerHTML = `
    <div class="receipt-header">
      <h2>COMANDA</h2>
      <p>${esc(res.table_name)} · Orden #${res.order_id}</p>
    </div>
    <hr class="receipt-divider">
    <div class="receipt-meta">
      <div><span><b>Hora:</b></span><span>${formatDate(res.sent_at)}</span></div>
      <div><span><b>Mesero:</b></span><span>${esc(State.user ? State.user.full_name : '—')}</span></div>
    </div>
    <hr class="receipt-divider">
    ${bloques}`;

  openModal('modal-comanda');
}

// ═══════════════════════════════════════════════════════════════════════════════
// COCINA Y BARRA
// ═══════════════════════════════════════════════════════════════════════════════
const KDS_COLUMNAS = ['en_espera', 'preparando', 'listo'];
const KDS_ACCION   = {
  en_espera:  { label: 'Empezar',  icon: 'clock' },
  preparando: { label: 'Listo',    icon: 'check' },
  listo:      { label: 'Entregar', icon: 'arrow' }
};
// Minutos desde el envío a partir de los cuales la comanda se marca como atrasada
const KDS_ALERTA = { en_espera: 10, preparando: 20, listo: 5 };

async function loadCocina() {
  const [tickets, counts] = await Promise.all([
    window.api.kitchen.tickets(State.cocinaDestino),
    window.api.kitchen.counts()
  ]);
  State.cocinaTickets = tickets;
  renderCocina(tickets, counts);
  updateCocinaBadge(counts);
}

function setCocinaDestino(destino, btn) {
  State.cocinaDestino = destino;
  document.querySelectorAll('#cocina-destinos .seg-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  loadCocina();
}

/** Minutos transcurridos desde una marca de tiempo. */
function minutosDesde(iso) {
  if (!iso) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
}

function etiquetaMinutos(min) {
  if (min < 1)  return 'recién';
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  return `${h} h ${min % 60} min`;
}

function renderCocina(tickets, counts) {
  document.getElementById('cnt-coc-todo').textContent   = counts.total || 0;
  document.getElementById('cnt-coc-cocina').textContent = counts.Cocina || 0;
  document.getElementById('cnt-coc-barra').textContent  = counts.Barra || 0;

  const total = tickets.length;
  const atrasadas = tickets.filter(t => minutosDesde(t.sent_at) >= (KDS_ALERTA[t.status] ?? 15)).length;
  document.getElementById('cocina-sub').textContent = total
    ? `${total} ${total === 1 ? 'comanda activa' : 'comandas activas'}` +
      (atrasadas ? ` · ${atrasadas} pasada${atrasadas === 1 ? '' : 's'} de tiempo` : '')
    : 'Sin comandas pendientes';

  for (const estado of KDS_COLUMNAS) {
    const enEstado = tickets.filter(t => t.status === estado);
    document.getElementById(`kds-cnt-${estado}`).textContent = enEstado.length;

    const cuerpo = document.getElementById(`kds-${estado}`);
    if (!enEstado.length) {
      cuerpo.innerHTML = `<div class="kds-vacio">${
        estado === 'listo' ? 'Nada esperando entrega.' : 'Sin comandas.'}</div>`;
      continue;
    }
    cuerpo.innerHTML = enEstado.map(t => ticketHTML(t)).join('');
  }
}

function ticketHTML(t) {
  const min      = minutosDesde(t.sent_at);
  const atrasada = min >= (KDS_ALERTA[t.status] ?? 15);
  const accion   = KDS_ACCION[t.status];

  return `
    <article class="kds-ticket ${atrasada ? 'atrasada' : ''}">
      <header class="kds-ticket-top">
        <span class="kds-mesa">${esc(t.table_name)}</span>
        <span class="kds-tiempo ${atrasada ? 'tarde' : ''}">${icon('clock', 12)}${etiquetaMinutos(min)}</span>
      </header>
      <div class="kds-meta">
        <span class="kds-destino">${esc(t.destino)}</span>
        <span class="kds-orden">#${t.order_id}</span>
        <span class="kds-mesero">${esc(t.user_name)}</span>
      </div>
      <ul class="kds-items">
        ${t.items.map(i => `
          <li class="kds-item ${i.status !== t.status ? 'adelantado' : ''}">
            <span class="kds-qty">${i.quantity}</span>
            <span class="kds-nombre">
              ${esc(i.product_name)}
              ${i.note ? `<span class="kds-nota">${esc(i.note)}</span>` : ''}
            </span>
            ${i.status !== t.status ? `<span class="kds-item-estado">${esc(i.status_label)}</span>` : ''}
          </li>`).join('')}
      </ul>
      <footer class="kds-acciones">
        ${t.status !== 'en_espera' ? `
          <button class="kds-btn-atras" onclick="retrocederComanda('${t.key}')"
                  aria-label="Regresar al paso anterior">${icon('back', 14)}</button>` : ''}
        <button class="kds-btn-avanzar" onclick="avanzarComanda('${t.key}')">
          ${icon(accion.icon, 15)}${accion.label}
        </button>
      </footer>
    </article>`;
}

function buscarTicket(key) {
  return (State.cocinaTickets || []).find(t => t.key === key);
}

async function avanzarComanda(key) {
  const t = buscarTicket(key);
  if (!t) return;
  const res = await window.api.kitchen.advance(t.order_id, t.sent_at, t.destino);
  if (res.success === false) { showToast(res.error || 'No se pudo avanzar', 'error'); return; }
  if (res.status === 'entregado') showToast(`${t.table_name} · entregado`, 'success');
  await loadCocina();
}

/** Deshace el último paso: el cocinero se adelantó y necesita corregir. */
async function retrocederComanda(key) {
  const t = buscarTicket(key);
  if (!t) return;
  const previo = { preparando: 'en_espera', listo: 'preparando' }[t.status];
  if (!previo) return;
  const res = await window.api.kitchen.setTicket(t.order_id, t.sent_at, t.destino, previo);
  if (res.success === false) { showToast(res.error || 'No se pudo regresar', 'error'); return; }
  await loadCocina();
}

async function updateCocinaBadge(counts) {
  const c = counts || await window.api.kitchen.counts();
  const badge = document.getElementById('nav-cocina-badge');
  if (!badge) return;
  badge.textContent = c.total || 0;
  badge.classList.toggle('hidden', !c.total);
  badge.classList.toggle('alerta', (c.listo || 0) > 0);
}

// Refresca el tablero mientras está a la vista: los tiempos corren solos y
// otro usuario puede haber movido una comanda.
setInterval(() => {
  const vista = document.getElementById('view-cocina');
  if (State.user && vista && vista.classList.contains('active')) loadCocina();
  else if (State.user) updateCocinaBadge();
}, 15000);

// ── Nota de ítem ──────────────────────────────────────────────────────────────
function openNoteModal(itemId) {
  const item = (State.currentOrder?.items || []).find(i => i.id === itemId);
  if (!item) return;
  State.noteItem = item;

  document.getElementById('note-title').textContent = item.product_name;
  document.getElementById('note-input').value       = item.note || '';
  document.getElementById('note-chips').innerHTML   = NOTE_SUGGESTIONS.map(s =>
    `<button type="button" class="note-chip" onclick="addNoteChip('${esc(s)}')">${esc(s)}</button>`
  ).join('');

  openModal('modal-note');
}

function addNoteChip(text) {
  const input = document.getElementById('note-input');
  const actual = input.value.trim();
  input.value = actual ? `${actual}, ${text}` : text;
  input.focus();
}

async function saveNote(e) {
  e.preventDefault();
  if (!State.noteItem) return;
  const res = await window.api.orders.setItemNote(
    State.noteItem.id, document.getElementById('note-input').value
  );
  if (res.success === false) { showToast(res.error || 'No se pudo guardar', 'error'); return; }
  closeModal('modal-note');
  await loadOrder();
}

// ── Anulación ─────────────────────────────────────────────────────────────────
function openVoidModal(itemId) {
  const item = (State.currentOrder?.items || []).find(i => i.id === itemId);
  if (!item) return;
  State.voidTarget = item;

  document.getElementById('void-msg').textContent =
    `"${item.product_name}" ya se envió a ${item.destino.toLowerCase()}. Indique el motivo para anularlo.`;
  openModal('modal-void');
}

async function saveVoid(e) {
  e.preventDefault();
  if (!State.voidTarget) return;

  const res = await window.api.orders.voidItem(
    State.voidTarget.id,
    document.getElementById('void-reason').value,
    State.user.id
  );
  if (res.success === false) { showToast(res.error || 'No se pudo anular', 'error'); return; }

  closeModal('modal-void');
  showToast('Ítem anulado', 'success');
  State.voidTarget = null;
  await loadOrder();
}

// ── Comensales ────────────────────────────────────────────────────────────────
function openGuestsModal() {
  document.getElementById('guests-input').value = State.currentOrder?.guests || 0;
  openModal('modal-guests');
}

async function saveGuests(e) {
  e.preventDefault();
  const res = await window.api.orders.setGuests(
    State.currentOrderId, document.getElementById('guests-input').value
  );
  if (res.success === false) { showToast(res.error || 'Valor inválido', 'error'); return; }
  closeModal('modal-guests');
  await loadOrder();
}

// ── Transferir de mesa ────────────────────────────────────────────────────────
async function openTransferModal() {
  const tables = await window.api.tables.list();
  const libres = tables.filter(t => t.status === 'libre');
  const list   = document.getElementById('transfer-list');

  document.getElementById('transfer-msg').textContent = libres.length
    ? 'Elija la mesa destino. Solo se listan las que están libres.'
    : 'No hay mesas libres en este momento.';

  list.innerHTML = libres.map(t => `
    <button type="button" class="transfer-option" onclick="doTransfer(${t.id})">
      <span class="transfer-name">${esc(t.name)}</span>
      <span class="transfer-cap">${icon('users', 13)}${t.capacity}</span>
    </button>`).join('');

  openModal('modal-transfer');
}

async function doTransfer(tableId) {
  const res = await window.api.orders.transfer(State.currentOrderId, tableId);
  if (res.success === false) { showToast(res.error || 'No se pudo mover', 'error'); return; }
  closeModal('modal-transfer');
  showToast(`Orden movida a ${res.table_name}`, 'success');
  await refreshTables();
  await loadOrder();
}

// ── Descuento ─────────────────────────────────────────────────────────────────
function openDiscountModal() {
  const o = State.currentOrder;
  document.getElementById('discount-type').value  = o?.discount_type || '';
  document.getElementById('discount-value').value = o?.discount_value || 0;
  openModal('modal-discount');
}

async function saveDiscount(e) {
  e.preventDefault();
  const type  = document.getElementById('discount-type').value;
  const value = document.getElementById('discount-value').value;

  const res = await window.api.orders.setDiscount(State.currentOrderId, type || null, value);
  if (res.success === false) { showToast(res.error || 'Descuento inválido', 'error'); return; }
  closeModal('modal-discount');
  showToast(type ? 'Descuento aplicado' : 'Descuento quitado', 'success');
  await loadOrder();
}

function renderOrderItems(order) {
  const list  = document.getElementById('order-items-list');
  const items = order.items || [];

  if (!items.length) {
    list.innerHTML = `
      <div class="empty-order">
        <span>Sin ítems</span>
        <small>Seleccione productos del menú</small>
      </div>`;
    document.getElementById('btn-cobrar').disabled = true;
    return;
  }

  document.getElementById('btn-cobrar').disabled = false;

  list.innerHTML = items.map(item => {
    const pendiente = item.status === 'pendiente';
    // Un ítem ya despachado no se borra de un toque: se anula con motivo.
    const quitar = pendiente
      ? `<button class="qty-btn remove" onclick="changeItemQty(${item.id}, ${item.quantity - 1})"
                 title="Reducir" aria-label="Reducir cantidad">${icon(item.quantity > 1 ? 'minus' : 'trash', 14)}</button>`
      : `<button class="qty-btn remove" onclick="openVoidModal(${item.id})"
                 title="Anular" aria-label="Anular ítem">${icon('ban', 14)}</button>`;

    return `
    <div class="order-item ${pendiente ? 'is-pendiente' : ''}" id="item-${item.id}">
      <div class="item-head">
        <span class="item-name">${esc(item.product_name)}</span>
        ${pendiente
          ? '<span class="item-tag pendiente">Pendiente</span>'
          : `<span class="item-tag enviado">${esc(item.destino)}</span>`}
      </div>
      ${item.note ? `<div class="item-note">${icon('note', 12)}${esc(item.note)}</div>` : ''}
      <div class="item-controls">
        <div class="qty-controls">
          ${quitar}
          <span class="qty-num">${item.quantity}</span>
          <button class="qty-btn" onclick="changeItemQty(${item.id}, ${item.quantity + 1})"
                  title="Aumentar" aria-label="Aumentar cantidad">${icon('plus', 14)}</button>
        </div>
        <button class="item-note-btn" onclick="openNoteModal(${item.id})"
                title="Nota" aria-label="Nota para ${esc(item.product_name)}">${icon('note', 14)}</button>
        <span class="item-subtotal">${fmt(item.unit_price * item.quantity)}</span>
      </div>
    </div>`;
  }).join('');
}

/** Pinta subtotal, descuento, total, comensales y el botón de comanda. */
function renderOrderSummary(order) {
  document.getElementById('order-subtotal').textContent = fmt(order.subtotal);
  document.getElementById('order-total').textContent    = fmt(order.total);

  const rowDesc = document.getElementById('row-discount');
  if (order.discount > 0) {
    rowDesc.classList.remove('hidden');
    document.getElementById('discount-label').textContent =
      order.discount_type === 'porcentaje' ? `Descuento (${order.discount_value}%)` : 'Descuento';
    document.getElementById('order-discount').textContent = '−' + fmt(order.discount);
  } else {
    rowDesc.classList.add('hidden');
  }

  document.getElementById('guests-label').textContent =
    order.guests ? `${order.guests} ${order.guests === 1 ? 'persona' : 'personas'}` : 'Comensales';

  const btnEnviar = document.getElementById('btn-enviar');
  btnEnviar.classList.toggle('hidden', order.pending_count === 0);
  document.getElementById('btn-enviar-label').textContent =
    `Enviar a cocina (${order.pending_count})`;
}

async function changeItemQty(itemId, newQty) {
  const res = newQty <= 0
    ? await window.api.orders.removeItem(itemId)
    : await window.api.orders.updateItem(itemId, newQty);

  // La capa de datos frena el borrado de algo ya despachado y pide anulación.
  if (res && res.success === false) {
    if (res.needsVoid) { openVoidModal(itemId); return; }
    showToast(res.error || 'No se pudo actualizar', 'error');
    return;
  }
  await loadOrder();
}

// ── Menú de productos ─────────────────────────────────────────────────────────
function buildMenuFilters() {
  const bar = document.getElementById('menu-filter-bar');

  // Tipos presentes en la carta, en orden de consumo
  const types = [...new Set(State.categories.map(c => c.type))]
    .sort((a, b) => (TYPE_ORDER[a] ?? 3) - (TYPE_ORDER[b] ?? 3));

  bar.innerHTML =
    `<button class="cat-filter-btn all ${State.categoryFilter === null ? 'active' : ''}"
             onclick="filterMenu(null, this)">Todos</button>` +
    types.map(type => `
      <button class="cat-filter-btn type-${type} ${State.categoryFilter === type ? 'active' : ''}"
              onclick="filterMenu('${type}', this)">
        ${TYPE_LABEL_PLURAL[type] || type}
      </button>`).join('');
}

function filterMenu(filter, btn) {
  State.categoryFilter = filter;
  document.querySelectorAll('.cat-filter-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderMenuProducts();
}

/** Buscador de la carta: con 139 productos, teclear gana a scrollear. */
function searchMenu(text) {
  State.menuSearch = String(text || '').trim();

  const input = document.getElementById('menu-search-input');
  if (input && input.value !== text) input.value = State.menuSearch;
  document.getElementById('menu-search-clear').classList.toggle('hidden', !State.menuSearch);

  renderMenuProducts();
}

// Ignora acentos y mayúsculas: "cafe" encuentra "Café".
const plano = s => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

function renderMenuProducts() {
  const grid    = document.getElementById('menu-products-grid');
  let filtered  = State.products.filter(p => p.available);

  if (State.categoryFilter) {
    filtered = filtered.filter(p => p.category_type === State.categoryFilter);
  }

  const buscando = State.menuSearch.length > 0;
  if (buscando) {
    const q = plano(State.menuSearch);
    filtered = filtered.filter(p => plano(p.name).includes(q) || plano(p.category_name).includes(q));
  }

  if (!filtered.length) {
    grid.innerHTML = buscando
      ? `<div class="menu-empty">${icon('search', 34)}<p>Nada coincide con “${esc(State.menuSearch)}”.</p></div>`
      : `<div class="menu-empty">${icon('table', 34)}<p>Sin productos en esta categoría.</p></div>`;
    return;
  }

  // Agrupar por categoría
  const groups = {};
  for (const p of filtered) {
    if (!groups[p.category_id]) {
      groups[p.category_id] = { name: p.category_name, type: p.category_type, products: [] };
    }
    groups[p.category_id].products.push(p);
  }

  // Ordenar: tipo (bebida → boquita → comida), luego nombre
  const sorted = Object.entries(groups).sort(([, a], [, b]) =>
    (TYPE_ORDER[a.type] ?? 3) - (TYPE_ORDER[b.type] ?? 3) || a.name.localeCompare(b.name)
  );

  grid.innerHTML = sorted.map(([catId, group]) => {
    // Buscando se abre todo: los resultados no sirven detrás de un chevrón.
    const isOpen = buscando || State.openMenuCats.has(catId);
    const open   = isOpen ? ' open' : '';
    return `
      <div class="menu-cat-section">
        <div class="menu-cat-header" onclick="toggleMenuCat('${catId}')"
             role="button" tabindex="0" aria-expanded="${isOpen}"
             onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();toggleMenuCat('${catId}');}">
          <span class="menu-cat-toggle${open}">${icon('chevron', 15)}</span>
          <span class="menu-cat-name">${esc(group.name)}</span>
          <span class="menu-cat-count">${group.products.length}</span>
        </div>
        <div class="menu-cat-grid${open}" id="mc-${catId}">
          ${group.products.map(p => `
            <div class="product-card" onclick="addProductToOrder(${p.id})">
              <div class="prod-name">${esc(p.name)}</div>
              <div class="prod-price">${fmt(p.price)}</div>
            </div>`).join('')}
        </div>
      </div>`;
  }).join('');
}

function toggleMenuCat(catId) {
  const grid = document.getElementById(`mc-${catId}`);
  if (!grid) return;

  const open = !State.openMenuCats.has(catId);
  if (open) State.openMenuCats.add(catId);
  else      State.openMenuCats.delete(catId);

  const header = grid.previousElementSibling;
  grid.classList.toggle('open', open);
  header.querySelector('.menu-cat-toggle').classList.toggle('open', open);
  header.setAttribute('aria-expanded', String(open));
}

async function addProductToOrder(productId) {
  if (!State.currentOrderId) return;
  await window.api.orders.addItem(State.currentOrderId, productId, 1);
  await loadOrder();
}

// ── Cobrar ────────────────────────────────────────────────────────────────────
async function cobrarOrden() {
  const btn = document.getElementById('btn-cobrar');
  btn.disabled = true;
  const order = await window.api.orders.get(State.currentOrderId);
  btn.disabled = false;

  if (!order || !order.items.length) {
    showToast('La orden está vacía', 'error'); return;
  }
  if (order.pending_count > 0) {
    const n = order.pending_count;
    showToast(n === 1 ? 'Queda 1 ítem sin enviar a cocina'
                      : `Quedan ${n} ítems sin enviar a cocina`, 'error');
    return;
  }

  State.currentOrder = order;
  State.pago = { method: 'efectivo', tip: 0, cash: null, chipsTotal: null };

  // Contexto en la cabecera: cobrar la mesa equivocada es el error caro.
  document.getElementById('pago-contexto').textContent =
    `${order.table_name} · Orden #${order.id}`;

  document.getElementById('pago-propina').value = '';
  document.getElementById('pago-efectivo').value = '';
  setPagoMetodo('efectivo');

  openModal('modal-pago');
}

function setPagoMetodo(method) {
  State.pago.method = method;
  document.querySelectorAll('.pago-metodo').forEach(b => {
    const activo = b.dataset.method === method;
    b.classList.toggle('active', activo);
    b.setAttribute('aria-checked', String(activo));
  });
  // El vuelto solo tiene sentido con efectivo en mano.
  document.getElementById('grupo-efectivo').classList.toggle('hidden', method !== 'efectivo');
  recalcPago();
}

function setPropinaPct(pct) {
  const base = State.currentOrder ? State.currentOrder.total : 0;
  document.getElementById('pago-propina').value = pct ? (base * pct / 100).toFixed(2) : '';
  recalcPago();
}

function setEfectivoExacto() {
  setEfectivo(totalAPagar());
}

/** Fija el efectivo recibido. Reemplaza el monto: el botón es el billete que
 *  el cliente puso sobre la barra, no algo que se acumula. */
function setEfectivo(valor) {
  document.getElementById('pago-efectivo').value = Number(valor).toFixed(2);
  recalcPago();
}

// Billetes de Guatemala que sirven para pagar de más
const BILLETES = [20, 50, 100, 200];

/**
 * Qué le puede dar el cliente: el redondeo natural hacia arriba más los
 * billetes que alcanzan. Para un total de Q74.75 → Q80, Q100, Q200.
 */
function billetesSugeridos(total) {
  const cand = new Set([
    Math.ceil(total / 10) * 10,
    Math.ceil(total / 100) * 100,
    ...BILLETES
  ]);
  return [...cand]
    .filter(v => v > total + 0.005)
    .sort((a, b) => a - b)
    .slice(0, 3);
}

// Q100 en vez de Q100.00 cuando es redondo: el chip se lee de un golpe
const fmtCorto = n => Number.isInteger(n) ? 'Q' + n : fmt(n);

function renderEfectivoChips(total) {
  document.getElementById('efectivo-chips').innerHTML = billetesSugeridos(total).map(v =>
    `<button type="button" class="propina-chip" data-cash="${v}"
             onclick="setEfectivo(${v})">${fmtCorto(v)}</button>`
  ).join('');
}

function totalAPagar() {
  const base = State.currentOrder ? State.currentOrder.total : 0;
  const tip  = parseFloat(document.getElementById('pago-propina').value) || 0;
  return Math.round((base + tip) * 100) / 100;
}

function recalcPago() {
  const order = State.currentOrder;
  if (!order) return;

  const tip   = parseFloat(document.getElementById('pago-propina').value) || 0;
  const total = totalAPagar();
  State.pago.tip = tip;

  document.getElementById('pago-total').textContent = fmt(total);

  // Una sola línea de contexto en vez de cuatro filas de tabla.
  const partes = [`Subtotal ${fmt(order.subtotal)}`];
  if (order.discount > 0) partes.push(`Descuento −${fmt(order.discount)}`);
  if (tip > 0)            partes.push(`Propina ${fmt(tip)}`);
  document.getElementById('pago-detalle').textContent = partes.join('  ·  ');

  // Marca el chip de propina que corresponde al monto actual
  const pctActual = order.total > 0 ? Math.round(tip / order.total * 1000) / 10 : 0;
  document.querySelectorAll('.propina-chip[data-tip]').forEach(c =>
    c.classList.toggle('active', Number(c.dataset.tip) === pctActual)
  );

  const btn       = document.getElementById('btn-confirm-payment');
  const btnLabel  = document.getElementById('btn-pago-label');
  const vueltoEl  = document.getElementById('pago-vuelto');
  const vueltoRow = document.getElementById('vuelto-row');
  const vueltoLbl = document.getElementById('vuelto-lbl');

  if (State.pago.method === 'efectivo') {
    // Las denominaciones dependen del total: se rehacen solo si el total cambió.
    if (State.pago.chipsTotal !== total) {
      renderEfectivoChips(total);
      State.pago.chipsTotal = total;
    }

    const cash = parseFloat(document.getElementById('pago-efectivo').value) || 0;
    State.pago.cash = cash;
    const vuelto = Math.round((cash - total) * 100) / 100;
    const falta  = cash > 0 && vuelto < 0;

    vueltoRow.classList.toggle('insuficiente', falta);
    vueltoLbl.textContent = falta ? 'Falta' : 'Vuelto';
    vueltoEl.textContent  = falta ? fmt(-vuelto) : fmt(Math.max(vuelto, 0));
    btn.disabled = falta;

    // Marca el billete elegido, igual que los chips de propina
    document.getElementById('chip-exacto').classList.toggle('active', cash > 0 && vuelto === 0);
    document.querySelectorAll('.propina-chip[data-cash]').forEach(c =>
      c.classList.toggle('active', Number(c.dataset.cash) === cash)
    );
  } else {
    State.pago.cash = null;
    vueltoRow.classList.remove('insuficiente');
    btn.disabled = false;
  }

  btnLabel.textContent = `Cobrar ${fmt(total)}`;
}

function showReceipt(order, cobro) {
  const el = document.getElementById('receipt-content');

  const rows = order.items.map(i => `
    <tr>
      <td>
        ${esc(i.product_name)}
        ${i.note ? `<div class="comanda-nota">${esc(i.note)}</div>` : ''}
      </td>
      <td style="text-align:center">x${i.quantity}</td>
      <td style="text-align:right">${fmt(i.unit_price)}</td>
      <td style="text-align:right">${fmt(i.unit_price * i.quantity)}</td>
    </tr>`).join('');

  el.innerHTML = `
    <div class="receipt-header">
      <h2>LA TABERNA</h2>
      <p>Barra y Restaurante · Powered by El Primo</p>
    </div>
    <hr class="receipt-divider">
    <div class="receipt-meta">
      <div><span><b>Mesa:</b></span><span>${esc(order.table_name)}</span></div>
      <div><span><b>Fecha:</b></span><span>${formatDate(order.created_at)}</span></div>
      <div><span><b>Atendido por:</b></span><span>${esc(order.user_name)}</span></div>
      <div><span><b>Orden #:</b></span><span>${order.id}</span></div>
      ${order.guests ? `<div><span><b>Personas:</b></span><span>${order.guests}</span></div>` : ''}
    </div>
    <hr class="receipt-divider">
    <table class="receipt-table">
      <thead>
        <tr>
          <th>Producto</th>
          <th style="text-align:center">Cant.</th>
          <th style="text-align:right">P/U</th>
          <th style="text-align:right">Total</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <hr class="receipt-divider">
    <div class="receipt-sums">
      <div><span>Subtotal</span><span>${fmt(order.subtotal)}</span></div>
      ${cobro.discount > 0 ? `<div><span>Descuento</span><span>−${fmt(cobro.discount)}</span></div>` : ''}
      ${cobro.tip > 0 ? `<div><span>Propina</span><span>${fmt(cobro.tip)}</span></div>` : ''}
    </div>
    <div class="receipt-total-block">TOTAL: ${fmt(cobro.total)}</div>
    <div class="receipt-sums receipt-pago">
      <div><span>Pago</span><span>${esc(PAYMENT_LABELS[cobro.payment_method] || '—')}</span></div>
      ${cobro.payment_method === 'efectivo' ? `
        <div><span>Recibido</span><span>${fmt(cobro.amount_paid)}</span></div>
        <div><span>Vuelto</span><span>${fmt(cobro.change_given)}</span></div>` : ''}
    </div>
    <hr class="receipt-divider">
    <div class="receipt-sums receipt-fiscal">
      <div><span>Base imponible</span><span>${fmt(cobro.tax_base)}</span></div>
      <div><span>IVA (12%) incluido</span><span>${fmt(cobro.tax)}</span></div>
    </div>
    <div class="receipt-footer">
      <p>¡Gracias por su visita!</p>
    </div>`;

  openModal('modal-receipt');
}

async function confirmPayment() {
  const btn = document.getElementById('btn-confirm-payment');
  if (btn.disabled) return;
  btn.disabled = true;

  const order = State.currentOrder;
  const res = await window.api.orders.close(State.currentOrderId, {
    method:     State.pago.method,
    tip:        State.pago.tip,
    amountPaid: State.pago.cash
  });

  if (!res.success) {
    btn.disabled = false;
    showToast(res.error || 'Error al cerrar orden', 'error'); return;
  }

  closeModal('modal-pago');
  btn.disabled = false;
  showToast(`Cobrado ${fmt(res.total)} en ${PAYMENT_LABELS[res.payment_method].toLowerCase()}`, 'success');

  // El recibo se arma con los ítems que ya teníamos y el desglose que devolvió el cobro.
  showReceipt(order, res);

  State.currentOrderId = null;
  State.currentOrder   = null;
  State.categoryFilter = null;
  State.menuSearch     = '';
  State.openMenuCats.clear();
  await refreshTables();
  showMainView('tables');
}

// ═══════════════════════════════════════════════════════════════════════════════
// HISTORIAL
// ═══════════════════════════════════════════════════════════════════════════════
async function loadHistory() {
  const dateFrom = document.getElementById('hist-date-from').value || null;
  const dateTo   = document.getElementById('hist-date-to').value   || null;

  const orders = await window.api.orders.history(dateFrom, dateTo);
  renderHistory(orders);
}

function renderHistory(orders) {
  State.historyOrders = orders;
  const totalAmount = orders.reduce((s, o) => s + o.total, 0);

  document.getElementById('history-summary').innerHTML = `
    <div class="hist-stat-card">
      <div class="hist-stat-value">${orders.length}</div>
      <div class="hist-stat-label">Órdenes cobradas</div>
    </div>
    <div class="hist-stat-card green">
      <div class="hist-stat-value">${fmt(totalAmount)}</div>
      <div class="hist-stat-label">Total recaudado</div>
    </div>
    ${orders.length ? `<button class="btn btn-outline hist-corte-btn" onclick="showCorte()">${icon('chart', 15)}Ver Corte</button>` : ''}`;

  const listEl = document.getElementById('history-list');
  if (!orders.length) {
    listEl.innerHTML = '<p class="hist-empty">No hay cobros en el período seleccionado.</p>';
    return;
  }

  listEl.innerHTML = orders.map(o => {
    const [datePart, timePart] = formatDateTime(o.closed_at);
    return `
    <div class="hist-order-card">
      <div class="hist-order-header" onclick="toggleHistOrder(${o.id})">
        <div class="hist-order-meta">
          <span class="hist-order-num">#${o.id}</span>
          <span class="hist-order-table">${esc(o.table_name)}</span>
          <span class="hist-order-user">${icon('user', 13)}${esc(o.user_name)}</span>
        </div>
        <div class="hist-order-right">
          <span class="hist-order-datetime">
            <span class="hist-date">${datePart}</span>
            <span class="hist-time">${icon('clock', 12)}${timePart}</span>
          </span>
          <span class="hist-order-total">${fmt(o.total)}</span>
          <button class="hist-del-btn" onclick="event.stopPropagation(); deleteFromHistory(${o.id}, '#${o.id} ${esc(o.table_name)}')"
                  title="Eliminar" aria-label="Eliminar orden #${o.id}">${icon('trash', 15)}</button>
          <span class="hist-chevron" id="hist-chev-${o.id}">${icon('chevron', 16)}</span>
        </div>
      </div>
      <div class="hist-order-items" id="hist-items-${o.id}">
        <table class="hist-items-table">
          <thead>
            <tr>
              <th>Producto</th>
              <th>Cant.</th>
              <th>P/U</th>
              <th>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${o.items.map(i => `
              <tr>
                <td>${esc(i.product_name)}</td>
                <td class="centered">x${i.quantity}</td>
                <td class="right">${fmt(i.unit_price)}</td>
                <td class="right bold">${fmt(i.unit_price * i.quantity)}</td>
              </tr>`).join('')}
          </tbody>
          <tfoot>
            <tr class="hist-items-total-row">
              <td colspan="3">Total de la orden</td>
              <td class="right">${fmt(o.total)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>`;
  }).join('');
}

function formatDateTime(iso) {
  if (!iso) return ['—', '—'];
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2,'0');
  const mm = String(d.getMonth()+1).padStart(2,'0');
  const yy = d.getFullYear();
  const time = d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
  return [`${dd}-${mm}-${yy}`, time];
}

// Convierte "YYYY-MM-DD" (valor del input date) a "DD-MM-YYYY" para mostrar
function fmtDateStr(yyyymmdd) {
  if (!yyyymmdd) return '—';
  const [y, m, d] = yyyymmdd.split('-');
  return `${d}-${m}-${y}`;
}

function deleteFromHistory(orderId, label) {
  document.getElementById('confirm-title').textContent   = 'Eliminar orden del historial';
  document.getElementById('confirm-message').textContent =
    `¿Eliminar la orden ${label}? Esta acción no se puede deshacer.`;

  const btn = document.getElementById('btn-confirm-ok');
  btn.onclick = async () => {
    closeModal('modal-confirm');
    const res = await window.api.orders.delete(orderId);
    if (res && res.success === false) {
      showToast(res.error || 'No se pudo eliminar', 'error'); return;
    }
    showToast('Orden eliminada del historial', 'success');
    loadHistory();
  };
  openModal('modal-confirm');
}

async function showCorte() {
  const orders = State.historyOrders;
  if (!orders.length) { showToast('No hay órdenes en el período seleccionado', 'info'); return; }

  const dateFrom    = document.getElementById('hist-date-from').value;
  const dateTo      = document.getElementById('hist-date-to').value;
  const totalAmount = orders.reduce((s, o) => s + o.total, 0);

  const [pagos, anulaciones] = await Promise.all([
    window.api.orders.payments(dateFrom || null, dateTo || null),
    window.api.orders.voids(dateFrom || null, dateTo || null)
  ]);

  const periodo = dateFrom === dateTo
    ? (dateFrom ? fmtDateStr(dateFrom) : 'Todo el historial')
    : `${dateFrom ? fmtDateStr(dateFrom) : '…'} al ${dateTo ? fmtDateStr(dateTo) : '…'}`;

  document.getElementById('corte-title').textContent = `Corte — ${periodo}`;

  document.getElementById('corte-content').innerHTML = `
    <div class="corte-resumen">
      <div class="corte-stat">
        <div class="corte-stat-val">${orders.length}</div>
        <div class="corte-stat-lbl">Órdenes cobradas</div>
      </div>
      <div class="corte-stat green">
        <div class="corte-stat-val">${fmt(totalAmount)}</div>
        <div class="corte-stat-lbl">Total recaudado</div>
      </div>
    </div>

    ${buildCorteCaja(pagos, anulaciones)}

    <div class="corte-tabs">
      <button class="corte-tab-btn active" onclick="switchCorteTab('mesas',this)">Por Mesa</button>
      <button class="corte-tab-btn" onclick="switchCorteTab('productos',this)">Por Producto</button>
      <button class="corte-tab-btn" onclick="switchCorteTab('dias',this)">Por Día</button>
      <button class="corte-tab-btn" onclick="switchCorteTab('anulaciones',this)">Anulaciones${
        anulaciones.length ? ` (${anulaciones.length})` : ''}</button>
    </div>

    <div id="corte-tab-mesas"    class="corte-tab-panel active">${buildCorteMesas(orders)}</div>
    <div id="corte-tab-productos" class="corte-tab-panel">${buildCorteProductos(orders, totalAmount)}</div>
    <div id="corte-tab-dias"     class="corte-tab-panel">${buildCorteDias(orders, totalAmount)}</div>
    <div id="corte-tab-anulaciones" class="corte-tab-panel">${buildCorteAnulaciones(anulaciones)}</div>`;

  openModal('modal-corte');
}

/**
 * Lo que el dueño necesita para cuadrar la caja: cuánto debería haber en
 * efectivo, cuánto entró por banco, y cuánto se fue en propinas.
 */
function buildCorteCaja(pagos, anulaciones) {
  const filas = pagos.methods.filter(m => m.orders > 0).map(m => `
    <div class="caja-fila">
      <span class="caja-metodo">${icon(PAYMENT_ICONS[m.method], 14)}${esc(m.label)}</span>
      <span class="caja-ordenes">${m.orders} ${m.orders === 1 ? 'orden' : 'órdenes'}</span>
      <span class="caja-monto">${fmt(m.total)}</span>
    </div>`).join('');

  const anuladoTotal = anulaciones.reduce((s, v) => s + v.amount, 0);

  return `
    <div class="corte-caja">
      <div class="corte-caja-titulo">Desglose de caja</div>
      ${filas || '<div class="caja-vacio">Sin cobros en el período.</div>'}
      ${pagos.tips > 0 ? `
        <div class="caja-fila caja-extra">
          <span class="caja-metodo">Propinas incluidas</span>
          <span class="caja-ordenes"></span>
          <span class="caja-monto">${fmt(pagos.tips)}</span>
        </div>` : ''}
      ${anuladoTotal > 0 ? `
        <div class="caja-fila caja-extra caja-anulado">
          <span class="caja-metodo">${icon('ban', 14)}Anulado</span>
          <span class="caja-ordenes">${anulaciones.length} ${anulaciones.length === 1 ? 'ítem' : 'ítems'}</span>
          <span class="caja-monto">${fmt(anuladoTotal)}</span>
        </div>` : ''}
    </div>`;
}

function buildCorteAnulaciones(anulaciones) {
  if (!anulaciones.length) {
    return '<div class="corte-vacio">Sin anulaciones en el período.</div>';
  }

  // Motivo más frecuente primero: si "Error del mesero" domina, hay algo que corregir.
  const porMotivo = {};
  for (const v of anulaciones) {
    porMotivo[v.reason] = (porMotivo[v.reason] || 0) + v.amount;
  }
  const resumen = Object.entries(porMotivo).sort((a, b) => b[1] - a[1]).map(([motivo, monto]) => `
    <div class="caja-fila">
      <span class="caja-metodo">${esc(motivo)}</span>
      <span class="caja-ordenes"></span>
      <span class="caja-monto">${fmt(monto)}</span>
    </div>`).join('');

  const filas = anulaciones.map(v => `
    <tr>
      <td>${formatDateTime(v.created_at)}</td>
      <td>${esc(v.table_name)}</td>
      <td><b>${v.quantity}×</b> ${esc(v.product_name)}</td>
      <td>${esc(v.reason)}</td>
      <td>${esc(v.user_name)}</td>
      <td style="text-align:right"><b>${fmt(v.amount)}</b></td>
    </tr>`).join('');

  return `
    <div class="corte-caja">${resumen}</div>
    <div class="table-wrapper">
      <table class="data-table">
        <thead>
          <tr><th>Fecha</th><th>Mesa</th><th>Producto</th><th>Motivo</th><th>Usuario</th><th style="text-align:right">Monto</th></tr>
        </thead>
        <tbody>${filas}</tbody>
      </table>
    </div>`;
}

function switchCorteTab(name, btn) {
  document.querySelectorAll('.corte-tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.corte-tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(`corte-tab-${name}`).classList.add('active');
  btn.classList.add('active');
}

function toggleCorteMesa(id) {
  const panel = document.getElementById(`cmt-orders-${id}`);
  const chev  = document.getElementById(`cmt-chev-${id}`);
  const open  = panel.classList.toggle('open');
  chev.classList.toggle('open', open);
}

function buildCorteMesas(orders) {
  // Agrupar órdenes por mesa
  const byTable = {};
  orders.forEach(o => {
    if (!byTable[o.table_name]) byTable[o.table_name] = { orders: [], total: 0 };
    byTable[o.table_name].orders.push(o);
    byTable[o.table_name].total += o.total;
  });

  return Object.entries(byTable)
    .sort((a, b) => b[1].total - a[1].total)
    .map(([name, d], idx) => {
      const safeId = `mesa_${idx}`;

      // Productos consolidados por mesa
      const byProd = {};
      d.orders.forEach(o => o.items.forEach(i => {
        if (!byProd[i.product_name]) byProd[i.product_name] = { qty: 0, price: i.unit_price, total: 0 };
        byProd[i.product_name].qty   += i.quantity;
        byProd[i.product_name].total += i.unit_price * i.quantity;
      }));

      const prodRows = Object.entries(byProd)
        .sort((a, b) => b[1].total - a[1].total)
        .map(([pname, pd]) => `
          <tr>
            <td>${esc(pname)}</td>
            <td class="centered">${fmt(pd.price)}</td>
            <td class="centered">${pd.qty}</td>
            <td class="right bold">${fmt(pd.total)}</td>
          </tr>`).join('');

      const ordRows = d.orders.map(o => {
        const [date, time] = formatDateTime(o.closed_at || o.created_at);
        const iRows = o.items.map(i => `
          <tr class="cmt-item-row">
            <td>${esc(i.product_name)}</td>
            <td class="centered">${fmt(i.unit_price)}</td>
            <td class="centered">${i.quantity}</td>
            <td class="right">${fmt(i.unit_price * i.quantity)}</td>
          </tr>`).join('');
        return `
          <div class="cmt-order">
            <div class="cmt-order-hdr">
              <span><span class="cmt-order-num">#${o.id}</span> ${date} ${time}</span>
              <span class="cmt-order-total">${fmt(o.total)}</span>
            </div>
            <table class="corte-table cmt-inner-table">
              <thead><tr><th>Producto</th><th>Precio</th><th>Cant.</th><th>Subtotal</th></tr></thead>
              <tbody>${iRows}</tbody>
            </table>
          </div>`;
      }).join('');

      return `
        <div class="cmt-card">
          <div class="cmt-card-hdr" onclick="toggleCorteMesa('${safeId}')">
            <div class="cmt-card-name">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="5" width="14" height="14" rx="2"/><line x1="5" y1="9" x2="19" y2="9"/><line x1="9" y1="5" x2="9" y2="19"/><line x1="15" y1="5" x2="15" y2="19"/><line x1="5" y1="15" x2="19" y2="15"/></svg>
              ${esc(name)}
            </div>
            <div class="cmt-card-meta">
              <span>${d.orders.length} orden${d.orders.length !== 1 ? 'es' : ''}</span>
              <span class="cmt-card-total">${fmt(d.total)}</span>
              <span id="cmt-chev-${safeId}" class="cmt-chev">${icon('chevron', 16)}</span>
            </div>
          </div>
          <div id="cmt-orders-${safeId}" class="cmt-orders-panel">
            <div class="cmt-prod-summary">
              <h5>Resumen de productos</h5>
              <table class="corte-table">
                <thead><tr><th>Producto</th><th>Precio Unit.</th><th>Cant.</th><th>Total</th></tr></thead>
                <tbody>${prodRows}</tbody>
                <tfoot><tr class="corte-total-row"><td colspan="3"><b>Total mesa</b></td><td class="right"><b>${fmt(d.total)}</b></td></tr></tfoot>
              </table>
            </div>
            <h5 class="cmt-ord-ttl">Órdenes cobradas</h5>
            ${ordRows}
          </div>
        </div>`;
    }).join('');
}

function buildCorteProductos(orders, totalAmount) {
  const byProduct = {};
  orders.forEach(o => o.items.forEach(i => {
    if (!byProduct[i.product_name]) byProduct[i.product_name] = { qty: 0, price: i.unit_price, total: 0, entries: [] };
    byProduct[i.product_name].qty   += i.quantity;
    byProduct[i.product_name].total += i.unit_price * i.quantity;
    byProduct[i.product_name].entries.push({ orderId: o.id, table: o.table_name });
  }));

  const rows = Object.entries(byProduct)
    .sort((a, b) => b[1].total - a[1].total)
    .map(([name, d]) => {
      const orderStack = d.entries.map(e => `<div class="stack-item">#${e.orderId}</div>`).join('');
      const tableStack = d.entries.map(e => `<div class="stack-item">${esc(e.table)}</div>`).join('');
      return `
        <tr>
          <td>${esc(name)}</td>
          <td class="centered">${fmt(d.price)}</td>
          <td class="centered">${d.qty}</td>
          <td class="stack-cell">${orderStack}</td>
          <td class="stack-cell">${tableStack}</td>
          <td class="right bold">${fmt(d.total)}</td>
        </tr>`;
    }).join('');

  return `
    <table class="corte-table">
      <thead><tr><th>Producto</th><th>Precio Unit.</th><th>Unidades</th><th>Órdenes</th><th>Mesa</th><th>Total</th></tr></thead>
      <tbody>${rows}</tbody>
      <tfoot>
        <tr class="corte-total-row">
          <td colspan="5"><b>Total</b></td>
          <td class="right"><b>${fmt(totalAmount)}</b></td>
        </tr>
      </tfoot>
    </table>`;
}

function buildCorteDias(orders, totalAmount) {
  const byDay = {};
  orders.forEach(o => {
    const day = (o.closed_at || o.created_at || '').slice(0, 10);
    if (!byDay[day]) byDay[day] = { count: 0, total: 0, entries: [] };
    byDay[day].count++;
    byDay[day].total += o.total;
    byDay[day].entries.push({ orderId: o.id, table: o.table_name });
  });

  const rows = Object.entries(byDay)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([day, d]) => {
      const orderStack = d.entries.map(e => `<div class="stack-item">#${e.orderId}</div>`).join('');
      const tableStack = d.entries.map(e => `<div class="stack-item">${esc(e.table)}</div>`).join('');
      return `
        <tr>
          <td>${fmtDateStr(day)}</td>
          <td class="centered">${d.count}</td>
          <td class="stack-cell">${orderStack}</td>
          <td class="stack-cell">${tableStack}</td>
          <td class="right bold">${fmt(d.total)}</td>
        </tr>`;
    }).join('');

  return `
    <table class="corte-table">
      <thead><tr><th>Fecha</th><th>Cant.</th><th>Órdenes</th><th>Mesa / Barra</th><th>Total del día</th></tr></thead>
      <tbody>${rows}</tbody>
      <tfoot>
        <tr class="corte-total-row">
          <td colspan="4"><b>Total general</b></td>
          <td class="right"><b>${fmt(totalAmount)}</b></td>
        </tr>
      </tfoot>
    </table>`;
}

function toggleHistOrder(id) {
  const itemsEl = document.getElementById(`hist-items-${id}`);
  const chevEl  = document.getElementById(`hist-chev-${id}`);
  const open    = itemsEl.classList.toggle('open');
  chevEl.classList.toggle('open', open);
}

function clearHistoryFilters() {
  document.getElementById('hist-date-from').value = '';
  document.getElementById('hist-date-to').value   = '';
  loadHistory();
}

function initHistoryView() {
  // Poner fecha de hoy como valor por defecto la primera vez
  const today = new Date().toISOString().slice(0, 10);
  if (!document.getElementById('hist-date-from').value) {
    document.getElementById('hist-date-from').value = today;
    document.getElementById('hist-date-to').value   = today;
  }
  if (!document.getElementById('wh-date-from').value) {
    document.getElementById('wh-date-from').value = today;
    document.getElementById('wh-date-to').value   = today;
  }
  loadHistory();
}

// ── Pestañas de Historial (Cobros / Meseros) ─────────────────────────────────
function toggleHistoryMenu() {
  const children = document.getElementById('nav-history-children');
  const chevron  = document.getElementById('nav-history-chevron');
  const open = children.classList.toggle('open');
  chevron.classList.toggle('open', open);
}

function showHistorialTab(tab) {
  document.querySelectorAll('#nav-history-children .nav-child').forEach(b => b.classList.remove('active'));
  const navBtn = document.getElementById(`nav-hist-${tab}`);
  if (navBtn) navBtn.classList.add('active');

  document.querySelectorAll('.hist-tab').forEach(t => t.classList.remove('active'));
  document.getElementById(`hist-${tab}-tab`).classList.add('active');

  const titles = {
    cobros:  ['Historial de Cobros',  'Órdenes cerradas y corte de caja'],
    meseros: ['Historial de Meseros', 'Ventas y órdenes por mesero']
  };
  const [title, sub] = titles[tab];
  document.getElementById('history-section-title').textContent = title;
  document.getElementById('history-section-sub').textContent   = sub;

  showMainView('history');
  if (tab === 'meseros') loadWaiterHistory();
}

// ── Historial de Meseros ─────────────────────────────────────────────────────
async function loadWaiterHistory() {
  const dateFrom = document.getElementById('wh-date-from').value || null;
  const dateTo   = document.getElementById('wh-date-to').value   || null;
  const data = await window.api.orders.waiterHistory(dateFrom, dateTo);
  renderWaiterHistory(data);
}

function clearWaiterFilters() {
  document.getElementById('wh-date-from').value = '';
  document.getElementById('wh-date-to').value   = '';
  loadWaiterHistory();
}

function renderWaiterHistory(data) {
  const summaryEl = document.getElementById('waiter-summary');
  const listEl    = document.getElementById('waiter-list');

  if (!data.length) {
    summaryEl.innerHTML = '';
    listEl.innerHTML = '<p class="hist-empty">No hay datos en el período seleccionado.</p>';
    return;
  }

  const grandTotal  = data.reduce((s, w) => s + w.total, 0);
  const totalOrders = data.reduce((s, w) => s + w.orders.length, 0);

  summaryEl.innerHTML = `
    <div class="hist-stat-card">
      <div class="hist-stat-value">${data.length}</div>
      <div class="hist-stat-label">Meseros activos</div>
    </div>
    <div class="hist-stat-card">
      <div class="hist-stat-value">${totalOrders}</div>
      <div class="hist-stat-label">Órdenes totales</div>
    </div>
    <div class="hist-stat-card green">
      <div class="hist-stat-value">${fmt(grandTotal)}</div>
      <div class="hist-stat-label">Total recaudado</div>
    </div>`;

  listEl.innerHTML = data.map((w, wi) => {
    const gId = `wh-waiter-${wi}`;

    const ordRows = w.orders.map(o => {
      const [datePart, timePart] = formatDateTime(o.closed_at);
      const prodList = o.items.map(i =>
        `<span class="wh-product-tag">${esc(i.product_name)} ×${i.quantity}</span>`
      ).join('');
      return `
        <div class="wh-order-row">
          <span class="wh-order-meta">
            <b>#${o.id}</b>
            <span class="wh-table-tag">${esc(o.table_name)}</span>
            <span class="wh-datetime">${datePart} ${timePart}</span>
          </span>
          <div class="wh-products">${prodList}</div>
          <span class="wh-order-total">${fmt(o.total)}</span>
        </div>`;
    }).join('');

    return `
      <div class="wh-waiter-card">
        <div class="wh-waiter-header" onclick="toggleWaiterCard('${gId}')">
          <div class="wh-waiter-info">
            <div class="wh-avatar">${esc(w.user_name.charAt(0).toUpperCase())}</div>
            <div>
              <div class="wh-waiter-name">${esc(w.user_name)}</div>
              <div class="wh-waiter-stats">
                ${w.orders.length} orden${w.orders.length !== 1 ? 'es' : ''}
                · ${w.items_qty} producto${w.items_qty !== 1 ? 's' : ''}
              </div>
            </div>
          </div>
          <div class="wh-waiter-right">
            <span class="wh-waiter-total">${fmt(w.total)}</span>
            <span class="wh-chevron" id="${gId}-chev">${icon('chevron', 16)}</span>
          </div>
        </div>
        <div class="wh-orders-list" id="${gId}">${ordRows}</div>
      </div>`;
  }).join('');
}

function toggleWaiterCard(gId) {
  const el  = document.getElementById(gId);
  const chv = document.getElementById(`${gId}-chev`);
  const open = el.classList.toggle('open');
  chv.classList.toggle('open', open);
}

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN
// ═══════════════════════════════════════════════════════════════════════════════
function initAdminView() {
  // Solo admins llegan aquí (el botón está oculto para users)
  switchAdminTab('productos', document.getElementById('tab-productos'));
}

function switchAdminTab(tabName, btn) {
  document.querySelectorAll('.admin-tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(`admin-${tabName}`).classList.add('active');
  if (btn) btn.classList.add('active');

  if (tabName === 'productos')  loadAdminProducts();
  if (tabName === 'categorias') loadAdminCategories();
  if (tabName === 'mesas')      loadAdminTables();
  if (tabName === 'usuarios')   loadAdminUsers();
}

// ── Productos Admin ───────────────────────────────────────────────────────────
async function loadAdminProducts() {
  [State.products, State.categories] = await Promise.all([
    window.api.products.list(),
    window.api.categories.list()
  ]);
  renderProductsTable();
}

function renderProductsTable() {
  const typeFilter = document.getElementById('filter-prod-type').value;
  let list = State.products;
  if (typeFilter) list = list.filter(p => p.category_type === typeFilter);

  const tbody = document.getElementById('products-tbody');

  if (!list.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="td-empty">Sin productos</td></tr>';
    return;
  }

  // Agrupar por categoría
  const groups = {};
  for (const p of list) {
    if (!groups[p.category_id]) {
      groups[p.category_id] = { name: p.category_name, type: p.category_type, products: [] };
    }
    groups[p.category_id].products.push(p);
  }

  // Ordenar grupos: por tipo (bebida → boquita → comida), luego por nombre
  const sortedGroups = Object.entries(groups).sort(([, a], [, b]) =>
    (TYPE_ORDER[a.type] ?? 3) - (TYPE_ORDER[b.type] ?? 3) || a.name.localeCompare(b.name)
  );

  tbody.innerHTML = sortedGroups.map(([catId, group]) => {
    const gId   = `ag-${catId}`;
    const count = group.products.length;
    const header = `
      <tr class="cat-group-header" onclick="toggleAdminCatGroup('${gId}')">
        <td colspan="6">
          <span class="cat-group-toggle">${icon('chevron', 14)}</span>
          <span class="badge badge-${group.type}">${TYPE_LABEL[group.type] || group.type}</span>
          <b>${esc(group.name)}</b>
          <span class="cat-group-count">${count} producto${count !== 1 ? 's' : ''}</span>
        </td>
      </tr>`;
    const rows = group.products.map(p => `
    <tr class="cat-group-row ${gId}" hidden>
      <td><b>${esc(p.name)}</b></td>
      <td>${esc(p.category_name)}</td>
      <td><span class="badge badge-${p.category_type}">${TYPE_LABEL[p.category_type] || p.category_type}</span></td>
      <td><b>${fmt(p.price)}</b></td>
      <td>${p.available
        ? '<span class="badge badge-active">Sí</span>'
        : '<span class="badge badge-inactive">No</span>'}</td>
      <td class="row-actions">
        <button class="btn btn-outline btn-sm" onclick="openProductModal(${p.id})">${icon('pencil', 13)}Editar</button>
        <button class="btn btn-ghost-danger btn-sm" onclick="confirmDelete('producto', ${p.id}, '${esc(p.name)}')">${icon('trash', 13)}Eliminar</button>
      </td>
    </tr>`).join('');
    return header + rows;
  }).join('');
}

function toggleAdminCatGroup(gId) {
  const rows   = document.querySelectorAll(`.cat-group-row.${gId}`);
  const header = document.querySelector(`.cat-group-header[onclick*="${gId}"]`);
  const open   = rows.length && rows[0].hidden;
  rows.forEach(r => { r.hidden = !open; });
  if (header) header.querySelector('.cat-group-toggle').classList.toggle('open', open);
}

function openProductModal(productId) {
  State.editProduct = productId ? State.products.find(p => p.id === productId) : null;
  const p = State.editProduct;

  document.getElementById('modal-product-title').textContent = p ? 'Editar Producto' : 'Nuevo Producto';
  document.getElementById('prod-name').value  = p ? p.name  : '';
  document.getElementById('prod-price').value = p ? p.price : '';
  document.getElementById('prod-type').value  = p ? p.category_type : 'bebida';
  document.getElementById('prod-available-group').style.display = p ? '' : 'none';
  if (p) document.getElementById('prod-available').checked = p.available;

  updateCategoryOptions();
  if (p) document.getElementById('prod-category').value = p.category_id;

  openModal('modal-product');
}

function updateCategoryOptions() {
  const type   = document.getElementById('prod-type').value;
  const select = document.getElementById('prod-category');
  const cats   = State.categories.filter(c => c.type === type);

  select.innerHTML = cats.length
    ? cats.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('')
    : '<option value="">Sin categorías de este tipo</option>';
  select.disabled = !cats.length;
}

async function saveProduct(e) {
  e.preventDefault();

  const categoryId = parseInt(document.getElementById('prod-category').value);
  if (!categoryId) {
    showToast('Cree primero una categoría de este tipo', 'error');
    return;
  }

  const data = {
    name:        document.getElementById('prod-name').value.trim(),
    price:       document.getElementById('prod-price').value,
    category_id: categoryId,
    available:   State.editProduct ? document.getElementById('prod-available').checked : true
  };

  let res;
  if (State.editProduct) {
    res = await window.api.products.update(State.editProduct.id, data);
  } else {
    res = await window.api.products.create(data);
  }

  if (res.success === false) { showToast(res.error || 'Error al guardar', 'error'); return; }
  closeModal('modal-product');
  showToast(State.editProduct ? 'Producto actualizado' : 'Producto creado', 'success');
  await loadAdminProducts();
}

// ── Categorías Admin ──────────────────────────────────────────────────────────
async function loadAdminCategories() {
  State.categories = await window.api.categories.list();
  renderCategoriesTable();
}

function renderCategoriesTable() {
  const typeFilter = document.getElementById('filter-cat-type').value;
  const list  = typeFilter ? State.categories.filter(c => c.type === typeFilter) : State.categories;
  const tbody = document.getElementById('categories-tbody');

  if (!list.length) {
    tbody.innerHTML = '<tr><td colspan="4" class="td-empty">Sin categorías</td></tr>';
    return;
  }

  tbody.innerHTML = list.map(c => {
    const n     = c.product_count || 0;
    const vacia = n === 0;
    return `
    <tr>
      <td><b>${esc(c.name)}</b></td>
      <td><span class="badge badge-${c.type}">${TYPE_LABEL[c.type] || c.type}</span></td>
      <td><b>${n}</b> producto${n !== 1 ? 's' : ''}</td>
      <td class="row-actions">
        <button class="btn btn-outline btn-sm" onclick="openCategoryModal(${c.id})">${icon('pencil', 13)}Editar</button>
        <button class="btn btn-ghost-danger btn-sm" ${vacia ? '' : 'disabled title="Tiene productos asignados"'}
                onclick="confirmDelete('categoría', ${c.id}, '${esc(c.name)}')">${icon('trash', 13)}Eliminar</button>
      </td>
    </tr>`;
  }).join('');
}

function openCategoryModal(categoryId) {
  State.editCategory = categoryId ? State.categories.find(c => c.id === categoryId) : null;
  const c = State.editCategory;

  document.getElementById('modal-category-title').textContent = c ? 'Editar Categoría' : 'Nueva Categoría';
  document.getElementById('cat-name').value = c ? c.name : '';
  document.getElementById('cat-type').value = c ? c.type : 'bebida';

  openModal('modal-category');
}

async function saveCategory(e) {
  e.preventDefault();
  const data = {
    name: document.getElementById('cat-name').value.trim(),
    type: document.getElementById('cat-type').value
  };

  const res = State.editCategory
    ? await window.api.categories.update(State.editCategory.id, data)
    : await window.api.categories.create(data);

  if (res.success === false) { showToast(res.error || 'Error al guardar', 'error'); return; }
  closeModal('modal-category');
  showToast(State.editCategory ? 'Categoría actualizada' : 'Categoría creada', 'success');
  await loadAdminCategories();
}

// ── Mesas Admin ───────────────────────────────────────────────────────────────
async function loadAdminTables() {
  State.tables = await window.api.tables.list();
  renderAdminTables();
}

function renderAdminTables() {
  const tbody = document.getElementById('tables-admin-tbody');
  if (!State.tables.length) {
    tbody.innerHTML = '<tr><td colspan="4" class="td-empty">Sin mesas</td></tr>';
    return;
  }
  tbody.innerHTML = State.tables.map(t => `
    <tr>
      <td><b>${esc(t.name)}</b></td>
      <td>${t.capacity} personas</td>
      <td><span class="badge badge-${t.status}">${t.status === 'libre' ? 'Libre' : 'Ocupada'}</span></td>
      <td class="row-actions">
        <button class="btn btn-outline btn-sm" onclick="openTableModal(${t.id})">${icon('pencil', 13)}Editar</button>
        <button class="btn btn-ghost-danger btn-sm" onclick="confirmDelete('mesa', ${t.id}, '${esc(t.name)}')"
                ${t.status === 'ocupada' ? 'disabled title="Mesa ocupada"' : ''}>${icon('trash', 13)}Eliminar</button>
      </td>
    </tr>`).join('');
}

function openTableModal(tableId) {
  State.editTable = tableId ? State.tables.find(t => t.id === tableId) : null;
  const t = State.editTable;

  document.getElementById('modal-table-title').textContent = t ? 'Editar Mesa' : 'Nueva Mesa';
  document.getElementById('table-name').value     = t ? t.name     : '';
  document.getElementById('table-capacity').value = t ? t.capacity : 4;

  openModal('modal-table');
}

async function saveTable(e) {
  e.preventDefault();
  const data = {
    name:     document.getElementById('table-name').value.trim(),
    capacity: parseInt(document.getElementById('table-capacity').value)
  };

  let res;
  if (State.editTable) {
    res = await window.api.tables.update(State.editTable.id, data);
  } else {
    res = await window.api.tables.create(data);
  }

  if (res.success === false) { showToast(res.error || 'Error al guardar', 'error'); return; }
  closeModal('modal-table');
  showToast(State.editTable ? 'Mesa actualizada' : 'Mesa creada', 'success');
  await loadAdminTables();
}

// ── Usuarios Admin ────────────────────────────────────────────────────────────
async function loadAdminUsers() {
  const users = await window.api.users.list();
  renderUsersTable(users);
}

function renderUsersTable(users) {
  const tbody = document.getElementById('users-tbody');
  if (!users.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="td-empty">Sin usuarios</td></tr>';
    return;
  }
  tbody.innerHTML = users.map(u => `
    <tr>
      <td><code>${esc(u.username)}</code></td>
      <td>${esc(u.full_name)}</td>
      <td><span class="badge badge-${u.role}">${u.role === 'admin' ? 'Admin' : 'Mesero'}</span></td>
      <td><span class="badge badge-${u.active ? 'active' : 'inactive'}">${u.active ? 'Activo' : 'Inactivo'}</span></td>
      <td class="row-actions">
        <button class="btn btn-outline btn-sm" onclick="openUserModal(${u.id})">${icon('pencil', 13)}Editar</button>
        ${u.id === State.user.id
          ? '<span class="row-note">Tu cuenta</span>'
          : `<button class="btn btn-ghost-danger btn-sm" onclick="confirmDelete('usuario', ${u.id}, '${esc(u.username)}')">${icon('trash', 13)}Eliminar</button>`
        }
      </td>
    </tr>`).join('');
}

function openUserModal(userId) {
  State.editUser = null;

  document.getElementById('modal-user-title').textContent = 'Nuevo Usuario';
  document.getElementById('user-fullname').value = '';
  document.getElementById('user-username').value = '';
  document.getElementById('user-password').value = '';
  document.getElementById('user-role').value     = 'user';
  document.getElementById('hint-password').classList.add('hidden');
  document.getElementById('user-active-group').style.display = 'none';
  document.getElementById('user-password').required = true;

  if (userId) {
    window.api.users.list().then(users => {
      const u = users.find(x => x.id === userId);
      if (!u) return;
      State.editUser = u;
      document.getElementById('modal-user-title').textContent = 'Editar Usuario';
      document.getElementById('user-fullname').value = u.full_name;
      document.getElementById('user-username').value = u.username;
      document.getElementById('user-role').value     = u.role;
      document.getElementById('user-active').value   = String(u.active);
      document.getElementById('hint-password').classList.remove('hidden');
      document.getElementById('user-active-group').style.display = '';
      document.getElementById('user-password').required = false;
    });
  }

  openModal('modal-user');
}

async function saveUser(e) {
  e.preventDefault();
  const password = document.getElementById('user-password').value;
  const data = {
    full_name: document.getElementById('user-fullname').value.trim(),
    username:  document.getElementById('user-username').value.trim(),
    role:      document.getElementById('user-role').value,
    active:    document.getElementById('user-active').value === 'true',
    password:  password || undefined
  };

  if (!State.editUser && !data.password) {
    showToast('La contraseña es requerida', 'error'); return;
  }

  let res;
  if (State.editUser) {
    res = await window.api.users.update(State.editUser.id, data);
  } else {
    res = await window.api.users.create(data);
  }

  if (res.success === false) { showToast(res.error || 'Error al guardar', 'error'); return; }
  closeModal('modal-user');
  showToast(State.editUser ? 'Usuario actualizado' : 'Usuario creado', 'success');
  await loadAdminUsers();
}

// ── Confirmación de eliminación ───────────────────────────────────────────────
function confirmDelete(type, id, name) {
  const labels = { producto: 'el producto', 'categoría': 'la categoría', mesa: 'la mesa', usuario: 'el usuario' };
  document.getElementById('confirm-title').textContent   = `Eliminar ${type}`;
  document.getElementById('confirm-message').textContent =
    `¿Eliminar ${labels[type] || type} "${name}"? Esta acción no se puede deshacer.`;

  const btn = document.getElementById('btn-confirm-ok');
  btn.onclick = async () => {
    closeModal('modal-confirm');
    let res;
    if      (type === 'producto')  res = await window.api.products.delete(id);
    else if (type === 'categoría') res = await window.api.categories.delete(id);
    else if (type === 'mesa')      res = await window.api.tables.delete(id);
    else if (type === 'usuario')   res = await window.api.users.delete(id);

    if (res && res.success === false) {
      showToast(res.error || 'No se pudo eliminar', 'error'); return;
    }
    const femenino = type === 'categoría' || type === 'mesa';
    showToast(`${type.charAt(0).toUpperCase() + type.slice(1)} eliminad${femenino ? 'a' : 'o'}`, 'success');
    if (type === 'producto')  await loadAdminProducts();
    if (type === 'categoría') await loadAdminCategories();
    if (type === 'mesa')      await loadAdminTables();
    if (type === 'usuario')   await loadAdminUsers();
  };

  openModal('modal-confirm');
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODALS helpers
// ═══════════════════════════════════════════════════════════════════════════════
function openModal(id) {
  document.getElementById(id).classList.add('active');
}

function closeModal(id) {
  document.getElementById(id).classList.remove('active');
}

function closeModalOnOverlay(e, id) {
  if (e.target.id === id) closeModal(id);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION helpers
// ═══════════════════════════════════════════════════════════════════════════════
function showContentSection(id) {
  document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

// ═══════════════════════════════════════════════════════════════════════════════
// TOAST
// ═══════════════════════════════════════════════════════════════════════════════
function showToast(msg, type = 'info') {
  const container = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  const glyph = { success: 'check', error: 'alert', info: 'info' }[type] || 'info';
  el.innerHTML = `${icon(glyph, 16)}<span></span>`;
  el.querySelector('span').textContent = msg;
  container.appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

// ═══════════════════════════════════════════════════════════════════════════════
// UTILS
// ═══════════════════════════════════════════════════════════════════════════════
function fmt(amount) {
  return 'Q' + Number(amount || 0).toFixed(2);
}

function formatDate(iso) {
  if (!iso) return '—';
  const d    = new Date(iso);
  const dd   = String(d.getDate()).padStart(2,'0');
  const mm   = String(d.getMonth()+1).padStart(2,'0');
  const yy   = d.getFullYear();
  const time = d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
  return `${dd}-${mm}-${yy} ${time}`;
}

function esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

// ── Keyboard shortcuts ────────────────────────────────────────────────────────
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
  }
});

// ── Form listeners (evita conflictos con CSP que bloquea onsubmit inline) ────
document.getElementById('login-form').addEventListener('submit', handleLogin);
