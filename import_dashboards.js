var fs = require('fs')
const _ = require('lodash')
const config = require('config')
const configs = config.get("configs");
const Dashboards = require('./lib/dashboards.js')
const {map} = require('./lib/utils.js')

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
            choices: config.configs,
            type: "string"
        }
    })
    .argv

const dashboards = new Dashboards(argv.target);
dashboards.createDashboards(argv.source).then(() => {
    console.log("Done!")
}).catch(err => {
    console.dir(err)
})