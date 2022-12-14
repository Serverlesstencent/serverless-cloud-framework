'use strict';

/*
 * serverless-tencent: Command: Dev
 */

const path = require('path');
const { Writable } = require('stream');
const ansiEscapes = require('ansi-escapes');
const chokidar = require('chokidar');
const { ServerlessSDK, utils: chinaUtils } = require('@serverless-cloud-framework/platform-client-china');
const { generatePayload, storeLocally } = require('../libs/telemtry');
const { standaloneUpgrade } = require('../libs/standalone');
const { v4: uuidv4 } = require('uuid');
const utils = require('../libs/utils');
const chalk = require('chalk');

class LogForwardingOutput extends Writable {
  _write(chunk, encoding, callback) {
    process.stdout.write(ansiEscapes.eraseDown);
    process.stdout._write(chunk, encoding, callback);
    process.stdout.write(ansiEscapes.cursorLeft);
  }

  _writev(chunks, callback) {
    process.stdout.write(ansiEscapes.eraseDown);
    process.stdout._writev(chunks, callback);
    process.stdout.write(ansiEscapes.cursorLeft);
  }
}

const logForwardingOutput = new LogForwardingOutput();
let functionInfoStore = null;
let regionStore = null;
let cliEventCallback = null;

const getInstanceInfo = async (sdk, instance) => {
  const { instance: instanceInfo } = await sdk.getInstance(
    instance.org,
    instance.stage,
    instance.app,
    instance.name
  );
  return instanceInfo;
};

/*
 * Deploy changes and hookup event callback which will be called when
 * deploying status has been changed.
 * @param sdk - instance of ServerlessSDK
 * @param instance - instance object
 * @param credentials - credentials used for deploy
 * @param enventCallback - event callback, when set to false, it will remove all event listener
 */
async function deploy(sdk, instance, credentials) {
  // The new debug api does not support deploying instance while it's in debugging mode, so stop it before deployment
  if (
    functionInfoStore &&
    regionStore &&
    cliEventCallback &&
    chinaUtils.doesRuntimeSupportDebug(functionInfoStore.runtime)
  ) {
    try {
      await chinaUtils.stopTencentRemoteLogAndDebug(
        functionInfoStore,
        regionStore,
        cliEventCallback
      );
    } catch (e) {
      e.extraErrorInfo = {
        source: 'Tencent',
      };
      throw e;
    }
  }
  let instanceInfo = {};

  try {
    await sdk.deploy(instance, credentials);
    const instanceStatusPollingStartTime = new Date().getTime();
    instanceInfo = await getInstanceInfo(sdk, instance);
    while (instanceInfo.instanceStatus === 'deploying') {
      instanceInfo = await getInstanceInfo(sdk, instance);
      if (Date.now() - instanceStatusPollingStartTime > 24000) {
        throw new Error('??????????????????????????????');
      }
    }
  } catch (e) {
    instanceInfo.instanceStatus = 'error';
    instanceInfo.deploymentError = e;
    instanceInfo.extraErrorInfo = e.extraErrorInfo;
  }

  return instanceInfo;
}

