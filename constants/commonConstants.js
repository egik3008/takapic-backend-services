const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.dirname(require.main.filename) + '/.env' });

let takapicDomain = process.env.GOOGLE_SIGN_IN_REDIRECT;
if (!(takapicDomain && takapicDomain !== "")) 
takapicDomain = "https://takapic.com";

module.exports.BASE_REDIRECT_URL = (takapicDomain + '/sign-in?redirect=');