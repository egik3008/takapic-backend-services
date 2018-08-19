const dotenv = require('dotenv')
const firebaseAdmin = require('./commons/firebaseAdmin')
const algoliasearch = require('algoliasearch')

dotenv.load()

const database = firebaseAdmin.database()
const algolia = algoliasearch(process.env.ALGOLIA_APP_ID, process.env.ALGOLIA_API_KEY)
const indexPhotographers = algolia.initIndex(process.env.ALGOLIA_INDEX_PHOTOGRAPHERS)
const userMetadataRef = database.ref('user_metadata')

userMetadataRef.once('value', initialImport)

function initialImport (dataSnapshot) {
  const objectsToIndex = []

  dataSnapshot.forEach(function (childSnapshot) {
    const firebaseObject = childSnapshot.val()

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
      firebaseObject.objectID = childSnapshot.key
      objectsToIndex.push(firebaseObject)
    }
  })

  if (objectsToIndex.length > 0) {
    indexPhotographers.saveObjects(objectsToIndex, function (error, content) {
      if (error) {
        throw error
      }

      console.log('Firebase -> Algolia import all valid photographers done')
    })
  } else {
    console.log('No data imported')
  }
}
