const dotenv = require('dotenv');
const firebaseAdmin = require('firebase-admin');
const algoliasearch = require('algoliasearch');
const logger = require('./commons/logger');

dotenv.load();

const serviceAccount = require('./serviceAccountKey.json');
firebaseAdmin.initializeApp({
  credential: firebaseAdmin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DATABASE_URL
});

const database = firebaseAdmin.database();
const algolia = algoliasearch(process.env.ALGOLIA_APP_ID, process.env.ALGOLIA_API_KEY);
const indexUserMetadata = algolia.initIndex('user_metadata');
const userMetadataRef = database.ref('/user_metadata');

userMetadataRef.on('child_added', addOrUpdateIndex);
userMetadataRef.on('child_changed', addOrUpdateIndex);
userMetadataRef.on('child_removed', deleteIndex);

function addOrUpdateIndex(data) {
  const firebaseObject = data.val();
  firebaseObject.objectID = data.key;
  indexUserMetadata.saveObject(firebaseObject, function (error, content) {
    if (error) {
      logger.error('Failed to add index: ' + error.message);
      throw error;
    }
    logger.info('Firebase object indexed in Algolia - ObjectID = ' + firebaseObject.objectID);
    logger.info(content);
  })
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
