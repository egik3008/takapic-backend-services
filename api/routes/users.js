const express = require('express');
const router = express.Router();
const firebase = require('firebase');
const firebaseAdmin = require('../../commons/firebaseAdmin');
const { notifyToSlack } = require('../../commons/functions');
const userConstants = require('../../constants/userConstants');

router.get('/', async (request, response) => {
    const db = firebaseAdmin.database()
    const userType = request.query['type'] === 'p' ? 'photographer' : 'traveller'
    let result
    let data = await db.ref('user_metadata')
      .orderByChild('userType').equalTo(userType)
      .once('value')
      .catch(function (error) {
        console.error(error)
        response.status(500).json({ error: error.message })
      })
  
    data = Object.keys(data.val()).map((k) => {
      const item = data.val()[k]
      return item
    })
  
    if (userType === 'photographer') {
      let photographersInfo = (await db.ref('photographer_service_information')
        .once('value')
        .catch(function (error) {
          console.error(error)
          response.status(500).json({ error: error.message })
        })).val()
  
      result = data.map(item => {
        item['photographerInfo'] = photographersInfo[item['uid']]
        return item
      })
  
      response.send(result)
    } else {
      response.send(data)
    }
})
  
router.get('/:uid', function (request, response) {
    const uid = request.params.uid
    const db = firebaseAdmin.database()
  
    db.ref('user_metadata')
      .child(uid)
      .once('value')
      .then(function (data) {
        if (data.exists()) {
          let userDetail = data.val()
  
          db.ref('reservations')
            .orderByChild('travellerId')
            .equalTo(uid)
            .once('value', history => {
              if (history.exists()) {
                userDetail['reservationHistory'] = Object.values(history.val())
              } else {
                userDetail['reservationHistory'] = []
              }
  
              response.send(userDetail)
            })
        } else {
          throw new Error('User not found!')
        }
      })
      .catch(function (error) {
        console.error(error)
        response.status(500).json({ error: error.message })
      })
});

router.post('/', function(request, response) {
    const userAuth = {
      email: request.body.email,
      emailVerified: true,
      password: request.body.password,
      displayName: request.body.displayName,
    }

    firebaseAdmin.auth().createUser(userAuth).then(async (userRecord) => {
      try{
        // create user metadata
        const db = firebaseAdmin.database();
        const child = db.ref('user_metadata').child(userRecord.uid);
        const result_data = await child.once('value');
        let data = await result_data.val();

        if (data === null) {
          let metaData = {
            uid: userRecord.uid,
            email:userRecord.email,
            displayName: userRecord.displayName,
            phoneDialCode: request.body.phoneDialCode,
            phoneNumber: request.body.phoneNumber,
            userType: request.body.userType,
            country: request.body.country,
            countryName: request.body.countryName,
            locationAdmLevel1: request.body.locationAdmLevel1,
            locationAdmLevel2: request.body.locationAdmLevel2,
            locationMerge: request.body.locationMerge,
            currency: request.body.currency,
            enable: request.body.enable,
            firstLogin: false,
            created: firebase.database.ServerValue.TIMESTAMP ,
          };

          if (metaData.userType === userConstants.USER_TYPE_PHOTOGRAPHER) {
            metaData.rating = 3;
            metaData.priceStartFrom = 0;
            metaData.defaultDisplayPictureUrl = '-';
            metaData.photoProfilePublicId = '-';
            metaData.defaultDisplayPicturePublicId = '-';
          }
          await child.set(metaData);

          if (metaData.userType === userConstants.USER_TYPE_PHOTOGRAPHER) {
            const service = db.ref('photographer_service_information').child(userRecord.uid);
            const res = await service.once('value');
            const data = await res.val();

            if (!data) {
              const serviceData = {
                selfDescription: request.body.selfDescription,
                languages: request.body.languages,
                
                // initilize service reviews
                serviceReviews: {
                  rating: {
                    label: 'Rating',
                    value: 3
                  },
                  impressions: [
                    { label: 'Friendly', value: 0.5 },
                    { label: 'Skillful', value: 0.5 },
                    { label: 'Creative', value: 0.5 }
                  ]
                }
              }

              await service.set(serviceData);
            }
          }

          // notif to slack
          // notifyToSlack(
          //   'userbase-status-notification',
          //   `New user registered via Email - Name: ${metaData.displayName}, Email: ${metaData.email}, Type: ${metaData.userType}`
          // );

          response.status(200).json({
            uid: userRecord.uid,
            message: "User created successfully."
          });
        }
      } catch (error) {
        console.log(error.message);
        response.status(500).json({
          message: "User failed to created."
        });
      }
    })
    .catch((error) => {
      console.log(error.message);
        response.status(500).json({
          message: "User failed to created."
        });
    });
});
  
router.put('/:uid', function (request, response) {
    const uid = request.params.uid
    const body = request.body
    const db = firebaseAdmin.database();
    body['updated'] = firebase.database.ServerValue.TIMESTAMP;
  
    db.ref('user_metadata')
      .child(uid)
      .update(body)
      .then(() => {
        response.send({ message: 'Success update user!' })
      })
      .catch(function (error) {
        console.error(error)
        response.status(500).json({ error: error.message })
      })
});


module.exports = router;