const { onRequest } = require('firebase-functions/v2/https');
  const server = import('firebase-frameworks');
  exports.ssrmonthlybudgetapp3551 = onRequest({}, (req, res) => server.then(it => it.handle(req, res)));
  