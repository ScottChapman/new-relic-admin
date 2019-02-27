module.exports = class Applications {
    constructor(keys) {
        const Api = require('newrelic-api-client').api
        this.api = new Api(keys);
        this.keys = keys;
    }

    getAccountId() {
        return this.keys.accountId;
    }

    async list() {
        return this.api.appsList()
    }
}