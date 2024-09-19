'use strict';

const i18next = require('i18next')
const hashString = require('./config/hashString')

// if no language parameter is passed, let's try to use the node.js system's locale
const systemLocale = (new Intl.DateTimeFormat()).resolvedOptions().locale

i18next
  .init({
    // fallbackLng: 'en',
    fallbackLng: systemLocale,
    resources: {
      en: {
        translation: require('./translation/en.json')
      },
      zh: {
        translation: require('./translation/zh.json')
      }
    }
  })

module.exports = (key, options) => {
  const hashKey = hashString(key);

  return i18next.t(hashKey, {
    ...(options || {}),
    defaultValue: key,
  })
};
