'use strict';

/*
 * serverless-tencent: Command: INIT
 */

const fs = require('fs');
const fse = require('fs-extra');
const { promisify } = require('util');
const path = require('path');
const stream = require('stream');
const AdmZip = require('adm-zip');
const { v4: uuidv4 } = require('uuid');
const { generatePayload, storeLocally } = require('../libs/telemtry');
const got = require('got');
const { ServerlessSDK } = require('@serverless-cloud-framework/platform-client-china');
const spawn = require('child-process-ext/spawn');
const { parseYaml, saveYaml, ServerlessCLIError } = require('../libs/utils');
const t = require('../../i18n');

const pipeline = promisify(stream.pipeline);

async function unpack(cli, dir) {
  if (await fse.exists(path.resolve(dir, 'package.json'))) {
    cli.sessionStatus(t('通过 npm install 在 {{dir}} 文件夹中安装依赖', { dir }));
    try {
      await spawn('npm', ['install'], { cwd: dir });
    } catch (error) {
      error.message = t('自动安装依赖失败，请手动执行安装');
      error.extraErrorInfo = {
        step: t('依赖安装'),
        source: 'Serverless::CLI',
      };
      throw error;
    }
  }

  const files = await fse.readdir(dir);
  for (const file of files) {
    // skip node_modules folder
    if (file === 'node_modules') {
      continue;
    }
    // Check if the file is a directory, or a file
    const stats = await fse.stat(`${dir}/${file}`);
    if (stats.isDirectory()) {
      await unpack(cli, path.resolve(dir, file));
    }
  }
  return null;
}

const initTemplateFromCli = async ({
  targetPath,
  packageName,
  registryPackage,
  cli,
  appName,
  reserveAppName = false,
  instanceName,
}) => {
  cli.sessionStatus('Fetching template from registry', packageName);
  try {
    const tmpFilename = path.resolve(path.basename(registryPackage.downloadKey));
    await pipeline(got.stream(registryPackage.downloadUrl), fs.createWriteStream(tmpFilename));

    cli.sessionStatus('Unpacking your new app', packageName);
    const zip = new AdmZip(tmpFilename);
    zip.extractAllTo(targetPath);
    await fs.promises.unlink(tmpFilename);
  } catch (e) {
    e.extraErrorInfo = { step: t('模版下载'), source: 'Serverless::CLI' };
    throw e;
  }

  cli.sessionStatus('app.YAML processd');
  let serverlessFilePath = path.resolve(targetPath, 'serverless.yaml');

  // Both yaml and yml is valid config file, if neither of them exist, create a new yml file
  if (!(await fse.existsSync(serverlessFilePath))) {
    const serverlessYmlFilePath = path.resolve(targetPath, 'serverless.yml');
    if (await fse.existsSync(serverlessYmlFilePath)) {
      serverlessFilePath = serverlessYmlFilePath;
    } else {
      await fse.createFile(serverlessFilePath);
    }
  }

  const ymlOriginal = await fse.readFile(serverlessFilePath, 'utf8');
  const ymlParsed = await parseYaml(serverlessFilePath);

  let newYmlContent;
  if (appName && ymlParsed.app) {
    if (reserveAppName) {
      newYmlContent = ymlOriginal.replace(/^app:\s\S*/m, `app: ${appName}`);
    } else {
      newYmlContent = ymlOriginal.replace(
        /^app:\s\S*/m,
        `app: ${appName}-${uuidv4().split('-')[0]}`
      );
    }
  }

  if (instanceName && ymlParsed.name) {
    newYmlContent = newYmlContent.replace(/^name:\s\S*/m, `name: ${instanceName}`);
  }

  if (newYmlContent) await fse.writeFile(serverlessFilePath, newYmlContent, 'utf8');

  // For template with unspcified `app`, usually created by the community
  if (appName && !ymlParsed.app) {
    ymlParsed.app = `${appName}-${uuidv4().split('-')[0]}`;
    await saveYaml(serverlessFilePath, ymlParsed);
  }

  cli.sessionStatus('app.YAML processd end');

  cli.sessionStatus('Setting up your new app');
  await unpack(cli, targetPath);

  return ymlParsed;
};

