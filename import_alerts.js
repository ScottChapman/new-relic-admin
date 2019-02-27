var fs = require('fs')
const _ = require('lodash')
const config = require('config')
const Alerts = require('./lib/alerts.js')
const {map} = require('./lib/utils.js')
const logger = require('./lib/logger.js').getLogger();
const optional_flags = {
    'cpc': {
        alias: "create_policy_conditions",
        demandOption: false,
        describe: "Create/Update infrastructure conditions for Policies",
        type: "boolean"
    },
    'cic': {
        alias: "create_infrastructure_conditions",
        demandOption: false,
        describe: "Create/Update infrastructure conditions for Policies",
        type: "boolean"
    },
    'cnc': {
        alias: "create_NRQL_conditions",
        demandOption: false,
        describe: "Create/Update NRQL conditions for Policies",
        type: "boolean"
    },
    'am': {
        alias: "assign_monitors",
        demandOption: false,
        describe: "Assign Monitors to Policies",
        type: "boolean"
    },
    'ac': {
        alias: "assign_channels",
        demandOption: false,
        describe: "Assign Channels to Policies",
        type: "boolean"
    },
    'cs': {
        alias: "create_synthetics",
        demandOption: false,
        describe: "Create/update synthetics",
        type: "boolean"
    },
    'cp': {
        alias: "create_policies",
        demandOption: false,
        describe: "Create an missing policies",
        type: "boolean"
    },
    'cc': {
        alias: "create_channels",
        demandOption: false,
        describe: "Create an missing channels",
        type: "boolean"
    }
}

const other_flags = {
    'a': {
        alias: "all",
        demandOption: false,
        describe: "All import operations",
        conflicts: _.keys(optional_flags),
        type: "boolean"
    },
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
}
const argv = require('yargs')
    .options( Object.assign(optional_flags, other_flags))
    .strict(true)
    .argv

async function createAlerts(source,alerts) {
    var dest = await alerts.getAlerts()
    const app_map = map(dest.applications,source.applications,"id","name")
    const src_apps = _.keyBy(source.applications,"id")
    var src_policy_map = _.keyBy(source.policies,"name")

    var obj;

    if (argv.all || argv.create_policies) {
        logger.info("Creating Policies")
        await alerts.createPolicies(source,dest);
    }

    if (argv.all || argv.create_channels) {
        logger.info("Creating Channels")
        await alerts.createChannels(source,dest);
    }

    if (argv.all || argv.create_synthetics) {
        logger.info("Creating Synthetics")
        dest.applications = await alerts.createSynthetics(source,dest);
    }

    if (argv.all || argv.assign_channels) {
        logger.info("Assigning Channels")
        await alerts.assignChannels(source,dest);
    }

    if (argv.all || argv.assign_monitors) {
        logger.info("Assigning Monitors")
        await alerts.assignMonitors(source,dest);
    }

    if ( argv.all || 
        argv.create_policy_conditions ||
        argv.create_NRQL_conditions ||
        argv.create_infrastructure_conditions){
        for (var policy of dest.policies) {
            logger.info("Working on Policy: " + policy.name);
            var src_policy = src_policy_map[policy.name]
        
            if (argv.all || argv.create_NRQL_conditions) {
                logger.info("Checking NRQL Conditions")
                await alerts.createNRQLConditions(src_policy,policy);
            }
    
            if (argv.all || argv.create_infrastructure_conditions) {
                logger.info("Checking Infrastructure Conditions")
                await alerts.createInfrastructureConditions(src_policy,policy);
            }
    
            if (argv.all || argv.create_policy_conditions) {
                logger.info("Checking Policy Conditions")
                await alerts.createConditions(src_policy,policy,app_map, src_apps);
            }
        }
    }
}

const target = new Alerts(config.get(argv.target));
createAlerts(argv.source,target).then(() => {
    logger.info("Done!")
}).catch(err => {
    logger.error(err.message)
})