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
  editProduct:    null,
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
    const adminTree = document.getElementById('nav-admin-tree');
    if (adminTree) adminTree.style.display = isAdmin ? 'block' : 'none';
    document.querySelectorAll('.admin-only')
      .forEach(el => el.style.display = isAdmin ? 'inline-flex' : 'none');

    await window.api.window.expand();
    showView('view-app');
    await loadBaseData();
    showMainView('tables');
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

  // Ocultar y colapsar árbol admin al cerrar sesión
  const adminTree = document.getElementById('nav-admin-tree');
  if (adminTree) adminTree.style.display = 'none';
  const children = document.getElementById('nav-admin-children');
  const chevron  = document.getElementById('nav-admin-chevron');
  if (children) children.classList.remove('open');
  if (chevron)  chevron.classList.remove('open');
  document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'none');

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
const ADMIN_ROUTES = { 'admin-productos': 'productos', 'admin-mesas': 'mesas', 'admin-usuarios': 'usuarios' };
const ADMIN_LABELS = { productos: 'Productos', mesas: 'Mesas', usuarios: 'Usuarios' };

function showMainView(name) {
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

function renderTables() {
  const grid = document.getElementById('tables-grid');
  if (!State.tables.length) {
    grid.innerHTML = '<p style="color:#94a3b8;padding:20px">No hay mesas configuradas.</p>';
    return;
  }

  grid.innerHTML = State.tables.map(t => {
    const isOcupada = t.status === 'ocupada';
    const n = t.name.toLowerCase();
    let iconHtml;
    const color   = isOcupada ? '#ef4444' : '#3b82f6';
    const colorBg = isOcupada ? '#fee2e2' : '#dbeafe';
    const colorLt = isOcupada ? '#fca5a5' : '#93c5fd';
    if (n.includes('barra')) {
      iconHtml = `<span class="card-icon">🍺</span>`;
    } else if (n.includes('terraza')) {
      iconHtml = `<span class="card-icon">🌿</span>`;
    } else {
      const num = (t.name.match(/\d+/) || [''])[0] || t.name.charAt(0).toUpperCase();
      // Mesa cuadrada con sillas — vista superior SVG
      iconHtml = `
        <svg class="tbl-svg" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
          <!-- silla arriba -->
          <rect x="18" y="3"  width="24" height="10" rx="3" fill="${colorLt}"/>
          <!-- silla abajo -->
          <rect x="18" y="47" width="24" height="10" rx="3" fill="${colorLt}"/>
          <!-- silla izquierda -->
          <rect x="3"  y="18" width="10" height="24" rx="3" fill="${colorLt}"/>
          <!-- silla derecha -->
          <rect x="47" y="18" width="10" height="24" rx="3" fill="${colorLt}"/>
          <!-- superficie de la mesa -->
          <rect x="13" y="13" width="34" height="34" rx="6" fill="${colorBg}" stroke="${color}" stroke-width="2.5"/>
          <!-- número -->
          <text x="30" y="35" text-anchor="middle" font-size="16" font-weight="900"
                font-family="Segoe UI,system-ui,sans-serif" fill="${color}">${num}</text>
        </svg>`;
    }
    return `
      <div class="table-card ${t.status}" onclick="openTable(${t.id})">
        ${iconHtml}
        <div class="card-name">${esc(t.name)}</div>
        <div class="card-cap">👥 ${t.capacity} personas</div>
        <span class="card-status">${isOcupada ? 'Ocupada' : 'Libre'}</span>
        ${isOcupada ? `<button class="btn-liberar-card" onclick="event.stopPropagation(); confirmarLiberarMesa(${t.id})">🔓 Liberar</button>` : ''}
      </div>`;
  }).join('');
}

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
  await loadOrder();
  showContentSection('view-order');

  // navBtn
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
}

function backToTables() {
  State.currentOrderId = null;
  State.categoryFilter = null;
  showMainView('tables');
}

function confirmarLiberarMesa(tableId) {
  const order = State.openOrders.find(o => o.table_id === tableId);
  if (!order) { showToast('No se encontró la orden abierta', 'error'); return; }
  const hasItems = /* comprobamos en la orden actual */ true;
  document.getElementById('confirm-title').textContent   = '🔓 Liberar Mesa';
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
  document.getElementById('confirm-title').textContent   = '🔓 Liberar Mesa';
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

  renderOrderItems(order.items, order.total);
  buildMenuFilters();
  renderMenuProducts();
}

