'use strict';

const i18next = require('i18next');
const utils = require('../libs/utils');

const LANG_ENV_ENUMS = ['LC_ALL', 'LC_MESSAGE', 'LANG', 'LANGUAGE']

/*
 * serverless-tencent: Command: lang
 */


module.exports = (config, cli) => {
  if (config.params && config.params.length > 0) {
    const lang = config.params[0];
    if (['zh', 'en'].includes(lang)) {
      const langENV = LANG_ENV_ENUMS.find(item => process.env[item]) || LANG_ENV_ENUMS[0];
      try {
        utils.updateEnvFile({
          [langENV]: lang
        });
        i18next.changeLanguage(lang);
      } catch (e) {
        e.extraErrorInfo = {
          step: 'setting language',
          source: 'Serverless::CLI',
        };
        throw e;
      }
      
    } else {
      throw new Error('Lang command only supports zh, en.');
    }
  } else {
    cli.log(i18next.language);
  }
};
