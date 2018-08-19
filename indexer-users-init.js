const dotenv = require('dotenv')
const firebaseAdmin = require('./commons/firebaseAdmin')
const algoliasearch = require('algoliasearch')

dotenv.load()

const database = firebaseAdmin.database()
const algolia = algoliasearch(process.env.ALGOLIA_APP_ID, process.env.ALGOLIA_API_KEY)
const indexUsers = algolia.initIndex(process.env.ALGOLIA_INDEX_USERS)
const userMetadataRef = database.ref('user_metadata')

userMetadataRef.once('value', initialImport)

function initialImport (dataSnapshot) {
  const objectsToIndex = []

  dataSnapshot.forEach(function (childSnapshot) {
    const firebaseObject = childSnapshot.val()
    firebaseObject.objectID = childSnapshot.key
    objectsToIndex.push(firebaseObject)
  })

  if (objectsToIndex.length > 0) {
    indexUsers.saveObjects(objectsToIndex, function (error, content) {
      if (error) {
        throw error
      }

      console.log('Firebase -> Algolia import all users (travellers and photographers) done')
    })
  } else {
    console.log('No data imported')
  }
}
