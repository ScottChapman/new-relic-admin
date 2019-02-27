const Alerts = require('./lib/alerts.js')
const config = require('config')
const _ = require('lodash')
const fs = require('fs')
const logger = require('./lib/logger').getLogger();

const argv = require('yargs')
    .options({
        'src': {
            alias: "source",
            demandOption: true,
            describe: "envrionment to export",
            choices: _.keys(config),
            type: "string"
        },
        'out': {
            alias: "output",
            demandOption: true,
            coerce: (arg) => {
                return fs.openSync(arg, "w")
            },
            describe: "output JSON file",
            type: "string"
        }
    })
    .argv

var alerts = new Alerts(config.get(argv.src))
alerts.getAlerts().then(result => {
    fs.writeSync(argv.out,(JSON.stringify(result,null,2)))
}).catch(err => {
    logger.error(err.message)
})