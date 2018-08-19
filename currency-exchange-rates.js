const path = require('path')
const dotenv = require('dotenv')
const axios = require('axios')
const firebaseAdmin = require('./commons/firebaseAdmin')

dotenv.config({ path: path.dirname(require.main.filename) + '/.env' })

// Fetch rates with source: USD
axios
  .get('https://apilayer.net/api/live?access_key=' + process.env.CURRENCY_LAYER_API_KEY + '&source=USD&format=1')
  .then(function (resultUSD) {
    const db = firebaseAdmin.database()

    db
      .ref('currency_exchange_rates')
      .set(resultUSD.data.quotes)
      .then(function () {
        console.log('Fetching USD complete')

        // Fetch rates with source: IDR
        axios
          .get('https://apilayer.net/api/live?access_key=' + process.env.CURRENCY_LAYER_API_KEY + '&source=IDR&format=1')
          .then(function (resultIDR) {
            db
              .ref('currency_exchange_rates')
              .update(resultIDR.data.quotes)
              .then(function () {
                console.log('Fetching IDR complete')
              })
          })
      })
  })