async function updateDeploymentStatus(cli, instanceInfo, startDebug) {
  const { instanceStatus, instanceName, deploymentError, deploymentErrorStack } = instanceInfo;
  const d = new Date();
  const header = `${d.toLocaleTimeString()} - ${instanceName} - deployment`;

  cliEventCallback.stdout = logForwardingOutput;

  switch (instanceStatus) {
    case 'active': {
      const {
        state: { lambdaArn, region, function: stateFunction },
        outputs: { scf, runtime, namespace },
      } = instanceInfo;
      regionStore = region;

      let runtimeInfo = runtime;
      let namespaceInfo = namespace;
      if (!runtimeInfo && scf) {
        runtimeInfo = scf.runtime;
      }

      if (!runtimeInfo && stateFunction && stateFunction.Runtime) {
        runtimeInfo = stateFunction.Runtime;
      }
      if (!namespaceInfo && scf) {
        namespaceInfo = scf.namespace;
      }

      if (!namespaceInfo && stateFunction && stateFunction.Namespace) {
        namespaceInfo = stateFunction.Namespace;
      }

      if (lambdaArn && runtimeInfo && region) {
        const functionInfo = {
          functionName: lambdaArn,
          namespace: namespaceInfo,
          runtime: runtimeInfo,
        };
        functionInfoStore = functionInfo;
        try {
          await chinaUtils.stopTencentRemoteLogAndDebug(functionInfo, region, cliEventCallback);
          if (startDebug) {
            await chinaUtils.startTencentRemoteLogAndDebug(functionInfo, region, cliEventCallback);
          }
        } catch (e) {
          e.extraErrorInfo = {
            source: 'Tencent',
          };
          throw e;
        }
      }
      cli.log(header, 'grey');
      delete instanceInfo.outputs.vendorMessage;
      cli.logOutputs(instanceInfo.outputs);
      cli.sessionStatus('?????????');
      return true;
    }
    case 'error':
      cli.log(`${header} error`, 'grey');
      cli.log(deploymentErrorStack || deploymentError, 'red');
      cli.sessionStatus('?????????');
      break;
    default:
      cli.log(`????????????????????????????????????????????????: ${instanceStatus}`, 'red');
  }
  return false;
}

