'use strict';

const path = require('path');
const { inspect } = require('util');
const semver = require('semver');
const { fileExistsSync } = require('../../../libs/utils');
const chalk = require('chalk');
const { execSync } = require('child_process');
const t = require('../../../../i18n');

// If this process is called from standalone or npm script
const isStandaloneExecutable = Boolean(
  process.pkg && /^(?:\/snapshot\/|[A-Z]+:\\snapshot\\)/.test(__dirname)
);

const checkRuntime = (requiredRuntime, cli) => {
  if (!requiredRuntime) {
    throw new Error(t('必须指定所需要的运行时'));
  }

  if (requiredRuntime.includes('Nodejs')) {
    const { node } = process.versions;
    if (!node) {
      throw new Error(t('当前环境没有Nodejs运行时，请先安装'));
    }
    const requiredMajorVer = requiredRuntime.split('.')[0].slice(6) - 0;
    const requiredMinorVer = requiredRuntime.split('.')[1] - 0;
    const currentMajorVer = semver.parse(node).major;
    const currentMinorVer = semver.parse(node).minor;

    if (currentMajorVer !== requiredMajorVer || currentMinorVer !== requiredMinorVer) {
      cli.log(
        t('当前系统Node版本为 {{node}}, 项目指定的版本为 {{requiredRuntime}}, 建议使用相同版本进行测试。\n', { node, requiredRuntime })
      );
    }
  } else if (requiredRuntime.includes('Python')) {
    let pythonInfo;
    try {
      pythonInfo = execSync(
        `${
          process.env.INVOKE_LOCAL_PYTHON || 'python'
        } -c "import platform; print(platform.python_version())"`
      );
      pythonInfo = Buffer.from(pythonInfo).toString();
    } catch (e) {
      throw new Error(t('检查当前环境的Python 运行时出错，错误信息: {{attr0}}', { attr0: e.message }));
    }
    const requiredMajorVer = requiredRuntime.split('Python')[1].split('.')[0];
    const requiredMinorVer = requiredRuntime.split('Python')[1].split('.')[1];
    const currentMajorVer = pythonInfo.split(' ')[0].split('.')[0];
    const currentMinorVer = pythonInfo.split(' ')[0].split('.')[1];

    if (currentMajorVer !== requiredMajorVer || currentMinorVer !== requiredMinorVer) {
      cli.log(
        t('当前系统Python版本为 {{attr0}}, 项目指定的版本为 {{requiredRuntime}}, 建议使用相同版本进行测试。\n', { attr0: pythonInfo
          .split(' ')[0]
          .replace('\n', ''), requiredRuntime })
      );
    }
  } else if (requiredRuntime.includes('Php')) {
    let phpInfo;
    try {
      phpInfo = execSync(
        `${process.env.INVOKE_LOCAL_PHP || 'php'} -r "echo phpversion();"`
      ).toString();
      const currentMajorVer = phpInfo.split('.')[0];
      const requiredMajorVer = requiredRuntime.split('Php')[1].split('.')[0];
      if (currentMajorVer !== requiredMajorVer) {
        cli.log(
          t('当前系统Php 版本为 {{phpInfo}}, 项目指定版本为 {{requiredRuntime}}, 建议使用相同版本', { phpInfo, requiredRuntime })
        );
      }
    } catch (e) {
      throw new Error(t('检查当前环境的Php 运行时出错，错误信息: {{attr0}}', { attr0: e.message }));
    }
  } else {
    colorLog(t('当前命令只支持 Node.js 和 Python 运行时，其他运行时暂不支持。'), 'yellow', cli);
  }
};

