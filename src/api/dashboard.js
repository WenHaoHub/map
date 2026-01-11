import http from "./http";

export default {
  //获取企业数据
  getMapData(params) {
    return http({
      url: "/property/wdcApi/getDlfb.dhtml",
      method: "get",
      params
    });
  },
  // fetchCombinationRiskAlert(data) {
  //   return http({
  //     url: "/property/wdcApi/getDlfb.dhtml?date=2025-11&type=allCountry",
  //     method: "post",
  //     data
  //   });
  // },
}