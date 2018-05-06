const path = require('path');
const dotenv = require('dotenv');
const express = require('express');
const bodyParser = require('body-parser');

const contentsResources = require('./contents-resources-routes');
const emailServices = require('./email-services-routes');
const authRelated = require('./auth-related-routes');
const slackIntegration = require('./slack-integration-routes');
const cloudinary = require('./cloudinary-routes');
const googleSignIn = require('./google-sign-in-routes');

dotenv.config({ path: path.dirname(require.main.filename) + '/.env' });

const app = express();
const router = express.Router();
const port = process.env.PORT_API_SERVICES;

app.use(function(request, response, next) {
  response.header("Access-Control-Allow-Origin", "*");
  response.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  response.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE");
  next();
});

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

router.use(contentsResources);
router.use(authRelated);
router.use(cloudinary);
router.use(googleSignIn);
router.use('/email-service', emailServices);
router.use('/slack-integration', slackIntegration);

app.use('/api', router);

app.listen(port, function () {
  console.log('App listening on port', port);
});