const summaryOptions = (config, instanceYml, cli) => {
  const {
    f,
    function: invokedFunc,
    data,
    d,
    path: eventDataPath,
    p,
    context,
    contextPath,
    x,
    py,
    php,
  } = config;
  const { inputs = {}, component } = instanceYml;

  let eventData = {};
  let contextData = {};

  // parse event data from cli
  if ((data || d) && (eventDataPath || p)) {
    colorLog(t('不能同时指定 data 与 path，请检查后重试。'), 'yellow', cli);
  }
  if (data || d) {
    try {
      eventData = JSON.parse(data || d);
    } catch (e) {
      colorLog(t('事件参数(event)数据格式错误，请检查后重试。'), 'yellow', cli);
    }
  } else if (eventDataPath || p) {
    const pPath = path.join(process.cwd(), eventDataPath || p);
    if (!fileExistsSync(pPath)) {
      colorLog(t('找不到指定的路径文件 {{pPath}}，请检查后重试', { pPath }), 'yellow', cli);
    }

    eventData = require(`${pPath}`);
  }

  // parse context data from cli
  if (context && (contextPath || x)) {
    colorLog(t('不能同时指定 context 与 contextPath，请检查后重试。'), 'yellow', cli);
  }
  if (context) {
    try {
      contextData = JSON.parse(context);
    } catch (e) {
      colorLog(t('环境参数(context)参数数据格式错误，请检查后重试。'), 'yellow', cli);
    }
  } else if (contextPath || x) {
    const pPath = path.join(process.cwd(), eventDataPath || p);
    if (!fileExistsSync(pPath)) {
      colorLog(t('找不到指定的路径文件 {{pPath}}，请检查后重试', { pPath }), 'yellow', cli);
    }
    contextData = require(`${pPath}`);
  }

  // Set user's customized env variables to process.env: --env or -e
  if (config.env || config.e) {
    const userEnv = config.env || config.e;
    const envs = Array.isArray(userEnv) ? userEnv : [userEnv];
    envs.forEach((item) => {
      const [k, v] = item.split('=');
      process.env[k] = v;
    });
  }

  // Set env vars from instance config file
  if (inputs.environment && inputs.environment.variables) {
    for (const [k, v] of Object.entries(inputs.environment.variables)) {
      process.env[k] = v;
    }
  }

  // For python runtime, users can set python execution by --py: scf invoke local --py python3
  if (py) {
    process.env.INVOKE_LOCAL_PYTHON = py;
  }

  // For php runtime, users can set php execution by --php: scf invoke local --php php7
  if (php) {
    process.env.INVOKE_LOCAL_PHP = php;
  }

  if (isStandaloneExecutable && process.env.NODE_OPTIONS) {
    delete process.env.NODE_OPTIONS;
    colorLog(
      t('Binary 环境下不能添加环境变量 NODE_OPTIONS, 已自动删除。 如要在本地调试下使用此变量，请安装 npm 版本之后重新执行命令: npm i -g serverless-tencent')
    );
  }

  // Deal with scf component(single instance situation)
  if (component.startsWith('scf')) {
    const inputsHandler = inputs.handler || '';
    if (!inputsHandler) {
      colorLog(t('调用函数未指定，请检查 serverless.yml 中的 hanlder 配置后重试。'), 'yellow', cli);
    }

    const [handlerFile, handlerFunc] = inputsHandler.split('.');

    return [eventData, contextData, handlerFile, handlerFunc];
  } else if (component.startsWith('multi-scf')) {
    // multi scf instances component
    const functions = inputs.functions || null;
    if (!functions) {
      colorLog(
        t('functions 字段配置错误，请检查serverless.yml 中的 functions 配置后重试.'),
        'yellow',
        cli
      );
    }
    const specificFunc = f || invokedFunc;

    if (!specificFunc) {
      colorLog(t('请使用 --function / -f 指定要调用的函数'), 'yellow', cli);
    }

    const choosedFunc = functions[specificFunc];

    if (!choosedFunc) {
      colorLog(
        t('未找到待调用的函数: {{specificFunc}}，请检查 serverless.yml 中的 functions 配置后重试.', { specificFunc }),
        'yellow',
        cli
      );
    }

    const { handler } = choosedFunc;

    const [handlerFile, handlerFunc] = handler.split('.');

    return [eventData, contextData, handlerFile, handlerFunc];
  }

  return [eventData, contextData];
};

const colorLog = (msg, color = 'green', cli = console) => {
  const logMsg = `Serverless: ${chalk[color](`${msg}`)}\n`;

  if (cli && cli.log) {
    cli.log(logMsg);
  }

  // when display a warning message, need to stop the process
  if (color === 'yellow') {
    process.exit();
  }
};

const handleError = (err) => {
  let errorResult;
  if (err instanceof Error) {
    errorResult = {
      errorMessage: err.message,
      errorType: err.constructor.name,
      stackTrace: err.stack && err.stack.split('\n'),
    };
  } else {
    errorResult = {
      errorMessage: err,
    };
  }
  console.log(chalk.red(JSON.stringify(errorResult, null, 4)));
};

const printOutput = (cli, res = {}, err = null) => {
  cli.log('---------------------------------------------');
  if (err) {
    colorLog(t('调用错误'), 'red', cli);
    handleError(err);
  } else {
    colorLog(t('调用成功'), 'green', cli);
    cli.log(inspect(res, { depth: Infinity, colors: true, compact: 0 }));
  }
  cli.log();
};

module.exports = {
  checkRuntime,
  summaryOptions,
  colorLog,
  handleError,
  printOutput,
};
