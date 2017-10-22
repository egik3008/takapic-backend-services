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

userMetadataRef.once('value', initialImport);

function initialImport(dataSnapshot) {
  const objectsToIndex = [];
  dataSnapshot.forEach((function (childSnapshot) {
    const childKey = childSnapshot.key;
    const childData = childSnapshot.val();
    childData.objectID = childKey;
    objectsToIndex.push(childData);
  }));

  indexUserMetadata.saveObjects(objectsToIndex, function (error, content) {
    if (error) {
      throw error;
    }

    console.log('Firebase -> Algolia import done');
    process.exit(0);
  });
}
