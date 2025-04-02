/* eslint no-restricted-syntax: 0 */

'use strict';

const { ServerlessSDK, utils: tencentUtils } = require('@serverless-cloud-framework/platform-client-china');
const utils = require('../libs/utils');
const { generatePayload, storeLocally, send: sendTelemtry } = require('../libs/telemtry');
// const generateNotificationsPayload = require('../libs/notifications/generate-payload');
const { v4: uuidv4 } = require('uuid');
// const requestNotification = require('../libs/notifications/request');
const printNotification = require('../libs/notifications/print-notification');
const { name: cliName } = require('../../package.json');
const t = require('../../i18n');

function translateCommand(command) {
  const translateCommandMap = new Map([
    ['deploy', t('部署')],
    ['remove', t('移除')],
  ]);
  if (translateCommandMap.has(command)) {
    return translateCommandMap.get(command);
  }
  return t('执行');
}

module.exports = async (config, cli, command) => {
  cli.sessionStart(t('正在初始化'), { timer: true });

  // No dynamic value, default is false
  config.debug = false;
  
  await utils.login(config);

  if (!config.debug) {
    cli.logLogo();
  } else if (process.env.SERVERLESS_PLATFORM_STAGE === 'dev') {
    cli.log(t('正在dev环境执行命令'));
  }

  const templateYaml = await utils.getTemplate(process.cwd());

  if (!templateYaml) {
    throw new Error(t('在子文件夹中没有发现组件信息'));
  }

  // Load Instance Credentials
  const credentials = await utils.loadInstanceCredentials(templateYaml.stage);

  cli.sessionStatus(t('正在初始化'), templateYaml.name);

  // initialize SDK
  const orgUid = await tencentUtils.getOrgId();
  const sdk = new ServerlessSDK({
    accessKey: tencentUtils.buildTempAccessKeyForTencent({
      SecretId: process.env.TENCENT_SECRET_ID,
      SecretKey: process.env.TENCENT_SECRET_KEY,
      Token: process.env.TENCENT_TOKEN,
    }),
    context: {
      orgUid,
      orgName: templateYaml.org,
      traceId: uuidv4(),
    },
  });

  // Prepare Options
  const options = {};
  options.cliName = cliName;
  options.dev = config.dev;

  // Connect to Serverless Platform Events, if in debug mode
  options.debug = config.debug;

  const cliendUidResult = await utils.writeClientUid();
  if (!cliendUidResult[orgUid]) {
    options.client_uid = cliendUidResult.value;
  }

  if (options.debug) {
    await sdk.connect({
      filter: {
        stageName: templateYaml.stage,
        appName: templateYaml.app,
      },
      onEvent: utils.handleDebugLogMessage(cli),
    });
  }

  const deferredNotificationsData = null;
    // command === 'deploy'
    //   ? requestNotification(
    //       Object.assign(generateNotificationsPayload(templateYaml), {
    //         command: 'deploy',
    //       })
    //     )
    //   : null;

  if (command === 'remove') {
    cli.sessionStatus(t('正在删除'), null, 'white');
  } else {
    cli.sessionStatus(t('正在部署'), null, 'white');
  }

  const allComponents = await utils.getAllComponents(templateYaml);

  const telemtryData = await generatePayload({
    command,
    userId: orgUid,
    rootConfig: templateYaml,
    configs: Object.values(allComponents),
  });

  try {
    const allComponentsWithDependencies = utils.setDependencies(allComponents);
    const graph = utils.createGraph(allComponentsWithDependencies, command);

    const allComponentsWithOutputs = await utils.executeGraph(
      allComponentsWithDependencies,
      command,
      graph,
      cli,
      sdk,
      credentials,
      options
    );

    // Check for errors
    const succeeded = [];
    const failed = [];
    for (const component in allComponentsWithOutputs) {
      if (Object.prototype.hasOwnProperty.call(allComponentsWithOutputs, component)) {
        const c = allComponentsWithOutputs[component];
        if (c.error) {
          failed.push(c);
        }
        if (c.outputs) {
          succeeded.push(c);
        }
      }
    }

    // Insert appId into client_uid-credentials to avoid repeatly searching database, no matter the status of instance is succ or fail
    if (!cliendUidResult[orgUid] && command === 'deploy') {
      utils.writeJsonToCredentials(utils.clientUidDefaultPath, {
        client_uid: { ...cliendUidResult, [orgUid]: true },
      });
    }
    if (failed.length) {
      cli.sessionStop(
        'error',
        t('已成功 {{attr0}}组件{{attr1}}个，失败{{attr2}}个', { attr0: translateCommand(command), attr1: succeeded.length, attr2: failed.length })
      );
      telemtryData.outcome = 'failure';
      telemtryData.failure_reason = failed.map((f) => f.error.message).join(',');
      await storeLocally(telemtryData);
      if (command === 'deploy') {
        sendTelemtry();
      }
      return null;
    }

    // don't show outputs if removing
    if (command !== 'remove') {
      const outputs = utils.getOutputs(allComponentsWithOutputs);

      // log all outputs at once at the end only on debug mode
      // when not in debug, the graph handles logging outputs
      // of each deployed instance in realtime
      if (options.debug) {
        cli.log();
        cli.logOutputs(outputs);
      }
    }

    cli.sessionStop('success', t('已成功{{attr0}}组件{{attr1}}个', { attr0: translateCommand(command), attr1: succeeded.length }));

    if (deferredNotificationsData) printNotification(cli, await deferredNotificationsData);
    await storeLocally(telemtryData);

    if (command === 'deploy') {
      sendTelemtry();
    }
    sdk.disconnect();
    return null;
  } catch (e) {
    telemtryData.outcome = 'failure';
    telemtryData.failure_reason = e.message;
    await storeLocally(telemtryData, e);

    if (command === 'deploy') {
      sendTelemtry();
    }
    throw e;
  }
};
