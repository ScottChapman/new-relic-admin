const _ = require('lodash')
const logger = require('./logger.js').getLogger();
const alerts = require('newrelic-api-client').alerts
const Applications = require('./applications.js')
const Synthetics = require('./synthetics.js')
const Users = require('./users.js')
const {map,mapObjects} = require('./utils.js')

module.exports = class Alerts extends alerts {
    constructor(keys) {
        super(keys)
    }

    getAccountId() {
        return this.keys.accountId;
    }

    async getAlerts() {
        const apps = new Applications(this.keys)
        const synthetics = new Synthetics(this.keys)
        const users = new Users(this.keys)
        var response = {
            accountId: this.getAccountId(),
            policies: await this.policiesList(),
            applications: await apps.list(),
            synthetics: await synthetics.getSynthetics(),
            users: await users.list(),
            channels: await this.channelsList()
        }
        for (var policy of response.policies) {
            policy.conditions = await this.conditionsList(policy.id)
            policy.infrastructureConditions = await this.infrastructureConditionsList(policy.id)
            policy.syntheticConditions = await this.syntheticsConditionsList(policy.id);
            policy.NRQLConditions = await this.NRQLConditionsList(policy.id);
        }
        return response;
    }

    async createPolicies(source, dest) {
        var diff = _.differenceBy(source.policies,dest.policies,"name")
        for (var src_policy of diff) {
            var obj = _.pick(src_policy,["name","incident_preference"])
            dest.policies.push(await this.policiesCreate(obj))
            logger.info("created policy " + obj.name)
        }
    }
    
    async createChannels(source, dest) {
        var diff = _.differenceBy(source.channels,dest.channels,"name")
        for (var src_policy of diff) {
            if (src_policy.type !== "user") {
                var obj = _.pick(src_policy,["name","type","configuration"])
                try {
                    dest.channels.push(await this.channelsCreate(obj))
                    logger.info("created policy " + obj.name)
                }
                catch(err) {
                    logger.info("Failed to create channel for: %s, reason %s", obj.name, err.title)
                }
            }
        }
    }

    // Copy NRQL Conditions
    async createNRQLConditions(src,dest) {
        const dst_infra_cond_map = _.keyBy(dest.NRQLConditions,"name")
        for (var cond of src.NRQLConditions) {
            var obj = _.omit(cond,[
                "id",
                "created_at_epoch_mills",
                "updated_at_epoch_mills",
            ])
            obj.policy_id = dest.id;
            if (dst_infra_cond_map.hasOwnProperty(cond.name)) {
                obj.id = dst_infra_cond_map[cond.name].id;
                logger.info("Updating existing condition: %s", cond.name)
                var result = await this.NRQLConditionsUpdate(obj);
            }
            else {
                logger.info("Creating new condition: %s",cond.name)
                var result = await this.NRQLConditionsCreate(dest.id,_.omit(obj,["id"]));
            }
        }
    }

    // Copy Infrastructure Conditions
    async createInfrastructureConditions(src,dest) {
        const dst_infra_cond_map = _.keyBy(dest.infrastructureConditions,"name")
        for (var cond of src.infrastructureConditions) {
            var obj = _.omit(cond,[
                "id",
                "created_at_epoch_mills",
                "updated_at_epoch_mills",
            ])
            obj.policy_id = dest.id;
            if (dst_infra_cond_map.hasOwnProperty(cond.name)) {
                logger.info("Updating existing infrastructure condition: %s",obj.name)
                var result = await this.infrastructureConditionsUpdate(dst_infra_cond_map[cond.name].id,obj);
            }
            else {
                logger.info("Creating new infrastructure condition: %s", obj.name)
                var result = await this.infrastructureConditionsCreate(obj);
            }
        }
    }

    // copy conditions
    async createConditions(src,dest,app_map,src_apps) {
        const dst_policy_cond_map = _.keyBy(dest.conditions,"name")
        for (var cond of src.conditions) {
            var obj = _.pick(cond,[
                "name",
                "type",
                "enabled",
                "entities",
                "metric",
                "gc_metric",
                "condition_scope",
                "violation_close_timer",
                "terms",
                "user_defined"
            ])
            obj.entities = [];
            for (var ent of cond.entities) {
                const dst_app = app_map[ent]
                if (dst_app) {
                    logger.warn("Mapping " + ent + " -> " +dst_app)
                    obj.entities.push(dst_app)
                }
                else
                    logger.info("Skipping missing app: " + src_apps[ent].name)
                }
                if (dst_policy_cond_map.hasOwnProperty(cond.name)) {
                    logger.info("Updating existing condition: %s",obj.name)
                    obj.id = dst_policy_cond_map[cond.name].id;
                    var result = await this.conditionsUpdate(obj);
                }
                else {
                    logger.info("Creating new condition: %s",obj.name)
                    var result = await this.conditionsCreate(dest.id,obj);
                }
            }
        }
    
    async createSynthetics(source, dest) {
        var synth = new Synthetics(this.keys);
        var resp = await synth.createSynthetics(source,dest);
        console.log("done")
    }

    async assignChannels(from,to) {
        var policy_map = map(to.policies,from.policies,"id","name")
        var channel_map = map(to.channels,from.channels,"id","name")
        var user_map = map(to.users,from.users,"id","email")
        var dst_user_channels = _.keyBy(_.filter(to.channels,"configuration.user_id"),"configuration.user_id")
        var dst_policies = {};
        for (var src_channel of from.channels) {
            if (src_channel.type !== "user") {
                var dst_channel_id = channel_map[src_channel.id];
                if (dst_channel_id) {
                    for (var src_policy_id of src_channel.links.policy_ids) {
                        const dst_policy_id = policy_map[src_policy_id]
                        if (!dst_policies.hasOwnProperty(dst_policy_id))
                            dst_policies[dst_policy_id] = []
                        logger.debug("Adding channel #" + dst_channel_id + " to policy #" + dst_policy_id)
                        dst_policies[dst_policy_id].push(dst_channel_id)
                    }
                }
                else {
                    logger.info("Unable to map channel: " + src_channel.name)
                }
            }
            else {
                var to_user = user_map[src_channel.configuration.user_id];
                var dst_channel = dst_user_channels[to_user]
                for (src_policy_id of src_channel.links.policy_ids) {
                    const dst_policy_id = policy_map[src_policy_id]
                    if (!dst_policies.hasOwnProperty(dst_policy_id))
                        dst_policies[dst_policy_id] = []
                    logger.info("Adding user channel #" + dst_channel.id + " to policy #" + dst_policy_id)
                    dst_policies[dst_policy_id].push(dst_channel.id)
                }
            }
        }
        for (var policy_id of _.keys(dst_policies)) {
            try {
                var resp = await this.policyChannelsUpdate(policy_id,dst_policies[policy_id]);
                logger.info("For Policy #" + policy_id + " adding channels: " + _.join(dst_policies[policy_id]))
            }
            catch(err) {
                logger.info("Failed to add channels to: " + dst_policies[policy_id].name)
                logger.error(err.title);
            }
        }
    }

    async assignMonitors(from,to) {
        var policy_map = mapObjects(to.policies,from.policies,"id","name")
        var monitor_map = mapObjects(to.synthetics.monitors,from.synthetics.monitors,"id","name")
        for (var src_policy of from.policies) {
            const dst_policy = policy_map[src_policy.id]
            const condition_map = mapObjects(dst_policy.syntheticConditions, src_policy.syntheticConditions,"id","name")
            for (var src_synthetic of src_policy.syntheticConditions) {
                const dst_monitor = monitor_map[src_synthetic.monitor_id]
                var obj = _.omit(src_synthetic,"id");
                obj.monitor_id = dst_monitor.id;
                if (!condition_map[src_synthetic.id]) {
                    logger.info("Adding Monitor " + dst_monitor.name + " to policy " + dst_policy.name)
                    var resp = await this.syntheticsConditionsCreate(dst_policy.id, obj)
                }
                else {
                    logger.info("Monitor " + dst_monitor.name + " already assigned to policy " + dst_policy.name)
                }
            }
        }
    }
}