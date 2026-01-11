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
        <span v-if="currentLevel === 'china'">点击省份查看城市</span>
        <span v-else-if="currentLevel === 'province'">点击城市查看区县</span>
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
  name: "ChinaMap",
  data() {
    return {
      chart: null,
      loading: false,
      currentLevel: "china", // 'china' | 'province' | 'city' | 'district'
      currentMapName: "china",
      breadcrumb: [{ name: "中国", code: "china" }],
      mapData: null,
      dataType: "enterprise", // 'enterprise' | 'project'
      mapCache: {}, // 地图数据缓存 {mapName: mapData}
      // 嵌套结构的企业数和项目数数据
      enterpriseData: {
        110000: {
          // 北京 (总和45)
          value: 45,
          name: "北京",
          children: {
            110101: { value: 8, name: "东城区" },
            110102: { value: 9, name: "西城区" },
            110105: { value: 7, name: "朝阳区" },
            110106: { value: 6, name: "丰台区" },
            110107: { value: 5, name: "石景山区" },
            110108: { value: 4, name: "海淀区" },
            110109: { value: 3, name: "门头沟区" },
            110111: { value: 3, name: "房山区" }
          }
        },
        120000: { value: 32, name: "天津" },
        130000: { value: 28, name: "河北" },
        140000: { value: 22, name: "山西" },
        150000: { value: 18, name: "内蒙古" },
        210000: { value: 35, name: "辽宁" },
        220000: { value: 25, name: "吉林" },
        230000: { value: 20, name: "黑龙江" },
        310000: {
          // 上海 (总和52)
          value: 52,
          name: "上海",
          children: {
            310101: { value: 6, name: "黄浦区" },
            310104: { value: 8, name: "徐汇区" },
            310105: { value: 7, name: "长宁区" },
            310106: { value: 6, name: "静安区" },
            310107: { value: 5, name: "普陀区" },
            310109: { value: 9, name: "虹口区" },
            310110: { value: 5, name: "杨浦区" },
            310112: { value: 6, name: "闵行区" }
          }
        },
        320000: { value: 48, name: "江苏" },
        330000: { value: 42, name: "浙江" },
        340000: { value: 30, name: "安徽" },
        350000: { value: 38, name: "福建" },
        360000: { value: 26, name: "江西" },
        370000: { value: 40, name: "山东" },
        410000: { value: 36, name: "河南" },
        420000: { value: 44, name: "湖北" },
        430000: { value: 34, name: "湖南" },
        440000: { value: 55, name: "广东" },
        450000: { value: 24, name: "广西" },
        460000: { value: 15, name: "海南" },
        500000: { value: 38, name: "重庆" },
        510000: { value: 46, name: "四川" },
        520000: { value: 20, name: "贵州" },
        530000: { value: 28, name: "云南" },
        540000: { value: 12, name: "西藏" },
        610000: { value: 32, name: "陕西" },
        620000: { value: 18, name: "甘肃" },
        630000: { value: 10, name: "青海" },
        640000: { value: 14, name: "宁夏" },
        650000: {
          // 新疆 (总和22)
          value: 22,
          name: "新疆",
          children: {
            650100: { value: 8, name: "乌鲁木齐市" },
            650200: { value: 4, name: "克拉玛依市" },
            650400: { value: 3, name: "吐鲁番市" },
            650500: { value: 3, name: "哈密市" },
            652300: { value: 2, name: "昌吉回族自治州" },
            652700: { value: 2, name: "博尔塔拉蒙古自治州" }
          }
        }
      },
      projectData: {
        110000: {
          // 北京 (总和23)
          value: 23,
          name: "北京",
          children: {
            110101: { value: 4, name: "东城区" },
            110102: { value: 5, name: "西城区" },
            110105: { value: 4, name: "朝阳区" },
            110106: { value: 3, name: "丰台区" },
            110107: { value: 2, name: "石景山区" },
            110108: { value: 2, name: "海淀区" },
            110109: { value: 2, name: "门头沟区" },
            110111: { value: 1, name: "房山区" }
          }
        },
        120000: { value: 16, name: "天津" },
        130000: { value: 14, name: "河北" },
        140000: { value: 11, name: "山西" },
        150000: { value: 9, name: "内蒙古" },
        210000: { value: 18, name: "辽宁" },
        220000: { value: 13, name: "吉林" },
        230000: { value: 10, name: "黑龙江" },
        310000: {
          // 上海 (总和26)
          value: 26,
          name: "上海",
          children: {
            310101: { value: 3, name: "黄浦区" },
            310104: { value: 4, name: "徐汇区" },
            310105: { value: 4, name: "长宁区" },
            310106: { value: 3, name: "静安区" },
            310107: { value: 3, name: "普陀区" },
            310109: { value: 5, name: "虹口区" },
            310110: { value: 2, name: "杨浦区" },
            310112: { value: 2, name: "闵行区" }
          }
        },
        320000: { value: 24, name: "江苏" },
        330000: { value: 21, name: "浙江" },
        340000: { value: 15, name: "安徽" },
        350000: { value: 19, name: "福建" },
        360000: { value: 13, name: "江西" },
        370000: { value: 20, name: "山东" },
        410000: { value: 18, name: "河南" },
        420000: { value: 22, name: "湖北" },
        430000: { value: 17, name: "湖南" },
        440000: { value: 28, name: "广东" },
        450000: { value: 12, name: "广西" },
        460000: { value: 8, name: "海南" },
        500000: { value: 19, name: "重庆" },
        510000: { value: 23, name: "四川" },
        520000: { value: 10, name: "贵州" },
        530000: { value: 14, name: "云南" },
        540000: { value: 6, name: "西藏" },
        610000: { value: 16, name: "陕西" },
        620000: { value: 9, name: "甘肃" },
        630000: { value: 5, name: "青海" },
        640000: { value: 7, name: "宁夏" },
        650000: {
          // 新疆 (总和11)
          value: 11,
          name: "新疆",
          children: {
            650100: { value: 4, name: "乌鲁木齐市" },
            650200: { value: 2, name: "克拉玛依市" },
            650400: { value: 2, name: "吐鲁番市" },
            650500: { value: 1, name: "哈密市" },
            652300: { value: 1, name: "昌吉回族自治州" },
            652700: { value: 1, name: "博尔塔拉蒙古自治州" }
          }
        }
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
    async getData(type = "allCountry", provinceCode = null) {
      // 获取数据：全国一级数据或省级下属市级数据
      try {
        const params = {
          date: "2025-11",
          type
        };

        // 如果是省级查询，添加省份代码参数
        if (type === "allProvince" && provinceCode) {
          params.provinceCode = provinceCode;
        }

        const { rCode, results } = await this.$api.getMapData(params);

        if (rCode === 0 && results && Array.isArray(results)) {
          if (type === "allCountry") {
            // 更新全国一级数据
            results.forEach((item) => {
              if (this.enterpriseData[item.code]) {
                this.enterpriseData[item.code].value = item["count(*)"];
                this.enterpriseData[item.code].name = item.name;
              } else {
                // 如果不存在该地区，创建新的数据项
                this.enterpriseData[item.code] = {
                  value: item["count(*)"],
                  name: item.name
                };
              }
            });
          } else if (type === "allProvince" && provinceCode) {
            // 更新省级下的市级数据
            if (!this.enterpriseData[provinceCode]) {
              this.enterpriseData[provinceCode] = {
                value: 0,
                name: "",
                children: {}
              };
            }

            if (!this.enterpriseData[provinceCode].children) {
              this.enterpriseData[provinceCode].children = {};
            }

            // 更新该省份下的市级数据
            results.forEach((item) => {
              this.enterpriseData[provinceCode].children[item.code] = {
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
    // 获取地图文件路径（根据环境判断使用本地还是线上）
    getMapPath(relativePath, usePublic = false) {
      // 开发环境使用本地路径
      // if (process.env.NODE_ENV === "development" || usePublic) {
      if (usePublic) {
        // 移除开头的斜杠，使用相对路径
        return "." + relativePath;
      }
      // 生产环境使用config.js中的mapURL
      let mapURL = window._GlobalConfig.mapURL || "";
      if (process.env.NODE_ENV === "development") {
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

    // 等待DOM尺寸可用后初始化图表（避免容器宽高为0）
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
        this.loadChinaMap();
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
        e.preventDefault(); // 阻止默认右键菜单
        if (this.breadcrumb.length > 1) {
          this.handleBreadcrumbClick(this.breadcrumb.length - 2); // 返回上一层
        }
      });
    },

    // 加载中国地图
    async loadChinaMap() {
      try {
        this.loading = true;

        // 检查缓存
        if (this.mapCache["china"]) {
          this.mapData = this.mapCache["china"];
        } else {
          // 缓存不存在，发起请求
          const response = await axios.get(
            this.getMapPath("/china.json", true)
          );
          this.mapData = response.data;
          this.mapCache["china"] = this.mapData;
        }

        echarts.registerMap("china", this.mapData);
        this.renderMap("china", "中国");

        this.currentLevel = "china";
        this.currentMapName = "china";
        this.breadcrumb = [{ name: "中国", code: "china" }];
      } catch (error) {
        console.error("加载中国地图失败:", error);
        alert("地图数据加载失败，请检查数据文件");
      } finally {
        this.loading = false;
      }
    },

    // 加载省级地图（显示该省所有市）
    async loadProvinceMap(adcode, name) {
      try {
        this.loading = true;
        const provinceCode = adcode.toString();
        const mapName = `province_${provinceCode}`;

        // 检查缓存
        if (this.mapCache[mapName]) {
          this.mapData = this.mapCache[mapName];
        } else {
          // 缓存不存在，发起请求
          const response = await axios.get(
            this.getMapPath(`/mapGeoJSON/chinaGeoJson/${provinceCode}.json`)
          );
          this.mapData = response.data;
          this.mapCache[mapName] = this.mapData;
        }

        echarts.registerMap(mapName, this.mapData);

        this.currentLevel = "province";
        this.currentMapName = mapName;
        this.breadcrumb = [
          { name: "中国", code: "china" },
          { name, code: provinceCode, level: "province" }
        ];

        // 获取该省份的市级企业数据 510000 四川
        if (adcode == 510000) {
          await this.getData("allProvince", provinceCode);
        }
        // await this.getData("allProvince", provinceCode);

        // 渲染地图（getData会触发渲染，这里确保数据加载后再渲染）
        this.renderMap(mapName, name);
      } catch (error) {
        console.error("加载省级地图失败:", error);
        alert("省级地图数据加载失败");
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
          // 缓存不存在，发起请求
          const response = await axios.get(
            this.getMapPath(`/mapGeoJSON/chinaGeoJson/${cityCode}.json`)
          );
          this.mapData = response.data;
          this.mapCache[mapName] = this.mapData;
        }

        echarts.registerMap(mapName, this.mapData);
        this.renderMap(mapName, name);

        this.currentLevel = "city";
        this.currentMapName = mapName;
        // 保留中国和省级，添加市级
        const provinceBreadcrumb = this.breadcrumb.find(
          (item) => item.level === "province"
        );
        if (provinceBreadcrumb) {
          this.breadcrumb = [
            { name: "中国", code: "china" },
            provinceBreadcrumb,
            { name, code: cityCode, level: "city" }
          ];
        } else {
          this.breadcrumb.push({ name, code: cityCode, level: "city" });
        }
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
          // 缓存不存在，发起请求
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
        // 保留中国、省级和市级，添加区县级
        const provinceBreadcrumb = this.breadcrumb.find(
          (item) => item.level === "province"
        );
        const cityBreadcrumb = this.breadcrumb.find(
          (item) => item.level === "city"
        );
        if (provinceBreadcrumb && cityBreadcrumb) {
          this.breadcrumb = [
            { name: "中国", code: "china" },
            provinceBreadcrumb,
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

    // 从地图数据构建气泡点位（用中心点/质心定位）
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

      // 返回所有有数据的点位（不再限制数量）
      return allPoints;
    },

    // 获取地图系列数据（支持嵌套结构）
    getMapSeriesData() {
      if (!this.mapData || !this.mapData.features) {
        return [];
      }

      // 根据当前数据类型选择数据源
      const dataSource =
        this.dataType === "enterprise" ? this.enterpriseData : this.projectData;

      return this.mapData.features.map((feature) => {
        const adcode = feature.properties.adcode || feature.properties.code;
        const name = feature.properties.name;

        // 从嵌套结构中获取数据值
        let value = 0;
        const dataItem = dataSource[adcode];

        if (dataItem) {
          // 如果是对象结构，取value属性；否则直接使用数值
          value = typeof dataItem === "object" ? dataItem.value : dataItem;
        } else {
          // 如果当前级别没有找到，尝试在父级的children中查找
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

    // 处理地图点击（四级下钻）
    handleMapClick(params) {
      const adcode = params.data.adcode;
      const name = params.name;

      if (!adcode) return;

      if (this.currentLevel === "china") {
        // 第一级：点击省份，显示该省所有市
        this.loadProvinceMap(adcode, name);
      } else if (this.currentLevel === "province") {
        // 第二级：点击市，显示该市所有区县
        this.loadCityMap(adcode, name);
      } else if (this.currentLevel === "city") {
        // 第三级：点击区县，只显示该区县
        this.loadDistrictMap(adcode, name);
      }
      // 第四级(district)不再下钻
    },

    // 处理面包屑点击（四级导航）
    handleBreadcrumbClick(index) {
      if (index === this.breadcrumb.length - 1) {
        return; // 当前层级，不处理
      }

      const targetItem = this.breadcrumb[index];
      this.breadcrumb = this.breadcrumb.slice(0, index + 1);

      if (index === 0) {
        // 返回中国地图
        this.loadChinaMap();
      } else if (targetItem.level === "province") {
        // 返回省级地图
        this.loadProvinceMap(targetItem.code, targetItem.name);
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
