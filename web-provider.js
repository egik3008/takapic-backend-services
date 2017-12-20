const dotenv = require('dotenv');
const express = require('express');
const bodyparser = require('body-parser');
const stylus = require('stylus');
const nib = require('nib');
const firebaseWeb = require('./commons/firebaseWeb');

dotenv.load();

function compileCSS(str, path) {
  return stylus(str).set('filename', path).use(nib());
}

const app = express();
const router = express.Router();

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

app.use(bodyparser.urlencoded({ extended: true }));
app.use(bodyparser.json());

app.use('/web-provider', router);

app.listen(process.env.PORT_WEB_PROVIDER);
console.log('Listen on port: ', process.env.PORT_WEB_PROVIDER);
