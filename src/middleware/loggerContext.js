const { AsyncLocalStorage } = require('async_hooks');
const { v4: uuidv4 } = require('uuid');

// Node.js'in asenkron işlemleri takip eden görünmez deposu
const requestContext = new AsyncLocalStorage();

const loggerMiddleware = (req, res, next) => {
  const store = new Map();
  
  // İsteğe özel verileri depoya koyuyoruz
  store.set('traceId', uuidv4()); // Bu isteğin benzersiz kimliği
  store.set('ip', req.ip || req.connection.remoteAddress);
  store.set('method', req.method);
  store.set('url', req.originalUrl);
  
  // Eğer kullanıcı giriş yapmışsa (Auth middleware'inden sonra çalışmalı)
  if (req.user) {
    store.set('userId', req.user.id);
    store.set('role', req.user.role);
  }

  // Bu deponun geçerli olduğu bir "Kapsam" (Scope) başlatıyoruz
  requestContext.run(store, () => {
    next();
  });
};

module.exports = { requestContext, loggerMiddleware };