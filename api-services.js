const dotenv = require('dotenv');
const express = require('express');
const bodyParser = require('body-parser');
const algoliasearch = require('algoliasearch');
const firebaseAdmin = require('./commons/firebaseAdmin');
const Geode = require('geode');
const helpers = require('./commons/helpers');

dotenv.load();

const app = express();
const router = express.Router();
const port = process.env.PORT || 8008;

const algolia = algoliasearch(process.env.ALGOLIA_APP_ID, process.env.ALGOLIA_API_KEY);
const indexUserMetadata = algolia.initIndex('user_metadata');

// ROUTES FOR OUR API
router.get('/photographers', function (request, response) {
  indexUserMetadata.search({
    query: request.query['filter']['destination'],
    attributesToHighlight: ['locationMerge'],
    facets: ['userType'],
    facetFilters: [['userType:photographer']]
  }, function searchDone(error, content) {
    if (error) {
      console.log(error);
      throw error;
    }
    response.json({ data: content.hits });
  });
});

router.get('/photographers/:uid', function (request, response) {
  firebaseAdmin.auth().getUser(request.params.uid)
    .then(function (user) {
      var email = null;
      if (user.providerData[0].providerId === 'password') {
        email = user.email;
      } else {
        email = user.providerData[0].email;
      }

      const db = firebaseAdmin.database();
      const photographerServiceInformationRef = db.ref('photographer_service_information/' + helpers.createUIDChars(email));

      photographerServiceInformationRef.once('value', function (data) {
        const photographerServiceInformationData = data.val();
        const userMetadataRef = db.ref('user_metadata/' + helpers.createUIDChars(email));

        userMetadataRef.once('value', function (userMetadataData) {
          photographerServiceInformationData.userMetadata = userMetadataData.val();
          response.json({ data: photographerServiceInformationData });
        });
      });
    })
    .catch(function (error) {
      response.json({ data: error });
    });
});

router.get('/cities', function (request, response) {
  const qry = request.query['kwd'];
  const countryCode = request.query['countryCode'];
  const continent = request.query['continent'];
  const geo = new Geode('okaprinarjaya', { countryCode: countryCode, language: 'id' });

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

app.use(function(request, response, next) {
  response.header("Access-Control-Allow-Origin", "*");
  response.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use('/api', router);

app.listen(port);
console.log('Listen on port', port);
