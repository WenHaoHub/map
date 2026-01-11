import axios from "axios";
// import Message from "@/components/common/message/index.js";

// 根据环境配置 baseURL
const getBaseURL = () => {
  // 生产环境使用当前域名和协议
  if (process.env.NODE_ENV === "production") {
    return window.location.origin;
  }
  // 开发环境使用代理
  return "/api";
};

const http = axios.create({
  baseURL: getBaseURL(),
  timeout: 10000
});

http.interceptors.request.use((config) => {
  // config.headers.AppKey = APP_KEY;
  // config.headers.sign = SIGN;
  return config;
});

http.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    
    // 如果是主动取消的请求，静默处理（不抛错，不提示）
    if (axios.isCancel(error)) {
      console.log('请求已取消:', error.message);
      // 返回一个特殊的已解决的 Promise，业务代码可以通过 _canceled 标识判断
      return Promise.resolve({ 
        _canceled: true, 
        message: error.message 
      });
    }
    
    // 4xx 5xx 6xx会进来
    let { message } = error;
    if (message == "Network Error") {
      message = "后端接口连接异常";
    } else if (message.includes("timeout")) {
      message = "系统接口请求超时";
    } else if (message.includes("Request failed with status code")) {
      message = "系统接口" + message.substr(message.length - 3) + "异常";
    }
    console.log('>>>error', error);
    // Message.error(message);
    return Promise.reject(error);
  }
);

export default http;



