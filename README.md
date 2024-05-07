<h1 align="center" style="border-bottom: none;">serverless-cloud-framework</h1>
<p align="center">
  <a href="https://cloud.tencent.com/document/product/1154/38787">官方文档</a>
</p>
<p align="center">
  <a href="https://www.npmjs.com/package/serverless-cloud-framework">
    <img alt="npm next version" src="https://img.shields.io/npm/v/serverless-cloud-framework/latest.svg">
  </a>
</p>

## 目录

- [简介](#description)
- [快速开始](#quickstart)
- [支持的命令](#commands)
- [功能特点](#features)

## <a name="description"></a>简介

Serverless Cloud Framework 是业界非常受欢迎的无服务器应用框架，开发者无需关心底层资源即可部署完整可用的 Serverless 应用架构。Serverless Cloud Framework 具有资源编排、自动伸缩、事件驱动等能力，覆盖编码、调试、测试、部署等全生命周期，帮助开发者通过联动云资源，迅速构建 Serverless 应用。

## <a name="quickstart"></a>快速开始

### 前置条件

1. Nodejs 12.x 及以上版本
2. Serverless CLI, 如果没有安装可以使用 `npm i -g serverless-cloud-framework` 命令安装
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
- 可以通过**serverless-cloud-framework CLI**管理你的 serverless 项目的整个生命周期:
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
