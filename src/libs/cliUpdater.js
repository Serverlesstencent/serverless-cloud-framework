'use strict';
// 检查最新版本，并提示升级
// 不阻塞流程，仅提示，获取最新版本异常就跳过
// todo 缓存最新版本，1天只拉取一次
// todo 获取版本更新信息

const got = require('got');
const semver = require('semver');
const { red } = require('chalk');
const { version: currentVersion, name: packageName } = require('../../package.json');

const resolveLatestTag = async () => {
  try {
    const { body } = await got.get(`https://registry.npmjs.org/${packageName}/latest`);
    const { version } = JSON.parse(body);
    return version;
  } catch (error) {
    console.log('\n未获取到cli最新版本\n');
    return currentVersion;
  }
};

const checkVersion = async () => {
  try {
    const latestVersion = await resolveLatestTag();

    if (semver.compare(currentVersion, latestVersion) === -1) {
      console.log(
        red(
          `当前CLI版本为${currentVersion}，最新版本为${latestVersion}，请尽快安装最新版本。\n安装指令: npm i -g serverless-cloud-framework\n`
        )
      );
    }
  } catch (error) {
    // do nothing
  }
};

module.exports = {
  checkVersion,
};
