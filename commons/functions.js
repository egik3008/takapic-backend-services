const axios = require('axios')
const path = require('path')
const dotenv = require('dotenv')
const pug = require('pug')
const sgMail = require('@sendgrid/mail')

dotenv.config({ path: path.dirname(require.main.filename) + '/.env' });

module.exports.notifyToSlack = function (username, text, icon = ':information_desk_person:') {
    return axios
    .post('https://hooks.slack.com/services/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', {
      username: username,
      text: text,
      icon_emoji: icon
    });
}

module.exports.sendEmail = function(
    receiverName, 
    receiverEmail, 
    emailSubject, 
    emailContent,
    fromName = 'Takapic Support',
    fromEmail = 'support@takapic.com'
) {
    const messageData = {
        receiverName: receiverName,
        receiverEmail: receiverEmail,
        emailSubject: emailSubject,
        emailContent: emailContent
      };

      const rootPath = path.dirname(require.main.filename);
      const ctpl = pug.compileFile(rootPath + '/email-templates/notifications.pug')
      const message = {
        to: {
          name: messageData.receiverName,
          email: messageData.receiverEmail
        },
        from: {
          name: fromName,
          email: fromEmail
        },
        subject: messageData.emailSubject,
        html: ctpl({ EMAIL_TITLE: 'Notification', CUSTOMER_NAME: messageData.receiverName, EMAIL_CONTENT: messageData.emailContent })
      }

      sgMail.send(message);
}