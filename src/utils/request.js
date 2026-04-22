import axios from 'axios'

const request = axios.create({
  baseURL: "http://localhost:8080",
  timeout: 5000
})

// request interceptor
request.interceptors.request.use(
  config => {
    // 某些模块需要自己精确控制 userId 注入逻辑，例如智慧生产接口只接受指定字段。
    if (config.autoInjectUser === false) {
      return config
    }

    // 从 localStorage 获取当前配置的 user_id
    const userId = localStorage.getItem('farming_user_id')
    if (userId) {
      // 将 userId 和 ownerUserId 加入到请求的 params 或 data 中
      if (config.method === 'get' || config.method === 'delete') {
        config.params = {
          ...config.params,
          userId: userId,
          ownerUserId: userId
        }
      } else if (config.method === 'post' || config.method === 'put' || config.method === 'patch') {
        // 如果 data 是 FormData 就不处理，这里假设 data 是普通对象
        if (config.data && !(config.data instanceof FormData)) {
          config.data = {
            ...config.data,
            userId: userId,
            ownerUserId: userId
          }
        } else if (!config.data) {
          config.data = {
            userId: userId,
            ownerUserId: userId
          }
        }
      }
    }
    return config
  },
  error => {
    return Promise.reject(error)
  }
)

// response interceptor
request.interceptors.response.use(
  response => {
    return response.data
  },
  error => {
    return Promise.reject(error)
  }
)

export default request
