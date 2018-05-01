const dotenv = require('dotenv');
const firebaseAdmin = require('./commons/firebaseAdmin');
const algoliasearch = require('algoliasearch');

dotenv.load();

const database = firebaseAdmin.database();
const algolia = algoliasearch(process.env.ALGOLIA_APP_ID, process.env.ALGOLIA_API_KEY);
const indexUserMetadata = algolia.initIndex(process.env.ALGOLIA_INDEX_USERMETADATA);
const userMetadataRef = database.ref('user_metadata');

userMetadataRef.once('value', initialImport);

function initialImport(dataSnapshot) {
  const objectsToIndex = [];

  dataSnapshot.forEach((function (childSnapshot) {
    const childData = childSnapshot.val();

    if (childData.userType === 'photographer') {
      if (
        !childData.hasOwnProperty('photoProfilePublicId') &&
        !childData.hasOwnProperty('phoneNumber') &&
        !childData.hasOwnProperty('defaultDisplayPicturePublicId')
      ) {
        childData.enable = 0;
      }
    }

    childData.objectID = childSnapshot.key;
    objectsToIndex.push(childData);
  }));

  if (objectsToIndex.length > 0) {
    indexUserMetadata.saveObjects(objectsToIndex, function (error, content) {
      if (error) {
        throw error;
      }

      console.log('Firebase -> Algolia import done');
    });

  } else {
    console.log('No data imported');
  }
  process.exit(0);
}
