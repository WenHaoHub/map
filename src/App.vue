<template>
  <div id="app">
    <div class="map-content">
      <ChinaMap v-if="currentMap === 'china'" />
      <WorldMap v-if="currentMap === 'world'" />
      <SichuanMap v-if="currentMap === 'sichuan'" />
    </div>
    <div class="map-tabs" v-if="currentMap !== 'sichuan'">
      <button
        class="tab-btn"
        :class="{ active: currentMap === 'china' }"
        @click="currentMap = 'china'"
      >
        中国地图
      </button>
      <button
        class="tab-btn"
        :class="{ active: currentMap === 'world' }"
        @click="currentMap = 'world'"
      >
        世界地图
      </button>
    </div>
  </div>
</template>

<script>
import ChinaMap from "./components/ChinaMap.vue";
import WorldMap from "./components/WorldMap.vue";
import SichuanMap from "./components/SichuanMap.vue";

export default {
  name: "App",
  components: {
    ChinaMap,
    WorldMap,
    SichuanMap,
  },
  data() {
    return {
      currentMap: "china", // 默认显示中国地图
    };
  },
  mounted() {
    //检查URL参数，如果指定了省份，则显示相应地图
    const params = new URLSearchParams(window.location.search);
    const province = params.get("province");
    if (province === "sichuan") {
      this.currentMap = "sichuan";
    }
  },
};
</script>

<style>
#app {
  width: 100%;
  height: 100%;
  background: transparent; /* 改为透明，让iframe可以透过看到父级背景 */
}

.map-tabs {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 10px;
  z-index: 1000;
}

.tab-btn {
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

.tab-btn:hover {
  background: rgba(0, 212, 255, 0.2);
  border-color: #00d4ff;
  box-shadow: 0 0 10px rgba(0, 212, 255, 0.5);
}

.tab-btn.active {
  background: rgba(0, 212, 255, 0.3);
  border-color: #00d4ff;
  color: #00d4ff;
  font-weight: bold;
  box-shadow: 0 0 15px rgba(0, 212, 255, 0.8);
}

.map-content {
  width: 100%;
  height: 100%;
}
</style>
