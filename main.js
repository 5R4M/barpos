const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

let mainWindow;
let db;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1380,
    height: 860,
    minWidth: 1100,
    minHeight: 680,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    title: 'BarPOS - Sistema de Punto de Venta',
    show: false,
    backgroundColor: '#0f172a'
  });

  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));
  mainWindow.once('ready-to-show', () => mainWindow.show());
}

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

// ── Categories ───────────────────────────────────────────────────────────────
ipcMain.handle('categories:list', () => db.getCategories());

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
ipcMain.handle('orders:openList',   ()                           => db.getOpenOrders());
ipcMain.handle('orders:get',        (_, orderId)                 => db.getOrderWithItems(orderId));
ipcMain.handle('orders:create',     (_, tableId, userId)         => db.createOrder(tableId, userId));
ipcMain.handle('orders:addItem',    (_, orderId, productId, qty) => db.addOrderItem(orderId, productId, qty));
ipcMain.handle('orders:updateItem', (_, itemId, qty)             => db.updateOrderItem(itemId, qty));
ipcMain.handle('orders:removeItem', (_, itemId)                  => db.removeOrderItem(itemId));
ipcMain.handle('orders:close',      (_, orderId)                 => db.closeOrder(orderId));
