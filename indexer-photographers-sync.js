const path = require('path')
const dotenv = require('dotenv')
const firebaseAdmin = require('./commons/firebaseAdmin')
const algoliasearch = require('algoliasearch')
const logger = require('./commons/logger')

dotenv.config({ path: path.dirname(require.main.filename) + '/.env' })

const database = firebaseAdmin.database()
const algolia = algoliasearch(process.env.ALGOLIA_APP_ID, process.env.ALGOLIA_API_KEY)
const indexPhotographers = algolia.initIndex(process.env.ALGOLIA_INDEX_PHOTOGRAPHERS)
const userMetadataRef = database.ref('user_metadata')

userMetadataRef.on('child_added', addIndex)
userMetadataRef.on('child_changed', updateIndex)
userMetadataRef.on('child_removed', deleteIndex)

async function addIndex (data) {
  const firebaseObject = data.val();
  
  // if obeject hasnt indexed yet
  if (isPhotographer(firebaseObject) && !firebaseObject.indexed) {  
    const isProfileCompleted = await isPhotographerProfileCompleted(firebaseObject);
    
    if (
        isProfileCompleted 
        && !firebaseObject.hidden // photographer is not filter/hide from web
        && Number(firebaseObject.enable) !== 0  // photographer is not blocked
    ) {
      markToIndexed(firebaseObject)
      .then(() => {
        firebaseObject.objectID = data.key
        indexPhotographers.saveObject(firebaseObject, function (error, content) {
          if (error) {
            logger.error('Failed to add index: ' + error.message)
            throw error
          }
          logger.info('Firebase object indexed in Algolia - ObjectID = ' + firebaseObject.objectID)
          logger.info(content)
        })
      })
    }
  } else {
    logger.info('This object already indexed in Algolia - UID = ' + firebaseObject.uid)
  }
}

async function updateIndex (data) {
  const firebaseObject = data.val();

  if (isPhotographer(firebaseObject)) {
    const isProfileCompleted = await isPhotographerProfileCompleted(firebaseObject);

    if (
        isProfileCompleted 
        && !firebaseObject.hidden // photographer is not filter/hide from web
        && Number(firebaseObject.enable) !== 0  // photographer is not blocked
    ) {
      markToIndexed(firebaseObject)
      .then(() => {
        firebaseObject.objectID = data.key;
        indexPhotographers.saveObject(firebaseObject, function (error, content) {
          if (error) {
            logger.error('Failed to add index: ' + error.message)
            throw error
          }
          logger.info('Firebase object indexed in Algolia - ObjectID = ' + firebaseObject.objectID)
          // logger.info(content)
        })
      })
    } else {
      if (firebaseObject.indexed)
      deleteIndex(data);
    }
  }
}

function deleteIndex (data) {
  const objectID = data.key
  indexPhotographers.deleteObject(objectID, function (error, content) {
    if (error) {
      logger.error('Failed to delete index: ' + error.message)
      throw error
    }
    logger.info('Firebase object deleted from Algolia - ObjectID = ' + objectID)
    logger.info(content);

    // set indexed status to false
    userMetadataRef.child(objectID).update({
      indexed: false,
      hidden: true
    });
  })
}


/**
 * check if this user type is photographer
 */
function isPhotographer(firebaseObject) {
  return (firebaseObject.userType === 'photographer');
}

/**
 * indexedObject => user_metadata object
 * change indexed status to TRUE, 
 * to prevent object being indexed again when the indexer-users-sync service is restarted
 */
function markToIndexed(indexedObject) {
  if (!indexedObject.indexed) {
    return userMetadataRef.child(indexedObject.uid).update({
      indexed: true,
      hidden: false
    })
  } else {
    return new Promise(function(resolve, reject) {
      resolve();
    });
  }
}

/**
 * check if profile photographer is completed
 */
function isPhotographerProfileCompleted(firebaseObject) {
  let isCompleted = true;

  // has photo profile
  var hasPhotoProfilePublicId = firebaseObject.hasOwnProperty('photoProfilePublicId') 
    && firebaseObject.photoProfilePublicId !== '-';

  if (!hasPhotoProfilePublicId) isCompleted = false;


  // has phone number
  if (isCompleted) {
    var hasPhoneNumber = firebaseObject.hasOwnProperty('phoneNumber') 
      && firebaseObject.phoneNumber !== '-';
    if (!hasPhoneNumber) isCompleted = false;
  }

  // has default portfolio
  if (isCompleted) {
    var hasDefaultDisplayPicturePublicId = firebaseObject.hasOwnProperty('defaultDisplayPicturePublicId') 
      && firebaseObject.defaultDisplayPicturePublicId !== '-';
    
      if (!hasDefaultDisplayPicturePublicId) isCompleted = false;
  }

  // has start price
  if (isCompleted) {
    var hasStartPrice = firebaseObject.hasOwnProperty('priceStartFrom') 
      && Number(firebaseObject.priceStartFrom) > 0;
    
      if (!hasStartPrice) isCompleted = false;
  }


  //check photographer services
  if (isCompleted) {
    return database.ref('photographer_service_information')
      .child(firebaseObject.uid)
      .once('value')
      .then(snapshot => {
        let pService = snapshot.val();

        // has camera equipment
        if (isCompleted && pService) {
          const hasCameraEquipment = pService.hasOwnProperty('cameraEquipment') 
            && pService.cameraEquipment.hasOwnProperty('body')
            && (Object.keys(pService.cameraEquipment.body).length > 0)
            && pService.cameraEquipment.hasOwnProperty('lens')
            && (Object.keys(pService.cameraEquipment.lens).length > 0)

            if (!hasCameraEquipment) isCompleted = false;
        }
        return isCompleted;
      });
  } else {
    var promise = new Promise(function(resolve, reject) {
      resolve(isCompleted);
    });
  
    return promise;
  }
}
