const axios = require('axios');
const path = require('path');
const dotenv = require('dotenv');
const pug = require('pug');
const sgMail = require('@sendgrid/mail');
const firebaseAdmin = require('./firebaseAdmin');
const moment = require('moment');
const { BASE_REDIRECT_URL } = require('../constants/commonConstants');
const { PKG } = require('../constants/reservationConstants');
const RESERVATION = require('../constants/reservationConstants');

dotenv.config({ path: path.dirname(require.main.filename) + '/.env' });
sgMail.setApiKey(process.env.SENDGRID_API_KEY)

module.exports.notifyToSlack = function (username, text, icon = ':information_desk_person:') {
    return axios
    .post('https://hooks.slack.com/services/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', {
      username: username,
      text: text,
      icon_emoji: icon
    });
}

function sendEmail (template, receiverName, receiverEmail, emailSubject, content) {
  const rootPath = path.dirname(require.main.filename);
  const ctpl = pug.compileFile(rootPath + '/email-templates/' + template + '.pug')
  const message = {
    to: {
      name: receiverName,
      email: receiverEmail
    },
    from: {
      name: 'Takapic Support',
      email: 'support@takapic.com'
    },
    subject: emailSubject,
    html: ctpl(content)
  }

  return sgMail.send(message);
}

module.exports.sendEmail = sendEmail

module.exports.sendEmailNotification = function (
    receiverName, 
    receiverEmail, 
    emailSubject, 
    emailContent,
) {
      const content = { 
        EMAIL_TITLE: 'Notification', 
        CUSTOMER_NAME: receiverName, 
        EMAIL_CONTENT: emailContent 
      };

      return sendEmail('notifications', 
          receiverName,
          receiverEmail,
          emailSubject,
          content
      );
}

module.exports.sendEmailReview = function(
  receiverName, 
  receiverEmail, 
  emailSubject, 
  emailContentTitle,
  emailContentBody,
  reviewLink,
) {
    const content = { 
        EMAIL_TITLE: 'Review', 
        EMAIL_CONTENT_TITLE: emailContentTitle, 
        REVIEW_LINK: reviewLink, 
        EMAIL_CONTENT_BODY: emailContentBody 
    };

    return sendEmail('reviews',
        receiverName,
        receiverEmail,
        emailSubject,
        content
    );
}

module.exports.sendEmailBookingTraveller = function(
  receiverName,
  receiverEmail,
  emailSubject,
  content
) {

  const emailContent = {
    MESSAGE_TITLE: content.title,
    MESSAGE_SUB_TITLE: content.subTitle,
    PHOTOGRAPHER_NAME: content.photographerName,
    PHOTOGRAPHER_PHOTO_URL: content.photographerPhotoURL,
    PHOTOGRAPHER_ADDRESS: content.photographerAddress,
    PHOTOGRAPHER_ABOUT: content.photographerAbout,
    PHOTOGRAPHER_PHONE: content.photographerPhone,
    RESERVATION_DATE: content.reservationDate,
    RESERVATION_TIME: content.reservationTime,
    RESERVATION_DURATION: content.reservationDuration,
    RESERVATION_PEOPLES: content.reservationPeoples,
  };

  return sendEmail('notification-booked-traveller',
    receiverName,
    receiverEmail,
    emailSubject,
    emailContent
  );
}

module.exports.sendEmailBookingPhotographer = function(
  receiverName,
  receiverEmail,
  emailSubject,
  content
) {

  const emailContent = {
    MESSAGE_TITLE: content.title,
    MESSAGE_SUB_TITLE: content.subTitle,
    TRAVELLER_NAME: content.travellerName,
    TRAVELLER_PHONE: content.travellerPhone,
    RESERVATION_DATE: content.reservationDate,
    RESERVATION_TIME: content.reservationTime,
    RESERVATION_DURATION: content.reservationDuration,
    RESERVATION_PEOPLES: content.reservationPeoples,
    RESERVATION_RATE: content.reservationRate,
    RESERVATION_FEE: content.reservationFee,
    RESERVATION_TOTAL: content.reservationTotal,
    RESERVATION_CODE: content.reservationCode,
  };

  return sendEmail('notification-booked-photographer',
    receiverName,
    receiverEmail,
    emailSubject,
    emailContent
  );
}


