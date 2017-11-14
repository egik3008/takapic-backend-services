const dotenv = require('dotenv');
var express = require('express');
var stylus = require('stylus');
var nib = require('nib');

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
  response.render('index', {});
});

app.listen(process.env.PORT_WEB_PROVIDER);
console.log('Listen on port: ', process.env.PORT_WEB_PROVIDER);
