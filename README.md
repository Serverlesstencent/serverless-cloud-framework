# serverless-cloud-framework

<!-- [![Build Status](https://github.com/serverless/serverless/workflows/Integrate/badge.svg)](https://github.com/serverless/serverless/actions?query=workflow%3AIntegrate) -->
<!-- [![npm version](https://badge.fury.io/js/serverless.svg)](https://badge.fury.io/js/serverless) -->
<!-- [![codecov](https://codecov.io/gh/serverless/serverless/branch/master/graph/badge.svg)](https://codecov.io/gh/serverless/serverless) -->
<!-- [![Known Vulnerabilities](https://snyk.io/test/github/serverless/serverless/badge.svg)](https://snyk.io/test/github/serverless/serverless) -->
<!-- [![license](https://img.shields.io/npm/l/serverless.svg)](https://www.npmjs.com/package/serverless) -->

<p align="center">
  <a href="https://cloud.tencent.com/document/product/1154/38787">🇨🇳 中文网站</a> •
</p>

## 目录

- [快速开始](#quickstart)
- [支持的命令](#commands)
- [功能特点](#features)
- [贡献代码](#contribute)

## <a name="quickstart"></a>快速开始

### 前置条件

1. Nodejs 12.x 及以上版本
2. Serverless CLI `v3.0+`, 如果没有安装可以使用 `npm i -g serverless-cloud-framework` 命令安装
3. [注册](https://cloud.tencent.com/register)腾讯云账号并[开通相关权限](https://cloud.tencent.com/document/product/1154/43006)

### 安装使用

#### 直接使用 serverless-cloud-framework CLI

```sh
$ npm i -g serverless-cloud-framework
$ scf init express-starter --name example
$ cd example
$ scf deploy
```

## <a name="commands"></a>支持的命令

- [Init 创建](/docs/commands/init.md)
- [Deploy 部署](/docs/commands/deploy.md)
- [Info 详情](/docs/commands/info.md)
- [Dev 远程开发](/docs/commands/dev.md)
- [Logs 日志](/docs/commands/logs.md)
- [Remove 移除](/docs/commands/remove.md)
- [Credentials 授权](/docs/commands/credentials.md)
- [Registry 注册中心](/docs/commands/registry.md)
- [Invoke 远程调用](/docs/commands/invoke.md)
- [Invoke Local 本地调用](/docs/commands/invoke-local.md)

## <a name="features"></a>功能特点

- 支持 `Node.js, Python, Java, Go, Php, `, 也可以使用[自定义运行环境](https://cloud.tencent.com/document/product/583/47274)
- 可以通过**serverless-tencent CLI**管理你的 serverless 项目的整个生命周期:
  - 部署: `scf deploy`
  - 调用: `scf invoke`
  - 本地调用: `scf invoke local`, 当前支持`Node.js, Python, Php` 项目
  - 日志查看: `scf logs`
  - 实例信息查看: `scf info`
  - 实例删除: `scf remove`
  - 实时调试: `scf dev`
- 丰富的[官方组件支持, 下面所列出仅为一部分](https://github.com/orgs/serverless-components/repositories?language=&q=tencent&sort=&type=all)
  - [scf](https://github.com/serverless-components/tencent-scf)
  - [http](https://github.com/serverless-components/tencent-http)
  - [multi-scf](https://github.com/serverless-components/tencent-multi-scf)
  - [website](https://github.com/serverless-components/tencent-website)
  - [DiscusQ](https://github.com/serverless-components/tencent-discuzq)
- 对不同组件的配置文件字段进行校验, 包括*字段类型，字段值的范围，字段可取限制等*，为用户提供更友好的开发体验和错误排查。 当前支持对`scf, multi-scf, http, website`组件的配置文件进行校验

## <a name="contribute"></a>贡献代码

_serverless-cloud-framework_ 是一个包容友好的开源项目，欢迎不同的代码贡献者

### 单元测试补充

1. 我们的单元测试代码位于 `tests/` 目录之下，使用[jest](https://jestjs.io/) 作为测试工具，`npm run test` 运行所有的单元测试
2. 您需要为你提交的功能代码补充对应的单元测试, 并且不可以破坏已有的其他模版对应的单元测试。 这是我们保证*serverless-cloud-framework* 代码健壮性的基本条件

### Canary 测试版本

提交代码到 `master` 分支，合并之后会自动发布项目的 `canary` 版本，可以通过 `npm i -g serverless-cloud-framework@canary` 安装测试

### 发布正式版本

1. 功能完成之后，需要修改 `package.json/version` 字段以及在 `CHANGELOG.md` 中写明更新日志
2. 提交代码到 `master`, 合并之后自动发布正式版本
