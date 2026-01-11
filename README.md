# 中国地图下钻展示项目

基于 Vue2 + ECharts 实现的中国地图下钻可视化项目，支持从省份下钻到区县级别展示。

访问 http://localhost:8080/?province=sichuan 即可直接加载四川地图并隐藏底部标签栏
## 功能特性

✨ **多级下钻**: 中国地图 → 省份区县地图
🎨 **炫酷UI**: 深色科技风格，带动画效果
🔍 **交互友好**: 支持地图缩放、平移、面包屑导航
📱 **响应式**: 自动适配窗口大小

## 快速开始

### 1. 安装依赖

```bash
cd demo
npm install
```

### 2. 启动开发服务器

```bash
npm run dev
```

浏览器会自动打开 `http://localhost:8080`

### 3. 构建生产版本

```bash
npm run build
```

构建后的文件在 `dist` 目录

## 项目结构

```
demo/
├── public/
│   └── index.html          # HTML模板
├── src/
│   ├── components/
│   │   └── ChinaMap.vue    # 地图组件
│   ├── App.vue             # 根组件
│   └── main.js             # 入口文件
├── package.json            # 依赖配置
├── webpack.config.js       # Webpack配置
└── .babelrc               # Babel配置
```

## 使用说明

### 交互操作

1. **点击省份**: 在中国地图上点击任意省份，下钻到该省的区县地图
2. **面包屑导航**: 点击顶部面包屑可快速返回上一级
3. **地图操作**:
   - 鼠标滚轮: 缩放地图
   - 鼠标拖拽: 平移地图
   - 悬停: 显示详细信息

### 数据来源

地图数据来自父目录的 GeoJSON 文件:
- `china.json`: 全国省级边界
- `province/*.json`: 各省市区县边界
- `county/*.json`: 区县详细数据

## 技术栈

- **Vue 2.6.14**: 渐进式 JavaScript 框架
- **ECharts 5.4.3**: 数据可视化图表库
- **Axios**: HTTP 客户端
- **Webpack 5**: 模块打包工具

## 自定义配置

### 修改地图样式

编辑 `src/components/ChinaMap.vue` 中的 `renderMap` 方法:

```javascript
itemStyle: {
  areaColor: '#1e4d7b',    // 区域颜色
  borderColor: '#0cf',      // 边界颜色
  borderWidth: 1            // 边界宽度
}
```

### 修改主题色

在 `ChinaMap.vue` 的 `<style>` 中修改 CSS 变量。

## 常见问题

**Q: 地图数据加载失败?**  
A: 确保 `china.json` 和 `province/` 文件夹在项目根目录

**Q: 如何添加数据展示?**  
A: 在 `getMapSeriesData()` 方法中绑定真实业务数据

**Q: 支持哪些浏览器?**  
A: Chrome/Edge/Firefox/Safari 现代浏览器

## License


MIT

访问 http://localhost:8080/?province=sichuan 即可直接加载四川地图并隐藏底部标签栏