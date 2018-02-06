const dotenv = require('dotenv');
const express = require('express');
const axios = require('axios');

dotenv.load();

const router = express.Router();

router.delete('/cloudinary-images/delete', function (request, response) {
  var urlRequest = process.env.CLOUDINARY_API_BASE_URL;
  urlRequest += '/resources/image/upload';

  axios({
    method: 'DELETE',
    url: urlRequest,
    auth: {
      username: process.env.CLOUDINARY_API_KEY,
      password: process.env.CLOUDINARY_API_SECRET
    },
    params: {
      public_ids: request.query.public_ids,
      invalidate: true
    }
  })
    .then(function (result) {
      response.send(result.data);
    })
    .catch(function (error) {
      console.error(error);
      response.status(500).send(error);
    });
});

module.exports = router;
