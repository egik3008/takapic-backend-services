const dotenv = require('dotenv');
const firebaseWeb = require('firebase');

dotenv.load();

const config = {
  apiKey: 'AIzaSyDSrUpNAUexu_aZe0QdXapw91vZN9PbrfE',
  authDomain: 'takapic-project.firebaseapp.com',
  databaseURL: process.env.FIREBASE_DATABASE_URL,
  projectId: 'takapic-project',
  storageBucket: 'takapic-project.appspot.com',
  messagingSenderId: '839607725532'
};

const app = firebaseWeb.initializeApp(config);
module.exports = app;