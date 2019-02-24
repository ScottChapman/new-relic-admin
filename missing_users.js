const Users = require('./lib/users.js')
const config = require('config')
const createCsvStringify = require('csv-writer').createObjectCsvStringifier;
const csvParser = require('csv-parse/lib/sync')
const fs = require('fs')
const _ = require('lodash')
const logger = require('./lib/logger.js')

const argv = require('yargs')
    .options({
        'out': {
            alias: "output",
            demandOption: true,
            describe: "output file",
            type: "string"
        },
        'src': {
            alias: "source",
            demandOption: true,
            describe: "user CSV file to import",
            coerce: (arg) => {
                return readCSV(arg)
            },
            type: "string"
        },
        't': {
            alias: "target",
            demandOption: true,
            describe: "envrionment to import to",
            choices: config.configs,
            type: "string"
        }
    })
    .argv

function readCSV(file) {
    var data = fs.readFileSync(file);
    const results = csvParser(data,{
        columns: true,
        skip_empty_lines: true
    })
    return results;
}

const csvStringify = createCsvStringify({
    header: [
        {
            id: 'Email',
            title: 'Email'
        },
        {
            id: 'Name',
            title: 'Name'
        },
        {
            id: 'Base role',
            title: 'Base role'
        },
        {
            id: 'Add-on roles',
            title: 'Add-on roles'
        }
    ]
});

var users = new Users(argv.target);
users.list().then(async (list) => {
    list = _.keyBy(list,"email");
    var result = [];
    for (var user of argv.source) {
        if (!list.hasOwnProperty(user.Email)) {
            logger.info("New User: " + user.Email)
            result.push(user);
        }
        else {
            logger.info("Skipping existing User: " + user.Email)
        }
    }
    if (result.length > 0) {
        fs.writeFileSync(argv.out, csvStringify.getHeaderString().trim(), {flag: "w"})
        fs.writeFileSync(argv.out, await csvStringify.stringifyRecords(result).trim(), {flag: "a"}) 
    }
    else {
        console.log("No missing users")
    }
}).catch(err => {
    console.dir(err)
})