function renderOrderItems(items, total) {
  const list = document.getElementById('order-items-list');

  if (!items || !items.length) {
    list.innerHTML = `
      <div class="empty-order">
        <span>Sin ítems</span>
        <small>Seleccione productos del menú</small>
      </div>`;
    document.getElementById('order-total').textContent = '$0.00';
    document.getElementById('btn-cobrar').disabled = true;
    return;
  }

  document.getElementById('btn-cobrar').disabled = false;

  list.innerHTML = items.map(item => `
    <div class="order-item" id="item-${item.id}">
      <div class="item-name">${esc(item.product_name)}</div>
      <div class="item-controls">
        <div class="qty-controls">
          <button class="qty-btn remove"
                  onclick="changeItemQty(${item.id}, ${item.quantity - 1})"
                  title="Reducir">−</button>
          <span class="qty-num">${item.quantity}</span>
          <button class="qty-btn"
                  onclick="changeItemQty(${item.id}, ${item.quantity + 1})"
                  title="Aumentar">+</button>
        </div>
        <span class="item-subtotal">${fmt(item.unit_price * item.quantity)}</span>
      </div>
    </div>`).join('');

  document.getElementById('order-total').textContent = fmt(total);
}

async function changeItemQty(itemId, newQty) {
  await window.api.orders.updateItem(itemId, newQty);
  await loadOrder();
}

// ── Menú de productos ─────────────────────────────────────────────────────────
function buildMenuFilters() {
  const bar = document.getElementById('menu-filter-bar');

  // Obtener tipos únicos
  const typeLabels = { bebida: '🍹 Bebidas', boquita: '🥨 Boquitas', comida: '🍽️ Comida' };
  const types = [...new Set(State.categories.map(c => c.type))];

  bar.innerHTML =
    `<button class="cat-filter-btn all ${State.categoryFilter === null ? 'active' : ''}"
             onclick="filterMenu(null, this)">Todos</button>` +
    types.map(type => `
      <button class="cat-filter-btn type-${type} ${State.categoryFilter === type ? 'active' : ''}"
              onclick="filterMenu('${type}', this)">
        ${typeLabels[type] || type}
      </button>`).join('') +
    State.categories.map(cat => `
      <button class="cat-filter-btn ${State.categoryFilter === 'cat_' + cat.id ? 'active' : ''}"
              onclick="filterMenu('cat_${cat.id}', this)"
              style="font-size:11px">
        ${esc(cat.name)}
      </button>`).join('');
}

