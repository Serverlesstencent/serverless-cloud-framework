'use strict';

const { promisify } = require('util');
const path = require('path');
const fs = require('fs');
const chalk = require('chalk');
const Cos = require('cos-nodejs-sdk-v5');

const distPath = path.resolve(__dirname, '../../../build');

// 测试环境bucket
// const TENCENT_BUCKET_NAME = 'scf-binary-sv-dev-1300862921';
// const TENCENT_REGION = 'ap-shanghai';

const TENCENT_BUCKET_NAME = 'scf-binary-sv-1300862921';
const TENCENT_REGION = 'ap-guangzhou';

module.exports = async (versionTag, { isLegacyVersion }) => {
  if (!process.env.TENCENT_SECRET_KEY) {
    process.stdout.write(chalk.red('Missing TENCENT_SECRET_KEY env var \n'));
    process.exitCode = 1;
    return;
  }

  if (!process.env.TENCENT_SECRET_ID) {
    process.stdout.write(chalk.red('Missing TENCENT_SECRET_ID env var \n'));
    process.exitCode = 1;
    return;
  }

  const cos = new Cos({
    SecretId: process.env.TENCENT_SECRET_ID,
    SecretKey: process.env.TENCENT_SECRET_KEY,
  });
  cos.putObjectAsync = promisify(cos.putObject);

  const bucketConf = {
    Bucket: TENCENT_BUCKET_NAME,
    Region: TENCENT_REGION,
  };

  await Promise.all([
    cos
      .putObjectAsync({
        Key: `${versionTag}/serverless-tencent-linux-x64`,
        Body: fs.createReadStream(path.resolve(distPath, 'serverless-tencent-linux')),
        ...bucketConf,
      })
      .then(() => {
        process.stdout.write(chalk.green("'serverless-tencent-linux-x64' uploaded to Tencent\n"));
      }),
    cos
      .putObjectAsync({
        Key: `${versionTag}/serverless-tencent-macos-x64`,
        Body: fs.createReadStream(path.resolve(distPath, 'serverless-tencent-macos')),
        ...bucketConf,
      })
      .then(() => {
        process.stdout.write(chalk.green("'serverless-tencent-macos-x64' uploaded to Tencent\n"));
      }),

    // Right now wo provide a `mac_x64` standalone for `mac_arm64` users because we can not build a mac arm64 in github CI. We will upload an exact right mac arm64 standalone once github actions provide a mac arm64 environment, related discussions: https://github.com/serverless/serverless/pull/10305#discussion_r761849431, https://github.com/serverless/serverless-tencent/pull/86#discussion_r761861822
    cos
      .putObjectAsync({
        Key: `${versionTag}/serverless-tencent-macos-armv6`,
        Body: fs.createReadStream(path.resolve(distPath, 'serverless-tencent-macos')),
        ...bucketConf,
      })
      .then(() => {
        process.stdout.write(chalk.green("'serverless-tencent-macos-armv6' uploaded to Tencent\n"));
      }),

    cos
      .putObjectAsync({
        Key: `${versionTag}/serverless-tencent-win-x64.exe`,
        Body: fs.createReadStream(path.resolve(distPath, 'serverless-tencent-win.exe')),
        ...bucketConf,
      })
      .then(() => {
        process.stdout.write(chalk.green("'serverless-tencent-win-x64' uploaded to Tencent\n"));
      }),
  ]);
  if (isLegacyVersion) return;
  await cos.putObjectAsync({
    Key: 'latest-tag',
    Body: Buffer.from(versionTag),
    ...bucketConf,
  });
  process.stdout.write(chalk.green("'latest-tag' uploaded to Tencent\n"));
};
