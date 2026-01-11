<template>
  <div class="map-container">
    <!-- 顶部导航栏 -->
    <div class="header">
      <div class="breadcrumb">
        <span
          v-for="(item, index) in breadcrumb"
          :key="index"
          @click="handleBreadcrumbClick(index)"
          :class="{ active: index === breadcrumb.length - 1 }"
        >
          {{ item.name }}
          <i v-if="index < breadcrumb.length - 1"> > </i>
        </span>
        <span style="font-size: 12px">（点击右键返回上一层）</span>
      </div>
      <div class="tips">
        <span v-if="currentLevel === 'world'">点击国家查看详情</span>
        <span v-else-if="currentLevel === 'country'">当前显示单个国家</span>
      </div>
    </div>

    <!-- 地图容器 -->
    <div ref="chartContainer" class="chart-container"></div>

    <!-- 右侧切换按钮 -->
    <div class="toggle-panel">
      <button
        class="toggle-btn"
        :class="{ active: dataType === 'enterprise' }"
        @click="dataType = 'enterprise'"
      >
        企业数
      </button>
      <button
        class="toggle-btn"
        :class="{ active: dataType === 'project' }"
        @click="dataType = 'project'"
      >
        项目数
      </button>
    </div>

    <!-- 加载提示 -->
    <div v-if="loading" class="loading">
      <div class="loading-spinner"></div>
      <p>加载地图数据中...</p>
    </div>
  </div>
</template>

<script>
import * as echarts from "echarts";
import axios from "axios";

