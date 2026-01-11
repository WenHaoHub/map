const { defineConfig } = require("@vue/cli-service");

module.exports = defineConfig({
  transpileDependencies: true,
  
  // 部署应用包时的基本 URL
  publicPath: "./",
  
  // 生产环境构建文件的目录
  outputDir: "dist",
  
  // 放置生成的静态资源 (js、css、img、fonts) 的目录
  assetsDir: "static",
  
  // 生产环境的 source map
  productionSourceMap: false,

  // 开发服务器配置
  devServer: {
    port: 8080,
    open: true,
    hot: true,
    // 静态资源服务配置
    // static: {
    //   directory: require('path').join(__dirname, 'public'),
    //   watch: {
    //     // 忽略大体积的地图数据文件，提升开发性能
    //     ignored: [require('path').resolve(__dirname, 'public/mapJSON')]
    //   }
    // },
    // 跨域代理配置
    proxy: {
      "/api": {
        target: "https://www.scgzjg.cn",
        changeOrigin: true,
        secure: true,
        pathRewrite: {
          "^/api": "" // 将 /api 前缀移除
        },
        logLevel: "debug",
        onProxyReq: function (proxyReq, req, res) {
          console.log(
            "代理请求:",
            req.method,
            req.url,
            "-> https://www.scgzjg.cn" + req.url.replace("/api", "")
          );
        },
        onProxyRes: function (proxyRes, req, res) {
          console.log("代理响应:", proxyRes.statusCode, req.url);
        },
        onError: function (err, req, res) {
          console.log("代理错误:", err.message);
        }
      }
    }
  },

  // Webpack配置
  configureWebpack: (config) => {
    // 路径别名
    config.resolve.alias["@"] = require("path").resolve(__dirname, "src");

    // 不再复制地图数据文件，全部使用线上数据
    // mapGeoJSON 文件夹不会被打包到 dist 中
  },

  // 链式配置
  chainWebpack: (config) => {
    // 开发环境优化
    if (process.env.NODE_ENV === "development") {
      // 提升开发构建速度
      config.devtool("eval-cheap-module-source-map");
    }

    // 生产环境排除 mapGeoJSON 目录
    if (process.env.NODE_ENV === "production") {
      config.plugin("copy").tap(([options]) => {
        // 添加 ignore 规则，排除 mapGeoJSON 目录
        options.patterns[0].globOptions = {
          ...options.patterns[0].globOptions,
          ignore: [
            ...(options.patterns[0].globOptions?.ignore || []),
            "**/mapGeoJSON/**"
          ]
        };
        return [options];
      });
    }
  }
});
