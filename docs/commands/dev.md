---
title: "Tencent Serverless - Dev 远程开发"
menuText: "Dev 远程开发"
menuOrder: 4
description: Serverless 远程开发模式
layout: Doc
---

# dev 远程开发模式

远程开发模式是为处于开发状态下的项目可以更便捷的进行代码编写、开发调试而设计的。在开发模式中，用户可以持续地进行开发-调试的过程，尽量减少打包、更新等其他工作的干扰。

打开开发模式后，Serverless Framework 工具将启动持续文件监控；在本地代码文件有修改的情况下，自动再次进行部署，将本地文件同步更新到云端，实现本地项目与云端项目的实时同步。

```sh
# 进入组件应用的开发调试模式
$ scf dev
```

## 命令选项

```sh
dev                       启动远程开发模式模式
    --stage / -s             指定环境名称，默认使用配置环境
    --profile                使用指定身份的全局授权信息
    --target                 指定执行命令的组件实例路径
```

## 使用说明

### 进入远程开发模式

在项目目录下执行 `serverless dev` 命令，可以进入项目的开发模式。

示例如下：

```
$ scf dev
serverless ⚡ framework
dev 模式开启中...

Debugging listening on ws://127.0.0.1:9222.
For help see https://nodejs.org/en/docs/inspector.
Please open chorme, and visit chrome://inspect, click [Open dedicated DevTools for Node] to debug your code.
--------------------- The realtime log ---------------------
17:13:38 - express-api-demo - deployment
region: ap-guangzhou
apigw:
  serviceId:   service-b77xtibo
  subDomain:   service-b77xtibo-1253970226.gz.apigw.tencentcs.com
  environment: release
  url:         http://service-b77xtibo-1253970226.gz.apigw.tencentcs.com/release/
scf:
  functionName: express_component_6r6xkh60k
  runtime:      Nodejs10.15
  namespace:    default

express-api-demo ›  监听中 ...
```

在进入 dev 模式后，Serverless 工具将输出部署的内容，并启动持续文件监控；在代码文件有修改的情况下，将自动再次进行部署，将本地文件更新到云端。

再次部署并输出部署信息：

```plaintext
express-api-demo › Deploying ...
Debugging listening on ws://127.0.0.1:9222.
For help see https://nodejs.org/en/docs/inspector.
Please open chorme, and visit chrome://inspect, click [Open dedicated DevTools for Node] to debug your code.
--------------------- The realtime log ---------------------
21:11:31 - express-api-demo - deployment
region: ap-guangzhou
apigw:
  serviceId:   service-b7dlqkyy
  subDomain:   service-b7dlqkyy-1253970226.gz.apigw.tencentcs.com
  environment: release
  url:         http://service-b7dlqkyy-1253970226.gz.apigw.tencentcs.com/release/
scf:
  functionName: express_component_uo5v2vp
  runtime:      Nodejs10.15
  namespace:    default
```

> !当前 `serverless dev` 仅支持 Node.js 10 运行环境，后续将支持 Python、PHP 等运行环境的实时日志。

### 退出远程开发模式

在开发模式下，通过 Ctrl+C 可以退出开发模式（dev 模式）。

```
express-api-demo › Dev 模式关闭中 ...

express-api-demo › Dev Mode Closed
```

## 云端调试：Node.js 10+

针对 Runtime 为 Node.js 10+ 的项目，可以通过开启云端调试，并使用针对 Node.js 的调试工具来连接云端调试，例如 Chrome DevTools、VS Code Debugger。

### 开启云端调试

在按如上方案进入开发模式时，如果是 Runtime 为 Node.js 10 及以上版本的函数，会自行开启云端调试，并输出调试相关信息。

例如在开启开发模式时，如果有如下输出，则代表已经启动云函数的云端调试：

```plaintext
Debugging listening on ws://127.0.0.1:9222.
For help see https://nodejs.org/en/docs/inspector.
Please open chorme, and visit chrome://inspect, click [Open dedicated DevTools for Node] to debug your code.
```

### 使用调试工具 Chrome DevTools

以下步骤说明如何使用 Chrome 浏览器的 DevTools 工具来连接远程环境并进行调试：

1. 启动 Chrome 浏览器。
2. 在地址栏中输入 `chrome://inspect/` 并访问。
3. 可通过以下两种方式打开 DevTools。如下图所示：
   ![](https://main.qcloudimg.com/raw/a731827f731370cce0a245ef7252e4ea.png)
4. （推荐）单击 Devices 下的【Open dedicated DevTools for Node】。
5. 选择 Remote Target #LOCALHOST 中具体 Target 下的【inspect】。
   如果无法打开或者没有 Target，请检查 Device 的 Configure 中是否已有 `localhost:9229` 或 `localhost:9222` 的配置，该配置对应开启云端调试时的输出。
6. 通过选择【Open dedicated DevTools for Node】方式打开的 DevTools 调试工具，可单击【Sources】页签看远端代码。函数的实际代码在 `/var/user/` 目录下。
   在【Sources】页签中查看的代码可能处于加载中，会随着调试进行而展示出更多远端文件。
7. 可按需打开文件，在文件的指定位置设置断点。
8. 通过任意方式，例如 URL 访问、页面触发、命令触发、接口触发等方式触发函数，会使得远端环境开始运行，并会在设置了断点的位置中断，等待进一步的运行。
9. 通过 DevTools 的右侧工具栏，可以控制中断的程序继续执行、单步执行、步入步出等操作，也可以直接查看当前变量，或设定需跟踪查看的变量。DevTools 的进一步使用可以搜索查询 DevTools 使用说明文档。

### 关闭云端调试

在退出开发模式时，将会自动关闭云端调试功能。