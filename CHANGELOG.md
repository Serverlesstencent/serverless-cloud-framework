## 1.4.1 (2026-09-11)


### Bug Fixes

* 发布1.4.1版本，由于semantic-release已经打了1.4.0的tag 9cf5847

# 1.4.0 (2026-09-11)


### Bug Fixes

* 修复scf cli检测最新版本异常问题 842f4fd
* 修复依赖axios依赖包不兼容node12的问题 c41e641
* 流水线误修改的发布记录，可忽略 f0c836b
* 重新更新package.json的版本为1.40,避免semantic-release识别不到待发布的版本


### Features

* 更新cli版本:1.3.3 dc4e47b

## 1.3.4 (2026-09-01)


### Bug Fixes

* 修复scf cli检测最新版本异常问题 842f4fd

## 1.3.1 (2025-10-22)


### Bug Fixes

* cli主要操作接入监控日志上报 c856952
* 修复安装beta版本cli出现监控[@opentelemetry](http://git.woa.com/opentelemetry)依赖404问题 a5ab0b2
* 修复自研流水线devcloud子机上的部署ssl报错问题 644c5b6

# 1.3.0 (2025-04-09)


### Features

* apigw net offline b7465d5
* cli本地持配置语言，默认英文 c6c28af
* 删除scf param参数 8045837

## 1.2.2 (2025-03-07)


### Bug Fixes

* publish命令支持--rollback回滚组件版本参数 8b4e257

## 1.2.1 (2025-01-18)


### Bug Fixes

* cli客户端放开700m code size limit 1e4f752

# 1.2.0 (2024-06-27)


### Bug Fixes

* 文案 4c77a2a


### Features

* 函数URL 27757a3

# 1.2.0-beta.1 (2024-06-20)


### Bug Fixes

* 文案 4c77a2a


### Features

* 函数URL 27757a3

# 1.1.0 (2024-05-08)


### Features

* 优化检查CLI版本逻辑 7c7e9c5

# 1.1.0-beta.1 (2024-05-07)


### Features

* 优化检查CLI新版本 4d2456d
* 如果版本超过最新版本提示用户 4228c04

## 1.0.6-beta.0 (2024-04-10)

### Features

- 优化检查 CLI 新版本

## 1.0.5 (2024-1-22)

- 执行 scf remove 时需手动确认
- 新版本提示升级

## 1.0.4 (2023-12-27)

升级 @serverless-cloud-framework/platform-client-china 库，压缩 cli 上传代码

## 1.0.3 (2023-9-21)

移除失效链接

## 1.0.2 (2022-10-16)

Init serverless-cloud-framework cli
