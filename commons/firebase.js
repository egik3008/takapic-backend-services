const admin = require('firebase-admin');
const DATABASE_URL = "https://takapic-project.firebaseio.com";

const firebaseAdmin = admin.initializeApp({
  credential: admin.credential.cert(require('../serviceAccountKey.json')),
  databaseURL: DATABASE_URL
});

module.exports = firebaseAdmin;
