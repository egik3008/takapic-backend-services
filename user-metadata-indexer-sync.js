const dotenv = require('dotenv');
const firebaseAdmin = require('./commons/firebaseAdmin');
const algoliasearch = require('algoliasearch');
const logger = require('./commons/logger');

dotenv.load();

const database = firebaseAdmin.database();
const algolia = algoliasearch(process.env.ALGOLIA_APP_ID, process.env.ALGOLIA_API_KEY);
const indexUserMetadata = algolia.initIndex(process.env.ALGOLIA_INDEX_USERMETADATA);
const userMetadataRef = database.ref('user_metadata');

userMetadataRef.on('child_added', addOrUpdateIndex);
userMetadataRef.on('child_changed', addOrUpdateIndex);
userMetadataRef.on('child_removed', deleteIndex);

function addOrUpdateIndex(data) {
  const firebaseObject = data.val();
  var isAddToIndex = false;

  if (firebaseObject.userType === 'photographer') {
    isAddToIndex = firebaseObject.hasOwnProperty('photoProfilePublicId') &&
      firebaseObject.hasOwnProperty('phoneNumber') &&
      firebaseObject.hasOwnProperty('defaultDisplayPicturePublicId');

  } else if (firebaseObject.userType === 'traveller') {
    isAddToIndex = true;
  }

  if (isAddToIndex) {
    firebaseObject.objectID = data.key;
    indexUserMetadata.saveObject(firebaseObject, function (error, content) {
      if (error) {
        logger.error('Failed to add index: ' + error.message);
        throw error;
      }
      logger.info('Firebase object indexed in Algolia - ObjectID = ' + firebaseObject.objectID);
      logger.info(content);
    });
  }
}

function deleteIndex(data) {
  const objectID = data.key;
  indexUserMetadata.deleteObject(objectID, function (error, content) {
    if (error) {
      logger.error('Failed to delete index: ' + error.message);
      throw error;
    }
    logger.info('Firebase object deleted from Algolia - ObjectID = ' + firebaseObject.objectID);
    logger.info(content);
  })
}
