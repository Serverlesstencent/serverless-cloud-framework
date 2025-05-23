'use strict';

const run = require('./run');
const info = require('./info');
const { init } = require('./init');
const dev = require('./dev');
const registry = require('./registry');
const help = require('./help');
const param = require('./param');
const credentials = require('./credentials');
const invoke = require('./invoke');
const logs = require('./logs');
const version = require('./version');
const lang = require('./lang');

module.exports = {
  run,
  info,
  init,
  dev,
  registry,
  help,
  param,
  version,
  credentials,
  invoke,
  logs,
  lang
};
