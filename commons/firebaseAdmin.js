const dotenv = require('dotenv');
const path = require('path');
const firebaseAdmin = require('firebase-admin');

dotenv.load();

const serviceAccount = require(path.resolve(__dirname) + '/../' + process.env.SERVICE_ACCOUNT_PRIVATE_KEY);
const app = firebaseAdmin.initializeApp({
  credential: firebaseAdmin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_WEB_DATABASE_URL
});

module.exports = app;
