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
ipcMain.handle('orders:cancel',     (_, id)                       => db.cancelOrder(id));
ipcMain.handle('orders:delete',     (_, id)                       => db.deleteOrder(id));
ipcMain.handle('orders:history',    (_, dateFrom, dateTo)         => db.getOrderHistory(dateFrom, dateTo));
