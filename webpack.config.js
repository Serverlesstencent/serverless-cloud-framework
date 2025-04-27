'use strict';

const path = require('path');
const nodeExternals = require('webpack-node-externals');
const TerserPlugin = require('terser-webpack-plugin');
const fs = require('fs');
const pkgPath = path.resolve(__dirname, 'package.json');
const packageJson = require(pkgPath);

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

module.exports = {
  mode: 'production',
  entry: {
    index: './src/index.js'
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    libraryTarget: 'commonjs2',
  },
  resolve: {
    modules: [path.resolve(__dirname, 'node_modules'), 'node_modules']
  },
  optimization: {
    concatenateModules: true, // 合并模块减少体积
    minimize: true, // 生产环境启用压缩
    minimizer: [
      new TerserPlugin({
        extractComments: false, // 禁用提取许可证
      }),
    ],
    splitChunks: {
      cacheGroups: {
        vendor: {
          test: /[\/]node_modules\/@tencent[\/]/,
          name: 'lib',
          chunks: 'all',
          enforce: true
        }
      }
    }
  },
  target: 'node',
  externalsPresets: { node: true },
  externals: [
    nodeExternals({
      // 允许打包以下依赖（如果需要排除其他依赖，调整 allowlist）
      allowlist: tencentDeps
    })
  ],
  plugins: [
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
