const path = require('path')
const dotenv = require('dotenv')
const express = require('express')
const firebaseAdmin = require('./commons/firebaseAdmin')
const algoliasearch = require('algoliasearch')
const Geode = require('geode')
const uuid = require('uuid/v4')

dotenv.config({ path: path.dirname(require.main.filename) + '/.env' })

const router = express.Router()
const algolia = algoliasearch(process.env.ALGOLIA_APP_ID, process.env.ALGOLIA_API_KEY)
const indexPhotographers = algolia.initIndex(process.env.ALGOLIA_INDEX_PHOTOGRAPHERS)
const indexUsers = algolia.initIndex(process.env.ALGOLIA_INDEX_USERS)

function fetchCurrencies () {
  return new Promise(function (resolve, reject) {
    firebaseAdmin
      .database()
      .ref('currency_exchange_rates')
      .once('value')
      .then(function (snapshot) {
        resolve(snapshot.val())
      })
      .catch(function (error) {
        reject(error)
      })
  })
}

function convertPriceCurrency (rows, priceKey, allLocalRates, currency) {
  if (typeof rows !== 'undefined' && rows && rows.length > 0) {
    return rows.map(function (item) {
      const useCurrency = !currency ? item.currency : currency
      const rates = allLocalRates['IDRUSD']
      const IDRRates = allLocalRates['IDR' + useCurrency]
      const USDRates = allLocalRates['USD' + useCurrency]

      // Get IDR rates of current local rates first.
      const inIDR = Math.round(item[priceKey] / IDRRates)
      item[priceKey + 'IDR'] = Math.round(inIDR + (inIDR * 0.3)); 

      // Use IDR rates as a base value to convert to USD
      item[priceKey + 'USD'] = Math.ceil((rates * inIDR) + ((rates * inIDR) * 0.3));

      // Use original price (not converted to IDR before) to convert to USD.
      // This is just an additional optional information.
      item[priceKey + 'USD2'] = Math.round(item[priceKey] / USDRates)

      return item
    })
  }

  return []
}

const usersRouter = require('./api/routes/users');
router.use('/users', usersRouter);

const paymentRouter = require('./api/routes/payment');
router.use('/payment', paymentRouter);

const vouchersRouter = require('./api/routes/vouchers');
router.use('/vouchers', vouchersRouter);

router.put('/auth/update/:uid', function (request, response) {
  const uid = request.params.uid;
  const data = request.body;

  firebaseAdmin.auth().updateUser(uid, data)
  .then(function(userRecord) {
    if ('photoURL' in data) {
      const db = firebaseAdmin.database();
      db.ref('user_metadata')
        .child(uid)
        .update({
          photoProfileUrl: data.photoURL,
          photoProfilePublicId: data.publicID,
          updated: new Date().getTime()
        });


        response.status(200).send({message: "Success update auth user!"})
    } else {
      response.status(200).send({message: "Success update auth user!"})
    }
  })
  .catch(function(error) {
    console.log("Error updating user:", error);
    response.status(500).json({ error: error.message })
  });
})

router.get('/photographers', function (request, response) {
  const destination = request.query['filter']['destination']
  const date = request.query['filter']['date']
  const search = {
    query: destination,
    hitsPerPage: process.env.ALGOLIA_HITS_PER_PAGE,
    page: request.query['filter']['page'],
    attributesToHighlight: ['locationMerge']
  }

  if (date !== '') {
    search.filters = 'NOT notAvailableDates:' + date
  }

  // convert currencies
  fetchCurrencies()
    .then(function (currencies) {
      indexPhotographers.search(search, function searchDone (error, content) {
        if (error) {
          console.error(error)
          response.json({ data: [] })
        } else {
          const convertedData = convertPriceCurrency(content.hits, 'priceStartFrom', currencies)
          response.json({
            data: convertedData,
            metaInfo: {
              nbHits: content.nbHits,
              page: content.page,
              nbPages: content.nbPages,
              hitsPerPage: content.hitsPerPage
            }
          })
        }
      })
    })
    .catch(function (error) {
      console.error(error)
      response.json({ data: [] })
    })
})

