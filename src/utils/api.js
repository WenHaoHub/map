import axios from 'axios'

// 创建 axios 实例
const api = axios.create({
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 请求拦截器
api.interceptors.request.use(
  config => {
    console.log('发送请求:', config.method?.toUpperCase(), config.url)
    return config
  },
  error => {
    console.error('请求错误:', error)
    return Promise.reject(error)
  }
)

// 响应拦截器
api.interceptors.response.use(
  response => {
    console.log('响应成功:', response.status, response.config.url)
    return response
  },
  error => {
    console.error('响应错误:', error.response?.status, error.config?.url, error.message)
    return Promise.reject(error)
  }
)

/**
 * 通过代理请求外部API
 * @param {string} path - API路径（会自动添加 /api 前缀）
 * @param {object} options - 请求选项
 * @returns {Promise}
 */
export const proxyRequest = (path, options = {}) => {
  const url = `/api${path.startsWith('/') ? path : '/' + path}`
  return api({
    url,
    method: 'GET',
    ...options
  })
}

/**
 * GET 请求
 * @param {string} path - API路径
 * @param {object} params - 查询参数
 * @returns {Promise}
 */
export const get = (path, params = {}) => {
  return proxyRequest(path, {
    method: 'GET',
    params
  })
}

/**
 * POST 请求
 * @param {string} path - API路径
 * @param {object} data - 请求数据
 * @returns {Promise}
 */
export const post = (path, data = {}) => {
  return proxyRequest(path, {
    method: 'POST',
    data
  })
}

/**
 * PUT 请求
 * @param {string} path - API路径
 * @param {object} data - 请求数据
 * @returns {Promise}
 */
export const put = (path, data = {}) => {
  return proxyRequest(path, {
    method: 'PUT',
    data
  })
}

/**
 * DELETE 请求
 * @param {string} path - API路径
 * @returns {Promise}
 */
export const del = (path) => {
  return proxyRequest(path, {
    method: 'DELETE'
  })
}

export default api