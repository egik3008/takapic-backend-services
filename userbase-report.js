const path = require('path')
const dotenv = require('dotenv')
const firebaseAdmin = require('./commons/firebaseAdmin')
const axios = require('axios')

dotenv.config({ path: path.dirname(require.main.filename) + '/.env' })

var stringInformation = ''
const db = firebaseAdmin.database()

db
  .ref('user_metadata')
  .once('value')
  .then(function (snapshot) {
    const vals = snapshot.val()
    const data = {
      photographers: {
        'have-no-photos-portfolio': [],
        'stucked-at-very-first-login': [],
        'never-login': []
      },
      travellers: []
    }

    var countP = 0
    var countT = 0

    Object.keys(vals).map(function (key) {
      const item = vals[key]
      if (item.userType === 'photographer') {
        if (!item.hasOwnProperty('defaultDisplayPicturePublicId')) {
          data.photographers['have-no-photos-portfolio'].push({
            uid: key,
            displayName: item.displayName,
            email: item.email,
            created: item.created
          })
        } else if (!item.hasOwnProperty('photoProfilePublicId') && !item.firstLogin) {
          data.photographers['stucked-at-very-first-login'].push({
            uid: key,
            displayName: item.displayName,
            email: item.email,
            created: item.created
          })
        } else if (item.firstLogin) {
          data.photographers['never-login'].push({
            uid: key,
            displayName: item.displayName,
            email: item.email,
            created: item.created
          })
        }
        countP++
      } else if (item.userType === 'traveller') {
        data.travellers.push({
          uid: key,
          displayName: item.displayName,
          email: item.email,
          created: item.created
        })
        countT++
      }
    })

    data.photographers['total-photographers'] = countP
    data.photographers['total-travellers'] = countT

    stringInformation = '\n*Total photographers: ' + data.photographers['total-photographers'] + '*\n'
    stringInformation += '======================================================================================\n'

    Object.keys(data.photographers).map(function (keykey) {
      if (keykey !== 'total-photographers' && keykey !== 'total-travellers') {
        const itemInfo = data.photographers[keykey]
        stringInformation += '*' + keykey + ' - Total: ' + itemInfo.length + '*\n'
        stringInformation += '======================================================================================\n'
        itemInfo.map(function (item) {
          stringInformation += 'UID = ' + item.uid + '\n'
          stringInformation += 'Name = ' + item.displayName + '\n'
          stringInformation += 'Email = ' + item.email + '\n'
          stringInformation += 'Created = ' + new Date(item.created).toString() + '\n'
          stringInformation += '---------------------------------------\n'
        })
      }
    })

    stringInformation += '\n\n*Travellers - Total: ' + data.photographers['total-travellers'] + '*\n'
    stringInformation += '======================================================================================\n'

    data.travellers.map(function (itemT) {
      stringInformation += 'UID = ' + itemT.uid + '\n'
      stringInformation += 'Name = ' + itemT.displayName + '\n'
      stringInformation += 'Email = ' + itemT.email + '\n'
      stringInformation += 'Created = ' + new Date(itemT.created).toString() + '\n'
      stringInformation += '---------------------------------------\n'
    })

    axios
      .post('https://hooks.slack.com/services/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', {
        username: 'userbase-status-notification',
        text: stringInformation,
        icon_emoji: ':information_desk_person:'
      })
      .then(function (response) {
        console.log(response.data)
        process.exit(0)
      })
      .catch(function (error) {
        console.log(error)
      })
  })
  .catch(function (error) {
    console.log(error)
  })
