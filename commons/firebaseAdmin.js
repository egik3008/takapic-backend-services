const dotenv = require('dotenv');
const firebaseAdmin = require('firebase-admin');

dotenv.load();

const serviceAccount = require('../serviceAccountKey.json');
firebaseAdmin.initializeApp({
  credential: firebaseAdmin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DATABASE_URL
});

module.exports = firebaseAdmin;
