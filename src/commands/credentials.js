/*
 * Long-term credentials functionality:
 * Ticket: https://app.asana.com/0/1200011502754281/1200046588610090/f
 * Design proposal: https://hackmd.io/JAPDyl8ORe6jZWh9JvLY2w
 * Author: Meng Zong(meng.zong@serverless.com)
 * Date: 2021/04/12

 * Credentials format:
 * [xxxx]
 * key=value
 * key2=value2
 * [yyyy]
 * key=value
 * key2=value2
 */
'use strict';

const fse = require('fs-extra');
const chalk = require('chalk');
const {
  fileExistsSync,
  loadCredentialsToJson,
  writeJsonToCredentials,
  ServerlessCLIError,
  getDefaultCredentialsPath,
} = require('../libs/utils');
const t = require('../../i18n');

const defaultPath = getDefaultCredentialsPath();

module.exports = async (config, cli, command, globalTencentCredentials = defaultPath) => {
  const subCommand = config.params[0];

  if (subCommand === 'set') {
    try {
      const { i, k, n, overwrite, o } = config;
      let { secretId, secretKey, profile } = config;

      const canOverwrite = overwrite || o;

      if (!secretId && !i) {
        throw new Error(t('缺少secretId, 请使用 --secretId 或者 -i 指定'));
      } else if (i) {
        secretId = i;
      }

      if (!secretKey && !k) {
        throw new Error(t('缺少secretKey, 请使用 --secretKey 或者 -k 指定'));
      } else if (k) {
        secretKey = k;
      }

      if (!profile) {
        if (n) {
          profile = n;
        } else {
          profile = 'default';
        }
      }

      if (!fileExistsSync(globalTencentCredentials)) {
        fse.createFileSync(globalTencentCredentials);
      }
      const credContent = loadCredentialsToJson(globalTencentCredentials);

      if (credContent[profile]) {
        if (!canOverwrite) {
          cli.log(
            `Serverless: ${chalk.yellow(t('授权信息 {{profile}} 已存在，请使用 --overwrite 进行覆写', {profile}))}`
          );
          process.exit(1);
        }
        credContent[profile] = {
          ...credContent[profile],
          TENCENT_SECRET_KEY: secretKey,
          TENCENT_SECRET_ID: secretId,
        };
        cli.log(`Serverless: ${chalk.green(t('授权信息 {{profile}} 更新成功', {profile}))}`);
      } else {
        credContent[profile] = {
          TENCENT_SECRET_KEY: secretKey,
          TENCENT_SECRET_ID: secretId,
        };
        cli.log(
          t(`
使用授权信息请在 scf 命令后添加 --profile {name}
或储存 TENCENT_CREDENTIALS_PROFILE={name} 在项目 .env 文件中。
授权信息会储存在系统本地目录，并长期有效。请确认当前电脑不是公用电脑或与他人共享。
如果密钥信息泄漏请前往 腾讯云-用户控制台 删除相关用户。
更多帮助请查看 scf --help
`)
        );
        cli.log(`Serverless: ${chalk.green(t('授权信息 {{profile}} 储存成功', {profile}))}`);
      }

      writeJsonToCredentials(globalTencentCredentials, credContent);
    } catch (e) {
      throw new ServerlessCLIError(e.message, { step: t('授权信息存储') });
    }
  }

  if (subCommand === 'remove') {
    let { profile } = config;
    const { n } = config;

    if (!profile) {
      if (n) {
        profile = n;
      } else {
        cli.log(
          `Serverless: ${chalk.yellow(t('未指定授权名称，请通过 --profile 指定要删除的授权名称'))}`
        );
        process.exit(1);
      }
    }

    if (fileExistsSync(globalTencentCredentials)) {
      try {
        const credContent = loadCredentialsToJson(globalTencentCredentials);
        if (!credContent[profile]) {
          cli.log(
            `Serverless: ${chalk.yellow(
              t('授权信息 {{profile}} 不存在，请通过 scf credentials list 查看当前授权信息', {profile})
            )}`
          );
          process.exit();
        }

        delete credContent[profile];
        writeJsonToCredentials(globalTencentCredentials, credContent);
        cli.log(
          t('如果需要删除相关授权用户请前往 腾讯云-用户控制台 删除相关用户。更多帮助请查看 scf --help')
        );
        cli.log(`Serverless: ${chalk.green(t('授权信息 {{profile}} 移除成功', {profile}))}`);
      } catch (e) {
        throw new ServerlessCLIError(e.message, { step: t('授权信息删除') });
      }
    } else {
      cli.log(t(`无法找到全局认证配置文件: ${globalTencentCredentials}, 删除失败`));
    }
  }

  if (subCommand === 'list') {
    try {
      if (fileExistsSync(globalTencentCredentials)) {
        const credContent = loadCredentialsToJson(globalTencentCredentials);

        cli.log(t('Serverless: 当前已有用户授权信息名称：'));
        Object.keys(credContent).forEach((item) => {
          cli.log(`  - ${item}`);
        });
      }
    } catch (e) {
      throw new ServerlessCLIError(e.message, { step: t('授权信息查询') });
    }
  }
};
