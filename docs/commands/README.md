---
title: "Tencent Serverless - CLI 命令"
menuText: "CLI 命令概述"
menuOrder: 4
description: Serverless CLI 命令概述
layout: Doc
---

# Serverless CLI 命令

Serverless CLI 为 serverlss 开发提供了完善的功能支持，使得开发者无需登录控制台，在本地就可以创建、开发、调试、管理您的 serverless 应用。

通过 [NPM 安装](#npm) 或 [二进制安装](#binary) 方式，来安装 Serverless CLI 并开始 Serverless 开发。

## 通过 npm 安装 & 升级

npm 是 Node.js 的包管理工具, 安装前需要确定您的环境中已安装好了 Node.js (版本 > 10)，更多请查看 [Node.js 安装指南](https://nodejs.org/zh-cn/download/) 。

```sh
# 使用 npm 全局安装 serverless 命令行工具
$ npm install -g serverless-cloud-framework

# 使用 cnpm 及镜像全局安装 serverless 命令行工具
$ npm install -g cnpm --registry=https://registry.npm.taobao.org
$ cnpm install -g serverless-cloud-framework

# 升级 serverless 命令行到最新版本
$ npm update -g serverless-cloud-framework
```

> 如 MacOS 提示无权限，可以通过 `sudo npm install -g serverless-cloud-framework` 进行安装。

## 查看版本信息

安装完成后，可以通过执行`scf -v`命令，来检查安装的 serverless 命令行工具版本信息：

```sh
# 查看系统当前 serverless 版本信息
$ scf -v
```

安装成功后可以出现如下的版本信息。

```
Framework Core: 2.33.1
Plugin: 4.5.3
SDK: 4.2.2
Components: 3.8.2
```

- 可以通过 `serverless-cloud-framework --help` 或 `scf [command] --help`，查看帮助指令说明。
- 请及时更新 CLI 客户端到最新版本，以便获得 CLI 的最新完整功能。
