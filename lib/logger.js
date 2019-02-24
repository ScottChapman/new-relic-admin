const log4js = require('log4js');
log4js.configure(__dirname + '/../config/logger.json');
module.exports = log4js;