function filterMenu(filter, btn) {
  State.categoryFilter = filter;
  document.querySelectorAll('.cat-filter-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderMenuProducts();
}

function renderMenuProducts() {
  const grid    = document.getElementById('menu-products-grid');
  let filtered  = State.products.filter(p => p.available);

  if (State.categoryFilter !== null) {
    if (State.categoryFilter && State.categoryFilter.startsWith('cat_')) {
      const catId = parseInt(State.categoryFilter.replace('cat_', ''));
      filtered = filtered.filter(p => p.category_id === catId);
    } else if (State.categoryFilter) {
      filtered = filtered.filter(p => p.category_type === State.categoryFilter);
    }
  }

  if (!filtered.length) {
    grid.innerHTML = '<p style="color:#94a3b8;padding:20px;grid-column:1/-1">Sin productos en esta categoría.</p>';
    return;
  }

  grid.innerHTML = filtered.map(p => `
    <div class="product-card" onclick="addProductToOrder(${p.id})">
      <div class="prod-name">${esc(p.name)}</div>
      <div class="prod-price">${fmt(p.price)}</div>
    </div>`).join('');
}

async function addProductToOrder(productId) {
  if (!State.currentOrderId) return;
  await window.api.orders.addItem(State.currentOrderId, productId, 1);
  await loadOrder();
}

// ── Cobrar ────────────────────────────────────────────────────────────────────
async function cobrarOrden() {
  const order = await window.api.orders.get(State.currentOrderId);
  if (!order || !order.items.length) {
    showToast('La orden está vacía', 'error'); return;
  }
  showReceipt(order);
}

function showReceipt(order) {
  const el = document.getElementById('receipt-content');

  const rows = order.items.map(i => `
    <tr>
      <td>${esc(i.product_name)}</td>
      <td style="text-align:center">x${i.quantity}</td>
      <td style="text-align:right">${fmt(i.unit_price)}</td>
      <td style="text-align:right">${fmt(i.unit_price * i.quantity)}</td>
    </tr>`).join('');

  el.innerHTML = `
    <div class="receipt-header">
      <h2>🍹 LA TABERNA</h2>
      <p>Barra y Restaurante · Powered by El Primo</p>
    </div>
    <hr class="receipt-divider">
    <div class="receipt-meta">
      <div><span><b>Mesa:</b></span><span>${esc(order.table_name)}</span></div>
      <div><span><b>Fecha:</b></span><span>${formatDate(order.created_at)}</span></div>
      <div><span><b>Atendido por:</b></span><span>${esc(order.user_name)}</span></div>
      <div><span><b>Orden #:</b></span><span>${order.id}</span></div>
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
    <div class="receipt-total-block">TOTAL: ${fmt(order.total)}</div>
    <div class="receipt-footer">
      <p>¡Gracias por su visita!</p>
    </div>`;

  openModal('modal-receipt');
}

async function confirmPayment() {
  const res = await window.api.orders.close(State.currentOrderId);
  if (!res.success) { showToast(res.error || 'Error al cerrar orden', 'error'); return; }

  closeModal('modal-receipt');
  showToast('Orden cobrada correctamente', 'success');
  State.currentOrderId = null;
  State.categoryFilter = null;
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
    ${orders.length ? `<button class="btn btn-outline hist-corte-btn" onclick="showCorte()">📊 Ver Corte</button>` : ''}`;

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
          <span class="hist-order-user">👤 ${esc(o.user_name)}</span>
        </div>
        <div class="hist-order-right">
          <span class="hist-order-datetime">
            <span class="hist-date">${datePart}</span>
            <span class="hist-time">🕐 ${timePart}</span>
          </span>
          <span class="hist-order-total">${fmt(o.total)}</span>
          <button class="hist-del-btn" onclick="event.stopPropagation(); deleteFromHistory(${o.id}, '#${o.id} ${esc(o.table_name)}')" title="Eliminar">🗑</button>
          <span class="hist-chevron" id="hist-chev-${o.id}">▼</span>
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

function showCorte() {
  const orders = State.historyOrders;
  if (!orders.length) { showToast('No hay órdenes en el período seleccionado', 'info'); return; }

  const dateFrom    = document.getElementById('hist-date-from').value;
  const dateTo      = document.getElementById('hist-date-to').value;
  const totalAmount = orders.reduce((s, o) => s + o.total, 0);

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

    <div class="corte-tabs">
      <button class="corte-tab-btn active" onclick="switchCorteTab('mesas',this)">Por Mesa</button>
      <button class="corte-tab-btn" onclick="switchCorteTab('productos',this)">Por Producto</button>
      <button class="corte-tab-btn" onclick="switchCorteTab('dias',this)">Por Día</button>
    </div>

    <div id="corte-tab-mesas"    class="corte-tab-panel active">${buildCorteMesas(orders)}</div>
    <div id="corte-tab-productos" class="corte-tab-panel">${buildCorteProductos(orders, totalAmount)}</div>
    <div id="corte-tab-dias"     class="corte-tab-panel">${buildCorteDias(orders, totalAmount)}</div>`;

  openModal('modal-corte');
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
  chev.textContent = open ? '▲' : '▼';
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
              <span id="cmt-chev-${safeId}" class="cmt-chev">▼</span>
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
  chevEl.textContent = open ? '▲' : '▼';
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
  loadHistory();
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

  if (tabName === 'productos') loadAdminProducts();
  if (tabName === 'mesas')     loadAdminTables();
  if (tabName === 'usuarios')  loadAdminUsers();
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

  const typeLabel = { bebida: 'Bebida', boquita: 'Boquita', comida: 'Comida' };
  const tbody = document.getElementById('products-tbody');

  if (!list.length) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#94a3b8;padding:24px">Sin productos</td></tr>';
    return;
  }

  tbody.innerHTML = list.map(p => `
    <tr>
      <td><b>${esc(p.name)}</b></td>
      <td>${esc(p.category_name)}</td>
      <td><span class="badge badge-${p.category_type}">${typeLabel[p.category_type] || p.category_type}</span></td>
      <td><b>${fmt(p.price)}</b></td>
      <td>${p.available
        ? '<span class="badge badge-active">Sí</span>'
        : '<span class="badge badge-inactive">No</span>'}</td>
      <td style="white-space:nowrap">
        <button class="btn btn-outline btn-sm" onclick="openProductModal(${p.id})">Editar</button>
        <button class="btn btn-danger btn-sm"  onclick="confirmDelete('producto', ${p.id}, '${esc(p.name)}')">Eliminar</button>
      </td>
    </tr>`).join('');
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

  select.innerHTML = cats.map(c =>
    `<option value="${c.id}">${esc(c.name)}</option>`
  ).join('');
}

