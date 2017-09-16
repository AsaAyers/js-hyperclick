/* eslint-disable */

const basicRequire /* basicRequire */ = require("./basicRequire")

const { destructured /* destructured */ } = require("./destructured")

const { a: renamed /* renamed */ } = require("./renamed")

require.resolve("./basicRequire" /* resolve */)

module.exports /* exports */ = require("./es6-module")

var config /* configVar */ = require(`../config/config.${process.env.NODE_ENV}`)

config /* config */.secrets.useCredits
