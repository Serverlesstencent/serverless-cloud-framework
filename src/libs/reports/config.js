// 是否配置内网访问
const isInner = process.env.SERVERLESS_TENCENT_NET_TYPE === 'inner'
// 是否是CLI的现网环境
const isProd = process.env.SERVERLESS_PLATFORM_STAGE !== 'dev'
module.exports = {
    common:  {
        platform: 'Zhiyan', //服务部署名称
        app: 'scfcli-client-monitor', // 应用名称
        server: 'prod', // 服务名称
        namespace: isProd ? 'Production' : 'Development' , // 物理环境，Production(正式环境) | Development(测试环境)
        env: isProd ? 'formal' : 'test', // 用户环境，namespace=Production时，env必须是formal, namespace=Development时，env可以为test, 或者特性环境(以123容器平台为例 8bfe8607)
        // 过滤器，对于被调而言只需要设置callerMethod: ['clb-healthcheck', 'Tencent-Leakscan']就可以实现屏蔽健康检查和安全扫描的上报；对于主调只需要设置被调方法即可，比如屏蔽rainbow拉取配置calleeMethod: ['/APIConf/getConfigInfo']
        filter: { callerMethod: ['clb-healthcheck', 'Tencent-Leakscan'], calleeMethod: ['/APIConf/getConfigInfo'] }, 
        target: 'Zhiyan.scfcli-client-monitor.prod',
        logCollectorAddr: isInner ? 'http://otlp.j.woa.com:80/v1/logs' : 'https://galileotelemetry.tencent.com/v1/logs', //日志上报域名地址
        resource: {
            attributes: [
                {
                    key: "telemetry.sdk.language", //伽利略监控SDK语言
                    value: {
                        string_value: "nodejs"
                    }
                },
                {
                    key: "telemetry.sdk.name", //伽利略监控SDK名称
                    value: {
                        string_value: "galileo"
                    }
                },
                {
                    key: "telemetry.sdk.version", //伽利略监控SDK版本
                    value: {
                        string_value: "v0.3.4"
                    }
                },
                {
                    key: "target",
                    value: {
                        string_value: "Zhiyan.scfcli-client-monitor.prod"
                    }
                },
                {
                    key: "namespace",  // 物理环境，Production(正式环境) | Development(测试环境)
                    value: {
                        string_value: isProd ? 'Production' : 'Development' 
                    }
                },
                {
                    key: "env",  // 用户环境，namespace=Production时，env必须是formal, namespace=Development时，env可以为test, 或者特性环境(以123容器平台为例 8bfe8607)
                    value: {
                        string_value: isProd ? "formal" : "test"
                    }
                },
                {
                    key: "server",  //监控服务名称
                    value: {
                        string_value: "scfcli-client-monitor.prod"
                    }
                }
            ]
        }
    },
    reportDelayTime: 5 * 1000, //上报持续时间: 5秒
}