const _ = require('lodash')
const logger = require('./logger.js').getLogger();
const dashboards = require('newrelic-api-client').dashboards

module.exports = class Dashboards extends dashboards {
    constructor(keys) {
        super(keys);
    }

    getAccountId() {
        return this.keys.accountId;
    }

    async getDashboards() {
        var result = [];
        var list = await this.list();
        for (var dash of list) {
            result.push(await this.getDashboard(dash.id))
        }
        return result;
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
