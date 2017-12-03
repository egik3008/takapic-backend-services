const dotenv = require('dotenv');
const axios = require('axios');
const firebaseAdmin = require('./commons/firebaseAdmin');

dotenv.load();

axios.get('http://apilayer.net/api/live?access_key=1aa6b5189fe7e7dc51f1189fe02008b4&source=USD&format=1')
  .then(function (result) {
    const db = firebaseAdmin.database();
    const ref = db.ref('currency_exchange_rates');
    ref
      .set(result.data.quotes)
      .then(function () {
        console.log('OK!');
      })
      .catch(function (error) {
        console.log(error);
      });
  })
  .catch(function (error) {
    console.log(error);
  });
