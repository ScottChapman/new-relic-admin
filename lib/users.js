const config = require('config')

module.exports = class Users {
    constructor(cfg) {
        this.users = require('newrelic-api-client').api.users
        this. accountId = config.get(cfg + '.accountId');
        this.config = cfg
    }

    getAccountId() {
        return this.accountId;
    }

    list() {
        return new Promise((resolve,reject) => {
        this.users.list(null,this.config,(err,response,list) => {
            if (err)
                reject(err);
            else
                resolve(list.users);
        })
    })
    }
    
}