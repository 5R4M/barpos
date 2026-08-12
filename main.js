const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

let mainWindow;
let db;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 420,
    height: 540,
    resizable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    title: 'La Taberna — Barra y Restaurante',
    show: false,
    backgroundColor: '#1a3667'
  });

  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));
  mainWindow.once('ready-to-show', () => mainWindow.show());
}

ipcMain.handle('window:expand', () => {
  mainWindow.setOpacity(0);
  mainWindow.setResizable(true);
  mainWindow.setMinimumSize(1100, 680);
  mainWindow.setSize(1380, 860, false);
  mainWindow.center();
});

ipcMain.handle('window:show', () => {
  mainWindow.setOpacity(1);
});

ipcMain.handle('window:collapse', () => {
  mainWindow.setOpacity(0);
  mainWindow.setResizable(true);
  mainWindow.setMinimumSize(1, 1);
  mainWindow.setSize(420, 540, false);
  mainWindow.setResizable(false);
  mainWindow.center();
  mainWindow.setOpacity(1);
});

app.whenReady().then(() => {
  db = require('./database');
  db.initDB();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ── Auth ─────────────────────────────────────────────────────────────────────
ipcMain.handle('auth:login', (_, username, password) => db.login(username, password));

// ── Users ────────────────────────────────────────────────────────────────────
ipcMain.handle('users:list',   ()          => db.getUsers());
ipcMain.handle('users:create', (_, data)   => db.createUser(data));
ipcMain.handle('users:update', (_, id, d)  => db.updateUser(id, d));
ipcMain.handle('users:delete', (_, id)     => db.deleteUser(id));
ipcMain.handle('users:changePassword', (_, id, cur, nueva) => db.changePassword(id, cur, nueva));

// ── Categories ───────────────────────────────────────────────────────────────
ipcMain.handle('categories:list',   ()          => db.getCategories());
ipcMain.handle('categories:create', (_, data)   => db.createCategory(data));
ipcMain.handle('categories:update', (_, id, d)  => db.updateCategory(id, d));
ipcMain.handle('categories:delete', (_, id)     => db.deleteCategory(id));

// ── Products ─────────────────────────────────────────────────────────────────
ipcMain.handle('products:list',   ()          => db.getProducts());
ipcMain.handle('products:create', (_, data)   => db.createProduct(data));
ipcMain.handle('products:update', (_, id, d)  => db.updateProduct(id, d));
ipcMain.handle('products:delete', (_, id)     => db.deleteProduct(id));

// ── Tables ───────────────────────────────────────────────────────────────────
ipcMain.handle('tables:list',   ()          => db.getTables());
ipcMain.handle('tables:create', (_, data)   => db.createTable(data));
ipcMain.handle('tables:update', (_, id, d)  => db.updateTable(id, d));
ipcMain.handle('tables:delete', (_, id)     => db.deleteTable(id));

// ── Orders ───────────────────────────────────────────────────────────────────
ipcMain.handle('orders:openList',   ()                                 => db.getOpenOrders());
ipcMain.handle('orders:get',        (_, orderId)                       => db.getOrderWithItems(orderId));
ipcMain.handle('orders:create',     (_, tableId, userId, guests)       => db.createOrder(tableId, userId, guests));
ipcMain.handle('orders:setGuests',  (_, orderId, guests)               => db.setOrderGuests(orderId, guests));
ipcMain.handle('orders:transfer',   (_, orderId, tableId)              => db.transferOrder(orderId, tableId));
ipcMain.handle('orders:addItem',    (_, orderId, productId, qty, note) => db.addOrderItem(orderId, productId, qty, note));
ipcMain.handle('orders:setItemNote', (_, itemId, note)                 => db.setOrderItemNote(itemId, note));
ipcMain.handle('orders:updateItem', (_, itemId, qty)                   => db.updateOrderItem(itemId, qty));
ipcMain.handle('orders:removeItem', (_, itemId)                        => db.removeOrderItem(itemId));
ipcMain.handle('orders:voidItem',   (_, itemId, reason, userId)        => db.voidOrderItem(itemId, reason, userId));
ipcMain.handle('orders:send',       (_, orderId)                       => db.sendToKitchen(orderId));

// ── Cocina y barra ───────────────────────────────────────────────────────────
ipcMain.handle('kitchen:tickets',    (_, destino)                 => db.getKitchenTickets(destino));
ipcMain.handle('kitchen:counts',     ()                           => db.getKitchenCounts());
ipcMain.handle('kitchen:advance',    (_, orderId, sentAt, destino) => db.advanceTicket(orderId, sentAt, destino));
ipcMain.handle('kitchen:retreat',    (_, orderId, sentAt, destino) => db.retreatTicket(orderId, sentAt, destino));
ipcMain.handle('kitchen:deliverReady', (_, orderId, sentAt, destino) => db.deliverReadyItems(orderId, sentAt, destino));
ipcMain.handle('kitchen:setItem',    (_, itemId, status)          => db.setItemStatus(itemId, status));
ipcMain.handle('kitchen:history',      (_, from, to) => db.getKitchenHistory(from, to));
ipcMain.handle('kitchen:historyByDay', (_, from, to) => db.getKitchenHistoryByDay(from, to));
ipcMain.handle('orders:setDiscount', (_, orderId, type, value)         => db.setOrderDiscount(orderId, type, value));
ipcMain.handle('orders:close',      (_, orderId, payment)              => db.closeOrder(orderId, payment));
ipcMain.handle('orders:cancel',        (_, id)                => db.cancelOrder(id));
ipcMain.handle('orders:delete',        (_, id)                => db.deleteOrder(id));
ipcMain.handle('orders:waiterHistory', (_, from, to)          => db.getWaiterHistory(from, to));
ipcMain.handle('orders:payments',      (_, from, to)          => db.getPaymentBreakdown(from, to));
ipcMain.handle('orders:voids',         (_, from, to)          => db.getVoids(from, to));
ipcMain.handle('orders:history',    (_, dateFrom, dateTo)         => db.getOrderHistory(dateFrom, dateTo));
