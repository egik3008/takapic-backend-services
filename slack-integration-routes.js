const express = require('express')
const axios = require('axios')
const router = express.Router()

router.post('/notify-userbase-status', function (request, response) {
  const text = request.body.text
  axios
    .post('https://hooks.slack.com/services/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', {
      username: 'userbase-status-notification',
      text: text,
      icon_emoji: ':information_desk_person:'
    })
    .then(function () {
      return response.status(204).send()
    })
    .catch(function (error) {
      console.error(error)
      return response.status(204).send()
    })
})

router.post('/midtrans-payment-notification', function (request, response) {
  console.log(request.body)
  return response.status(204).send()
  /* const text = request.body.text;
  axios
    .post('https://hooks.slack.com/services/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', {
      username: "userbase-status-notification",
      text: text,
      icon_emoji: ":information_desk_person:"
    })
    .then(function () {
      return response.status(204).send();
    })
    .catch(function (error) {
      console.error(error);
      return response.status(204).send();
    }); */
})

module.exports = router
