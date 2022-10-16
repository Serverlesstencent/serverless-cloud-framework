---
title: "Tencent Serverless - 开始使用"
menuText: "开始使用 Serverless"
menuOrder: 2
description: 安装 Serverless CLI 工具并开始使用。
layout: Doc
---

# 开始使用 Serverless

通过开源的 Serverless CLI 工具您仅需几分钟就可以开始无服务器的开发工作。

## 安装 Serverless CLI

通过 NPM 安装最新的 Serverless CLI：

```bash
npm install -g serverless-cloud-framework
```

> 注意: 如果您的电脑上没有安装 Node.js 和 NPM，请先[安装所需依赖](https://nodejs.org/zh-cn/)。我们建议您使用最新的长期维护版本（LTS）的 Node.js。

## 升级 Serverless CLI

如果您通过 NPM 安装了 Serverless CLI，您可以通 NPM 进行升级：

```bash
npm install -g serverless-cloud-framework
```

同时 Serverless 为腾讯云提供支持的 Tencent Serverless CLI 会自动检查是否有最新发布版本，并提示您进行升级，如下：

```bash
Tencent Serverless CLI 有新版本更新，是否立即升级？(Y/n)

# 确认升级后会自动下载并安装最新的 Serverless Tencent CLI。
⠧ 正在升级 Tencent Serverless CLI 
```

> 注意: Serverless CLI 会为中国用户和腾讯云的 Serverless 项目自动安装 Tencent Serverless CLI，并自动切换。如果您想使用 AWS 云服务，请在命令前添加环境变量 `SLS_GEO_LOCATION=us`。 更多内容请查看[ CLI 的高级使用说明](./guides/cli-advance)。

## 开始使用

执行 `serverless-cloud-framework` （或 `scf`）快速创建一个 Serverless 项目，并根据提示进行操作：

```bash
# 创建新的 serverless 应用
scf

# 进入创建的项目目录
cd your-service-name
```

> 您可以使用 `scf` 替换 `serverless-cloud-framework` 来执行 Serverless CLI 的所有功能。

`scf` 命令会引导并创建一个新的项目，并提供了调试，部署，日志查看，移除应用等命令帮助您更好的进行 Serverless 应用开发。同时您也可以添加管理您的[腾讯云账号](./guides/tencent-account)授权。

> 注意: Serverless CLI 会为中国用户和腾讯云的 Serverless 项目自动安装 Tencent Serverless CLI，并自动切换。如果您想使用 AWS 云服务，请在命令前添加环境变量 `SLS_GEO_LOCATION=us`。 更多内容请查看[ CLI 的高级使用说明](./guides/cli-advance)。


新创建的项目会包含 `serverless.yml` 文件，这是 Serverless 应用的所需的配置文件，它定义了会被部署到云上的所有信息：云函数，事件，资源等。

如果通过 `serverless` 创建的模板项目无法满足您的使用需求，您也可以查看我们的[应用示例](https://cn.serverless.com/examples)。

### 部署应用

您可以随时通过以下命令来部署您的 Serverless 应用：

```bash
scf deploy
```

部署完成后的应用信息，资源和 URL 地址都会在终端命令行中显示。

### 查看详情

在应用部署完成之后，可以随时通过 `info` 来查看部署的应用的详细输出信息，信息中包含运行状态，版本信息，生成的网关地址，生成的数据库账号密码等信息。

```bash
scf info
```

### 调试开发

在应用部署之后，可以通过 `dev` 命令开启远程开发功能，在此状态下终端命令行会监听部署的 Serverless 应用终端输出并同步到本地终端，方便开发者在本地进行云环境下应用的调试:

```bash
scf dev
```

### 远程调用函数

在云函数应用(SCF 和 Multi-SCF 组件应用)部署之后，除了通过部署完成返回的调用 URL 地址调用之外，可以通过 `invoke` 调用远程云函数:

```bash
scf invoke -f my-func
```

同时也可以在调用函数时传递所需的 Event 对象数据：

```bash
$ scf invoke -f my-func -d '{"foo":"bar"}'
```

### 查看日志

在应用部署后，所有的应用日志信息都会存储在腾讯云上，可以通过 `logs` 查看应用的最新日志：

```bash
scf logs
```

或者使用 `--tail` 模式监听应用的实时日志：

```bash
scf logs --tail
```

## 移除应用

通过 `scf remove` 您可以移除已部署的 Serverless 应用和它创建时生成的所有相关资源。

```bash
scf remove
```