const init = async (config, cli) => {
  // Start CLI persistance status
  cli.sessionStart('Initializing', { timer: false });

  // Presentation
  cli.logLogo();
  cli.log();

  let packageName = config.t || config.template;
  let telemtryData = await generatePayload({ command: 'init' });

  try {
    if (!packageName) {
      if (config.params && config.params.length > 0) {
        packageName = config.params[0];
      } else {
        throw new Error(t('请指定 component 或 template 名称，如: "scf init scf-starter"'));
      }
    }

    const sdk = new ServerlessSDK({ context: { traceId: uuidv4() } });
    let registryPackage;
    try {
      registryPackage = await sdk.getPackage(packageName);
    } catch (e) {
      if (!e.extraErrorInfo) {
        e.extraErrorInfo = {
          step: t('组件信息获取'),
        };
      } else {
        e.extraErrorInfo.step = t('组件信息获取');
      }
      throw e;
    }
    if (!registryPackage) {
      telemtryData.outcome = 'failure';
      telemtryData.failure_reason = t('查询的包 "{{packageName}}" 不存在.', { packageName });
      await storeLocally(telemtryData);

      throw new Error(t('查询的包 "{{packageName}}" 不存在.', { packageName }));
    }

    // registryPackage.component will be null if component is not found
    // this is the design for platform API backward compatibility
    delete registryPackage.component;
    if (Object.keys(registryPackage).length === 0) {
      telemtryData.outcome = 'failure';
      telemtryData.failure_reason = t('查询的包 "{{packageName}}" 不存在.', { packageName });
      await storeLocally(telemtryData);

      throw new Error(t('查询的包 "{{packageName}}" 不存在.', { packageName }));
    }

    const targetName = config.name || packageName;
    const targetPath = path.resolve(targetName);
    const isPathExists = await fse.pathExists(targetPath);

    if (isPathExists) {
      telemtryData.outcome = 'failure';
      telemtryData.failure_reason = t('尝试创建的文件夹 "{{targetPath}}" 已存在.', { targetPath });
      await storeLocally(telemtryData);
      const error = new Error(t('文件夹 {{targetName}} 已经存在，请修改后重试', { targetName }));
      error.extraErrorInfo = {
        step: t('初始化命令'),
        source: 'Serverless::CLI',
      };
      throw error;
    }

    if (registryPackage.type !== 'template') {
      await fse.mkdir(targetPath);
      const envDestination = path.resolve(targetPath, 'serverless.yml');
      const envConfig = `component: ${packageName}\nname: ${targetName}\napp: ${targetName}-${
        uuidv4().split('-')[0]
      }\ninputs:\n`;
      try {
        await fse.writeFile(envDestination, envConfig);
      } catch (e) {
        throw new ServerlessCLIError(e.message);
      }

      telemtryData.components.push(packageName);
    } else {
      const ymlParsed = await initTemplateFromCli({
        targetPath,
        packageName,
        registryPackage,
        cli,
        appName: targetName,
      });
      telemtryData = await generatePayload({
        command: 'init',
        rootConfig: ymlParsed,
      });
    }

    cli.log(t('- 项目 "{{packageName}}" 已在当前目录成功创建', { packageName }));
    cli.log(t('- 执行 "cd {{targetName}} && scf deploy" 部署应用', { targetName }));

    await storeLocally(telemtryData);
    cli.sessionStop('success', t('创建成功'));
    return null;
  } catch (err) {
    telemtryData.outcome = 'failure';
    telemtryData.failure_reason = err.message;
    await storeLocally(telemtryData, err);

    throw err;
  }
};

module.exports = {
  init,
  initTemplateFromCli,
};
