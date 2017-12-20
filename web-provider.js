const dotenv = require('dotenv');
const express = require('express');
const bodyparser = require('body-parser');
const stylus = require('stylus');
const nib = require('nib');
const braintree = require('braintree');
const firebaseWeb = require('./commons/firebaseWeb');

dotenv.load();

function compileCSS(str, path) {
  return stylus(str).set('filename', path).use(nib());
}

const app = express();
const router = express.Router();
const gateway = braintree.connect({
  environment: braintree.Environment['Sandbox'],
  merchantId: '4cm4s6c4wxpf7zp8',
  publicKey: 'y9p3crmh2pqyx8r5',
  privateKey: '813da30a3117a475c5766a8b026d92aa'
});

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
    }
  } else {
    configs.orderId = request.body.orderId;
  }

  gateway.transaction.sale(configs, function (error, result) {
    if (result) {
      response.send(result);
    } else {
      response.status(500).send(error);
    }
  });
});

router.get('/payment/token', function (request, response) {
  gateway.clientToken.generate({}, function (error, result) {
    console.log(result);
  });
});

app.use(bodyparser.urlencoded({ extended: true }));
app.use(bodyparser.json());
app.use('/web-provider', router);

app.listen(process.env.PORT_WEB_PROVIDER);
console.log('Listen on port: ', process.env.PORT_WEB_PROVIDER);
