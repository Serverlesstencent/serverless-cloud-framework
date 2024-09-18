'use strict';

/*
 * serverless-tencent: Command: Help
 */

const chalk = require('chalk');
const { distance: getDistance } = require('fastest-levenshtein');
const utils = require('../libs/utils');
const t = require('../../i18n');

const title = chalk.blue.bold;
const command = chalk.blue;
const command2 = chalk.bold.blue;
const description = chalk.blue;
const gray = chalk.gray;

async function generateMainHelp(cli) {
  async function isInSCFComponentFolder() {
    try {
      const instanceYaml = await utils.loadInstanceConfig(process.cwd());
      if (instanceYaml && instanceYaml.component.includes('scf')) {
        return true;
      }
    } catch (error) {
      return false;
    }

    return false;
  }

  cli.logLogo();

  let scfCommands = '';
  if (await isInSCFComponentFolder()) {
    scfCommands = `
${title(t('函数组件命令'))}

${command('invoke')}           ${t('调用函数')}
${command('invoke local')}     ${t('本地调用函数')}`;
  }

  const paramCommands = `
${title(t('参数配置'))}         ${t('在线文档')}: https://cn.serverless.com/framework/docs-commands-parameters

${command('param set')}        ${t('在项目目录下配置动态参数')}
${command('param list')}       ${t('在项目目录下展示已配置的动态参数')}`;

  cli.log(
    `
${title(t('快速开始'))}
${gray(t('* 直接输入 "serverless-cloud-framework" (或缩写 "scf") 进行项目初始化'))}

${title(t('链接'))}
${gray(t('产品文档: https://cloud.tencent.com/document/product/1154'))}
${gray(t('控制面板: https://console.cloud.tencent.com/sls'))}
${gray(t('问答社区: https://github.com/Serverlesstencent/serverless-cloud-framework/discussions'))}

${title(t('命令'))}
${gray(t('* 您可以通过 "serverless-cloud-framework" 或简称 "scf" 来执行命令'))}
${gray(t('* 使用 "scf [command] --help" 获取详细帮助信息'))}

${command('init')}             ${t('通过模板初始化新项目')}
${command('deploy')}           ${t('部署应用到云端')}
${command('info')}             ${t('获取应用详情')}
${command('dev')}              ${t('启动调试模式')}
${command('logs')}             ${t('查看应用日志')}
${command('remove')}           ${t('移除应用')}
${command('credentials')}      ${t('管理全局授权信息')}
${command('registry')}         ${t('查看模版信息')}
${command('bind role')}        ${t('重新为当前用户分配使用 Serverless 所需权限')}
${scfCommands}
${paramCommands}
  `
  );
}

