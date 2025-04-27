// 日志等级分类
const LogLevel  = {
    Error: 'error',
    Warning: 'warning',
    Info: 'info',
    Debug: 'debug',
}


// 抽样率配置
const SamplingRateConfig = {
    [LogLevel.Error]: 1.0,     // 100%采集错误
    [LogLevel.Warning]: 0.5,   // 50%采集警告
    [LogLevel.Info]: 0.8,      // 80%采集信息
    [LogLevel.Debug]: 0.01     // 1%采集调试信息
};

const Command_Excute_Status = {
    Success: '0', // 执行成功
    Error: '1'  // 执行失败
}


module.exports = {
    LogLevel,
    SamplingRateConfig,
    Command_Excute_Status
};
  