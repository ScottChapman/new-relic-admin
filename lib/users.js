const config = require('config')
const api = require('newrelic-api-client').api

module.exports = class Users {
    constructor(keys) {
        this.api = new api(keys);
        this.keys = keys;
    }

    getAccountId() {
        return this.keys.accountId;
    }

    async list() {
        return await this.api.usersList()
    }
}