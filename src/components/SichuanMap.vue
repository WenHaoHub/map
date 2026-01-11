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
        <span v-if="currentLevel === 'province'">点击城市查看区县</span>
        <span v-else-if="currentLevel === 'city'">点击区县查看详情</span>
        <span v-else-if="currentLevel === 'district'">当前显示单个区县</span>
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
  name: "SichuanMap",
  data() {
    return {
      chart: null,
      loading: false,
      currentLevel: "province", // 'province' | 'city' | 'district'
      currentMapName: "sichuan",
      breadcrumb: [{ name: "四川", code: "510000" }],
      mapData: null,
      dataType: "enterprise", // 'enterprise' | 'project'
      mapCache: {}, // 地图数据缓存 {mapName: mapData}
      // 企业数和项目数数据
      enterpriseData: {},
      projectData: {}
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
    async getData(type = "allProvince", cityCode = null) {
      // 获取数据：四川省市级数据或市级下属区县数据
      try {
        const params = {
          date: "2025-11",
          type,
          provinceCode: "510000" // 四川省代码
        };
        
        // 如果是市级查询，添加城市代码参数
        if (type === "allCity" && cityCode) {
          params.cityCode = cityCode;
        }
        
        const { rCode, results } = await this.$api.getMapData(params);
        
        if (rCode === 0 && results && Array.isArray(results)) {
          if (type === "allProvince") {
            // 更新四川省市级数据
            this.enterpriseData = {};
            results.forEach(item => {
              this.enterpriseData[item.code] = {
                value: item["count(*)"],
                name: item.name
              };
            });
          } else if (type === "allCity" && cityCode) {
            // 更新市级下的区县数据
            if (!this.enterpriseData[cityCode]) {
              this.enterpriseData[cityCode] = {
                value: 0,
                name: "",
                children: {}
              };
            }
            
            if (!this.enterpriseData[cityCode].children) {
              this.enterpriseData[cityCode].children = {};
            }
            
            // 更新该市下的区县数据
            results.forEach(item => {
              this.enterpriseData[cityCode].children[item.code] = {
                value: item["count(*)"],
                name: item.name
              };
            });
          }
          
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

    // 获取地图文件路径
    getMapPath(relativePath, usePublic = false) {
      if (usePublic) {
        return "." + relativePath;
      }
      let mapURL = window._GlobalConfig.mapURL || "";
      if (process.env.NODE_ENV === "development") {
        mapURL = "/api/production/web/SGE-project-scsgzw-master";
      }
      if (mapURL) {
        const cleanPath = relativePath.replace(/^\//, "");
        return `${mapURL}/${cleanPath}`;
      }
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
        this.loadSichuanMap();
      });
    },

    // 初始化图表
    initChart() {
      this.chart = echarts.init(this.$refs.chartContainer);

      // 绑定点击事件
      this.chart.on("click", (params) => {
        if (params.componentType === "series") {
          this.handleMapClick(params);
        }
      });

      // 绑定右键事件返回上一层
      this.$refs.chartContainer.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        if (this.breadcrumb.length > 1) {
          this.handleBreadcrumbClick(this.breadcrumb.length - 2);
        }
      });
    },

    // 加载四川省地图
    async loadSichuanMap() {
      try {
        this.loading = true;

        // 检查缓存
        if (this.mapCache["sichuan"]) {
          this.mapData = this.mapCache["sichuan"];
        } else {
          // 加载本地四川省JSON数据
          const response = await axios.get(
            this.getMapPath("/sichuanProvince.json", true)
          );
          this.mapData = response.data;
          this.mapCache["sichuan"] = this.mapData;
        }

        echarts.registerMap("sichuan", this.mapData);
        this.renderMap("sichuan", "四川");

        this.currentLevel = "province";
        this.currentMapName = "sichuan";
        this.breadcrumb = [{ name: "四川", code: "510000" }];
      } catch (error) {
        console.error("加载四川地图失败:", error);
        alert("地图数据加载失败，请检查数据文件");
      } finally {
        this.loading = false;
      }
    },

    // 加载城市地图（显示该市所有区县）
    async loadCityMap(adcode, name) {
      try {
        this.loading = true;

        const cityCode = adcode.toString();
        const mapName = `city_${cityCode}`;

        // 检查缓存
        if (this.mapCache[mapName]) {
          this.mapData = this.mapCache[mapName];
        } else {
          // 加载区县地图数据
          const response = await axios.get(
            this.getMapPath(`/mapGeoJSON/chinaGeoJson/${cityCode}.json`)
          );
          this.mapData = response.data;
          this.mapCache[mapName] = this.mapData;
        }

        echarts.registerMap(mapName, this.mapData);
        
        this.currentLevel = "city";
        this.currentMapName = mapName;
        this.breadcrumb = [
          { name: "四川", code: "510000" },
          { name, code: cityCode, level: "city" }
        ];
        
        // 获取该市的区县企业数据
        await this.getData("allCity", cityCode);
        
        this.renderMap(mapName, name);
      } catch (error) {
        console.error("加载城市地图失败:", error);
        alert("城市地图数据加载失败");
      } finally {
        this.loading = false;
      }
    },

    // 加载区县地图（显示单个区县边界）
    async loadDistrictMap(adcode, name) {
      try {
        this.loading = true;

        const districtCode = adcode.toString();
        const mapName = `district_${districtCode}`;

        // 检查缓存
        if (this.mapCache[mapName]) {
          this.mapData = this.mapCache[mapName];
        } else {
          const response = await axios.get(
            this.getMapPath(`/mapGeoJSON/chinaGeoJson/${districtCode}.json`)
          );
          this.mapData = response.data;
          this.mapCache[mapName] = this.mapData;
        }

        echarts.registerMap(mapName, this.mapData);
        this.renderMap(mapName, name);

        this.currentLevel = "district";
        this.currentMapName = mapName;
        
        const cityBreadcrumb = this.breadcrumb.find(
          (item) => item.level === "city"
        );
        if (cityBreadcrumb) {
          this.breadcrumb = [
            { name: "四川", code: "510000" },
            cityBreadcrumb,
            { name, code: districtCode, level: "district" }
          ];
        } else {
          this.breadcrumb.push({ name, code: districtCode, level: "district" });
        }
      } catch (error) {
        console.error("加载区县地图失败:", error);
        alert("区县地图数据加载失败");
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
        animation: false,
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
            areaColor: "rgba(63,177,227,0.15)",
            borderColor: "rgba(0,191,255,0.5)",
            borderWidth: 2,
            shadowColor: "rgba(0,191,255,0.4)",
            shadowBlur: 24,
            shadowOffsetX: 0,
            shadowOffsetY: 0
          }
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
            emphasis: {
              label: {
                show: false
              }
            },
            data: mapSeriesData
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
              borderWidth: 8
            },
            tooltip: { show: false },
            label: { show: false },
            progressive: 500,
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
            progressive: 500,
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

    // 从地图数据构建气泡点位
    getPointSeriesData(mapSeriesData) {
      if (!this.mapData || !this.mapData.features || !mapSeriesData) {
        return [];
      }

      const valueByAdcode = new Map(
        mapSeriesData.map((d) => [d.adcode || d.code, d.value])
      );

      const allPoints = this.mapData.features
        .map((feature) => {
          const props = feature.properties || {};
          const adcode = props.adcode || props.code;
          const name = props.name;
          const coord =
            Array.isArray(props.centroid) && props.centroid.length >= 2
              ? props.centroid
              : Array.isArray(props.center) && props.center.length >= 2
              ? props.center
              : null;

          if (!coord || adcode === undefined || !name) return null;

          const v = valueByAdcode.has(adcode) ? valueByAdcode.get(adcode) : 0;

          // 过滤掉值为0的点
          if (v === 0) return null;

          return { name, adcode, value: [coord[0], coord[1], v] };
        })
        .filter(Boolean);

      return allPoints;
    },

    // 获取地图系列数据
    getMapSeriesData() {
      if (!this.mapData || !this.mapData.features) {
        return [];
      }

      const dataSource =
        this.dataType === "enterprise" ? this.enterpriseData : this.projectData;

      return this.mapData.features.map((feature) => {
        const adcode = feature.properties.adcode || feature.properties.code;
        const name = feature.properties.name;

        let value = 0;
        const dataItem = dataSource[adcode];

        if (dataItem) {
          value = typeof dataItem === "object" ? dataItem.value : dataItem;
        } else {
          // 尝试在父级的children中查找
          for (const parentCode in dataSource) {
            const parent = dataSource[parentCode];
            if (parent && parent.children && parent.children[adcode]) {
              const child = parent.children[adcode];
              value = typeof child === "object" ? child.value : child;
              break;
            }
          }
        }

        return {
          name,
          adcode,
          value
        };
      });
    },

    // 处理地图点击
    handleMapClick(params) {
      const adcode = params.data.adcode;
      const name = params.name;

      if (!adcode) return;

      if (this.currentLevel === "province") {
        // 点击市，显示该市所有区县
        this.loadCityMap(adcode, name);
      } else if (this.currentLevel === "city") {
        // 点击区县，只显示该区县
        this.loadDistrictMap(adcode, name);
      }
    },

    // 处理面包屑点击
    handleBreadcrumbClick(index) {
      if (index === this.breadcrumb.length - 1) {
        return;
      }

      const targetItem = this.breadcrumb[index];
      this.breadcrumb = this.breadcrumb.slice(0, index + 1);

      if (index === 0) {
        // 返回四川省地图
        this.loadSichuanMap();
      } else if (targetItem.level === "city") {
        // 返回市级地图
        this.loadCityMap(targetItem.code, targetItem.name);
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
  background: transparent;
  overflow: hidden;
}

.header {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 60px;
  background: transparent;
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
  color: #00d4ff;
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
  color: #00d4ff;
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
}

.loading {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  color: #00d4ff;
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
