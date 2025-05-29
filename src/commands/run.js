'use strict';

/*
 * serverless-tencent: Command: RUN
 */

const path = require('path');
const fs = require('fs');
const {
  ServerlessSDK,
  utils: tencentUtils,
} = require('@serverless-cloud-framework/platform-client-china');
const { v4: uuidv4 } = require('uuid');
const { generatePayload, storeLocally, send: sendTelemtry } = require('../libs/telemtry');
const utils = require('../libs/utils');
const runAll = require('./runAll');
const chalk = require('chalk');
const printNotification = require('../libs/notifications/print-notification');
const { name: cliName, version } = require('../../package.json');
const { getServerlessFilePath } = require('../libs/serverlessFile');
const confirm = require('@serverless/utils/inquirer/confirm');
const t = require('../../i18n');
const {computeDuration,reportLogger} = require('../libs/reports/index')
const { LogLevel } = require('../libs/reports/constants');
const componentsVersion = version;

module.exports = async (config, cli, command) => {
  // No dynamic value, default is false
  config.debug = false;

  let instanceDir = process.cwd();
  if (config.target) {
    instanceDir = path.join(instanceDir, config.target);
  }

  if (
    !config.target &&
    utils.runningTemplate(instanceDir) &&
    utils.checkTemplateAppAndStage(instanceDir)
  ) {
    return runAll(config, cli, command);
  }

  let telemtryData = await generatePayload({ command });
  let instanceCredentials;
  let instanceYaml;
  let startTime;
  let userInfo = {}
  try {
    const hasPackageJson = await utils.fileExists(path.join(process.cwd(), 'package.json'));

    if (
      command === 'deploy' &&
      !getServerlessFilePath(process.cwd()) &&
      hasPackageJson &&
      !config.target
    ) {
      try {
        const generatedYML = await utils.generateYMLForNodejsProject(cli);
        await fs.promises.writeFile(
          path.join(process.cwd(), 'serverless.yml'),
          generatedYML,
          'utf8'
        );
        utils.loadInstanceConfig.clear();
        cli.log(t('自动生成 serverless.yml 成功，即将部署'));
      } catch (e) {
        e.extraErrorInfo = {
          step: t('配置文件生成'),
          source: 'Serverless::CLI',
        };
        throw e;
      }
    }

    // Start CLI persistance status
    cli.sessionStart(t('正在初始化'), { timer: true });

    await utils.checkBasicConfigValidation(instanceDir);

    await utils.login(config);
    
    //初始化开始时间值
    startTime = new Date().getTime()

    // Load YAML
    instanceYaml = await utils.loadTencentInstanceConfig(instanceDir, command);

    // Presentation
    const meta = `Action: "${command}" - Stage: "${instanceYaml.stage}" - App: "${instanceYaml.app}" - Name: "${instanceYaml.name}"`;
    if (!config.debug) {
      cli.logLogo();
      cli.log(meta, 'grey');
    } else {
      cli.log(meta);
    }

    cli.sessionStatus(t('正在初始化'), instanceYaml.name);

    // Load Instance Credentials
    instanceCredentials = await utils.loadInstanceCredentials(instanceYaml.stage);

    // initialize SDK
    userInfo = await tencentUtils.getUserInfo();
    const orgUid = userInfo.appId.toString()
    const sdk = new ServerlessSDK({
      accessKey: tencentUtils.buildTempAccessKeyForTencent({
        SecretId: process.env.TENCENT_SECRET_ID,
        SecretKey: process.env.TENCENT_SECRET_KEY,
        Token: process.env.TENCENT_TOKEN,
      }),
      context: {
        orgUid,
        orgName: instanceYaml.org,
        traceId: uuidv4(),
      },
      agent: `ComponentsCLI_${version}`,
    });

    telemtryData = await generatePayload({
      command,
      rootConfig: instanceYaml,
      userId: orgUid,
    });

    // if the command is not deploy and remove, it's a custom command, we should change the event to components.custom.xxx
    if (command !== 'deploy' && command !== 'remove') {
      telemtryData.event = `components.custom.${command}`;
    }

    // Prepare Options
    const options = {};
    options.debug = config.debug;
    options.dev = config.dev;
    options.force = config.force;
    options.forceDelete = config.forceDelete;
    options.noValidation = config.noValidation;
    options.noCache = config.noCache;
    options.componentsVersion = componentsVersion;
    options.cliName = cliName;

    const cliendUidResult = await utils.writeClientUid();
    if (!cliendUidResult[orgUid]) {
      options.client_uid = cliendUidResult.value;
    }
    let deferredNotificationsData;
    if (command === 'deploy') {
      deferredNotificationsData = null;
      // Warn about dev agent
      if (options.dev) {
        cli.log();
        cli.log(
          '"--dev" option detected.  Dev Agent will be added to your code.  Do not deploy this in your production stage.',
          'grey'
        );
      }

      // run deploy
      cli.sessionStatus('', null, 'white');
      options.statusReceiver = (statusMsg) => {
        if (statusMsg) {
          cli.sessionStatus(statusMsg, null, 'white');
        } else {
          cli.sessionStatus(t('部署中'), null, 'white');
        }
      };
      const instance = await sdk.deploy(instanceYaml, instanceCredentials, options);
      const vendorMessage = instance.outputs.vendorMessage;
      delete instance.outputs.vendorMessage;
      cli.log();
      if (instance.typeErrors) {
        cli.logTypeError(instance.typeErrors);
        cli.log();
        // 上报部署失败日志
        reportLogger({
          logMessage:`${command} failed: ${instance.deploymentError}`,
          cliCommand: command ,
          cliDuration: computeDuration(startTime), 
          appId: orgUid,
          uin: userInfo.uin,
          cliComponent: instanceYaml && instanceYaml.component ? instanceYaml.component :  '',
          cliAppName: instanceYaml  ? (instanceYaml.app || instanceYaml.name || '')  : '',
          instanceYaml
        },LogLevel.Error)
      }else {
        // 上报部署成功日志
        reportLogger({
          logMessage: `${command} success`,
          cliCommand: command ,
          cliDuration: computeDuration(startTime), 
          appId: orgUid,
          uin: userInfo.uin,
          cliComponent: instanceYaml && instanceYaml.component ? instanceYaml.component :  '',
          cliAppName: instanceYaml  ? (instanceYaml.app || instanceYaml.name || '')  : '',
          instanceYaml,
          },LogLevel.Info
        )
      }
      cli.logOutputs(instance.outputs);
      cli.log();
      cli.log(`${chalk.grey(t('应用控制台:'))} ${utils.getInstanceDashboardUrl(instanceYaml)}`);
      if (vendorMessage) {
        cli.log();
        cli.log(`${chalk.green(vendorMessage)}`);
      }

      // Insert appId into client_uid-credentials to avoid repeatly searching database, no matter the status of instance is succ or fail
      if (!cliendUidResult[orgUid]) {
        utils.writeJsonToCredentials(utils.clientUidDefaultPath, {
          client_uid: { ...cliendUidResult, [orgUid]: true },
        });
      }
      if (instance.instanceStatus === 'error') {
        telemtryData.outcome = 'failure';
        telemtryData.failure_reason = instance.deploymentError;
      }
    } else if (command === 'remove') {
      cli.log();
      cli.log(t('您正在尝试删除应用，此操作不可逆，请谨慎操作！'), 'red');
      cli.log(
        t('应用关联的其他云资源（如COS、CLS等），平台均不会关联删除，您可以前往对应产品控制台删除，避免不必要的计费。'),
        'red'
      );
      cli.sessionStop('close', t('等待确认'));
      let answer = false;
      if (options.forceDelete) {
        cli.log();
        cli.log(t('已配置 forceDelete 参数跳过用户确认直接执行注销应用'), 'red');
        answer = true;
      } else {
        answer = await confirm(
          t('我确认要注销此应用，并删除对应的函数资源。我已知晓这些资源删除后将无法找回'),
          {
            name: 'removeConfirm',
          }
        );
      }
      if (answer) {
        cli.sessionStart(t('删除中'), { timer: true });
        cli.sessionStatus(t('删除中'), null, 'white');
        // run remove
        let removeRes = await sdk.remove(instanceYaml, instanceCredentials, options);
        // 上报remove操作日志
        if (removeRes.error) {
          reportLogger({
            logMessage:`${command} failed: ${instance.deploymentError}`,
            cliCommand:command ,
            cliDuration: computeDuration(startTime),
            appId: orgUid,
            uin: userInfo.uin,
            cliComponent: instanceYaml && instanceYaml.component ? instanceYaml.component :  '',
            cliAppName: instanceYaml  ? (instanceYaml.app || instanceYaml.name || '')  : '',
            instanceYaml,
            error: removeRes.error
            },LogLevel.Error)
        } else {
          reportLogger({
            logMessage:`${command} success`,
            cliCommand:command ,
            cliDuration: computeDuration(startTime),
            appId: orgUid,
            uin: userInfo.uin,
            cliComponent: instanceYaml && instanceYaml.component ? instanceYaml.component :  '',
            cliAppName: instanceYaml  ? (instanceYaml.app || instanceYaml.name || '')  : '',
            instanceYaml,
          },LogLevel.Info)
        }
      } else {
        cli.log();
        cli.log(t('已取消删除'));
      }
    } else if (command === 'bind' && config.params[0] === 'role') {
      await sdk.bindRole(instanceCredentials,
        {
          ...options,
          region: process.env.SERVERLESS_PLATFORM_STAGE === 'dev' ? 'ap-shanghai' : 'ap-guangzhou',
          token: process.env.TENCENT_TOKEN,
          sdkAgent: sdk.agent,
          traceId: sdk.context.traceId,
        }
      );
      cli.log(t('已成功开通 Serverless 相关权限'));
      // 上报bind role操作成功日志
      reportLogger({
        logMessage:`${command} role success`,
        cliCommand: command ,
        cliDuration: computeDuration(startTime),
        appId: orgUid,
        uin: userInfo.uin,
        cliComponent: instanceYaml && instanceYaml.component ? instanceYaml.component :  '',
        cliAppName: instanceYaml  ? (instanceYaml.app || instanceYaml.name || '')  : '',
        instanceYaml,
        },LogLevel.Info
      )
    } else if (command === 'login') {
      // we have do login upside, so if command is login, do nothing here
      // no op
    } else {
      // run a custom method synchronously to receive outputs directly
      options.sync = true;

      // run a custom method
      cli.sessionStatus(t('正在运行'), null, 'white');
      // We need to convert xx-yy-zz into xx_yy_zz, due to we can not use a 'xx-yy` as the name of function in nodejs
      command = command.replace(/-/g, '_');
      const instance = await sdk.run(command, instanceYaml, instanceCredentials, options);

      cli.log();
      cli.logOutputs(instance.outputs);
      if (instance.actionStatus === 'error') {
        telemtryData.outcome = 'failure';
        telemtryData.failure_reason = instance.actionError;
      }
    }
    cli.sessionStop('success', t('执行完毕'));

    await storeLocally(telemtryData);
    if (deferredNotificationsData) printNotification(cli, await deferredNotificationsData);
    // we will send all telemtry data into metrics server while deploying
    if (command === 'deploy') {
      await sendTelemtry();
    }

    sdk.disconnect();
    return null;
  } catch (e) {
    // 上报命令执行错误日志
    if (e.message) {
      reportLogger(
        { 
          logMessage: `${command} failed: ${e.message}`,
          cliCommand:command,
          cliDuration: computeDuration(startTime),
          appId: userInfo.appId, 
          uin: userInfo.uin,
          cliComponent: instanceYaml && instanceYaml.component ? instanceYaml.component :  '',
          cliAppName: instanceYaml  ? (instanceYaml.app || instanceYaml.name || '')  : '',
          instanceYaml,
          error: e.message
        },LogLevel.Error
      )
    }
    telemtryData.outcome = 'failure';
    telemtryData.failure_reason = e.message;
    await storeLocally(telemtryData, e);
    if (command === 'deploy') {
      await sendTelemtry();
    }

    throw e;
  }
};
