'use strict';
// 检查最新版本，并提示升级
// 不阻塞流程，仅提示，获取最新版本异常就跳过
const util = require('util');
const got = require('got');
const semver = require('semver');
const { red, dim, green, blue, underline } = require('chalk');
const { version: currentVersion, name: packageName } = require('../../package.json');
const fs = require('fs');
const path = require('path');

const versionLogFile = path.resolve(__dirname, './version.log');

const checkIfOutdated = (cacheTime) => {
    const now = new Date();
    const dCacheTime = new Date(cacheTime)
    return !(now.getFullYear() === dCacheTime.getFullYear() && now.getMonth() === dCacheTime.getMonth() && now.getDate() === dCacheTime.getDate());
}

const checkVersion = async () => {
  try {
    let latestVersionInfo;

    try {
      const data = await util.promisify(fs.readFile)(versionLogFile, { encoding: 'utf-8' });
      latestVersionInfo = JSON.parse(data);
    } catch (err) {
      // 没有缓存文件，或之前数据解析失败 都当做没有缓存
    }
    if (typeof latestVersionInfo !== 'object') {
      fetchLatestVersionInfo();
      return;
    }
    const { latestVersion, latestCheckTime } = latestVersionInfo;
    const order = semver.compare(currentVersion, latestVersion)
    if (order === -1) {
      console.log(`CLI版本有可用更新：${dim(currentVersion)} → ${green(latestVersion)}\n执行 ${blue('npm install -g serverless-cloud-framework')} 命令即安装最新版本CLI。更新日志详见：${underline('https://github.com/Serverlesstencent/serverless-cloud-framework/blob/master/CHANGELOG.md')}\n${red('>>> 建议安装最新版本，以获得平台的最新能力和漏洞修复 <<<\n')}`);
    } else if (order === 1) {
      console.log('请检测当前CLI版本，并尽量保持使用官方最新版本CLI');
    }

    if (checkIfOutdated(latestCheckTime)) {
      fetchLatestVersionInfo();
    }

  } catch (error) {
    // do nothing
  }

};

const resolveLatestTag = async () => {
  try {
    const { body } = await got.get(`https://registry.npmjs.org/${packageName}/latest`, {timeout: 10000});
    const { version } = JSON.parse(body);
    return version;
  } catch (error) {
    console.log('\n未获取到cli最新版本\n');
    return currentVersion;
  }
};

const fetchLatestVersionInfo = async () => {
  const latestVersion = await resolveLatestTag();
  const latestVersionInfo = {
    latestVersion,
    latestCheckTime: Date.now(),
  };
  util.promisify(fs.writeFile)(versionLogFile, JSON.stringify(latestVersionInfo));
};

module.exports = {
  checkVersion,
};
