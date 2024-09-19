'use strict';

const i18next = require('i18next')
const hashString = require('./config/hashString')
const I18nextCLILanguageDetector = require('i18next-cli-language-detector');
const dotenv = require('dotenv');

const LANG_ENV_ENUMS = ['LC_ALL', 'LC_MESSAGE', 'LANG', 'LANGUAGE']

// try to get the node.js system's locale
const systemLocale = (new Intl.DateTimeFormat()).resolvedOptions().locale.startsWith('zh') ? 'zh' : 'en'

const getLangEnv = () => {
  let lang = systemLocale;
  try {
    dotenv.config();
  } catch (error) {
    // no find .env
  }

  const envLang = LANG_ENV_ENUMS.find(item => process.env[item]);
  if (envLang) {
    if (envLang.startsWith('zh')) {
      lang = 'zh';
    } else {
      lang = 'en';
    }
  } else {
    process.stdout.write('You can configure the language by setting the environment variable LANG in the .env file (e.g., LANG=zh or LANG=en).');
  }
  
  return lang;
}

i18next
  .use(I18nextCLILanguageDetector)
  .init({
    fallbackLng: getLangEnv(),
    supportedLngs: ['en', 'zh'],
    resources: {
      en: {
        translation: require('./translation/en.json')
      },
      zh: {
        translation: require('./translation/zh.json')
      }
    }
  });

module.exports = (key, options) => {
  const hashKey = hashString(key);

  return i18next.t(hashKey, {
    ...(options || {}),
    defaultValue: key,
  })
};
