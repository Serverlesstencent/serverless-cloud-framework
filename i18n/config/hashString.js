'use strict'

const hashString = require('hash-string');

module.exports = (key) => `k_${(`0000${hashString(key.replace(/\s+/g, '')).toString(36)}`).slice(-7)}`;