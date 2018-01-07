const dotenv = require('dotenv');
const express = require('express');
const bodyparser = require('body-parser');
const stylus = require('stylus');
const nib = require('nib');
const firebaseAdmin = require('./commons/firebaseAdmin');

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
    if ("uid" in request.query) {
      const uid = request.query.uid.trim();
      if (uid !== '') {
        const auth = firebaseAdmin.auth();
        auth
          .updateUser(uid, {
            emailVerified: true
          })
          .then(function (user) {
            console.log('Success verifying email');
            response.render('index', {
              afterEmailVerificationRedirectionUrl: process.env.AFTER_EMAIL_VERIFICATION_REDIRECTION_URL
            });
          })
          .catch(function (error) {
            console.log(error);
            response.status(500).send(error);
          });

      } else {
        response.send('Params not supported');
      }

    } else {
      response.send('Params not supported');
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