router.post('/photographers', function (request, response) {
  const body = request.body
  const db = firebaseAdmin.database()
  const uid = uuid()
  let userMetadata = {}
  let photographer = {}
  body['created'] = new Date().getTime()
  body.userMetadata['uid'] = uid
  body.userMetadata['created'] = new Date().getTime()
  body.userMetadata['userType'] = 'photographer'
  userMetadata[uid] = body.userMetadata
  delete body['userMetadata']
  photographer[uid] = body

  db.ref('user_metadata')
    .update(userMetadata)
    .then(() => {
      db.ref('photographer_service_information')
        .update(photographer)
        .then(() => {
          response.status(201).send({ message: 'Success add photographer!' })
        })
        .catch(function (error) {
          console.error(error)
          response.status(500).json({ error: error.message })
        })
    })
    .catch(function (error) {
      console.error(error)
      response.status(500).json({ error: error.message })
    })
})

router.get('/photographers/:uid', function (request, response) {
  fetchCurrencies()
    .then(function (currencies) {
      const uid = request.params.uid
      const db = firebaseAdmin.database()

      db.ref('photographer_service_information')
        .child(uid)
        .once('value')
        .then(function (data) {
          let photographerData = data.val()
          if (photographerData) {
            db.ref('user_metadata')
              .child(uid)
              .once('value')
              .then(function (userMetadataData) {
                const userMetadataDataVal = userMetadataData.val()
                const userMetadataDataItem = [userMetadataDataVal]
                const packagesPriceModified = convertPriceCurrency(
                  photographerData.packagesPrice,
                  'price',
                  currencies,
                  userMetadataDataVal.currency
                )

                photographerData.packagesPrice = packagesPriceModified
                photographerData.userMetadata = convertPriceCurrency(
                  userMetadataDataItem,
                  'priceStartFrom',
                  currencies
                )[0]

                db.ref('reservations')
                  .orderByChild('photographerId')
                  .equalTo(uid)
                  .once('value', history => {
                    if (history.exists()) {
                      photographerData['reservationHistory'] = Object.values(history.val())
                    } else {
                      photographerData['reservationHistory'] = []
                    }

                    response.send(photographerData)
                  })
              })
          } else {
            response.send({ data: {} })
          }
        })
    })
    .catch(function (error) {
      console.error(error)
      response.json({ data: {} })
    })
})

router.put('/photographers/:uid', function (request, response) {
  const uid = request.params.uid
  const body = request.body
  const db = firebaseAdmin.database()
  body['updated'] = new Date().getTime()

  db.ref('photographer_service_information')
    .child(uid)
    .set(body)
    .then(() => {
      response.send({ message: 'Success update photographer!' })
    })
    .catch(function (error) {
      console.error(error)
      response.status(500).json({ error: error.message })
    })
})

router.get('/topPhotographers', function (request, response) {
  indexPhotographers.search(
    {
      attributesToHighlight: ['locationMerge'],
      facets: ['topPhotographer', 'userType'],
      facetFilters: [['topPhotographer:true']]
    },
    function searchDone (error, content) {
      if (error) {
        console.error(error)
        response.json({ data: [] })
      } else {
        response.json({ data: content.hits })
      }
    }
  )
})

router.get('/countries', function (request, response) {
  const db = firebaseAdmin.database()
  
  const countriesRef = db.ref('/countries');
    countriesRef.once('value', snapshot => {
      const countriesSource = snapshot.val();
      let countriesList = [];
      for (let key in countriesSource) {
        countriesList.push({
          value: countriesSource[key].phone_dial_code,
          label: `${countriesSource[key].name} (${countriesSource[key].phone_dial_code})`
        });
      }

      response.json(countriesList); 
  })
})

