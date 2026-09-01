'use strict';

const path = require('path');
const nodeExternals = require('webpack-node-externals');
const TerserPlugin = require('terser-webpack-plugin');
const fs = require('fs');
const pkgPath = path.resolve(__dirname, 'package.json');
const packageJson = require(pkgPath);
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

// 自动获取dependencies下@tencent/xxx所有依赖以及对应的peerDependencies
function getTencentDependencies() {
  const tencentPath = path.resolve(__dirname, 'node_modules/@tencent');
  if (!fs.existsSync(tencentPath)) return [];
  const devDepTencentPkgs = Object.keys(packageJson['devDependencies'])?.filter(key => key.startsWith('@tencent/')) || [];
  return fs.readdirSync(tencentPath)
    .filter(pkg => {
      try {
        require.resolve(`@tencent/${pkg}`);
        // 过滤掉devDependencies下@tencent/xxx依赖
        if (devDepTencentPkgs.includes(`@tencent/${pkg}`)) {
          return false
        } else { 
          return true; 
        }
      } catch {
        return false;
      }
    })
    .map(pkg => `@tencent/${pkg}`);
}

const tencentDeps = getTencentDependencies();

module.exports = (env, argv) => {
  // 获取 mode 值
  const mode = argv.mode || 'development'; // 默认开发模式
  console.log('当前模式: ', mode, '')
  // 判断当前模式是否是生产环境
  const isProd = mode === 'production';

  return {
    mode: mode,
    entry: {
      index: './src/index.js'
    },
    output: {
      path: path.resolve(__dirname, 'dist'),
      libraryTarget: 'commonjs2',
    },
    target: 'node',
    node: {
        __dirname: false,
        __filename: false,
        global: false
    },
    optimization: {
      concatenateModules: true, // 合并模块减少体积
      minimize: true, // 生产环境启用压缩
      minimizer: [
        new TerserPlugin({
          extractComments: false, // 禁用提取许可证
          terserOptions: {
            // 限定压缩输出的 ECMAScript 版本上限为 ES5，
            // 避免 Terser 把 `x == null ? y : x` / `a && a.b` 等 ES5 写法
            // 自动优化（折叠）成 Node 12 不支持的 `??` / `?.` 语法，
            // 导致低版本 Node 环境下 require 时抛出 SyntaxError。
            ecma: 5,
            compress: {
              ecma: 5,
            },
            output: {
              ecma: 5,
            },
          },
        }),
      ],
      splitChunks: {
        minSize: 30000, // 最小30KB才拆分
        maxSize: 250000, // 尝试拆分大于250KB的包
        cacheGroups: {
          vendor: { // 抽离内部依赖包
            test: /[\/]node_modules\/@tencent[\/].*[\\/]/,
            name: 'galileo.lib',
            chunks: 'all',
            enforce: true
          },
          opentelemetryVendor: {
            test: (module) => { // 抽离外部第三方依赖包
              if (!module.context) return false;
              return (
                /[\/]node_modules\/@opentelemetry[\/].*[\\/]/.test(module.context) ||
                /[\\/]node_modules[\\/]axios[\\/]/.test(module.context)
              );
            },
            name: 'lib',
            chunks: 'all',
            enforce: true
          }
        }
      }
    },
    externalsPresets: { node: true },
    resolve: {
      fallback: {
        "path": false, // 不打包 path 模块
        "fs": false, // 不打包 fs 模块
        "child_process": false // 不打包子进程模块
      }
    },
    externals: [nodeExternals({
      // 允许打包以下依赖包打包目标文件
      allowlist: [
        /^@tencent\/*/,
        /^@opentelemetry\/*/,
        /^axios\/*/
      ]
    })],
    plugins: [
      // 打包分析包大小分布情况
      !isProd ? new BundleAnalyzerPlugin() : null,
      // 构建后处理 package.json
      {
        apply: (compiler) => {
          compiler.hooks.done.tap('RemoveTencentDeps', (stats) => {
            if (!stats.hasErrors()) {
              try {
                  // 1.去掉package.json文件里dependencies下的所有@tencent/xxx依赖
                  const pkgPath = path.resolve(__dirname, 'package.json');
                  const pkg = require(pkgPath);
                  let changed = false;
                  ['dependencies', 'peerDependencies'].forEach(depType => {
                    if (pkg[depType]) {
                      tencentDeps.forEach(dep => {
                        if (pkg[depType][dep]) {
                          delete pkg[depType][dep];
                          changed = true;
                        }
                      });
                    }
                  });
                  if (changed) {
                    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2)) + '\n'
                  }
                  // 2.清理 node_modules/@tencent/xxx依赖
                  tencentDeps.forEach(tecentPkg => {
                    const tencentPath = path.resolve(__dirname, `node_modules/${tecentPkg}`);
                    if (fs.existsSync(tencentPath)) {
                      fs.rmSync(tencentPath, { recursive: true, force: true });
                    }
                  })
              } catch (error) {
                fs.rmSync(path.resolve(__dirname, 'dist'), { recursive: true, force: true });
                throw new Error('打包失败: 清理node_modules下内部依赖依赖@tencent出错');
              }
            }
          });
        }
      }
    ],
    node: {
      __dirname: false,
    },
  };
}
