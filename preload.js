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
    delete: (id)      => ipcRenderer.invoke('users:delete', id),
    changePassword: (id, cur, nueva) => ipcRenderer.invoke('users:changePassword', id, cur, nueva)
  },
  categories: {
    list:   ()        => ipcRenderer.invoke('categories:list'),
    create: (d)       => ipcRenderer.invoke('categories:create', d),
    update: (id, d)   => ipcRenderer.invoke('categories:update', id, d),
    delete: (id)      => ipcRenderer.invoke('categories:delete', id)
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
  kitchen: {
    tickets:      (destino)                  => ipcRenderer.invoke('kitchen:tickets', destino),
    counts:       ()                         => ipcRenderer.invoke('kitchen:counts'),
    advance:      (orderId, sentAt, destino) => ipcRenderer.invoke('kitchen:advance', orderId, sentAt, destino),
    retreat:      (orderId, sentAt, destino) => ipcRenderer.invoke('kitchen:retreat', orderId, sentAt, destino),
    deliverReady: (orderId, sentAt, destino) => ipcRenderer.invoke('kitchen:deliverReady', orderId, sentAt, destino),
    setItem:      (itemId, status)           => ipcRenderer.invoke('kitchen:setItem', itemId, status),
    history:       (dateFrom, dateTo) => ipcRenderer.invoke('kitchen:history', dateFrom, dateTo),
    historyByDay:  (dateFrom, dateTo) => ipcRenderer.invoke('kitchen:historyByDay', dateFrom, dateTo)
  },
  orders: {
    openList:   ()                                 => ipcRenderer.invoke('orders:openList'),
    get:        (id)                               => ipcRenderer.invoke('orders:get', id),
    create:     (tableId, userId, guests)          => ipcRenderer.invoke('orders:create', tableId, userId, guests),
    setGuests:  (orderId, guests)                  => ipcRenderer.invoke('orders:setGuests', orderId, guests),
    transfer:   (orderId, tableId)                 => ipcRenderer.invoke('orders:transfer', orderId, tableId),
    addItem:    (orderId, productId, qty, note)    => ipcRenderer.invoke('orders:addItem', orderId, productId, qty, note),
    setItemNote:(itemId, note)                     => ipcRenderer.invoke('orders:setItemNote', itemId, note),
    updateItem: (itemId, qty)                      => ipcRenderer.invoke('orders:updateItem', itemId, qty),
    removeItem: (itemId)                           => ipcRenderer.invoke('orders:removeItem', itemId),
    voidItem:   (itemId, reason, userId)           => ipcRenderer.invoke('orders:voidItem', itemId, reason, userId),
    send:       (orderId)                          => ipcRenderer.invoke('orders:send', orderId),
    setDiscount:(orderId, type, value)             => ipcRenderer.invoke('orders:setDiscount', orderId, type, value),
    close:      (orderId, payment)                 => ipcRenderer.invoke('orders:close', orderId, payment),
    cancel:     (id)                         => ipcRenderer.invoke('orders:cancel', id),
    delete:     (id)                         => ipcRenderer.invoke('orders:delete', id),
    history:       (dateFrom, dateTo) => ipcRenderer.invoke('orders:history', dateFrom, dateTo),
    waiterHistory: (dateFrom, dateTo) => ipcRenderer.invoke('orders:waiterHistory', dateFrom, dateTo),
    payments:      (dateFrom, dateTo) => ipcRenderer.invoke('orders:payments', dateFrom, dateTo),
    voids:         (dateFrom, dateTo) => ipcRenderer.invoke('orders:voids', dateFrom, dateTo)
  }
});
