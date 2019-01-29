var schedule = require('node-schedule');
const path = require('path');
const dotenv = require('dotenv');
const moment = require('moment');
const firebaseAdmin = require('./commons/firebaseAdmin');
const RESERVATION = require('./constants/reservationConstants');
const { 
    sendEmail,
    sendEmailReview,
    sendEmailBookingTraveller,
    sendEmailBookingPhotographer,
    fetchReservationDetail
} = require('./commons/functions');

const rootPath = path.dirname(require.main.filename)
dotenv.config({ path: rootPath + '/.env' })
 
// task schedule execute every day at 21.00
var tpScheduler = schedule.scheduleJob('0 0 21 * * *', function(fireDate){
    emailReminderBeforePhotoShoot();
    emailReminderToCompletePayment();
});


//********************* TASK ************************/

function isDateReminder(date, days) {
    return (moment().diff(date, 'days') === days);
}

// query reservation 
function emailReminderBeforePhotoShoot() {
    const db = firebaseAdmin.database();
    db.ref('reservations')
        .orderByChild('status')
        .equalTo(RESERVATION.RESERVATION_ACCEPTED)
        .once('value')
        .then(snap => {
            const reservations = snap.val();
            for (key in reservations) {
                const photoshootDate = moment(reservations[key].startDateTime);
                let days = 0;

                // if 7 days before photoshoot
                if (isDateReminder(photoshootDate, -7)) days = 7;
                // if 3 days before photoshoot
                if (isDateReminder(photoshootDate, -3)) days = 3;

                if (days > 0) {
                    fetchReservationDetail(key).then(res => {
                        // send email notif to traveller
                        sendEmailBookingTraveller(
                            res.travellerName,
                            res.travellerEmail,
                            `Booking reminder - ${res.reservationDate}`,
                            {
                                title: 'Get ready to pose!',
                                subTitle: `It’s ${days} days to your memorable photo shoot!`,
                                photographerName: res.photographerName,
                                photographerPhotoURL: res.photographerPhotoURL,
                                photographerAddress: res.photographerAddress,
                                photographerAbout: "",
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
                            `Booking reminder - ${res.reservationDate}`,
                            {
                                title: 'Pack up your gear!',
                                subTitle: `Get ready to show your skill because it’s ${days} days to your photo shoot!`,
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
                    })
                }
            }
        })
        .catch(err => {
            console.log("query error: ", err.message);
        })
}

function emailReminderToCompletePayment() {
    const db = firebaseAdmin.database();
    db.ref('reservations')
        .orderByChild('status')
        .equalTo(RESERVATION.RESERVATION_UNPAID)
        .once('value')
        .then(snap => {
            const reservations = snap.val();
            for (key in reservations) {
                const bookingDate = moment(reservations[key].created);
                let sendReminder = false;
                if (isDateReminder(bookingDate, 2)) sendReminder = true;
                if (isDateReminder(bookingDate, 3)) sendReminder = true;

                if (sendReminder) {
                    fetchReservationDetail(key)
                        .then(res => {
                            sendEmail(
                                'notification-finish-payment',
                                res.travellerName,
                                res.travellerEmail,
                                `Finish your payment before ${res.photographerName} is taken`,
                                {
                                    CUSTOMER_NAME: res.travellerName,
                                    PHOTOGRAPHER_NAME: res.photographerName,
                                    PAYMENT_LINK: res.reservationLink,
                                }
                            );
                        })
                        .catch(err => {
                            console.log("query error: ", err.message);
                        });
                }
            }
        })
        .catch(err => {
            console.log("query error: ", err.message);
        })
}

function emailReminderToReview() {
    const db = firebaseAdmin.database();
    db.ref('reservations')
        .orderByChild('status')
        .equalTo(RESERVATION.RESERVATION_UNPAID)
        .once('value')
        .then(snap => {
            const reservations = snap.val();
            for (key in reservations) {
                const bookingDate = moment(reservations[key].created);
                let sendReminder = false;
                
            }
        })
        .catch(err => {
            console.log("query error: ", err.message);
        })
}