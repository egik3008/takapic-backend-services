const dotenv = require('dotenv');
const express = require('express');
const bodyparser = require('body-parser');
const stylus = require('stylus');
const nib = require('nib');
const paypal = require('paypal-rest-sdk');
const firebaseWeb = require('./commons/firebaseWeb');

dotenv.load();

function compileCSS(str, path) {
  return stylus(str).set('filename', path).use(nib());
}

const app = express();
const router = express.Router();

app.set('views', __dirname + '/web/views');
app.set('view engine', 'pug');

app.use(stylus.middleware({
  src: __dirname + '/web/public',
  compile: compileCSS
}));

app.use(express.static(__dirname + '/web/public'));

app.use(function(request, response, next) {
  response.header("Access-Control-Allow-Origin", "*");
  response.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

router.get('/email-action-handler/verify-email', function (request, response) {
  if ("test" in request.query) {
    response.render('index', {
      afterEmailVerificationRedirectionUrl: process.env.AFTER_EMAIL_VERIFICATION_REDIRECTION_URL
    });

  } else {
    const mode = request.query['mode'];
    if (mode === 'verifyEmail' && "oobCode" in request.query) {
      const actionCode = request.query['oobCode'];
      const auth = firebaseWeb.auth();

      auth.applyActionCode(actionCode)
        .then(function () {
          response.render('index', {
            afterEmailVerificationRedirectionUrl: process.env.AFTER_EMAIL_VERIFICATION_REDIRECTION_URL
          });
        })
        .catch(function (error) {
          console.log(error);
          response.send('Error occured');
        });
    } else {
      response.send('Mode and params not supported');
    }
  }
});

router.post('/payment/create', function (request, response) {
  paypal.configure({
    mode: process.env.PAYPAL_MODE,
    client_id: process.env.PAYPAL_REST_API_CLIENT_ID,
    client_secret: process.env.PAYPAL_REST_API_CLIENT_SECRET
  });

  const create_payment_json = {
    "intent": "sale",
    "payer": {
      "payment_method": "paypal"
    },
    "redirect_urls": {
      "return_url": "http://localhost:8484/web-provider/payment/success",
      "cancel_url": "http://localhost:8484/web-provider/payment/cancel"
    },
    "transactions": [{
      "item_list": {
        "items": [{
          "name": "Photographer Reservation",
          "sku": "OVEIMFPA",
          "price": "10.00",
          "currency": "USD",
          "quantity": 1
        }]
      },
      "amount": {
        "currency": "USD",
        "total": "10.00"
      },
      "description": "Pay reservation."
    }]
  };

  paypal.payment.create(create_payment_json, function (error, payment) {
    if (error) {
      throw error;
    } else {
      console.log("Create Payment Response");
      console.log(payment);
      response.setHeader('Content-Type', 'application/json');
      response.send(JSON.stringify(payment));
    }
  });
});

router.get('/payment/success', function (request, response) {
  const payerId = request.query.PayerID;
  const paymentId = request.query.paymentId;

  var execute_payment_json = {
    "payer_id": payerId,
    "transactions": [{
      "amount": {
        "currency": "USD",
        "total": "10.00"
      }
    }]
  };

  paypal.payment.execute(paymentId, execute_payment_json, function (error, payment) {
    if (error) {
      console.log(error.response);
      throw error;
    } else {
      console.log("Get Payment Response");
      console.log(JSON.stringify(payment));
      response.send('Success');
    }
  });
});

router.get('/payment/cancel', function (request, response) {
  response.send('Cancelled');
});

app.use(bodyparser.urlencoded({ extended: true }));
app.use(bodyparser.json());
app.use('/web-provider', router);

app.listen(process.env.PORT_WEB_PROVIDER);
console.log('Listen on port: ', process.env.PORT_WEB_PROVIDER);
