const loggerConfig  = require('./config')
const {LogLevel,SamplingRateConfig,Command_Excute_Status} = require('./constants')
const {getRegionFromYaml,getFuncNameFromYaml,getUnixNanoTime} = require('../utils/index');
const { version: cliVersion } = require('../../../package.json');
// const  got = require('got');
const  { Logger } = require('@tencent/galileo-node-sdk');
const { sleep } = require('@serverless-cloud-framework/platform-client-china/src/utils');

/**
 * 初始化日志上报实例
 */
const initGalileoLogger = () =>  {
    // 生成一个日志上报实例，可全局使用，避免每次上报动态属性值都需要new一个实例
    global.galileoLogger = new Logger({
        attributes: {}, // 自定义属性，适合用于全局固定属性场景，作用域较大
        ...loggerConfig.common,
    });
}

/**
 * 计算上报日志duration
 * @param {*} startTime 
 * @returns 
 */
const computeDuration = (startTime) => {
    if (!startTime) {
      return 0
    }
    const endTime = new Date().getTime()
    const duration = endTime > startTime ? endTime - startTime : 0
    return duration.toString()
}

/**
 * 判断日志必传参数值都不为空
 * @param {*} loggerParams 
 * @returns 
 */
const validateLoggerField = (logParams) => {
    if (!logParams || !logParams.cliCommand || ['lang'].includes(logParams.cliCommand)) {
        return false
    }
    let validKeys;
    if (
        // 针对基于serverless.yml文件的CLI操作，校验日志上报的必传字段
        ['deploy','info','logs','remove ','invoke'].includes(logParams.cliCommand)
    ) {
        validKeys = ['logMessage','cliCommand','cliDuration','appId','uin','cliComponent','cliAppName','instanceYaml']
    } else {
        // 针对不需要serverless.yml文件的CLI操作，校验日志上报的必传字段
        validKeys = ['logMessage','cliCommand','cliDuration']
    }
    const isValid = validKeys.every(key => key && !!logParams[key])
    return isValid
}

/**
 * 上报日志
 * @param {*} logParams 日志参数对象
 * @param {*} level 日志等级
 * @returns 
 */
const  reportLogger = async (logParams,level = LogLevel.Info) => {
    // 清理上一次的延时器
    if (global.timer) {
        clearTimeout(global.timer)
        global.timer = null
    }
    // 避免阻塞主流程，使用setTimeout通过异步任务执行日志上报
    global.timer = setTimeout(async () => {
        try {
            // 校验必传日志参数key
            if (
                !validateLoggerField(logParams) || !global.galileoLogger
            ) {
                return
            }
            const {logMessage,instanceYaml = {}} = logParams
            const traceId = level === LogLevel.Error && logMessage.match(/TraceId:\s*([a-f0-9\-]+)/) ? logMessage.match(/TraceId:\s*([a-f0-9\-]+)/)[1] : (logParams.traceId || '')
            const samplingRate = SamplingRateConfig[level];
            const newLogParams = {
                logMessage: logMessage,
                cliCommand: logParams.cliCommand,
                cliDuration: logParams.cliDuration,
                cliSubCommand: logParams.cliSubCommand || '',
                appId: logParams.appId || '',
                uin: logParams.uin || '',
                cliAppName: logParams.cliAppName || '',
                cliComponent: logParams.cliComponent ? logParams.cliComponent.replace('@dev','') :  '',
                cliFunctionName: getFuncNameFromYaml(instanceYaml),
                cliTraceId: traceId,
                cliStatus: level === LogLevel.Error ? Command_Excute_Status.Error : Command_Excute_Status.Success,
                region: getRegionFromYaml(instanceYaml),
                cliVersion,
                nodeVersion: process.version,
                cliSamplingRate: samplingRate.toString(),
            }
            // 根据日志等级匹配不同抽样率进行抽样上报
            const randomNum = Math.random();
            if (randomNum < samplingRate) {
                //node sdk方式上报日志
                switch (level) {
                    case LogLevel.Info:
                    default:
                        global.galileoLogger.info(logMessage,newLogParams)
                        break;
                    case LogLevel.Error:
                        global.galileoLogger.error(logMessage,newLogParams)
                        break;
                    case LogLevel.Warning:
                        global.galileoLogger.warn(logMessage,newLogParams)
                        break;
                    case LogLevel.Debug:
                        global.galileoLogger.debug(logMessage,newLogParams)
                        break;
                }
                // 延迟上报
                await sleep(loggerConfig.reportDelayTime)
            }
        } catch (error) {}
    },0)
}


module.exports = {
    initGalileoLogger,
    computeDuration,
    reportLogger
};