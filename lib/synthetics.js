const logger = require('./logger.js').getLogger();
const _ = require('lodash')
const synthetics = require('newrelic-api-client').synthetics

module.exports = class Synthetics extends synthetics {
    constructor(keys) {
        super(keys)
    }

    getAccountId() {
        return this.keys.accountId;
    }

    async getSynthetics() {
        var result = {
            monitors: []
        };
        var list = await this.getAllMonitors();
        for (var monitor of list.monitors) {
            result.monitors.push(await this.getMonitor(monitor.id))
        }
        result.locations = await this.getLocations()
        return (result);
    }

    async createSynthetics(source, dest) {
        if (_.has(source,"synthetics.monitors") && source.synthetics.monitors.length > 0) {
          if (!dest.synthetics.monitors)
            dest.synthetics.monitors = [];
          var dst_monitor_map = _.keyBy(dest.synthetics.monitors,"name")
          for (var src_monitor of source.synthetics.monitors) {
            var obj = _.omit(src_monitor, [
              "id",
              "modifiedAt",
              "userId",
              "createdAt"
            ])
            if (dst_monitor_map.hasOwnProperty(src_monitor.name)) {
              logger.info("Update existing Monitor: " + src_monitor.name)
              obj.id = dst_monitor_map[src_monitor.name].id
              var resp = await this.updateMonitor(obj)
              return resp;
            }
            else {
              try {
                var resp = await this.createMonitor(obj);
                logger.info("Created new Monitor: " + src_monitor.name)
              }
              catch(err) {
                logger.warn("Failed to create Monitor: " + src_monitor.name)
                logger.warn.log(err.title);
              }
            }
          }
        }
        return this.getSynthetics();
      }
}