'use strict';

const fs = require('fs');
const hashString = require('./hashString');

const systemLanguage = {
  zh: 'zh',
  en: 'en'
};
// 读取已经存在在en.json文件的词条
const existJsonData = fs.readFileSync('i18n/translation/en.json');
let existData = {};
try {
  existData = JSON.parse(existJsonData);
} catch {
  existData = {};
}

const keyList = Object.keys(existData);

module.exports = {
  input: [
    'src/**/*.{js,jsx,tsx,ts}',
    // 不需要扫描的文件加!
    '!docs/**',
    '!example/**',
    '!examples/**',
    '!i18n/**',
    '!**/node_modules/**'
  ],
  output: './', // 输出目录
  options: {
    debug: true,
    func: false,
    trans: false,
    lngs: [systemLanguage.zh, systemLanguage.en],
    defaultLng: systemLanguage.zh,
    resource: {
      loadPath: 'i18n/newJson/{{lng}}.json', // 输入路径 (手动新建目录)
      savePath: 'i18n/newJson/{{lng}}.json', // 输出路径 (输出会根据输入路径内容自增, 不会覆盖已有的key)
      jsonIndent: 2,
      lineEnding: '\n'
    },
    removeUnusedKeys: true,
    nsSeparator: false, // namespace separator
    keySeparator: false, // key separator
    interpolation: {
      prefix: '{{',
      suffix: '}}'
    }
  },
  // 这里我们要实现将中文转换成crc格式, 通过crc格式key作为索引, 最终实现语言包的切换.
  transform (file, enc, done) {
    // 自己通过该函数来加工key或value
    const { parser } = this;
    const content = fs.readFileSync(file.path, enc);
    parser.parseFuncFromString(content, { list: ['t'] }, (key, options) => {
      options.defaultValue = key;
      const hashKey = hashString(key);
      // 如果词条不存在，则写入
      if (!keyList.includes(hashKey)) {
        parser.set(hashKey, options);
      }
    });
    done();
  }
};
