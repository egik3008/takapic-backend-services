const express = require('express');
const firebaseAdmin = require('./commons/firebaseAdmin');

const router = express.Router();

router.get('/auth/accountType', function (request, response) {
  firebaseAdmin
    .auth()
    .getUserByEmail(request.query.email)
    .then(function (record) {
      const data = record.toJSON();
      response.json({ status: 'ok', data: data.providerData });
    })
    .catch(function (error) {
      response.status(500).send({ status: 'error', message: error.message });
    });
});

module.exports = router;