async function saveProduct(e) {
  e.preventDefault();
  const data = {
    name:        document.getElementById('prod-name').value.trim(),
    price:       document.getElementById('prod-price').value,
    category_id: parseInt(document.getElementById('prod-category').value),
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

// ── Mesas Admin ───────────────────────────────────────────────────────────────
async function loadAdminTables() {
  State.tables = await window.api.tables.list();
  renderAdminTables();
}

function renderAdminTables() {
  const tbody = document.getElementById('tables-admin-tbody');
  if (!State.tables.length) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:#94a3b8;padding:24px">Sin mesas</td></tr>';
    return;
  }
  tbody.innerHTML = State.tables.map(t => `
    <tr>
      <td><b>${esc(t.name)}</b></td>
      <td>${t.capacity} personas</td>
      <td><span class="badge badge-${t.status}">${t.status === 'libre' ? 'Libre' : 'Ocupada'}</span></td>
      <td style="white-space:nowrap">
        <button class="btn btn-outline btn-sm" onclick="openTableModal(${t.id})">Editar</button>
        <button class="btn btn-danger btn-sm"  onclick="confirmDelete('mesa', ${t.id}, '${esc(t.name)}')"
                ${t.status === 'ocupada' ? 'disabled title="Mesa ocupada"' : ''}>Eliminar</button>
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
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#94a3b8;padding:24px">Sin usuarios</td></tr>';
    return;
  }
  tbody.innerHTML = users.map(u => `
    <tr>
      <td><code>${esc(u.username)}</code></td>
      <td>${esc(u.full_name)}</td>
      <td><span class="badge badge-${u.role}">${u.role === 'admin' ? 'Admin' : 'Mesero'}</span></td>
      <td><span class="badge badge-${u.active ? 'active' : 'inactive'}">${u.active ? 'Activo' : 'Inactivo'}</span></td>
      <td style="white-space:nowrap">
        <button class="btn btn-outline btn-sm" onclick="openUserModal(${u.id})">Editar</button>
        ${u.id === State.user.id
          ? '<span style="font-size:11px;color:#94a3b8">Tu cuenta</span>'
          : `<button class="btn btn-danger btn-sm" onclick="confirmDelete('usuario', ${u.id}, '${esc(u.username)}')">Eliminar</button>`
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
  const labels = { producto: 'el producto', mesa: 'la mesa', usuario: 'el usuario' };
  document.getElementById('confirm-title').textContent   = `Eliminar ${type}`;
  document.getElementById('confirm-message').textContent =
    `¿Eliminar ${labels[type] || type} "${name}"? Esta acción no se puede deshacer.`;

  const btn = document.getElementById('btn-confirm-ok');
  btn.onclick = async () => {
    closeModal('modal-confirm');
    let res;
    if      (type === 'producto') res = await window.api.products.delete(id);
    else if (type === 'mesa')     res = await window.api.tables.delete(id);
    else if (type === 'usuario')  res = await window.api.users.delete(id);

    if (res && res.success === false) {
      showToast(res.error || 'No se pudo eliminar', 'error'); return;
    }
    showToast(`${type.charAt(0).toUpperCase() + type.slice(1)} eliminado`, 'success');
    if (type === 'producto') await loadAdminProducts();
    if (type === 'mesa')     await loadAdminTables();
    if (type === 'usuario')  await loadAdminUsers();
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
  el.textContent = msg;
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
