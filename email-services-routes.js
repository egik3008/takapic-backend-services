const path = require('path');
const dotenv = require('dotenv');
const express = require('express');

const pug = require('pug')
const sgMail = require('@sendgrid/mail')
const { 
  sendEmailReview,
  sendEmailBookingTraveller,
  sendEmailBookingPhotographer,
  fetchReservationDetail
} = require('./commons/functions');

const rootPath = path.dirname(require.main.filename)
dotenv.config({ path: rootPath + '/.env' })

const router = express.Router();
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

router.post('/email-verification', function (request, response) {
  const receiverEmail = request.body.receiverEmail
  const receiverName = request.body.receiverName
  const uid = request.body.uid
  const compiledFunction = pug.compileFile(rootPath + '/email-templates/email-verification.pug')

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
  }

  sgMail
    .send(msg)
    .then(function () {
      response.send({ status: 'OK' })
    })
    .catch(function (error) {
      console.log(error)
      response.status(500).send({ status: 'FAILED', errorMessage: error.message })
    })
})

router.post('/contact-takapic', function (request, response) {
  const consumerEmail = request.body.consumerEmail
  const consumerName = request.body.consumerName
  const topic = request.body.topic
  const description = request.body.description
  const compiledFunction = pug.compileFile(rootPath + '/email-templates/contact-takapic.pug')

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
  }

  sgMail
    .send(msg)
    .then(function () {
      response.send({ status: 'OK' })
    })
    .catch(function (error) {
      console.log(error)
      response.status(500).send({ status: 'FAILED', errorMessage: error.message })
    })
})

router.post('/cashout-request', function (request, response) {
  const compiledFunction = pug.compileFile(rootPath + '/email-templates/cashout.pug')

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
  }

  sgMail
    .send(msg)
    .then(function () {
      response.send({ status: 'OK' })
    })
    .catch(function (error) {
      console.log(error)
      response.status(500).send({ status: 'FAILED', errorMessage: error.message })
    })
})

router.post('/email-notifications', function (req, resp) {
  const ctpl = pug.compileFile(rootPath + '/email-templates/notifications.pug')
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
  }

  sgMail
    .send(message)
    .then(function () {
      resp.status(204).send()
    })
})

router.post('/photo-session-email-reviews', function (req, resp) {
  
  const {
    receiverName,
    receiverEmail,
    photographerName,
    reviewLink
  } = req.body;

  const emailSubject = `Rate your experience with ${photographerName}`;
  const emailContentTitle = `Rate your experience with ${photographerName}`;
  const emailContentBody = `<p>You just completed your photoshoot with <strong>${photographerName}</strong>. Now, take a minute to replect on the experience and share a quick review</p>
  <p>You'll have space to leave private feedback, just for <strong>${photographerName}</strong> and public comments for future travellers too</p>`;
  // <p>We won't share any of your response until after <strong>${photographerName}</strong> leaves feedback too</p>`;

  sendEmailReview(
    receiverName,
    receiverEmail,
    emailSubject,
    emailContentTitle,
    emailContentBody,
    reviewLink
  ).then(function() {
      resp.status(204).send()
    })
});

router.post('/photo-album-email-reviews', function (req, resp) {
  
  const {
    receiverName,
    receiverEmail,
    photographerName,
    reviewLink
  } = req.body;

  const emailSubject = `How was your photoshoot with ${photographerName}`;
  const emailContentTitle = `How was your photoshoot with ${photographerName}`;
  const emailContentBody = `<p>Share your experience while it's still fresh.</p>
  <p>Your review will help <strong>${photographerName}</strong> improve and tells future travellers what to expect</p>`;
  // <p><strong>${photographerName}</strong> won't see your responses until after they write a review for you</p>`;

  sendEmailReview(
    receiverName,
    receiverEmail,
    emailSubject,
    emailContentTitle,
    emailContentBody,
    reviewLink
  ).then(function() {
      resp.status(204).send()
    })
});


router.post('/notification-accepted-booking', function (req, resp) {
  
  const { reservationId } = req.body;
  fetchReservationDetail(reservationId)
    .then(res => {
      Promise.all([
        // send email notif to traveller
        sendEmailBookingTraveller(
            res.travellerName,
            res.travellerEmail,
            `Booking confirmed for ${res.photographerName} photography service`,
            {
                title: 'Your booking is confirmed!',
                subTitle: "You're going to have an awesome photoshoot with Takapic",
                photographerName: res.photographerName,
                photographerPhotoURL: res.photographerPhotoURL,
                photographerAddress: res.photographerAddress,
                photographerAbout: res.photographerAbout,
                photographerPhone: res.photographerPhone,
                reservationDate: res.reservationDate,
                reservationTime: res.reservationTime,
                reservationDuration: res.reservationDuration,
                reservationPeoples: res.reservationPeoples,
            }
        ),
      
        // send email notif to photographer
        sendEmailBookingPhotographer(
            res.photographerName,
            res.photographerEmail,
            `Takapic booking confirmed for ${res.travellerName}`,
            {
                title: 'You have accepted a booking!',
                subTitle: "Well done, you’re going to take some awesome pics with Takapic!",
                travellerName: res.travellerName,
                travellerPhone: res.travellerPhone,
                reservationDate: res.reservationDate,
                reservationTime: res.reservationTime,
                reservationDuration: res.reservationDuration,
                reservationPeoples: res.reservationPeoples,
                reservationRate: res.reservationRate,
                reservationFee: res.reservationFee,
                reservationTotal: res.reservationTotal,
                reservationCode: res.reservationCode,
            }
        )

      ]).then(() => {
        resp.status(204).send()
      });
    }).catch(err => {
      resp.status(500).send();
    });
  
});

module.exports = router
