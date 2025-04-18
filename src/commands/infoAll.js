'use strict';

const { v4: uuidv4 } = require('uuid');
const { ServerlessSDK } = require('@serverless-cloud-framework/platform-client-china');
const { getTemplate, getInstanceDashboardUrl } = require('../libs/utils');
const chalk = require('chalk');
const dayjs = require('dayjs');
const relativeTime = require('dayjs/plugin/relativeTime');
const t = require('../../i18n');

dayjs.extend(relativeTime);

module.exports = async (config, cli) => {
  const templateYaml = await getTemplate(process.cwd());
  cli.sessionStatus('Initializing', templateYaml.name);

  cli.logLogo();

  const meta = `Action: "info" - Stage: "${templateYaml.stage}" - App: "${templateYaml.app}" - Name: "${templateYaml.name}"`;
  cli.log(meta, 'grey');
  cli.log();

  // initialize SDK
  const sdk = new ServerlessSDK({ context: { traceId: uuidv4() } });

  // don't show the status in debug mode due to formatting issues
  if (!config.debug) {
    cli.sessionStatus('Loading Info', null, 'white');
  }

  const instanceYamls = Object.values(templateYaml).filter(
    (instance) => typeof instance === 'object'
  );

  for (const instanceYaml of instanceYamls) {
    cli.log(instanceYaml.name, 'whiteBold');

    let instance = {};
    try {
      const result = await sdk.getInstance(
        instanceYaml.org,
        instanceYaml.stage,
        instanceYaml.app,
        instanceYaml.name
      );
      instance = result.instance;
      instance = result.instance;
    } catch (e) {
      if (!e.extraErrorInfo) {
        e.extraErrorInfo = { step: t('实例信息获取') };
      } else {
        e.extraErrorInfo.step = t('实例信息获取');
      }
      throw e;
    }

    if (!instance || !instance.outputs || Object.keys(instance.outputs).length === 0) {
      cli.log(`  ${chalk.grey('Status:')}       ${chalk.red('inactive')}`);
      cli.log();
      continue;
    }

    const lastActionAgo = dayjs(instance.lastActionAt).fromNow();

    let statusLog;
    if (instance.instanceStatus === 'error') {
      statusLog = chalk.red(instance.instanceStatus);
    } else if (instance.instanceStatus === 'active') {
      statusLog = chalk.green(instance.instanceStatus);
    } else if (instance.instanceStatus === 'inactive') {
      statusLog = chalk.yellow(instance.instanceStatus);
    } else {
      statusLog = instance.instanceStatus;
    }
    cli.log(`  ${chalk.grey(t('最后操作:'))}  ${instance.lastAction} (${lastActionAgo})`);
    cli.log(`  ${chalk.grey(t('部署次数:'))}  ${statusLog}`);
    cli.log(`  ${chalk.grey(t('应用状态:'))}  ${instance.instanceMetrics.deployments}`);

    // show state only in debug mode
    if (config.debug) {
      cli.log();
      cli.log(`${'State:'}`, 'whiteBold');
      cli.log();
      cli.logOutputs(instance.state);
    }

    const outputs = instance.outputs;

    delete outputs.vendorMessage;

    cli.log(`  ${chalk.grey(t('输出:'))}`);
    cli.logOutputs(outputs, 4);

    cli.log();
  }

  cli.log(getInstanceDashboardUrl(templateYaml));

  cli.sessionStop('success', t('信息成功加载'));
};
