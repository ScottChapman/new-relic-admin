const config = require('config')
const _ = require('lodash')
const logger = require('./logger.js').getLogger();

module.exports = class Alerts {
    constructor(cfg) {
        this.alerts = require('newrelic-api-client').alerts
        this. accountId = config.get(cfg + '.accountId');
        this.config = cfg
    }

    getAccountId() {
        return this.accountId;
    }

    getConfig() {
        return this.config;
    }

    policies() {
        return new Promise((resolve,reject) => {
        this.alerts.policies.list(null,this.config,(err,response,list) => {
            if (err)
                reject(err);
            else
                resolve(list.policies);
        })
    }) 
    }
    
    channels() {
        return new Promise((resolve,reject) => {
        this.alerts.channels.list(this.config,(err,response,list) => {
            if (err)
                reject(err);
            else if (list.error)
                reject (list.error)
            else {
                for (var channel of list.channels) {
                    if (channel.type === "webhook" && channel.configuration.headers === "") {
                        channel.configuration.headers = {};
                    }
                }
                resolve(list.channels);
            }
        })
    }) 
    }

    policyChannelUpdate(policyId,channels) {
        return new Promise((resolve,reject) => {
        this.alerts.policyChannels.update(policyId,_.join(channels),this.config,(err,response,list) => {
            if (err)
                reject(err);
            else if (list.error)
                reject (list.error)
            else
                resolve(list.policy);
        })
    }) 
    }

    createChannel(channel) {
        return new Promise((resolve,reject) => {
        this.alerts.channels.create(this.config,{channel: channel},(err,response,list) => {
            if (err)
                reject(err);
            else if (list.error)
                reject (list.error)
            else
                resolve(list.channels[0]);
        })
    }) 
    }

    conditions(id) {
        return new Promise((resolve,reject) => {
        this.alerts.conditions.list(id,this.config,(err,response,list) => {
            if (err)
                reject(err);
            else
                resolve(list.conditions);
        })
    }) 
    }

    infrastructureConditions(id) {
        return new Promise((resolve,reject) => {
        this.alerts.infrastructureConditions.list(id,this.config,(err,response,list) => {
            if (err)
                reject(err);
            else
                resolve(list.data);
        })
    }) 
    }

    createInfrastructureCondition(cond) {
        return new Promise((resolve,reject) => {
        this.alerts.infrastructureConditions.create(this.config, {data: cond},(err,response,result) => {
            if (err)
                reject(err);
            else
                resolve(result.data);
        })
    }) 
    }

    updateInfrastructureCondition(id,cond) {
        return new Promise((resolve,reject) => {
        this.alerts.infrastructureConditions.update(this.config, id, {data: cond},(err,response,result) => {
            if (err)
                reject(err);
            else
                resolve(result.data);
        })
    }) 
    }


    syntheticsConditions(id) {
        return new Promise((resolve,reject) => {
        this.alerts.syntheticsConditions.list(id,this.config,(err,response,list) => {
            if (err)
                reject(err);
            else
                resolve(list.synthetics_conditions);
        })
    }) 
    }

    createSyntheticsCondition(id,cond) {
        return new Promise((resolve,reject) => {
        this.alerts.syntheticsConditions.create(this.config,id, {synthetics_condition: cond}, (err,response,list) => {
            if (err)
                reject(err);
            else
                resolve(list.synthetics_condition);
        })
    }) 
    }

    NRQLConditions(id) {
        return new Promise((resolve,reject) => {
        this.alerts.NRQLConditions.list(id,this.config,(err,response,list) => {
            if (err)
                reject(err);
            else
                resolve(list.nrql_conditions);
        })
    }) 
    }

    createNRQLCondition(id, cond) {
        return new Promise((resolve,reject) => {
        this.alerts.NRQLConditions.create(this.config, id, {nrql_condition: cond},(err,response,result) => {
            if (err)
                reject(err);
            else
                resolve(result.nrql_condition);
        })
    }) 
    }

    updateNRQLCondition(cond) {
        return new Promise((resolve,reject) => {
        this.alerts.NRQLConditions.update(this.config, {nrql_condition: cond},(err,response,result) => {
            if (err)
                reject(err);
            else
                resolve(result.nrql_condition);
        })
    }) 
    }


    createPolicy(policy) {
        return new Promise((resolve,reject) => {
        this.alerts.policies.create(this.config, {policy: policy},(err,response,result) => {
            if (err)
                reject(err);
            else
                resolve(result.policy);
        })
    }) 
    }

    createCondition(id,cond) {
        return new Promise((resolve,reject) => {
        this.alerts.conditions.create(this.config, id, {condition: cond},(err,response,result) => {
            if (err)
                reject(err);
            else
                resolve(result.condition);
        })
    }) 
    }

    updateCondition(id,cond) {
        return new Promise((resolve,reject) => {
        this.alerts.conditions.update(this.config, id, {condition: cond},(err,response,result) => {
            if (err)
                reject(err);
            else
                resolve(result.condition);
        })
    }) 
    }

    async getAlerts() {
        const Applications = require('./applications.js')
        const apps = new Applications(this.config)
        const Synthetics = require('./synthetics.js')
        const synthetics = new Synthetics(this.config)
        const Users = require('./users.js')
        const users = new Users(this.config)
        var response = {
            accountId: this.accountId,
            policies: await this.policies(),
            applications: await apps.list(),
            synthetics: await synthetics.getSynthetics(),
            users: await users.list(),
            channels: await this.channels()
        }
        for (var policy of response.policies) {
            logger.info("Getting conditions for: " + policy.name + " (" + policy.id + ")")
            policy.conditions = await this.conditions(policy.id)
            logger.info("Getting infrastructure conditions for: " + policy.name + " (" + policy.id + ")")
            policy.infrastructureConditions = await this.infrastructureConditions(policy.id)
            policy.syntheticConditions = await this.syntheticsConditions(policy.id);
            policy.NRQLConditions = await this.NRQLConditions(policy.id);
        }
        return response;
    }

    async createPolicies(source, dest) {
        var diff = _.differenceBy(source.policies,dest.policies,"name")
        for (var src_policy of diff) {
            var obj = _.pick(src_policy,["name","incident_preference"])
            dest.policies.push(await this.createPolicy(obj))
            logger.info("created policy " + obj.name)
        }
    }
    
    async createChannels(source, dest) {
        var diff = _.differenceBy(source.channels,dest.channels,"name")
        for (var src_policy of diff) {
            if (src_policy.type !== "user") {
                // have to put in fake config for pagerduty channels
                if (src_policy.type === "pagerduty") {
                    logger.info("Need to add service key for PagerDuty channel: " + src_policy.name)
                    src_policy.configuration = {
                        "service_key": "my_key"
                    }
                }
                var obj = _.pick(src_policy,["name","type","configuration"])
                try {
                    dest.channels.push(await this.createChannel(obj))
                    logger.info("created policy " + obj.name)
                }
                catch(err) {
                    logger.info("Failed to create channel for: %s, reason %s", obj.name, err.title)
                }
            }
        }
    }

    // Copy NRQL Conditions
    async creatNRQLConditions(src,dest) {
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
                logger.info("NRQL Condition exists")
                var result = await this.updateNRQLCondition(obj);
            }
            else {
                logger.info("New NRQL Condition")
                var result = await this.createNRQLCondition(dest.id,_.omit(obj,["id"]));
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
                logger.info("Infra Condition exists")
                var result = await this.updateInfrastructureCondition(dst_infra_cond_map[cond.name].id,obj);
            }
            else {
                logger.info("New Infra Condition")
                var result = await this.createInfrastructureCondition(obj);
            }
        }
    }

    // copy conditions
    async createConditions(src,dest) {
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
                    logger.info("Mapping " + ent + " -> " +dst_app)
                    obj.entities.push(dst_app)
                }
                else
                    logger.info("Skipping missing app: " + ent)
                }
                if (dst_policy_cond_map.hasOwnProperty(cond.name)) {
                    logger.info("Condition exists")
                    var result = await this.updateCondition(dst_policy_cond_map[cond.name].id,obj);
                }
                else {
                    logger.info("New Condition")
                    var result = await this.createCondition(dest.id,obj);
                }
            }
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
                    for (src_policy_id of src_channel.links.policy_ids) {
                        const dst_policy_id = policy_map[src_policy_id]
                        if (!dst_policies.hasOwnProperty(dst_policy_id))
                            dst_policies[dst_policy_id] = []
                        logger.info("Adding channel #" + dst_channel_id + " to policy #" + dst_policy_id)
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
                var resp = await this.policyChannelUpdate(policy_id,dst_policies[policy_id]);
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
                    logger.info("Adding Monitor #" + dst_monitor.id + " to policy #" + dst_policy.id)
                    var resp = await this.createSyntheticsCondition(dst_policy.id, obj)
                }
                else {
                    logger.info("Updating Monitor #" + dst_monitor.id + " to policy #" + dst_policy.id)
                }
            }
        }
    }
}