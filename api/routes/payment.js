const path = require('path')
const dotenv = require('dotenv')
const express = require('express');
const router = express.Router();
const paypal = require('paypal-rest-sdk');
const firebase = require('firebase');
const firebaseAdmin = require('../../commons/firebaseAdmin');
const { sendEmail } = require('../../commons/functions');

const RESERVATION = require('../../constants/reservationConstants');

dotenv.config({ path: path.dirname(require.main.filename) + '/.env' });

const paypalConfig = {
  'mode': process.env.PAYPAL_ENVIRONMENT,
  'client_id': process.env.PAYPAL_CLIENT_ID,
  'client_secret': process.env.PAYPAL_CLIENT_SECRET
};
paypal.configure(paypalConfig);

function paymentSuccessEmailContent(csName, dest, startDateTime) {
  let takapicDomain = process.env.GOOGLE_SIGN_IN_REDIRECT;
  if (!(takapicDomain && takapicDomain !== "")) takapicDomain = "https://takapic.com";

  return "Congratulations! you have a new booking!<br />Please review and accept if you are ok" +
  "<br /><br />" +
  "<table>" +
  "<tr><td>Customer Name</td><td>:</td><td>"+ csName +"</td></tr>" +
  "<tr><td>Destination</td><td>:</td><td>"+ dest +"</td></tr>" +
  "<tr><td>Start Date Time</td><td>:</td><td>" + startDateTime + "</td></tr>" +
  "</table>" + 
  "<br/><br/><br/>" +
  "<a style='text-align:center;border-radius:3px; font-size:15px;color:white;text-decoration:none; padding:14px 7px 14px 7px; width:260px;display:block;background-color:#007ee6;'" + 
  "href='"+ takapicDomain +"/me/reservations' target='_blank'>" +
  "Click here to see and accept booking</a>";
}



router.post('/paypal', async (request, response) => {
  const {
    order_id,
    price,
    currency,
    cancel_url
  } = request.body;
  
  const create_payment_json = {
    "intent": "sale",
    "payer": {
        "payment_method": "paypal"
    },
    "redirect_urls": {
        "return_url": process.env.PAYPAL_RETURN_URL,
        "cancel_url": cancel_url
    },
    "transactions": [{
        "item_list": {
            "items": [{
                "name": "item",
                "sku": order_id,
                "price": price,
                "currency": currency,
                "quantity": 1
            }]
        },
        "amount": {
            "currency": currency,
            "total": price
        },
        "description": "Takapic Photographer booking"
    }]
  };
  
  
  paypal.payment.create(create_payment_json, function (error, payment) {
      if (error) {
          throw error;
      } else {
          for(let i = 0; i < payment.links.length; i++) {
            if(payment.links[i].rel === "approval_url") {
              response.send(payment.links[i].href);
            }
          }
      }
  });
})
  
router.post('/paypal/success', function (request, response) {
    const payerID = request.body.PayerID;
    const paymentID = request.body.paymentId;

    const execute_paypment_json = {
      'payer_id': payerID,
    };

    paypal.payment.execute(paymentID, execute_paypment_json, function(error, payment) {
      if (error) {
        console.log(error.response);
        throw error;
      } else {
        const reservationID = payment.transactions[0].item_list.items[0].sku;
        const paymentCurrency = payment.transactions[0].item_list.items[0].currency;
        const db = firebaseAdmin.database();

        const reservationRef = db.ref('reservations').child(reservationID);

        reservationRef.update({
          paymentCurrency,
          status: RESERVATION.RESERVATION_PAID,
          updated: firebase.database.ServerValue.TIMESTAMP
        }).then(() => {
          reservationRef.once('value')
            .then(snapshot => {
              const res = snapshot.val();
              const travellerId = res.travellerId;
              const photographerId = res.photographerId;

              const pgName  = res.uidMapping[photographerId].displayName;
              const pgEmail = res.uidMapping[photographerId].email;
              const csName  = res.uidMapping[travellerId].displayName;
              const dest    = res.destination;
              const sdTime  = res.startDateTime;

              sendEmail(
                pgName,
                pgEmail,
                "Your client has been successfuly create a payment",
                paymentSuccessEmailContent(csName, dest, sdTime)
              );

              response.status(200).json({
                message: "payment success",
                status: true
              });
            })
        })
      }
    })
});


module.exports = router;