function generateCommandHelp(commandName, cli) {
  const allowedCommands = {
    'init': `
${command2('init')}                       ${t('通过模板初始化新应用')}
${description(`    {template}               ${t('[必填]')} ${t('模板名称')}
    --name                   ${t('指定应用目录名称')}
`)}`,
    'deploy': `
${command2('deploy')}                    ${t('部署应用到云端')}
${description(`    --stage / -s             ${t('指定环境名称，默认使用配置环境')}
    --target                 ${t('指定要部署的组件实例路径')}
    --inputs                 ${t('覆写 inputs 配置')}
    --profile                ${t('使用指定身份的全局授权信息')}
    --login                  ${t('使用临时授权')}
    --force                  ${t('强制部署，跳过缓存和 serverless 应用校验')}
    --noCache                ${t('跳过缓存')}
    --noValidation           ${t('跳过 serverless 应用校验')}
    --debug                  ${t('显示 debug 信息')}
`)}`,
    'info': `
${command2('info')}                      ${t('获取应用详情')}
${description(`    --stage / -s             ${t('指定环境名称，默认使用配置环境')}
    --profile                ${t('指定身份的全局授权信息')}
`)}`,
    'dev': `
${command2('dev')}                       ${t('启动调试模式')}
${description(`    --stage / -s             ${t('指定环境名称，默认使用配置环境')}
    --profile                ${t('使用指定身份的全局授权信息')}
    --target                 ${t('指定执行命令的组件实例路径')}
`)}`,
    'logs': `
${command2('logs')}                      ${t('查看应用日志')}
${description(`    --function / -f          ${t('查看多函数组件的指定函数日志(单函数组件无需指定)')}
    --target                 ${t('指定要查看的组件实例路径')}
    --stage / -s             ${t('指定环境名称，默认使用配置环境')}
    --startTime              ${t('指定开始时间，如：3h, 20130208T080910，默认10m')}
    --tail / -t              ${t('启动监听模式')}
    --intervial / -i         ${t('监听模式的刷新时间 默认：2000ms')}
    --region / -r            ${t('指定地区名称，默认使用配置地区')}
    --namespace / -n         ${t('指定命名空间，默认使用配置命名空间')}
    --qualifier / -q         ${t('指定函数版本，默认使用配置版本')}
`)}`,
    'remove': `
${command2('remove')}                    ${t('移除应用')}
${description(`    --stage / -s             ${t('指定环境名称，默认使用配置环境')}
    --target                 ${t('指定要移除的组件实例路径')}
    --profile                ${t('使用指定身份的全局授权信息')}
    --debug                  ${t('显示 debug 信息')}
`)}`,
    'credentials': `
${command2('credentials')}               ${t('管理全局授权信息')}
${command2('credentials set')}           ${t('存储用户授权信息')}
${description(`    --secretId / -i          ${t('[必填]')}${t('腾讯云CAM账号secretId')}
    --secretKey / -k         ${t('[必填]')}${t('腾讯云CAM账号secretKey')}
    --profile / -n {name}    ${t('身份名称. 默认为 "default"')}
    --overwrite / -o         ${t('覆写已有身份名称授权信息')}`)}
${command2('credentials remove')}        ${t('删除用户授权信息')}
${description(`    --profile / -n {name}    ${t('身份名称. 默认为 "default"')}`)}
${command2('credentials list')}          ${t('查看已有用户授权信息')}
`,
    'registry': `
${command2('registry')}                  ${t('查看模版信息')}
${description(`    {name}                   ${t('模板名称')}
`)}`,
    'publish': `
${command2('publish')}                   ${t('发布组件或模版到应用中心')}
`,
    'bind role': `
${command2('bind role')}                 ${t('重新为当前用户分配使用 Serverless 所需权限')}
`,
    'invoke': `
${command2('invoke')}                    ${t('调用函数')}
${description(`    --function / -f          ${t('调用的多函数组件的函数名称(单函数组件无需指定)')}
    --target                 ${t('指定要调用的组件实例路径')}
    --stage / -s             ${t('指定环境名称，默认使用配置环境')}
    --region / -r            ${t('指定地区名称，默认使用配置地区')}
    --data / -d              ${t('指定传入函数的事件(event)参数数据，需要使用序列化的 JSON 格式')}
    --path / -p              ${t('指定传入还输的事件(event)参数的 JSON 文件路径')}
    --namespace / -n         ${t('指定命名空间，默认使用配置命名空间')}
    --qualifier / -q         ${t('指定函数版本，默认使用配置版本')}
`)}`,
    'invoke local': `
${command2('invoke local')}              ${t('本地调用函数')}
${description(`    --function / -f          ${t('调用的多函数组件的函数名称(单函数组件无需指定)')}
    --target                 ${t('指定要调用的组件实例路径')}
    --data / -d              ${t('指定传入函数的事件(event)参数数据，需要使用序列化的 JSON 格式')}
    --path / -p              ${t('指定传入还输的事件(event)参数的 JSON 文件路径')}
    --context                ${t('指定传入函数的上下文(context)参数数据，需要使用序列化的 JSON 格式')}
    --contextPath / -x       ${t('指定传入函数的上下文(context)参数的 JSON 文件路径')}
    --env / -e               ${t('指定环境变量信息 如: --env VAR=val')}
    --config / -c            ${t('指定使用的配置文件')}
    --py                     ${t('指定要使用的本机中的Python版本，默认使用python. 如: --py python3 (此配置只对runtime是Python的配置有效)')}
    --php                    ${t('指定要使用的本机中的Php版本，默认使用php. 如: --php php7.2 (此配置只对runtime是Php的配置有效)')}
`)}`,
    'param set': `
${command2(
  'param set'
)}               ${t('在项目中配置参数,支持多参数配置: scf param set key1=value1 key2=value2')}
`,
    'param list': `
${command2('param list')}              ${t('在项目中获取并展示已配置的所有参数')}
`,
  };

  if (allowedCommands[commandName]) {
    cli.log(allowedCommands[commandName]);
  } else {
    // suggest command
    const commandWordsArr = Object.keys(allowedCommands);
    const { suggestion } = commandWordsArr.reduce(
      (pre, cur) => {
        const distance = getDistance(commandName, cur);
        if (pre.minDistance === 0 || pre.minDistance > distance) {
          return {
            suggestion: cur,
            minDistance: distance,
          };
        }

        return pre;
      },
      { suggestion: '', minDistance: 0 }
    );
    // Serverless command "log" not found. Did you mean "logs"? Run "serverless help" for a list of all available commands.
    cli.log();
    cli.log(
      `Serverless: ${chalk.yellow(
        t('没有找到 "{{commandName}}" 命令. 你想查看的是 "{{suggestion}}" 的帮助信息吗? 可以通过 "scf help" 查看所有可用命令', {commandName, suggestion})
      )}`
    );
    cli.log();
  }
}

module.exports = async (config, cli) => {
  // Get command name
  let commandName;
  // sls [command] --help
  if (config.help === true) {
    commandName = config.originalCommand;
    const paramStr = config.params.join(' ');
    if (paramStr) commandName = `${commandName} ${paramStr}`;
  }

  // sls --help [command]
  if (config.help && config.help !== true) {
    commandName = config.help;
    if (config.originalCommand) commandName = `${commandName} ${config.originalCommand}`;
  }

  // sls help [command]
  if (!config.help && config.params.length > 0) {
    commandName = config.params.join(' ');
  }

  if (commandName) {
    generateCommandHelp(commandName, cli);
  } else {
    await generateMainHelp(cli);
  }
};
