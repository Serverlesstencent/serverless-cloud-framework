'use strict';

/*
 * serverless-tencent: Command: Registry
 */

const { ServerlessSDK } = require('@serverless-cloud-framework/platform-client-china');
const { v4: uuidv4 } = require('uuid');
const utils = require('../libs/utils');
const { loadServerlessFile } = require('../libs/serverlessFile');
const t = require('../../i18n');

/**
 * Publish a Package(Component or Template) to the Serverless Registry
 * @param {*} config
 * @param {*} cli
 */
const publish = async (config, cli) => {
  // Disable timer
  config.timer = false;

  // Start CLI persistance status
  cli.sessionStart(t('初始化中...'));

  await utils.login(config);

  // We want to check the existence of serverless.template.yml and serverless.component.yml first
  // If both of them did not show up, we will check serverless.yml for backward compatibility
  // Why not check the existence of serverless.yml first? serverless.template.yml and serverless.yml may be in the same folder
  const serverlessTemplateFile = await utils.loadTemplateConfig(process.cwd());
  const serverlessComponentFile = await utils.loadComponentConfig(process.cwd());
  const serverlessFile = await loadServerlessFile(process.cwd());

  if (!serverlessTemplateFile && !serverlessComponentFile && !serverlessFile) {
    throw new utils.ServerlessCLIError(
      t('发布失败。当前工作目录没有包含 "serverless.template.yml" 或者 "serverless.component.yml"')
    );
  }

  let finalServerlessFile;

  if (serverlessComponentFile) {
    // Publishing a component
    finalServerlessFile = serverlessComponentFile;
    finalServerlessFile.src = serverlessComponentFile.main;
    finalServerlessFile.type = 'component';
  } else {
    // Publishing a template
    finalServerlessFile = serverlessTemplateFile || serverlessFile;
    finalServerlessFile.type = 'template';
    finalServerlessFile.version = '0.0.0';
  }

  // fall back to service name for framework v1
  finalServerlessFile.name = finalServerlessFile.name || finalServerlessFile.service;

  // If "--dev" flag is used, set the version the API expects
  // default version is dev
  if (!finalServerlessFile.version || config.dev) {
    finalServerlessFile.version = 'dev';
  }

  finalServerlessFile.org = finalServerlessFile.org || (await utils.getDefaultOrgName());

  // Presentation
  cli.logRegistryLogo();
  cli.log(
    t('发布中 "{{attr0}}@{{attr1}}"...', { attr0: finalServerlessFile.name, attr1: config.dev ? 'dev' : finalServerlessFile.version }),
    'grey'
  );

  const sdk = new ServerlessSDK({ context: { traceId: uuidv4() } });

  // Publish
  cli.sessionStatus(t('发布中'));

  let registryPackage;
  try {
    registryPackage = await sdk.publishPackage(finalServerlessFile);
  } catch (error) {
    if (error.message.includes('409')) {
      error.message = error.message.replace('409 - ', '');
      cli.error(error.message, true);
    } else {
      if (!error.extraErrorInfo) {
        error.extraErrorInfo = {
          step: t('组件发布'),
          source: 'Serverless::Cli',
        };
      } else {
        error.extraErrorInfo.step = t('组件发布');
      }
      throw error;
    }
  }

  if (registryPackage && registryPackage.version === '0.0.0-dev') {
    registryPackage.version = 'dev';
  }

  cli.sessionStop(
    'success',
    t('发布成功 {{attr0}}{{attr1}}', { attr0: registryPackage.name, attr1: registryPackage.type === 'template' ? '' : `@${registryPackage.version}` })
  );
  return null;
};


/**
 * rollback a Package(Component or Template) version
 * @param {*} config
 * @param {*} cli
 */
