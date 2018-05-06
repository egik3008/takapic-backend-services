const path = require('path');
const dotenv = require('dotenv');
const express = require('express');
const firebaseAdmin = require('./commons/firebaseAdmin');
const algoliasearch = require('algoliasearch');
const Geode = require('geode');

dotenv.config({ path: path.dirname(require.main.filename) + '/.env' });

const router = express.Router();
const algolia = algoliasearch(process.env.ALGOLIA_APP_ID, process.env.ALGOLIA_API_KEY);
const indexPhotographers = algolia.initIndex(process.env.ALGOLIA_INDEX_PHOTOGRAPHERS);
const indexUsers = algolia.initIndex(process.env.ALGOLIA_INDEX_USERS);

function fetchCurrencies() {
  return new Promise(function (resolve, reject) {
    firebaseAdmin
      .database()
      .ref('currency_exchange_rates')
      .once('value')
      .then(function (snapshot) {
        resolve(snapshot.val());
      })
      .catch(function (error) {
        reject(error);
      });
  });
}

function convertPriceCurrency(rows, priceKey, allLocalRates, currency) {
  return rows.map(function (item) {
    const useCurrency = !currency ? item.currency : currency;
    const IDR_USD_Rates = allLocalRates['IDRUSD'];
    const IDRRates = allLocalRates['IDR' + useCurrency];
    const USDRates = allLocalRates['USD' + useCurrency];

    // Get IDR rates of current local rates first.
    const inIDR = Math.round(item[priceKey] / IDRRates);
    item[priceKey + 'IDR'] = inIDR;

    // Use IDR rates as a base value to convert to USD
    item[priceKey + 'USD'] = Math.round(IDR_USD_Rates * inIDR);

    // Use original price (not converted to IDR before) to convert to USD.
    // This is just an additional optional information.
    item[priceKey + 'USD2'] = Math.round(item[priceKey] / USDRates);

    return item;
  });
}

router.get('/photographers', function (request, response) {
  var destination = request.query['filter']['destination'];
  var date = request.query['filter']['date'];
  var search = {
    query: destination,
    hitsPerPage: process.env.ALGOLIA_HITS_PER_PAGE,
    page: request.query['filter']['page'],
    attributesToHighlight: ['locationMerge']
  };

  if (date !== '') {
    search.filters = search.filters + ' AND NOT notAvailableDates:' + date;
  }

  fetchCurrencies()
    .then(function (currencies) {
      indexPhotographers.search(search, function searchDone(error, content) {
        if (error) {
          console.error(error);
          response.json({ data: [] });

        } else {
          const convertedData = convertPriceCurrency(content.hits, 'priceStartFrom', currencies);
          response.json({
            data: convertedData,
            metaInfo: {
              nbHits: content.nbHits,
              page: content.page,
              nbPages: content.nbPages,
              hitsPerPage: content.hitsPerPage
            }
          });
        }
      });
    })
    .catch(function (error) {
      console.error(error);
      response.json({ data: [] });
    });
});

router.get('/admin/users', function (request, response) {
  var filterQueryObject = request.query['filter'];
  var filters = '';

  if (typeof filterQueryObject !== 'undefined') {
    Object.keys(filterQueryObject).forEach(function (item) {
      filters = filters + filterQueryObject[item] + ' ';
    });

    filters = filters.trim();
  }

  var search = {
    query: filters,
    hitsPerPage: 50,
    page: request.query['page'],
    attributesToHighlight: ['locationMerge']
  };

  fetchCurrencies()
    .then(function (currencies) {
      indexUsers.search(search, function searchDone(error, content) {
        if (error) {
          console.error(error);
          response.json({ data: [] });

        } else {
          const convertedData = convertPriceCurrency(content.hits, 'priceStartFrom', currencies);
          response.json({
            data: convertedData,
            metaInfo: {
              nbHits: content.nbHits,
              page: content.page,
              nbPages: content.nbPages,
              hitsPerPage: content.hitsPerPage
            }
          });
        }
      });
    })
    .catch(function (error) {
      console.error(error);
      response.json({ data: [] });
    });
});

router.get('/topPhotographers', function (request, response) {
  indexPhotographers.search({
    attributesToHighlight: ['locationMerge'],
    facets: ['topPhotographer', 'userType'],
    facetFilters: [['topPhotographer:true']]
  }, function searchDone(error, content) {
    if (error) {
      console.error(error);
      response.json({ data: [] });
    } else {
      response.json({ data: content.hits });
    }
  });
});

router.get('/photographers/:uid', function (request, response) {
  fetchCurrencies()
    .then(function (currencies) {
      const uid = request.params.uid;
      const db = firebaseAdmin.database();

      db
        .ref('photographer_service_information')
        .child(uid)
        .once('value')
        .then(function (data) {
          const photographerServiceInformationData = data.val();
          if (photographerServiceInformationData) {
            db
              .ref('user_metadata')
              .child(uid)
              .once('value')
              .then(function (userMetadataData) {
                const userMetadataDataVal = userMetadataData.val();
                const userMetadataDataItem = [userMetadataDataVal];
                const packagesPriceModified = convertPriceCurrency(
                  photographerServiceInformationData.packagesPrice,
                  'price',
                  currencies,
                  userMetadataDataVal.currency
                );

                photographerServiceInformationData.packagesPrice = packagesPriceModified;
                photographerServiceInformationData.userMetadata = convertPriceCurrency(userMetadataDataItem, 'priceStartFrom', currencies)[0];
                response.json({ data: photographerServiceInformationData });
              });

          } else {
            response.json({ data: {} });
          }
        });
    })
    .catch(function (error) {
      console.error(error);
      response.json({ data: {} });
    });
});

router.get('/cities', function (request, response) {
  const qry = request.query['kwd'];
  const countryCode = request.query['countryCode'];
  const continent = request.query['continent'];
  const geo = new Geode('okaprinarjaya', { countryCode: countryCode });

  geo.search({ q: qry, continentCode: continent, featureClass: 'A' }, function (error, result) {
    if (error) {
      console.log(error);
    } else {
      var results = [];
      result.geonames.forEach(function (item) {
        results.push(
          {
            value: item.toponymName,
            label: item.toponymName,
            adm1: item.adminName1
          }
        );
      });
      response.json({ data: results });
    }
  });
});

router.get('/locations', function (request, response) {
  indexPhotographers.search({
    query: request.query.keyword,
    distinct: true,
    attributesToHighlight: ['countryName'],
    attributesToRetrieve: ['countryName', 'locationAdmLevel1', 'locationAdmLevel2']
  }, function searchDone(error, content) {
    if (error) {
      console.error(error);
      response.json({ data: [] });
    } else {
      const results = content.hits.map(function (item) {
        return { label: item.locationAdmLevel2 + ', ' + item.locationAdmLevel1 + ', ' + item.countryName };
      });
      response.json({ data: results });
    }
  });
});

module.exports = router;
