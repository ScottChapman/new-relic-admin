var fs = require('fs')
const _ = require('lodash')
const config = require('config')
const Dashboards = require('./lib/dashboards.js')

const argv = require('yargs')
    .options({
        'src': {
            alias: "source",
            demandOption: true,
            describe: "dashboard file to import",
            coerce: (arg) => {
                return JSON.parse(fs.readFileSync(arg));
            },
            type: "string"
        },
        't': {
            alias: "target",
            demandOption: true,
            describe: "envrionment to import to",
            choices: _.keys(config),
            type: "string"
        }
    })
    .argv

const dashboards = new Dashboards(config.get(argv.target));
dashboards.createDashboards(argv.source).then(() => {
    console.log("Done!")
}).catch(err => {
    console.dir(err)
})