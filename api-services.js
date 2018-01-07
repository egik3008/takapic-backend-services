const dotenv = require('dotenv');
const express = require('express');
const bodyParser = require('body-parser');
const algoliasearch = require('algoliasearch');
const Geode = require('geode');
const axios = require('axios');
const sgMail = require('@sendgrid/mail');
const pug = require('pug');
const braintree = require('braintree');
const firebaseAdmin = require('./commons/firebaseAdmin');

dotenv.load();

const app = express();
const router = express.Router();
const port = process.env.PORT_API_SERVICES;

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

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
  var date = request.query['filter']['date'];
  var search = {
    query: destination,
    attributesToHighlight: ['locationMerge'],
    facets: ['userType'],
    facetFilters: [['userType:photographer']]
  };

  if (date !== '') {
    search.filters = 'NOT notAvailableDates:' + date;
  }

  indexUserMetadata.search(search, function searchDone(error, content) {
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

router.delete('/cloudinary-images/delete', function (request, response) {
  var urlRequest = process.env.CLOUDINARY_API_BASE_URL;
  urlRequest += '/resources/image/upload';

  axios({
    method: 'DELETE',
    url: urlRequest,
    auth: {
      username: process.env.CLOUDINARY_API_KEY,
      password: process.env.CLOUDINARY_API_SECRET
    },
    params: {
      public_ids: request.query.public_ids,
      invalidate: true
    }
  })
    .then(function (result) {
      response.send(result.data);
    })
    .catch(function (error) {
      console.log(error);
      if (error) {
        response.status(500).send(error);
      }
    });
});

router.post('/email-service/email-verification', function (request, response) {
  const receiverEmail = request.body.receiverEmail;
  const receiverName = request.body.receiverName;
  const uid = request.body.uid;
  const compiledFunction = pug.compileFile('email-templates/email-verification.pug');

  const msg = {
    to: {
      name: receiverName,
      email: receiverEmail
    },
    from: {
      name: 'Takapic',
      email: 'admin@takapic.com'
    },
    subject: 'Verify your email for Takapic',
    html: compiledFunction({
      BASE_HOSTNAME: process.env.BASE_HOSTNAME,
      EMAIL_TITLE: 'Verify your email for Takapic',
      UID: uid,
      CUSTOMER_NAME: receiverName
    })
  };

  sgMail
    .send(msg)
    .then(function () {
      response.send({ status: 'OK' });
    })
    .catch(function (error) {
      console.log(error);
      response.status(500).send({ status: 'FAILED', errorMessage: error.message });
    });
});

router.get('/google-sign-in', function (request, response) {
  response.redirect(301, process.env.GOOGLE_SIGN_IN_REDIRECT);
});

app.use(function(request, response, next) {
  response.header("Access-Control-Allow-Origin", "*");
  response.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  response.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE");
  next();
});

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use('/api', router);

app.listen(port);
console.log('Listen on port', port);
