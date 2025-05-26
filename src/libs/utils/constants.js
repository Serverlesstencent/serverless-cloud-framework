'use strict';

const os = require('os');

const USER_PERFERENCE_FILE = `${os.homedir}/.serverless-tencent/perference.json`;

// 组件操作action
const ACTION_TYPE_ENUM = {
  UPGRADE :  'upgrade',
  ROLLBACK: 'rollback'
}

module.exports = {
  USER_PERFERENCE_FILE,
  ACTION_TYPE_ENUM
};