export default {
  name: "WorldMap",
  data() {
    return {
      chart: null,
      loading: false,
      currentLevel: "world", // 'world' | 'country'
      currentMapName: "world",
      breadcrumb: [{ name: "世界", code: "world" }],
      mapData: null,
      dataType: "enterprise", // 'enterprise' | 'project'
      mapCache: {}, // 地图数据缓存 {mapName: mapData}
      // 嵌套结构的企业数和项目数数据
      enterpriseData: {
        CHN: { value: 1050, name: "中国" },
        USA: { value: 980, name: "美国" },
        RUS: { value: 650, name: "俄罗斯" },
        IND: { value: 720, name: "印度" },
        BRA: { value: 580, name: "巴西" },
        CAN: { value: 520, name: "加拿大" },
        AUS: { value: 480, name: "澳大利亚" },
        ARG: { value: 380, name: "阿根廷" },
        KAZ: { value: 280, name: "哈萨克斯坦" },
        DZA: { value: 320, name: "阿尔及利亚" },
        SAU: { value: 450, name: "沙特阿拉伯" },
        MEX: { value: 540, name: "墨西哥" },
        IDN: { value: 630, name: "印度尼西亚" },
        JPN: { value: 890, name: "日本" },
        DEU: { value: 820, name: "德国" },
        FRA: { value: 760, name: "法国" },
        GBR: { value: 740, name: "英国" },
        ITA: { value: 680, name: "意大利" },
        ESP: { value: 590, name: "西班牙" },
        TUR: { value: 520, name: "土耳其" },
        KOR: { value: 710, name: "韩国" }
      },
      projectData: {
        CHN: { value: 520, name: "中国" },
        USA: { value: 480, name: "美国" },
        RUS: { value: 320, name: "俄罗斯" },
        IND: { value: 360, name: "印度" },
        BRA: { value: 290, name: "巴西" },
        CAN: { value: 260, name: "加拿大" },
        AUS: { value: 240, name: "澳大利亚" },
        ARG: { value: 190, name: "阿根廷" },
        KAZ: { value: 140, name: "哈萨克斯坦" },
        DZA: { value: 160, name: "阿尔及利亚" },
        SAU: { value: 225, name: "沙特阿拉伯" },
        MEX: { value: 270, name: "墨西哥" },
        IDN: { value: 315, name: "印度尼西亚" },
        JPN: { value: 445, name: "日本" },
        DEU: { value: 410, name: "德国" },
        FRA: { value: 380, name: "法国" },
        GBR: { value: 370, name: "英国" },
        ITA: { value: 340, name: "意大利" },
        ESP: { value: 295, name: "西班牙" },
        TUR: { value: 260, name: "土耳其" },
        KOR: { value: 355, name: "韩国" }
      }
    };
  },
  watch: {
    // 监听dataType变化，重新渲染地图
    dataType() {
      if (
        this.chart &&
        this.currentMapName &&
        this.breadcrumb &&
        this.breadcrumb.length
      ) {
        const title = this.breadcrumb[this.breadcrumb.length - 1].name;
        this.renderMap(this.currentMapName, title);
      }
    },
    // 监听面包屑变化，重新渲染地图
    breadcrumb() {
      if (
        this.chart &&
        this.currentMapName &&
        this.breadcrumb &&
        this.breadcrumb.length
      ) {
        const title = this.breadcrumb[this.breadcrumb.length - 1].name;
        this.renderMap(this.currentMapName, title);
      }
    }
  },
  mounted() {
    this.initChartWhenReady();
    this.getData();
    // 监听窗口大小变化（防抖优化）
    this.resizeTimer = null;
    this.handleResizeDebounced = () => {
      if (this.resizeTimer) clearTimeout(this.resizeTimer);
      this.resizeTimer = setTimeout(() => {
        this.handleResize();
      }, 200);
    };
    window.addEventListener("resize", this.handleResizeDebounced);
  },
  beforeDestroy() {
    window.removeEventListener("resize", this.handleResizeDebounced);
    if (this.resizeTimer) clearTimeout(this.resizeTimer);
    if (this.$refs.chartContainer) {
      this.$refs.chartContainer.removeEventListener(
        "contextmenu",
        this.handleContextMenu
      );
    }
    if (this.chart) {
      this.chart.dispose();
    }
  },
  methods: {
    async getData() {
      // 获取世界一级数据
      try {
        const { rCode, results } = await this.$api.getMapData({
          date: "2025-11",
          type: "allWorld"
        });
        
        if (rCode === 0 && results && Array.isArray(results)) {
          // 等待地图数据加载完成
          if (!this.mapData || !this.mapData.features) {
            console.warn("地图数据未加载，等待加载完成后再获取数据");
            // 延迟执行，等待地图加载
            setTimeout(() => this.getData(), 500);
            return;
          }
          
          // 从地图数据构建 iso_n3 到 iso_a3 的映射
          const isoN3ToIsoA3 = {};
          this.mapData.features.forEach(feature => {
            const isoN3 = feature.properties.iso_n3;
            const isoA3 = feature.properties.iso_a3 || feature.id;
            if (isoN3 && isoA3) {
              isoN3ToIsoA3[isoN3] = isoA3;
            }
          });
          
          // 清空现有数据，准备使用接口数据
          this.enterpriseData = {};
          
          // 根据接口返回数据更新企业数据
          results.forEach(item => {
            // 使用 iso_n3 映射获取 ISO 三位代码
            let isoCode = isoN3ToIsoA3[item.code];
            
            // 如果没有映射到，直接使用 code（处理特殊情况如 "CHN"）
            if (!isoCode) {
              isoCode = item.code;
            }
            
            // 创建或更新数据项
            this.enterpriseData[isoCode] = {
              value: item["count(*)"],
              name: item.name
            };
          });
          
          console.log("企业数据已更新:", this.enterpriseData);
          
          // 触发地图重新渲染
          if (this.chart && this.currentMapName) {
            const title = this.breadcrumb[this.breadcrumb.length - 1].name;
            this.renderMap(this.currentMapName, title);
          }
        }
      } catch (error) {
        console.error("获取数据失败:", error);
      }
    },
    // 获取地图文件路径（根据环境判断使用本地还是线上）
    getMapPath(relativePath, usePublic = false) {
      // 开发环境使用本地路径
      // if (process.env.NODE_ENV === "development" || usePublic) {
      if (usePublic) {
        // 移除开头的斜杠，使用相对路径
        return '.' + relativePath;
      }
      // 生产环境使用config.js中的mapURL
      let mapURL = window._GlobalConfig.mapURL || "";
      if (process.env.NODE_ENV === "development") {
        // mapURL = "";//使用本地json
        mapURL = "/api/production/web/SGE-project-scsgzw-master";
      }
      console.log(mapURL);
      if (mapURL) {
        // 移除相对路径前的斜杠
        const cleanPath = relativePath.replace(/^\//, "");
        return `${mapURL}/${cleanPath}`;
      }
      // 如果没有配置mapURL，回退到相对路径
      return relativePath;
    },

    // 等待DOM尺寸可用后初始化图表
    initChartWhenReady(retryCount = 0) {
      this.$nextTick(() => {
        const container = this.$refs.chartContainer;
        const width = container && container.clientWidth;
        const height = container && container.clientHeight;

        if (!width || !height) {
          if (retryCount < 10) {
            setTimeout(() => this.initChartWhenReady(retryCount + 1), 100);
            return;
          }
          console.warn("图表容器宽高为0，无法初始化ECharts");
          return;
        }

        this.initChart();
        this.loadWorldMap();
      });
    },

    // 初始化图表
    initChart() {
      // 确保图表容器背景透明
      this.chart = echarts.init(this.$refs.chartContainer, null, {
        backgroundColor: 'transparent' // 初始化时设置背景透明
      });

      // 绑定点击事件
      this.chart.on("click", (params) => {
        if (params.componentType === "series") {
          this.handleMapClick(params);
        }
      });

      // 绑定右键事件返回上一层
      this.$refs.chartContainer.addEventListener("contextmenu", (e) => {
        e.preventDefault(); // 阻止默认右键菜单
        if (this.currentLevel !== "world") {
          this.handleBreadcrumbClick(0); // 返回世界地图
        }
      });
    },

    // 加载世界地图
    async loadWorldMap() {
      try {
        this.loading = true;
        console.log("开始加载世界地图数据...");

        // 检查缓存
        if (this.mapCache["world"]) {
          this.mapData = this.mapCache["world"];
        } else {
          // 缓存不存在，发起请求
          const response = await axios.get(this.getMapPath("/world.json",true));
          this.mapData = response.data;
          this.mapCache["world"] = this.mapData;
        }
        
        echarts.registerMap("world", this.mapData);
        this.renderMap("world", "世界");

        this.currentLevel = "world";
        this.currentMapName = "world";
        this.breadcrumb = [{ name: "世界", code: "world" }];
      } catch (error) {
        console.error("加载世界地图失败:", error);
        console.error("错误详情:", {
          url: "/world.json",
          status: error.response?.status,
          statusText: error.response?.statusText
        });
        alert(`世界地图数据加载失败: ${error.message}`);
      } finally {
        this.loading = false;
      }
    },

    // 加载单个国家地图
    async loadCountryMap(countryCode, countryName) {
      try {
        this.loading = true;
        console.log(`尝试加载国家地图: ${countryName} (${countryCode})`);

        const mapName = `country_${countryCode}`;
        
        // 检查缓存
        if (this.mapCache[mapName]) {
          this.mapData = this.mapCache[mapName];
        } else {
          // 缓存不存在，发起请求
          const response = await axios.get(
            this.getMapPath(`/mapGeoJSON/worldGeoJSON/${countryCode}.geo.json`)
          );
          this.mapData = response.data;
          this.mapCache[mapName] = this.mapData;
        }
        
        console.log(">>>this.mapData", this.mapData);
        console.log(`${countryName} 地图数据加载成功`);

        echarts.registerMap(mapName, this.mapData);
        this.renderMap(mapName, countryName);

        this.currentLevel = "country";
        this.currentMapName = mapName;
        this.breadcrumb = [
          { name: "世界", code: "world" },
          { name: countryName, code: countryCode, level: "country" }
        ];
      } catch (error) {
        console.error("加载国家地图失败:", error);
        console.error("错误详情:", {
          countryCode,
          countryName,
          url: `/mapGeoJSON/worldGeoJSON/${countryCode}.geo.json`,
          status: error.response?.status,
          statusText: error.response?.statusText
        });
        alert(`${countryName}地图数据加载失败: ${error.message}`);
      } finally {
        this.loading = false;
      }
    },

    // 渲染地图
    renderMap(mapName, title) {
      const metricLabel = this.getMetricLabel();
      const mapSeriesData = this.getMapSeriesData();
      const pointSeriesData = this.getPointSeriesData(mapSeriesData);

      const option = {
        backgroundColor: "transparent",
        animation: false, // 禁用动画提升性能
        tooltip: {
          trigger: "item",
          formatter: (params) => {
            const valueFromScatter = Array.isArray(params.value)
              ? params.value[2]
              : undefined;
            const valueFromMap =
              params && params.data ? params.data.value : undefined;
            const value =
              valueFromScatter !== undefined ? valueFromScatter : valueFromMap;

            if (value !== undefined) {
              return `${params.name}<br/>${metricLabel}: ${value}`;
            }
            return params.name;
          },
          backgroundColor: "rgba(0, 0, 0, 0.8)",
          borderColor: "#00d4ff",
          borderWidth: 1,
          textStyle: {
            color: "#fff"
          }
        },
        geo: {
          map: mapName,
          roam: true,
          zoom: 1.2,
          label: {
            show: false
          },
          emphasis: {
            label: {
              show: false
            },
            itemStyle: {
              areaColor: "rgba(63,177,227,0.25)",
              borderColor: "rgba(0,191,255,0.7)",
              borderWidth: 3,
              shadowColor: "rgba(0,191,255,0.6)",
              shadowBlur: 29,
              shadowOffsetX: 0,
              shadowOffsetY: 0
            }
          },
          itemStyle: {
            // areaColor: "rgba(0,0,0,0)",
            areaColor: "rgba(63,177,227,0.15)",
            borderColor: "rgba(0,191,255,0.5)",
            borderWidth: 2,
            shadowColor: "rgba(0,191,255,0.4)",
            shadowBlur: 24,
            shadowOffsetX: 0,
            shadowOffsetY: 0
          },
          silent: false,
          backgroundColor: "transparent"
        },
        series: [
          {
            name: title,
            type: "map",
            map: mapName,
            geoIndex: 0,
            label: {
              show: false
            },
            data: mapSeriesData,
            // 确保地图系列背景透明
            itemStyle: {
              areaColor: "transparent"
            },
            emphasis: {
              itemStyle: {
                areaColor: "rgba(173, 216, 230, 0.2)"
              }
            }
          },
          // 外层光晕
          {
            name: `${metricLabel}_halo`,
            type: "scatter",
            coordinateSystem: "geo",
            silent: true,
            z: 2,
            data: pointSeriesData,
            symbol: "circle",
            symbolSize: (val) => this.calcBubbleSize(val[2]) + 22,
            itemStyle: {
              color: "rgba(47, 124, 255, 0.16)",
              borderColor: "rgba(47, 124, 255, 0.25)",
              borderWidth: 4
            },
            tooltip: { show: false },
            label: { show: false },
            progressive: 500, // 渐进式渲染
            progressiveThreshold: 1000
          },
          // 内层气泡
          {
            name: metricLabel,
            type: "scatter",
            coordinateSystem: "geo",
            z: 3,
            data: pointSeriesData,
            symbol: "circle",
            symbolSize: (val) => this.calcBubbleSize(val[2]),
            itemStyle: {
              color: "#2f7cff",
              opacity: 0.95,
              borderColor: "rgba(255, 255, 255, 0.35)",
              borderWidth: 1,
              shadowBlur: 20,
              shadowColor: "rgba(47, 124, 255, 0.35)"
            },
            label: {
              show: true,
              position: "inside",
              align: "center",
              verticalAlign: "middle",
              formatter: (p) => {
                console.log('>>>formatter',p);
                const v = Array.isArray(p.value) ? p.value[2] : "";
                return `{v|${v}}\n{n|${p.name}}`;
              },
              rich: {
                v: {
                  color: "#fff",
                  fontSize: 18,
                  fontWeight: "bold",
                  lineHeight: 22
                },
                n: { color: "#fff", fontSize: 12, lineHeight: 16 }
              }
            },
            progressive: 500, // 渐进式渲染
            progressiveThreshold: 1000
          }
        ]
      };

      this.chart.setOption(option, true);
    },

    getMetricLabel() {
      return this.dataType === "enterprise" ? "企业数" : "项目数";
    },

    calcBubbleSize(value) {
      const minSize = 46;
      const maxSize = 92;
      const minValue = this.dataType === "enterprise" ? 100 : 50;
      const maxValue = this.dataType === "enterprise" ? 1100 : 550;
      const safeValue = typeof value === "number" ? value : minValue;
      const t = (safeValue - minValue) / (maxValue - minValue);
      const clamped = Math.max(0, Math.min(1, t));
      return minSize + clamped * (maxSize - minSize);
    },

    // 计算几何中心点
    calculateCentroid(geometry) {
      if (!geometry || !geometry.coordinates) return null;

      let allCoords = [];

      // 处理不同类型的几何体
      if (geometry.type === "Polygon") {
        allCoords = geometry.coordinates[0];
      } else if (geometry.type === "MultiPolygon") {
        // 取第一个polygon的外环
        allCoords = geometry.coordinates[0][0];
      } else {
        return null;
      }

      if (!allCoords || allCoords.length === 0) return null;

      // 计算平均值作为中心点
      let sumLng = 0,
        sumLat = 0;
      allCoords.forEach((coord) => {
        sumLng += coord[0];
        sumLat += coord[1];
      });

      return [sumLng / allCoords.length, sumLat / allCoords.length];
    },

    // 国家首都坐标映射 [经度, 纬度]
    capitalCoordinates() {
      return {
        CHN: [116.4074, 39.9042],      // 北京
        USA: [-77.0369, 38.9072],      // 华盛顿
        RUS: [37.6173, 55.7558],       // 莫斯科
        IND: [77.2099, 28.6139],       // 新德里
        BRA: [-47.8822, -15.7942],     // 巴西利亚
        CAN: [-75.6972, 45.4215],      // 渥太华
        AUS: [149.1300, -35.2809],     // 堪培拉
        ARG: [-58.3816, -34.6037],     // 布宜诺斯艾利斯
        KAZ: [71.4691, 51.1694],       // 努尔苏丹
        DZA: [3.0588, 36.7538],        // 阿尔及尔
        SAU: [46.6753, 24.7136],       // 利雅得
        MEX: [-99.1332, 19.4326],      // 墨西哥城
        IDN: [106.8456, -6.2088],      // 雅加达
        JPN: [139.6917, 35.6895],      // 东京
        DEU: [13.4050, 52.5200],       // 柏林
        FRA: [2.3522, 48.8566],        // 巴黎
        GBR: [-0.1276, 51.5074],       // 伦敦
        ITA: [12.4964, 41.9028],       // 罗马
        ESP: [-3.7038, 40.4168],       // 马德里
        TUR: [32.8597, 39.9334],       // 安卡拉
        KOR: [126.9780, 37.5665],      // 首尔
        SGP: [103.8198, 1.3521],       // 新加坡
        NLD: [4.8952, 52.3702],        // 阿姆斯特丹
        POL: [21.0122, 52.2297],       // 华沙
        MYS: [101.6869, 3.1390],       // 吉隆坡
        KEN: [36.8219, -1.2921],       // 内罗毕
        BGD: [90.4125, 23.8103],       // 达卡
        CZE: [14.4378, 50.0755],       // 布拉格
        HKG: [114.1694, 22.3193],      // 香港
        NPL: [85.3240, 27.7172],       // 加德满都
        CYM: [-81.3857, 19.3133],      // 乔治敦
        MNG: [106.9057, 47.8864],      // 乌兰巴托
        VIR: [-64.8963, 18.3358],      // 夏洛特阿马利亚
        ARE: [54.3773, 24.4539],       // 阿布扎比
        PHL: [120.9842, 14.5995],      // 马尼拉
        BLR: [27.5615, 53.9045],       // 明斯克
        GEO: [44.7938, 41.7151],       // 第比利斯
        VGB: [-64.6230, 18.4207],      // 罗德城
        THA: [100.5018, 13.7563],      // 曼谷
        TZA: [39.2083, -6.7924],       // 达累斯萨拉姆
        KHM: [104.9160, 11.5564],      // 金边
        VNM: [105.8342, 21.0278],      // 河内
        ERI: [38.9318, 15.3229],       // 阿斯马拉
        HUN: [19.0402, 47.4979],       // 布达佩斯
        BRB: [-59.6152, 13.1939],      // 布里奇敦
        IRL: [-6.2603, 53.3498],       // 都柏林
        ZMB: [28.2937, -15.4167],      // 卢萨卡
        BMU: [-64.7505, 32.2949],      // 汉密尔顿
        PAK: [73.0479, 33.6844],       // 伊斯兰堡
        LAO: [102.6000, 17.9757]       // 万象
      };
    },

    // 从地图数据构建气泡点位（使用首都坐标）
    getPointSeriesData(mapSeriesData) {
      console.log('>>>mapSeriesData',mapSeriesData);
      if (!mapSeriesData) {
        return [];
      }

      const valueByCode = new Map(
        mapSeriesData.map((d) => [d.countryCode || d.id, d.value])
      );

      const capitals = this.capitalCoordinates();

      // 遍历所有有数据的国家，使用首都坐标
      const allPoints = [];
      for (const [code, value] of valueByCode.entries()) {
        // 过滤掉值为0的点
        if (value === 0) continue;

        const capitalCoord = capitals[code];
        if (!capitalCoord) continue;

        // 从mapSeriesData中找到对应的国家名称
        const countryData = mapSeriesData.find((d) => d.countryCode === code || d.id === code);
        const name = countryData?.name || code;
        allPoints.push({
          name,
          code,
          value: [capitalCoord[0], capitalCoord[1], value]
        });
      }

      console.log("生成气泡点位数据:", allPoints.length, "个点");
      console.log("前3个点位:", allPoints.slice(0, 3));

      // 返回所有有数据的点位（使用首都坐标）
      return allPoints;
    },

    // 获取地图系列数据（支持嵌套结构）
    getMapSeriesData() {
      if (!this.mapData || !this.mapData.features) {
        console.warn("地图数据为空");
        return [];
      }

      // 根据当前数据类型选择数据源
      const dataSource = this.dataType === "enterprise" ? this.enterpriseData : this.projectData;

      const seriesData = this.mapData.features.map((feature) => {
        let name;
        const originalName = feature.properties.name;
        console.log(">>>feature", feature);

        if (this.currentLevel === "world") {
          // 世界地图：判断是否为英文并转换
          const countryCode =
            feature.properties.iso_a3 ||
            feature.id ||
            feature.properties.iso_a2;

          // 判断名称是否为英文，如果是则使用countryNames转换，否则直接使用原始名称
          name = feature.properties.name;

          // 从嵌套结构中获取数据值
          let value = 0;
          const dataItem = dataSource[countryCode];
          
          if (dataItem) {
            // 如果是对象结构，取value属性；否则直接使用数值
            value = typeof dataItem === "object" ? dataItem.value : dataItem;
          }

          return {
            name,
            countryCode,
            originalName,
            id: feature.id,
            value
          };
        } else {
          // 单个国家地图：直接使用GeoJSON中的名称（已被脚本转换为中文）
          name = originalName || "";
          const regionCode = feature.properties.code || feature.id;

          // 单个国家内部区域使用较小的固定值
          let value = 0;
          if (this.dataType === "enterprise") {
            value = 150;
          } else {
            value = 75;
          }

          return {
            name,
            id: feature.id,
            value
          };
        }
      });

      console.log("生成系列数据，数量:", seriesData.length);
      console.log("前3个数据项:", seriesData.slice(0, 3));

      return seriesData;
    },

    // 处理地图点击（两级下钻：世界->国家）
    handleMapClick(params) {
      console.log("地图点击事件:", params); // 添加调试日志

      if (this.currentLevel === "world") {
        // 从点击参数中获取国家代码
        const countryCode = params.data?.countryCode|| params.data?.code || params.name;
        const countryName = params.name;

        console.log("点击国家:", countryName, "代码:", countryCode); // 添加调试日志

        if (countryCode) {
          this.loadCountryMap(countryCode, countryName);
        } else {
          console.warn("未找到国家代码:", params);
          alert("无法获取国家信息，请重试");
        }
      }
      // 国家级别不再下钻
    },

    // 处理面包屑点击
    handleBreadcrumbClick(index) {
      if (index === this.breadcrumb.length - 1) {
        return; // 当前层级，不处理
      }

      const targetItem = this.breadcrumb[index];
      this.breadcrumb = this.breadcrumb.slice(0, index + 1);

      if (index === 0) {
        // 返回世界地图
        this.loadWorldMap();
      }
    },

    // 窗口大小变化
    handleResize() {
      if (this.chart) {
        this.chart.resize();
      }
    }
  }
};
</script>

<style scoped>
.map-container {
  width: 100%;
  height: 100%;
  position: relative;
  background: transparent; /* 确保容器背景透明 */
  overflow: hidden;
}

.header {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 60px;
  background: transparent; /* 头部背景透明 */
  backdrop-filter: blur(10px);
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 30px;
  z-index: 100;
}

.breadcrumb {
  display: flex;
  align-items: center;
  color: #fff;
  font-size: 16px;
}

.breadcrumb span {
  cursor: pointer;
  padding: 5px 10px;
  border-radius: 4px;
  transition: all 0.3s;
}

.breadcrumb span:hover:not(.active) {
  background: rgba(0, 212, 255, 0.2);
  color: #00d4ff;
}

.breadcrumb span.active {
  color: #00d4ff;
  font-weight: bold;
}

.breadcrumb i {
  margin: 0 5px;
  color: #666;
  font-style: normal;
}

.tips {
  color: #0cf;
  font-size: 14px;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.chart-container {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  top: 60px;
  background: transparent; /* 图表容器背景透明 */
}

.loading {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  color: #fff;
  z-index: 1000;
}

.loading-spinner {
  width: 50px;
  height: 50px;
  margin: 0 auto 20px;
  border: 4px solid rgba(0, 212, 255, 0.3);
  border-top-color: #00d4ff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.loading p {
  font-size: 16px;
  color: #0cf;
}

/* 右侧切换面板 */
.toggle-panel {
  position: absolute;
  left: 30px;
  top: 45%;
  display: flex;
  flex-direction: column;
  gap: 10px;
  z-index: 100;
}

.toggle-btn {
  padding: 10px 20px;
  background: rgba(0, 212, 255, 0.1);
  border: 1px solid rgba(0, 212, 255, 0.5);
  color: #0cf;
  font-size: 14px;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.3s;
  white-space: nowrap;
}

.toggle-btn:hover {
  background: rgba(0, 212, 255, 0.2);
  border-color: #00d4ff;
  box-shadow: 0 0 10px rgba(0, 212, 255, 0.5);
}

.toggle-btn.active {
  background: rgba(0, 212, 255, 0.3);
  border-color: #00d4ff;
  color: #00d4ff;
  font-weight: bold;
  box-shadow: 0 0 15px rgba(0, 212, 255, 0.8);
}
</style>
