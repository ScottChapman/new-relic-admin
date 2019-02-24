const Dashboards = require('./lib/dashboards.js')
const config = require('config')
const _ = require('lodash')
const logger = require('./lib/logger.js').getLogger();
const fs = require('fs')

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

var dashboards = new Dashboards(argv.src)
dashboards.getDashboards().then(result => {
    fs.writeSync(argv.out,(JSON.stringify({
        accountId: dashboards.getAccountId(),
        dashboards: result
    },null,2)))
}).catch(err => {
    logger.error(err.message)
})