const express = require('express');
const bodyParser = require('body-parser');
const logger = require('./commons/logger');
const firebaseAdmin = require('./commons/firebase');

const app = express();
const router = express.Router();
const port = process.env.PORT || 8008;

// ROUTES FOR OUR API
router.post('/users', function (request, response) {
  const data = request.body;
  data.emailVerified = false;
  data.disabled = false;

  firebaseAdmin.auth().createUser(data)
    .then(function (userRecord) {
      logger.info('Successfully created new user:', {email: data.email, uid: userRecord.uid});
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
