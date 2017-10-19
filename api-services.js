const express = require('express');
const bodyParser = require('body-parser');
// const logger = require('./commons/logger');
const firebaseAdmin = require('./commons/firebaseAdmin');
// const helpers = require('./commons/helpers');

const app = express();
const router = express.Router();
const port = process.env.PORT || 8008;

// ROUTES FOR OUR API
router.get('/users/:uid', function (request, response) {
  firebaseAdmin.auth().getUser(request.params.uid)
    .then(function (userRecord) {
      console.log('Successfully fetched user data: ', userRecord.toJSON());
      response.json({ data: userRecord });
    })
    .catch(function (error) {
      response.json({ error: error });
      console.log('Error fetching user data: ', error);
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