module.exports.sendEmailPaidTraveller = function(
  receiverName,
  receiverEmail,
  emailSubject,
  content
) {

  const emailContent = {
    TRAVELLER_NAME: content.travellerName,
    PHOTOGRAPHER_NAME: content.photographerName,
    PHOTOGRAPHER_PHOTO_URL: content.photographerPhotoURL,
    PHOTOGRAPHER_ADDRESS: content.photographerAddress,
    RESERVATION_DATE: content.reservationDate,
    RESERVATION_TIME: content.reservationTime,
    RESERVATION_DURATION: content.reservationDuration,
    RESERVATION_PEOPLES: content.reservationPeoples,
  };

  return sendEmail('notification-paid-traveller',
    receiverName,
    receiverEmail,
    emailSubject,
    emailContent
  );
}

module.exports.sendEmailPaidPhotographer = function(
  receiverName,
  receiverEmail,
  emailSubject,
  content
) {

  const emailContent = {
    PHOTOGRAPHER_NAME: content.photographerName,
    RESERVATION_DATE: content.reservationDate,
    RESERVATION_TIME: content.reservationTime,
    RESERVATION_DURATION: content.reservationDuration,
    RESERVATION_PEOPLES: content.reservationPeoples,
    RESERVATION_RATE: content.reservationRate,
    RESERVATION_FEE: content.reservationFee,
    RESERVATION_TOTAL: content.reservationTotal,
    RESERVATION_CODE: content.reservationCode,
    RESERVATION_LINK: content.reservationLink,
  };

  return sendEmail('notification-paid-photographer',
    receiverName,
    receiverEmail,
    emailSubject,
    emailContent
  );
}

module.exports.fetchReservationDetail = function (reservationID) {
  const db = firebaseAdmin.database();
  return db.ref('reservations')
    .child(reservationID)
    .once('value')
    .then(snap => {
      const {
        photographerId,
        travellerId,
        startDateTime,
        packageId,
        passengers = {
          adults: 0,
          childrens: 0,
          infants: 0
        },
        photographerFeeIDR,
        photographerFeeUSD,
        totalPriceIDR,
        totalPriceUSD,
        travellerContactPerson = '-',
        uidMapping,
        status
      } = snap.val();

      const totalIDR = 'IDR ' + Number((totalPriceIDR - ((totalPriceIDR-photographerFeeIDR) * 2))).toLocaleString();
      const totalUSD = 'USD ' + (totalPriceUSD - ((totalPriceUSD-photographerFeeUSD) * 2));

      const feeIDR = 'IDR ' + Number(photographerFeeIDR).toLocaleString();
      const feeUSD = 'USD ' + photographerFeeUSD;

      return db.ref('user_metadata')
        .child(photographerId)
        .once('value')
        .then(snap => {
          const {
            displayName,
            email,
            locationMerge,
            photoProfileUrl,
            phoneDialCode,
            phoneNumber,
            currency
          } = snap.val();

          let rsrvLink = BASE_REDIRECT_URL;
          if (status === RESERVATION.RESERVATION_UNPAID)
            rsrvLink += `/booking/${photographerId}/${reservationID}`;
          else 
            rsrvLink += `/me/reservations/${reservationID}/${photographerId}`;

          return {
            photographerId: photographerId,
            photographerName: displayName,
            photographerEmail: email,
            photographerPhotoURL: photoProfileUrl,
            photographerAddress: locationMerge,
            photographerAbout: "",
            photographerPhone: phoneDialCode + phoneNumber,
            travellerName: uidMapping[travellerId].displayName,
            travellerEmail: uidMapping[travellerId].email,
            travellerPhone: travellerContactPerson,
            reservationDate: moment(startDateTime).format('MMMM Do, YYYY'),
            reservationTime: moment(startDateTime).format('hA'),
            reservationDuration: PKG[packageId].hours,
            reservationPeoples: (passengers.adults + passengers.childrens + passengers.infants),
            reservationRate: currency === 'IDR' ? feeIDR : feeUSD,
            reservationFee: "-10%",
            reservationTotal: currency === 'IDR' ? totalIDR : totalUSD,
            reservationCode: reservationID,
            reservationLink: rsrvLink,
          }
        })
    }).catch(err => {
      return err.message;
    });
}
