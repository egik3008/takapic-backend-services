const express = require('express')
const axios = require('axios')
const router = express.Router()

// ================================================================================
const path = require('path')
const dotenv = require('dotenv')
const firebaseAdmin = require('./commons/firebaseAdmin')
const pug = require('pug')
const sgMail = require('@sendgrid/mail')

dotenv.config({ path: path.dirname(require.main.filename) + '/.env' })


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
  const {
    transaction_status,
    order_id
  } = request.body;

  const reservationStatus = transaction_status === "settlement" ? "PAID" : null;

  if (reservationStatus) {
    let takapicDomain = process.env.GOOGLE_SIGN_IN_REDIRECT;
    if (!(takapicDomain && takapicDomain !== "")) takapicDomain = "https://takapic.com";

    const db = firebaseAdmin.database();
    db
      .ref('reservations')
      .child(order_id)
      .once('value')
      .then(snaps => {
        const reservationData = snaps.val();

        const photographerName = reservationData.uidMapping[reservationData.photographerId].displayName;
        const photographerEmail = reservationData.uidMapping[reservationData.photographerId].email;

        const travellerId = reservationData.travellerId;

          db
          .ref('reservations')
          .child(order_id)
          .update({ status: reservationStatus })
          .then(() => {
            // Start - Send notification email
            const tableStr = "Congratulations! you have a new booking!<br />Please review and accept if you are ok" +
              "<br /><br />" +
              "<table>" +
              "<tr><td>Customer Name</td><td>:</td><td>"+ reservationData.uidMapping[travellerId].displayName +"</td></tr>" +
              "<tr><td>Destination</td><td>:</td><td>"+ reservationData.destination +"</td></tr>" +
              "<tr><td>Start Date Time</td><td>:</td><td>" + reservationData.startDateTime + "</td></tr>" +
              "</table>" + 
              "<br/><br/><br/>" +
              "<a style='text-align:center;border-radius:3px; font-size:15px;color:white;text-decoration:none; padding:14px 7px 14px 7px; width:260px;display:block;background-color:#007ee6;'" + 
              "href='"+ takapicDomain +"/me/reservations' target='_blank'>" +
              "Click here to see and accept booking</a>";

            const messageData = {
              receiverName: photographerName,
              receiverEmail: photographerEmail,
              emailSubject: "Your client has been successfuly create a payment",
              emailContent: tableStr
            };

            const rootPath = path.dirname(require.main.filename);
            const ctpl = pug.compileFile(rootPath + '/email-templates/notifications.pug')
            const message = {
              to: {
                name: messageData.receiverName,
                email: messageData.receiverEmail
              },
              from: {
                name: 'Takapic Support',
                email: 'support@takapic.com'
              },
              subject: messageData.emailSubject,
              html: ctpl({ EMAIL_TITLE: 'Notification', CUSTOMER_NAME: messageData.receiverName, EMAIL_CONTENT: messageData.emailContent })
            }

            sgMail.send(message);
            // End - Send notification email

            return response.json({
              status: true
            })
          });
        })
        .catch(error => {
          console.log(error);
        });
  } else {
    return response.json({
      status: true
    })
  }
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