const rollback = async (config, cli) => {
  const rollBackVersion = config.rollback || config.r;
  // --rollback/-r参数未传版本号或者版本号格式错误，会提示报错
  if (!/^\d+\.\d+\.\d+$/.test(rollBackVersion)) {
    throw new utils.ServerlessCLIError(
      `回滚失败:--rollback/-r参数没有设置版本号或者版本号格式错误,版本号格式:'0.0.0'`
    );
  }
  // Disable timer
  config.timer = false;

  // Start CLI persistance status
  cli.sessionStart('初始化中...');

  await utils.login(config);

  // We want to check the existence of serverless.template.yml and serverless.component.yml first
  // If both of them did not show up, we will check serverless.yml for backward compatibility
  // Why not check the existence of serverless.yml first? serverless.template.yml and serverless.yml may be in the same folder
  const serverlessTemplateFile = await utils.loadTemplateConfig(process.cwd());
  const serverlessComponentFile = await utils.loadComponentConfig(process.cwd());
  const serverlessFile = await loadServerlessFile(process.cwd());

  if (!serverlessTemplateFile && !serverlessComponentFile && !serverlessFile) {
    throw new utils.ServerlessCLIError(
      '回滚失败。当前工作目录没有包含 "serverless.template.yml" 或者 "serverless.component.yml"'
    );
  }


  let finalServerlessFile;

  if (serverlessComponentFile) {
    // Rollbacking a component
    finalServerlessFile = serverlessComponentFile;
    finalServerlessFile.src = serverlessComponentFile.main;
    finalServerlessFile.type = 'component';
  } else {
    // Rollbacking a template
    finalServerlessFile = serverlessTemplateFile || serverlessFile;
    finalServerlessFile.type = 'template';
  }

  if (config.dev) {
    finalServerlessFile.version = 'dev';
  }

  if (rollBackVersion) {
    finalServerlessFile.actionType = utils.ACTION_TYPE_ENUM.ROLLBACK
    finalServerlessFile.rollbackVersion = rollBackVersion
  }

  // fall back to service name for framework v1
  finalServerlessFile.name = finalServerlessFile.name || finalServerlessFile.service;
  finalServerlessFile.org = finalServerlessFile.org || (await utils.getDefaultOrgName());

  // Presentation
  cli.logRegistryLogo();
  cli.log(
    `回滚中 "${finalServerlessFile.name}@${finalServerlessFile.rollbackVersion}"...`,
    'grey'
  );

  const sdk = new ServerlessSDK({ context: { traceId: uuidv4() } });

  // Publish
  cli.sessionStatus('回滚中');

  let registryPackage;
  try {
    registryPackage = await sdk.rollbackPackage(finalServerlessFile);
  } catch (error) {
    if (error.message.includes('409')) {
      error.message = error.message.replace('409 - ', '');
      cli.error(error.message, true);
    } else {
      if (!error.extraErrorInfo) {
        error.extraErrorInfo = {
          step: '组件回滚',
          source: 'Serverless::Cli',
        };
      } else {
        error.extraErrorInfo.step = '组件回滚';
      }
      throw error;
    }
  }

  cli.sessionStop(
    'success',
    `回滚成功 ${finalServerlessFile.name}${
      finalServerlessFile.type === 'template' ? '' : `@${finalServerlessFile.rollbackVersion}`
    }`
  );
  return null;
};

/**
 * Get a registry package from the Serverless Registry
 * @param {*} config
 * @param {*} cli
 */
const getPackage = async (config, cli) => {
  const packageName = config.params[0];

  // Start CLI persistance status
  cli.sessionStart(t('正在获取版本: {{packageName}}', { packageName }));

  const sdk = new ServerlessSDK({ context: { traceId: uuidv4() } });
  let data;
  try {
    data = await sdk.getPackage(packageName);
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
  delete data.component;

  if (Object.keys(data).length === 0) {
    throw new Error(t('所查询的包 "{{packageName}}" 不存在.', { packageName }));
  }

  const devVersion = data.versions.indexOf('0.0.0-dev');
  if (devVersion !== -1) {
    data.versions.splice(devVersion, 1);
  }

  cli.logRegistryLogo();
  cli.log();
  cli.log(`${data.type === 'template' ? 'Template' : 'Component'}: ${packageName}`);
  cli.log(t('描述: {{attr0}}', { attr0: data.description }));
  if (data.type !== 'template') {
    cli.log(t('最新版本: {{attr0}}', { attr0: data.version }));
  }
  if (data.author) {
    cli.log(t('作者: {{attr0}}', { attr0: data.author }));
  }
  if (data.repo) {
    cli.log(t('代码地址: {{attr0}}', { attr0: data.repo }));
  }
  cli.log();
  if (data.type !== 'template') {
    cli.log(t('可用版本:'));
    cli.log(`${data.versions.join(', ')}`);
  }

  cli.sessionStop('success', t('"{{packageName}}" 的包信息', { packageName }));
  return null;
};

/**
 * List Featured
 * @param {*} config
 * @param {*} cli
 */
const listFeatured = async (config, cli) => {
  cli.logRegistryLogo();

  try {
    const sdk = new ServerlessSDK({ context: { traceId: uuidv4() } });
    const { templates: featuredTemplates } = await sdk.listPackages(null, {
      isFeatured: true,
    });

    if (featuredTemplates.length > 0) {
      cli.log();
      cli.log(t('运行 "scf init <package>" 安装组件或者模版...'));
      cli.log();
      for (const featuredTemplate of featuredTemplates) {
        let name = featuredTemplate.name;

        if (featuredTemplate['description-i18n'] && featuredTemplate['description-i18n']['zh-cn']) {
          name = `${name} - ${featuredTemplate['description-i18n']['zh-cn']}`;
        } else if (featuredTemplate.description) {
          name = `${name} - ${featuredTemplate.description}`;
        }

        cli.log(`• ${name}`, 'grey');
      }
    }
    cli.sessionStop('close', t('查看更多: https://github.com/serverless-components?q=tencent'));
    return null;
  } catch (e) {
    if (!e.extraErrorInfo) {
      e.extraErrorInfo = {
        step: t('组件列表获取'),
      };
    } else {
      e.extraErrorInfo.step = t('组件列表获取');
    }
    throw e;
  }
};

/**
 * Route Registry Command
 */
module.exports = async (config, cli) => {
  if (!config.params[0]) {
    return await listFeatured(config, cli);
  }
  if (config.params[0] === 'publish') {
    const rollBackVersion = config.rollback || config.r;
    // 如果publish命令传递了--rollback/-r参数，则进行回滚版本
    if (rollBackVersion) {
      return await rollback(config, cli);
    } else {
      // 反之,如果publish命令没有传递--rollback/-r参数，则进行发布版本
      return await publish(config, cli);
    }
  }
  return await getPackage(config, cli);
};