// eslint-disable-next-line consistent-return
module.exports = async (config, cli, command) => {
  // Load serverless component instance.  Submit a directory where its config files should be.
  let instanceDir = process.cwd();
  if (config.target) {
    instanceDir = path.join(instanceDir, config.target);
  }
  if (utils.runningTemplate(instanceDir)) {
    cli.log(
      `Serverless: ${chalk.yellow('?????????????????????????????????????????????, ?????? --target ??????????????????')}`
    );
    process.exit(1);
  }

  const projectFile = await utils.checkBasicConfigValidation(instanceDir);
  if (
    projectFile &&
    projectFile.inputs &&
    projectFile.inputs.runtime &&
    projectFile.inputs.runtime.toLowerCase().startsWith('nodejs')
  ) {
    cli.log('????????????????????????????????????????????????????????????????????????????????????:');
    cli.log(
      '1. ?????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????'
    );
    cli.log('2. $LATEST????????????????????????????????????900s');
    cli.log('3. ?????????????????????????????????????????????');
    cli.log('?????????????????????Node.js?????????>=10.15, ?????????????????????????????????');
  }

  let watcher;

  cliEventCallback = (msg, option) => {
    if (option && option.type === 'error') {
      cli.logError(
        {
          message: msg,
          step: '??????????????????',
          source: 'Tencent::Scf',
        },
        { command: 'dev' }
      );
      console.log('');
      process.exit(1);
    } else {
      cli.log(msg, 'grey');
    }
  };
  cliEventCallback.stdout = logForwardingOutput;

  // Define a close handler, that removes any "dev" mode agents
  const closeHandler = async () => {
    // Set new close listener
    process.on('SIGINT', () => {
      cli.sessionStop('error', 'dev ???????????????');
      process.exit();
    });

    if (watcher) {
      await watcher.close();
    }
    cli.sessionStatus('dev ???????????????', null, 'green');
    const deployedInstance = await deploy(sdk, instanceYaml, instanceCredentials);
    if (await updateDeploymentStatus(cli, deployedInstance, false)) {
      cli.sessionStop('success', 'dev ???????????????');
      await standaloneUpgrade(config);
      return null;
    }
    cli.sessionStop('error', '???????????????????????? ???scf deploy??? ????????????');
    await standaloneUpgrade(config);
    return null;
  };

  // Start CLI persistance status
  cli.sessionStart('Initializing', { closeHandler });

  await utils.login(config);

  // Presentation
  cli.logLogo();
  cli.log('Dev Mode -????????????????????????????????????????????????????????', 'grey');
  cli.log();

  let instanceYaml = await utils.loadTencentInstanceConfig(instanceDir, command);

  // Load Instance Credentials
  const instanceCredentials = await utils.loadInstanceCredentials(instanceYaml.stage);

  const orgUid = await chinaUtils.getOrgId();
  const sdk = new ServerlessSDK({
    context: {
      orgName: instanceYaml.org,
      traceId: uuidv4(),
      orgUid,
    },
  });

  const telemtryData = await generatePayload({
    command,
    rootConfig: instanceYaml,
    userId: orgUid,
  });
  cli.sessionStatus('Initializing', instanceYaml.name);

  try {
    // Filter configuration
    const filter = {
      stageName: instanceYaml.stage,
      appName: instanceYaml.app,
      instanceName: instanceYaml.name,
      events: [],
    };

    // User wants to receive all messages at the app level
    if (config.filter && config.filter === 'app' && filter.instanceName) {
      delete filter.instanceName;
      cli.log('Enabling filtering at the activity at the application level', 'grey');
      cli.log();
    }

    /**
     * Watch logic
     */

    let isProcessing = false; // whether there's already a deployment in progress
    let queuedOperation = false; // whether there's another deployment queued

    // Set watcher
    watcher = chokidar.watch(process.cwd(), { ignored: /\.serverless/ });

    watcher.on('ready', async () => {
      cli.sessionStatus('dev ???????????????', null, 'green');
      // Try to stop debug mode before first time deploy
      const instanceInfo = await getInstanceInfo(sdk, instanceYaml);
      if (
        instanceInfo &&
        instanceInfo.instanceStatus &&
        instanceInfo.instanceStatus !== 'inactive'
      ) {
        const {
          state: { lambdaArn, region, function: stateFunction },
          outputs: { scf, runtime, namespace },
        } = instanceInfo;
        regionStore = region;

        let runtimeInfo = runtime;
        let namespaceInfo = namespace;
        if (!runtimeInfo && scf) {
          runtimeInfo = scf.runtime;
        }
        if (!runtimeInfo && stateFunction && stateFunction.Runtime) {
          runtimeInfo = stateFunction.Runtime;
        }
        if (!namespaceInfo && scf) {
          namespaceInfo = scf.namespace;
        }
        if (!namespaceInfo && stateFunction && stateFunction.Namespace) {
          namespaceInfo = stateFunction.Namespace;
        }

        if (lambdaArn && runtimeInfo && region && chinaUtils.doesRuntimeSupportDebug(runtimeInfo)) {
          functionInfoStore = {
            functionName: lambdaArn,
            namespace: namespaceInfo,
            runtime: runtimeInfo,
          };
        }
      }

      const deployedInstance = await deploy(sdk, instanceYaml, instanceCredentials);
      await updateDeploymentStatus(cli, deployedInstance, true);
      if (deployedInstance.instanceStatus === 'error') {
        telemtryData.outcome = 'failure';
        telemtryData.failure_reason = deployedInstance.deploymentError;
      }
      await storeLocally(telemtryData);
    });

    // "raw" makes sure to catch all FS events, not just file changes
    watcher.on('raw', async () => {
      // Skip if processing already and there is a queued operation
      if (isProcessing && queuedOperation) {
        return;
      }

      // If already deploying and user made more changes, queue another deploy operation to be run after the first one
      if (isProcessing && !queuedOperation) {
        queuedOperation = true;
        return;
      }

      // If it's not processin and there is no queued operation
      if (!isProcessing) {
        let deployedInstance;
        isProcessing = true;
        cli.sessionStatus('Deploying', null, 'green');
        // reload serverless component instance
        instanceYaml = await utils.loadInstanceConfig(instanceDir, command);
        deployedInstance = await deploy(sdk, instanceYaml, instanceCredentials);
        if (queuedOperation) {
          cli.sessionStatus('Deploying', null, 'green');
          // reload serverless component instance
          instanceYaml = await utils.loadInstanceConfig(instanceDir, command);
          deployedInstance = await deploy(sdk, instanceYaml, instanceCredentials);
        }

        await updateDeploymentStatus(cli, deployedInstance, true);
        isProcessing = false;
        queuedOperation = false;
      }
    });
  } catch (e) {
    if (e.extraErrorInfo) {
      e.extraErrorInfo.step = '??????????????????';
    } else {
      e.extraErrorInfo = {
        step: '??????????????????',
      };
    }
    telemtryData.outcome = 'failure';
    telemtryData.failure_reason = e.message;
    await storeLocally(telemtryData, e);

    throw e;
  }
};
