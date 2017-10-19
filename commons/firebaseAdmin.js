const firebaseAdmin = require('firebase-admin');

firebaseAdmin.initializeApp({
  credential: firebaseAdmin.credential.cert(require('../serviceAccountKey.json')),
  databaseURL: 'https://takapic-project.firebaseio.com'
});

module.exports = firebaseAdmin;
