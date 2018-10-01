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

function addIndex (data) {
  const firebaseObject = data.val();

  // if obeject hasnt indexed yet
  if (!firebaseObject.indexed) {
    var hasPhotoProfilePublicId = firebaseObject.hasOwnProperty('photoProfilePublicId') &&
    firebaseObject.photoProfilePublicId !== '-'

    var hasPhoneNumber = firebaseObject.hasOwnProperty('phoneNumber') &&
      firebaseObject.phoneNumber !== '-'

    var hasDefaultDisplayPicturePublicId = firebaseObject.hasOwnProperty('defaultDisplayPicturePublicId') &&
      firebaseObject.defaultDisplayPicturePublicId !== '-'

    if (
      firebaseObject.userType === 'photographer' &&
      hasPhotoProfilePublicId &&
      hasPhoneNumber &&
      hasDefaultDisplayPicturePublicId
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

function updateIndex (data) {
  const firebaseObject = data.val();
  var hasPhotoProfilePublicId = firebaseObject.hasOwnProperty('photoProfilePublicId') &&
    firebaseObject.photoProfilePublicId !== '-'

    var hasPhoneNumber = firebaseObject.hasOwnProperty('phoneNumber') &&
      firebaseObject.phoneNumber !== '-'

    var hasDefaultDisplayPicturePublicId = firebaseObject.hasOwnProperty('defaultDisplayPicturePublicId') &&
      firebaseObject.defaultDisplayPicturePublicId !== '-'

    if (
      firebaseObject.userType === 'photographer' &&
      hasPhotoProfilePublicId &&
      hasPhoneNumber &&
      hasDefaultDisplayPicturePublicId
    ) {
      firebaseObject.objectID = data.key;
      indexPhotographers.saveObject(firebaseObject, function (error, content) {
        if (error) {
          logger.error('Failed to add index: ' + error.message)
          throw error
        }
        logger.info('Firebase object indexed in Algolia - ObjectID = ' + firebaseObject.objectID)
        logger.info(content)
      })
    }
}

function deleteIndex (data) {
  const objectID = data.key
  indexPhotographers.deleteObject(objectID, function (error, content) {
    if (error) {
      logger.error('Failed to delete index: ' + error.message)
      throw error
    }
    logger.info('Firebase object deleted from Algolia - ObjectID = ' + firebaseObject.objectID)
    logger.info(content)
  })
}

/**
 * indexedObject => user_metadata object
 * change indexed status to TRUE, 
 * to prevent object being indexed again when the indexer-users-sync service is restarted
 */
function markToIndexed(indexedObject) {
  return userMetadataRef.child(indexedObject.uid).update({
    indexed: true
  });
}
