const dotenv = require('dotenv');
const firebaseWeb = require('firebase');

dotenv.load();

const config = {
  apiKey: process.env.FIREBASE_WEB_API_KEY,
  authDomain: process.env.FIREBASE_WEB_AUTH_DOMAIN,
  databaseURL: process.env.FIREBASE_WEB_DATABASE_URL,
  projectId: process.env.FIREBASE_WEB_PROJECT_ID,
  storageBucket: process.env.FIREBASE_WEB_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_WEB_MESSAGING_SENDER_ID
};

const app = firebaseWeb.initializeApp(config);
module.exports = app;