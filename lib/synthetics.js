const config = require('config')
const logger = require('./logger.js').getLogger();

module.exports = class Synthetics {
    constructor(cfg) {
        this.synthetics = require('newrelic-api-client').synthetics
        this. accountId = config.get(cfg + '.accountId');
        this.config = cfg
    }

    getAccountId() {
        return this.accountId;
    }

    getMonitor(id) {
        return new Promise((resolve,reject) => {
        this.synthetics.getMonitor(id, this.config,(err,response,result) => {
            if (err)
                reject(err);
            else{
                resolve(result);
            }
        })
    }) 
    }
    
    getLocations() {
        return new Promise((resolve,reject) => {
        this.synthetics.getLocations(this.config,(err,response,result) => {
            if (err)
                reject(err);
            else{
                resolve(result);
            }
        })
    }) 
    }
    
    createMonitor(monitor) {
        return new Promise((resolve,reject) => {
        this.synthetics.createMonitor(monitor,this.config,(err,response,result) => {
            if (err)
                reject(err);
            else if (result.error)
                reject (result.error)
            else{
                resolve(response.statusCode === 201);
            }
        })
    }) 
    }
    
    updateMonitor(monitor) {
        return new Promise((resolve,reject) => {
        this.synthetics.updateMonitor(monitor,this.config,(err,response,result) => {
            if (err)
                reject(err);
            else if (result.error)
                reject (result.error)
            else{
                resolve(response.statusCode === 204);
            }
        })
    }) 
    }
    
    getSynthetics() {
        return new Promise((resolve,reject) => {
        var result = {
            monitors: []
        };
        this.synthetics.getAllMonitors(this.config,async (err,response,list) => {
            if (err)
                reject(err);
            else{
                for (var monitor of list.monitors) {
                    result.monitors.push(await this.getMonitor(monitor.id))
                }
                result.locations = await this.getLocations()
                resolve(result);
            }
        })
    }) 
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
              var resp = this.updateMonitor(obj)
            }
            else {
              try {
                var resp = this.createMonitor(obj);
                logger.info("Created new Monitor: " + src_monitor.name)
              }
              catch(err) {
                logger.warn("Failed to create Monitor: " + src_monitor.name)
                logger.warn.log(err.title);
              }
            }
          }
        }
      }
}