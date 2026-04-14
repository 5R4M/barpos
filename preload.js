const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  auth: {
    login: (u, p) => ipcRenderer.invoke('auth:login', u, p)
  },
  window: {
    expand:   () => ipcRenderer.invoke('window:expand'),
    show:     () => ipcRenderer.invoke('window:show'),
    collapse: () => ipcRenderer.invoke('window:collapse')
  },
  users: {
    list:   ()        => ipcRenderer.invoke('users:list'),
    create: (d)       => ipcRenderer.invoke('users:create', d),
    update: (id, d)   => ipcRenderer.invoke('users:update', id, d),
    delete: (id)      => ipcRenderer.invoke('users:delete', id)
  },
  categories: {
    list: () => ipcRenderer.invoke('categories:list')
  },
  products: {
    list:   ()        => ipcRenderer.invoke('products:list'),
    create: (d)       => ipcRenderer.invoke('products:create', d),
    update: (id, d)   => ipcRenderer.invoke('products:update', id, d),
    delete: (id)      => ipcRenderer.invoke('products:delete', id)
  },
  tables: {
    list:   ()        => ipcRenderer.invoke('tables:list'),
    create: (d)       => ipcRenderer.invoke('tables:create', d),
    update: (id, d)   => ipcRenderer.invoke('tables:update', id, d),
    delete: (id)      => ipcRenderer.invoke('tables:delete', id)
  },
  orders: {
    openList:   ()                           => ipcRenderer.invoke('orders:openList'),
    get:        (id)                         => ipcRenderer.invoke('orders:get', id),
    create:     (tableId, userId)            => ipcRenderer.invoke('orders:create', tableId, userId),
    addItem:    (orderId, productId, qty)    => ipcRenderer.invoke('orders:addItem', orderId, productId, qty),
    updateItem: (itemId, qty)                => ipcRenderer.invoke('orders:updateItem', itemId, qty),
    removeItem: (itemId)                     => ipcRenderer.invoke('orders:removeItem', itemId),
    close:      (orderId)                    => ipcRenderer.invoke('orders:close', orderId),
    cancel:     (id)                         => ipcRenderer.invoke('orders:cancel', id),
    delete:     (id)                         => ipcRenderer.invoke('orders:delete', id),
    history:    (dateFrom, dateTo)           => ipcRenderer.invoke('orders:history', dateFrom, dateTo)
  }
});
