const dotenv = require('dotenv');
const express = require('express');
const stylus = require('stylus');
const nib = require('nib');
const firebaseAdmin = require('./commons/firebaseAdmin');

dotenv.load();

const app = express();

function compileCSS(str, path) {
  return stylus(str).set('filename', path).use(nib());
}

app.set('views', __dirname + '/web/views');
app.set('view engine', 'pug');

app.use(stylus.middleware({
  src: __dirname + '/web/public',
  compile: compileCSS
}));

app.use(express.static(__dirname + '/web/public'));

app.get('/', function (request, response) {
  if ("test" in request.query) {
    response.render('index', {});

  } else {
    const mode = request.query['mode'];
    if (mode === 'verifyEmail' && "oobCode" in request.query) {
      const actionCode = request.query['oobCode'];
      const auth = firebaseAdmin.auth();

      auth.applyActionCode(actionCode)
        .then(function () {
          response.render('index', {});
        })
        .catch(function (error) {
          console.log(error);
        });
    } else {
      response.send('Mode and params not supported');
    }
  }
});

app.listen(process.env.PORT_WEB_PROVIDER);
console.log('Listen on port: ', process.env.PORT_WEB_PROVIDER);
