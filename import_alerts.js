var fs = require('fs')
const _ = require('lodash')
const config = require('config')
const Alerts = require('./lib/alerts.js')
const {map} = require('./lib/utils.js')
const logger = require('./lib/logger.js')

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

async function createAlerts(source,alerts) {
    var dest = await alerts.getAlerts()
    const app_map = map(dest.applications,source.applications,"id","name")
    var src_policy_map = _.keyBy(source.policies,"name")

    // await alerts.createPolicies(source,dest);
    // await alerts.createChannels(source,dest);
    // await alerts.createSynthetics(source,dest,new Synthetics(alerts.getConfig()));
    // await alerts.assignChannels(source,dest);
    // await alerts.assignMonitors(source,dest);
    for (var policy of dest.policies) {
        logger.info("Working on Policy: " + policy.name);
        var src_policy = src_policy_map[policy.name]
    
        // await alerts.createNRQLConditions(src_policy,policy);
        // await alerts.createInfrastructureConditions(src_policy,policy);
        // await alerts.createConditions(src_policy,policy);
    }
}

const target = new Alerts(argv.target);
createAlerts(argv.source,target).then(() => {
    logger.info("Done!")
}).catch(err => {
    logger.error(err.message)
})