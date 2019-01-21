const path = require('path')
const dotenv = require('dotenv')
const express = require('express');
const router = express.Router();
const paypal = require('paypal-rest-sdk');
const firebase = require('firebase');
const moment = require('moment');
const firebaseAdmin = require('../../commons/firebaseAdmin');
const { 
  sendEmailPaidPhotographer,
  sendEmailPaidTraveller
} = require('../../commons/functions');

const RESERVATION = require('../../constants/reservationConstants');
const { PKG_HOUR } = require('../../constants/reservationConstants');

dotenv.config({ path: path.dirname(require.main.filename) + '/.env' });

const paypalConfig = {
  'mode': process.env.PAYPAL_ENVIRONMENT,
  'client_id': process.env.PAYPAL_CLIENT_ID,
  'client_secret': process.env.PAYPAL_CLIENT_SECRET
};
paypal.configure(paypalConfig);

function sendEmailPaidNotif(reservationID) {
  const db = firebaseAdmin.database();
  const reservationRef = db.ref('reservations').child(reservationID);

  reservationRef.once('value')
    .then(snapshot => {
      const {
        photographerId,
        travellerId,
        startDateTime,
        packageId,
        passengers,
        photographerFeeIDR,
        photographerFeeUSD,
        totalPriceIDR,
        totalPriceUSD,
        uidMapping
      } = snapshot.val();

      const csName  = uidMapping[travellerId].displayName;
      const csEmail  = uidMapping[travellerId].email;

      const totalIDR = 'IDR ' + Number((totalPriceIDR - ((totalPriceIDR-photographerFeeIDR) * 2))).toLocaleString();
      const totalUSD = 'USD ' + (totalPriceUSD - ((totalPriceUSD-photographerFeeUSD) * 2));

      const feeIDR = 'IDR ' + Number(photographerFeeIDR).toLocaleString();
      const feeUSD = 'USD ' + photographerFeeUSD;

      db.ref('user_metadata')
        .child(photographerId)
        .once('value')
        .then(snap => {
            const {
              displayName,
              email,
              locationMerge,
              photoProfileUrl,
              currency
            } = snap.val();

            let takapicDomain = process.env.GOOGLE_SIGN_IN_REDIRECT;
            if (!(takapicDomain && takapicDomain !== "")) takapicDomain = "https://takapic.com";
            const rsrvLink = takapicDomain + "/me/reservations";


            sendEmailPaidTraveller(
              csName,
              csEmail,
              `Booking request sent to ${displayName}`,
              {
                travellerName: csName,
                photographerName: displayName,
                photographerPhotoURL: photoProfileUrl,
                photographerAddress: locationMerge,
                reservationDate: moment(startDateTime).format('MMMM Do, YYYY'),
                reservationTime: moment(startDateTime).format('hA'),
                reservationDuration: PKG_HOUR[packageId],
                reservationPeoples: (passengers.adults + passengers.childrens + passengers.infants),
              }
            );

            sendEmailPaidPhotographer(
                displayName,
                email,
                `Takapic booking request for ${displayName}`,
                {
                    photographerName: displayName,
                    reservationDate: moment(startDateTime).format('MMMM Do, YYYY'),
                    reservationTime: moment(startDateTime).format('hA'),
                    reservationDuration: PKG_HOUR[packageId],
                    reservationPeoples: (passengers.adults + passengers.childrens + passengers.infants),
                    reservationRate: currency === 'IDR' ? feeIDR : feeUSD,
                    reservationFee: "-10%",
                    reservationTotal: currency === 'IDR' ? totalIDR : totalUSD,
                    reservationCode: reservationID,
                    reservationLink: rsrvLink,
                }
            );
        });
    })
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
          sendEmailPaidNotif(reservationID);
          response.status(200).json({
            message: "payment success",
            status: true
          });

        })
      }
    })
});

router.post('/midtrans/payment-notification', function (request, response) {
  const {
    transaction_status,
    order_id
  } = request.body;

  const reservationStatus = transaction_status === "settlement" ? "PAID" : null;
  

  if (reservationStatus) {
    const db = firebaseAdmin.database();
    const reservationRef = db.ref('reservations').child(order_id);

    reservationRef.once('value')
      .then(snap => {
        if (snap.exists()) {
          reservationRef.update({ 
            status: reservationStatus,
            updated: firebase.database.ServerValue.TIMESTAMP  
          })
          .then(() => {
            sendEmailPaidNotif(order_id);
            return response.json({
              status: true,
              message: "payment success"
            });
          }).catch(err => {
            return response.json({
              status: false,
              message: err.message
            });
          })
        } else {
          return response.json({
            status: false,
            message: "reservation ID not found!"
          });;
        }
      }).catch(err => {
        return response.json({
          status: false,
          message: err.message
        });
      })
  } else {
    return response.json({
      status: true,
    });
  }
})


module.exports = router;