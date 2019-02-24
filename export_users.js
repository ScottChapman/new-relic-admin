const Users = require('./lib/users.js')
const config = require('config')
const createCsvStringify = require('csv-writer').createObjectCsvStringifier;
const _ = require('lodash')
const configs = config.get("configs");
var tmp = config.util.toObject(config);
console.log(JSON.stringify(tmp,null,2));
console.log(JSON.stringify(config,null,2));
console.dir(_.keys(config));
const logger = require('./lib/logger.js').getLogger();
const fs = require('fs')

const argv = require('yargs')
    .options({
        'src': {
            alias: "source",
            demandOption: true,
            describe: "envrionment to export",
            choices: config.configs,
            type: "string"
        },
        'out': {
            alias: "output",
            demandOption: true,
            coerce: (arg) => {
                return fs.openSync(arg, "w")
            },
            describe: "output CSV file",
            type: "string"
        }
    })
    .argv

const csvStringify = createCsvStringify({
    header: [
        {id: 'email', title: 'Email'},
        {id: 'name', title: 'Name'},
        {id: 'role', title: 'Base role'},
        {id: 'addon', title: 'Add-on roles'}
    ]
});

var users = new Users(argv.src);
users.list().then(async (users) => {
    for (var user of users) {
        user.name = user.first_name + " " + user.last_name
    }
    fs.writeSync(argv.out,csvStringify.getHeaderString().trim());
    fs.writeSync(argv.out,await csvStringify.stringifyRecords(users).trim())
    fs.closeSync(argv.out)
}).catch(err => {
    logger.error(err.message)
})