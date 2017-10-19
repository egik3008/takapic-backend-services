const express = require('express');
const json2csv = require('json2csv');
const basicAuth = require('basic-auth');
const firebaseAdmin = require('./commons/firebaseAdmin');

const auth = function (req, resp, next) {
  function unauthorized(resp) {
    resp.set('WWW-Authenticate', 'Basic realm=Authorization Required');
    return resp.send(401);
  }

  const user = basicAuth(req);
  if (!user || !user.name || !user.pass) {
    return unauthorized(resp);
  }

  if (user.name === 'takapic' && user.pass === '123') {
    return next();
  } else {
    return unauthorized(resp);
  }
};

const constructCsv = function (data) {
  var result = [];
  Object.keys(data).forEach(function (key) {
    result.push(data[key]);
  });
  return result;
};

const app = express();
const router = express.Router();

router.get('/', function (req, resp) {
  const db = firebaseAdmin.database();
  const ref = db.ref('promo');

  ref.once('value', function (snapshot) {
    const fields = ['city', 'destination', 'email', 'visitor_type'];
    const dataList = constructCsv(snapshot.val());

    const date = new Date();
    const month = date.getMonth() + 1;

    const filename = 'report_' + date.getFullYear() + '-' + month + '-' + date.getDate();
    const csv = json2csv({ data: dataList, fields: fields });

    resp.set('text/csv');
    resp.attachment(filename + '.csv');
    resp.send(csv);
  });
});

app.use('/report', auth, router);

const port = process.env.PORT || 8484;
app.listen(port);
console.log('Listen on port', port);
