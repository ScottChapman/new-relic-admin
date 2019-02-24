const config = require('config')

module.exports = class Applications {
    constructor(cfg) {
        this.api = require('newrelic-api-client').api
        this. accountId = config.get(cfg + '.accountId');
        this.config = cfg
    }

    getAccountId() {
        return this.accountId;
    }

    list() {
        return new Promise((resolve,reject) => {
        this.api.apps.list(this.config,(err,response,list) => {
            if (err)
                reject(err);
            else
                resolve(list.applications);
        })
    }) 
    }
}