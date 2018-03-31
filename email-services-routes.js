const dotenv = require('dotenv');
const express = require('express');
const pug = require('pug');
const sgMail = require('@sendgrid/mail');

dotenv.load();

const router = express.Router();
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

router.post('/email-verification', function (request, response) {
  const receiverEmail = request.body.receiverEmail;
  const receiverName = request.body.receiverName;
  const uid = request.body.uid;
  const compiledFunction = pug.compileFile('email-templates/email-verification.pug');

  const msg = {
    to: {
      name: receiverName,
      email: receiverEmail
    },
    from: {
      name: 'Takapic',
      email: 'admin@takapic.com'
    },
    subject: 'Verify your email for Takapic',
    html: compiledFunction({
      BASE_HOSTNAME: process.env.BASE_HOSTNAME,
      EMAIL_TITLE: 'Verify your email for Takapic',
      UID: uid,
      CUSTOMER_NAME: receiverName
    })
  };

  sgMail
    .send(msg)
    .then(function () {
      response.send({ status: 'OK' });
    })
    .catch(function (error) {
      console.log(error);
      response.status(500).send({ status: 'FAILED', errorMessage: error.message });
    });
});

router.post('/contact-takapic', function (request, response) {
  const consumerEmail = request.body.consumerEmail;
  const consumerName = request.body.consumerName;
  const topic = request.body.topic;
  const description = request.body.description;
  const compiledFunction = pug.compileFile('email-templates/contact-takapic.pug');

  const msg = {
    to: {
      name: 'Takapic Support',
      email: 'support@takapic.com'
    },
    from: {
      name: consumerName,
      email: consumerEmail
    },
    subject: 'Contact Takapic - ' + topic,
    html: compiledFunction({
      EMAIL_TITLE: 'Contact Takapic - ' + topic,
      CONSUMER: consumerName,
      EMAIL: consumerEmail,
      TOPIC: topic,
      DESCRIPTION: description
    })
  };

  sgMail
    .send(msg)
    .then(function () {
      response.send({ status: 'OK' });
    })
    .catch(function (error) {
      console.log(error);
      response.status(500).send({ status: 'FAILED', errorMessage: error.message });
    });
});

router.post('/cashout-request', function (request, response) {
  const compiledFunction = pug.compileFile('email-templates/cashout.pug');

  const msg = {
    to: {
      name: 'Takapic Support',
      email: 'support@takapic.com'
    },
    from: {
      name: request.body.REQUESTER,
      email: request.body.EMAIL
    },
    subject: 'Cash out Request - ' + request.body.REQUESTER,
    html: compiledFunction(request.body)
  };

  sgMail
    .send(msg)
    .then(function () {
      response.send({ status: 'OK' });
    })
    .catch(function (error) {
      console.log(error);
      response.status(500).send({ status: 'FAILED', errorMessage: error.message });
    });
});

router.post('/email-notifications', function (req, resp) {
  const ctpl = pug.compileFile('email-templates/notifications.pug');
  const message = {
    to: {
      name: req.body.receiverName,
      email: req.body.receiverEmail
    },
    from: {
      name: 'Takapic Support',
      email: 'support@takapic.com'
    },
    subject: req.body.emailSubject,
    html: ctpl({ EMAIL_TITLE: 'Notification', CUSTOMER_NAME: req.body.receiverName, EMAIL_CONTENT: req.body.emailContent })
  };

  // console.log(ctpl({ EMAIL_TITLE: 'Notification', CUSTOMER_NAME: 'Oka' }));
  // console.log(req.body.emailContent);
  // resp.status(204).send();

  sgMail
    .send(message)
    .then(function () {
      resp.status(204).send();
    });
});

module.exports = router;