router.get('/cities', function (request, response) {
  const qry = request.query['kwd']
  const countryCode = request.query['countryCode']
  const continent = request.query['continent']
  const geo = new Geode('okaprinarjaya', { countryCode: countryCode })

  geo.search({ q: qry, continentCode: continent, featureClass: 'A' }, function (error, result) {
    if (error) {
      console.log(error)
    } else {
      let results = []
      result.geonames.forEach(function (item) {
        results.push({
          value: item.toponymName,
          label: item.toponymName,
          adm1: item.adminName1
        })
      })
      response.json({ data: results })
    }
  })
})

router.get('/locations', function (request, response) {
  indexPhotographers.search(
    {
      query: request.query.keyword,
      distinct: true,
      attributesToHighlight: ['countryName'],
      attributesToRetrieve: ['countryName', 'locationAdmLevel1', 'locationAdmLevel2']
    },
    function searchDone (error, content) {
      if (error) {
        console.error(error)
        response.json({ data: [] })
      } else {
        let filterResult = [];
        let results = content.hits.map(function (item) {
          const location = item.locationAdmLevel2 + ', ' + item.locationAdmLevel1 + ', ' + item.countryName;

          if (filterResult.includes(location)) return null;
          filterResult.push(location);
          return { label:  location }
        });
        results = results.filter(loc => loc);
        results = results.sort(function(a, b) {
          var nameA = a.label.toUpperCase();
          var nameB = b.label.toUpperCase();
          if (nameA < nameB) return -1;
          if (nameA > nameB) return 1;
          return 0;
        });
        response.json({ data: results })
      }
    }
  )
});

router.get('/reservations', function (request, response) {
  fetchCurrencies()
    .then(function (currencies) {
      const db = firebaseAdmin.database()
      db.ref('reservations')
        .once('value', data => {
          const result = Object.keys(data.val()).map((k) => {
            const item = data.val()[k]
            const userKeys = Object.keys(item.uidMapping)
            let traveler, photographer, travellerCurrency;

            for (const key in userKeys) {
              if (item.uidMapping[userKeys[key]].photoProfileUrl === '-') {
                traveler = item.uidMapping[userKeys[key]].displayName
              } else {
                photographer = item.uidMapping[userKeys[key]].displayName
              }
            }


            item['id'] = k
            item['traveler'] = traveler
            item['photographer'] = photographer
            item['travellerCurrency'] = travellerCurrency
            return item
          })

          response.send(result)
        })
        .catch(function (error) {
          console.error(error)
          response.status(500).json({ error: error.message })
        })
    })
    .catch(function (error) {
      console.error(error)
      response.status(500).json({ error: error.message })
    })
})

router.get('/reservations/:uid', function (request, response) {
  const uid = request.params.uid
  const db = firebaseAdmin.database()
  db.ref('reservations')
    .child(uid)
    .once('value', data => {
      const item = data.val()
      const userKeys = Object.keys(item.uidMapping)
      let traveler, photographer
      for (const key in userKeys) {
        if (item.uidMapping[userKeys[key]].photoProfileUrl === '-') {
          traveler = item.uidMapping[userKeys[key]].displayName
        } else {
          photographer = item.uidMapping[userKeys[key]].displayName
        }
      }
      item['traveler'] = traveler
      item['photographer'] = photographer

      // get photographer currency
      db.ref('user_metadata')
      .child(item['photographerId'])
      .once('value', snapshot => {
        const udata = snapshot.val();
        item['currency'] = udata.currency || 'IDR';
        // get albums information
        db.ref('albums')
        .child(uid)
        .once('value', albums => {
          item['albums'] = albums.val()

          // get photographer detail package
          db.ref('photographer_service_information')
            .child(item.photographerId)
            .once('value', detail => {
              let packageDetail
              for (const p of detail.val().packagesPrice) {
                if (p.id === item.packageId) { packageDetail = p }
              }

              item['package'] = packageDetail
              response.send(item)
            })
        })
      })
    })
    .catch(function (error) {
      console.error(error)
      response.status(500).json({ error: error.message })
    })
})

module.exports = router
