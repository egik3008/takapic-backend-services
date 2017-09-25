const express = require('express');
const bodyParser = require('body-parser');
const logger = require('./commons/logger');
const firebaseAdmin = require('./commons/firebase');
const helpers = require('./commons/helpers');

const app = express();
const router = express.Router();
const port = process.env.PORT || 8008;

function createUserMetadata(email, userType) {
  const db = firebaseAdmin.database();
  const ref = db.ref('/user_metadata');
  const data = {};
  data[helpers.createUIDChars(email)] = {
    userType: userType,
    firstLogin: true
  };
  ref.set(data);
}

// ROUTES FOR OUR API
router.post('/users', function (request, response) {
  const data = {
    email: request.body.email,
    password: request.body.password,
    displayName: request.body.displayName,
    emailVerified: false,
    disabled: false
  };

  firebaseAdmin.auth().createUser(data)
    .then(function (userRecord) {
      logger.info('Successfully created new user:', {email: data.email, uid: userRecord.uid});
      createUserMetadata(data.email, request.body.userType);
      response.statusCode = 201;
      response.json({ message: 'User created', uid: userRecord.uid });

    }).catch(function (error) {
      logger.debug('Error creating new user', error.message);
      response.statusCode = 400;
      response.json({ message: error.message });
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
