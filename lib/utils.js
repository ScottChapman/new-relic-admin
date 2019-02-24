const _ = require('lodash')

// Given two arrays of objects, will provide a mapping of `key` values
// dst -> src indexed by `field`
module.exports.map = function (src,dst,field,key) {
    var result = {}
    const lookup = _.keyBy(src,(obj) => {
        return _.get(obj,key);
    });
    for (var obj of dst) {
        if (_.get(obj,key)) {
            result[_.get(obj,field)] = _.get(lookup[_.get(obj,key)],field)
        }
    }
    return result;
}

module.exports.mapObjects = function (src,dst,field,key) {
    var result = {}
    const lookup = _.keyBy(src,(obj) => {
        return _.get(obj,key);
    });
    for (var obj of dst) {
        if (_.get(obj,key)) {
            result[_.get(obj,field)] = lookup[_.get(obj,key)]
        }
    }
    return result;
}