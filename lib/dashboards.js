const config = require('config')
const _ = require('lodash')
const logger = require('./logger.js').getLogger();

module.exports = class Dashboards {
    constructor(cfg) {
        this.dashboards = require('newrelic-api-client').dashboards
        this. accountId = config.get(cfg + '.accountId');
        this.config = cfg
    }

    getAccountId() {
        return this.accountId;
    }

    getDashboard(id) {
        return new Promise((resolve,reject) => {
        this.dashboards.getOne(id, this.config,(err,response,result) => {
            if (err)
                reject(err);
            else{
                resolve(result.dashboard);
            }
        })
    }) 
    }
    
    updateAccountId(body,fromId, toId) {
        return this.dashboards.updateAccountId(body,fromId,toId);
    }

    createDashboard(board) {
        return new Promise((resolve,reject) => {
        this.dashboards.create({dashboard:board}, this.config,(err,response,result) => {
            if (err)
                reject(err);
            else{
                resolve(result.dashboard);
            }
        })
    }) 
    }

    updateDashboard(id,board) {
        return new Promise((resolve,reject) => {
        this.dashboards.update(id, {dashboard:board}, this.config,(err,response,result) => {
            if (err)
                reject(err);
            else{
                resolve(result.dashboard);
            }
        })
    }) 
    }

    getDashboards() {
        return new Promise((resolve,reject) => {
        var result = [];
        this.dashboards.list(this.config,async (err,response,list) => {
            if (err)
                reject(err);
            else{
                for (var dash of list.dashboards) {
                    result.push(await this.getDashboard(dash.id))
                }
                resolve(result);
            }
        })
    }) 
    }

    async createDashboards(source) {
        var dest = await this.getDashboards()
        const dest_boards = _.keyBy(dest,"title")
        for (var src_dashboard of source.dashboards) {
            let dashboard = _.pick(src_dashboard,[
                "title",
                "description",
                "icon",
                "visibility",
                "editable",
                "metadata",
                "owner_email"
            ])
            dashboard.widgets = [];
            for (var src_widget of src_dashboard.widgets) {
                let widget = _.omit(src_widget,[
                    "widget_id",
                    "account_id"
                ]) 
                dashboard.widgets.push(widget);
            }
            if (dest_boards.hasOwnProperty(src_dashboard.title)) {
                var new_dash = await this.updateDashboard(
                    dest_boards[src_dashboard.title].id,dashboard)
                logger.info("updated dashboard " + dashboard.title)
            }
                var new_dash = await this.createDashboard(dashboard)
                logger.info("created dashboard " + dashboard.title)
        }
    }
}
