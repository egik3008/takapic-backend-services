const path = require('path');
const dotenv = require('dotenv');
const firebaseAdmin = require('./commons/firebaseAdmin');
const algoliasearch = require('algoliasearch');
const logger = require('./commons/logger');

dotenv.config({ path: path.dirname(require.main.filename) + '/.env' });

const database = firebaseAdmin.database();
const algolia = algoliasearch(process.env.ALGOLIA_APP_ID, process.env.ALGOLIA_API_KEY);
const indexPhotographers = algolia.initIndex(process.env.ALGOLIA_INDEX_PHOTOGRAPHERS);
const userMetadataRef = database.ref('user_metadata');

userMetadataRef.on('child_added', addOrUpdateIndex);
userMetadataRef.on('child_changed', addOrUpdateIndex);
userMetadataRef.on('child_removed', deleteIndex);

function addOrUpdateIndex(data) {
  const firebaseObject = data.val();

  var hasPhotoProfilePublicId = firebaseObject.hasOwnProperty('photoProfilePublicId') &&
    firebaseObject.photoProfilePublicId !== '-';

  var hasPhoneNumber = firebaseObject.hasOwnProperty('phoneNumber') &&
    firebaseObject.phoneNumber !== '-';

  var hasDefaultDisplayPicturePublicId = firebaseObject.hasOwnProperty('defaultDisplayPicturePublicId') &&
    firebaseObject.defaultDisplayPicturePublicId !== '-';

  if (
    firebaseObject.userType === 'photographer' &&
    hasPhotoProfilePublicId &&
    hasPhoneNumber &&
    hasDefaultDisplayPicturePublicId
  ) {
    firebaseObject.objectID = data.key;
    indexPhotographers.saveObject(firebaseObject, function (error, content) {
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
  indexPhotographers.deleteObject(objectID, function (error, content) {
    if (error) {
      logger.error('Failed to delete index: ' + error.message);
      throw error;
    }
    logger.info('Firebase object deleted from Algolia - ObjectID = ' + firebaseObject.objectID);
    logger.info(content);
  });
}
