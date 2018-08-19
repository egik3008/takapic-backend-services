const path = require('path')
const dotenv = require('dotenv')
const express = require('express')

dotenv.config({ path: path.dirname(require.main.filename) + '/.env' })

const router = express.Router()

router.get('/google-sign-in', function (request, response) {
  response.redirect(301, process.env.GOOGLE_SIGN_IN_REDIRECT)
})

module.exports = router
