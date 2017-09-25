const winston = require('winston');
const moment = require('moment');
const path = require('path');

const logger = new winston.Logger({
  level: 'debug',
  transports: [
    new (winston.transports.File)({
      filename: path.resolve('./logs/api-services.log'),
      json: false,
      timestamp: function () {
        return moment().format('dddd, MMMM Do YYYY, HH:mm:ss')
      },
      formatter: function (options) {
        return options.timestamp() + '\t' + options.level.toUpperCase() + '\t' + (options.message ? options.message : '') +
          (options.meta && Object.keys(options.meta).length ? '\t' + JSON.stringify(options.meta) : '' );
      }
    })
  ]
});

module.exports = logger;
