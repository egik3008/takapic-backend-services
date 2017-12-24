const dotenv = require('dotenv');
const express = require('express');
const bodyParser = require('body-parser');
const algoliasearch = require('algoliasearch');
const Geode = require('geode');
const braintree = require('braintree');
const firebaseAdmin = require('./commons/firebaseAdmin');

dotenv.load();

const app = express();
const router = express.Router();
const port = process.env.PORT_API_SERVICES;

const gateway = braintree.connect({
  environment: braintree.Environment[process.env.BT_ENVIRONMENT],
  merchantId: process.env.BT_MERCHANT_ID,
  publicKey: process.env.BT_PUBLIC_KEY,
  privateKey: process.env.BT_PRIVATE_KEY
});

const algolia = algoliasearch(process.env.ALGOLIA_APP_ID, process.env.ALGOLIA_API_KEY);
const indexUserMetadata = algolia.initIndex(process.env.ALGOLIA_INDEX_USERMETADATA);

// ROUTES FOR OUR API
router.get('/photographers', function (request, response) {
  var destination = request.query['filter']['destination'];
  destination = destination === 'Anywhere' ? '' : destination;

  indexUserMetadata.search({
    query: destination,
    attributesToHighlight: ['locationMerge'],
    facets: ['userType'],
    facetFilters: [['userType:photographer']]
  }, function searchDone(error, content) {
    if (error) {
      console.log(error);
      response.json({ data: [] });
    } else {
      response.json({ data: content.hits });
    }
  });
});

router.get('/topPhotographers', function (request, response) {
  indexUserMetadata.search({
    attributesToHighlight: ['locationMerge'],
    facets: ['topPhotographer', 'userType'],
    facetFilters: [['topPhotographer:true']]
  }, function searchDone(error, content) {
    if (error) {
      console.log(error);
      response.json({ data: [] });
    } else {
      response.json({ data: content.hits });
    }
  });
});

router.get('/photographers/:uid', function (request, response) {
  const uid = request.params.uid;
  const db = firebaseAdmin.database();
  const photographerServiceInformationRef = db.ref('photographer_service_information/' + uid);

  photographerServiceInformationRef.once('value', function (data) {
    const photographerServiceInformationData = data.val();
    if (photographerServiceInformationData) {
      const userMetadataRef = db.ref('user_metadata/' + uid);

      userMetadataRef.once('value', function (userMetadataData) {
        photographerServiceInformationData.userMetadata = userMetadataData.val();
        response.json({ data: photographerServiceInformationData });
      });

    } else {
      const userMetadataRef = db.ref('user_metadata/' + uid);
      userMetadataRef.once('value', function (userMetadataData) {
        response.json({ data: { userMetadata: userMetadataData.val() } });
      });
    }
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

router.get('/locations', function (request, response) {
  indexUserMetadata.search({
    query: request.query.keyword,
    distinct: true,
    attributesToHighlight: ['countryName'],
    facets: ['userType'],
    facetFilters: [['userType:photographer']],
    attributesToRetrieve: ['countryName', 'locationAdmLevel1', 'locationAdmLevel2']
  }, function searchDone(error, content) {
    if (error) {
      console.log(error);
      response.json({ data: [] });
    } else {
      const results = content.hits.map(function (item) {
        return { label: item.locationAdmLevel2 + ', ' + item.locationAdmLevel1 + ', ' + item.countryName };
      });
      response.json({ data: results });
    }
  });
});

router.post('/payment/create', function (request, response) {
  const configs = {
    amount: request.body.amount,
    paymentMethodNonce: request.body.paymentMethodNonce,
    options: {
      submitForSettlement: true
    }
  };

  if (request.body.paymentType === 'PayPalAccount') {
    configs.options.paypal = {
      description: 'Payment for photographer reservation #' + request.body.orderId
    };

    gateway.transaction.sale(configs, function (error, result) {
      if (result) {
        response.send(result);
      } else {
        response.status(500).send(error);
      }
    });

  } else {
    configs.orderId = request.body.orderId;

    // Create new customer
    gateway.customer.create({
      firstName: request.body.travellerDisplayName,
      lastName: request.body.travellerDisplayName
    }, function (error, result) {

      // Successfuly create new customer - then verify the credit card
      if (result.success) {
        const customerId = result.customer.id;

        gateway.paymentMethod.create({
          customerId: customerId,
          paymentMethodNonce: request.body.paymentMethodNonce,
          options: {
            verifyCard: true
          }
        }, function (errorA, resultA) {

          if (resultA.success) {
            console.log('CC verified success - Create transaction');
            // Credit card verification return success - then create the transaction
            delete configs.paymentMethodNonce;
            configs.paymentMethodToken = resultA.creditCard.token;

            gateway.transaction.sale(configs, function (errorB, resultB) {
              if (resultB) {

                // Delete the created customer
                gateway.customer.delete(customerId, function (errorCustomerDelete) {});
                response.send(resultB);

              } else {
                console.log('Create transaction failed');
                response.status(500).send(resultB);
              }
            });

          } else {
            console.log('CC not verified');
            // Delete the created customer
            gateway.customer.delete(customerId, function (errorCustomerDelete) {});
            response.status(500).send(resultA);
          }

        });

      } else {
        console.log('Failed to create customer data');
        response.status(500).send(result);
      }

    });
  }
});

router.get('/payment/token', function (request, response) {
  gateway.clientToken.generate({}, function (error, result) {
    console.log(result);
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
