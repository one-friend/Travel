// services/userDataService.js
const CACHE_KEY = 'user_data_cache'
const CLOUD_FN = 'userData'

class UserDataService {
  constructor() {
    this.data = null
    this.loaded = false
  }

  /** 🔹 读取云端 + 本地缓存 */
  async load() {
    if (this.loaded) return this.data

    // 1. 尝试读取本地缓存
    const cache = wx.getStorageSync(CACHE_KEY)
    if (cache) {
      this.data = cache
      this.loaded = true
      // 不阻塞 UI，后台同步最新数据
      this.refreshFromCloud()
      return cache
    }

    // 2. 本地没有缓存 → 请求云端
    return await this.refreshFromCloud()
  }

  /** 🔹 强制从云端拉取最新数据 */
  async refreshFromCloud() {
    const res = await wx.cloud.callFunction({
      name: CLOUD_FN,
      data: { action: 'get' }
    })
    this.data = res.result
    this.loaded = true
    wx.setStorageSync(CACHE_KEY, this.data)
    return this.data
  }

  /** 🔹 获取单个字段 */
  async getField(field) {
    const data = await this.load()
    return data[field] || null
  }

  /** 🔹 整个字段覆盖更新（危险操作） */
  async setField(field, value) {
    await wx.cloud.callFunction({
      name: CLOUD_FN,
      data: {
        action: 'updateField',
        payload: { field, data: value }
      }
    })
    this.data[field] = value
    wx.setStorageSync(CACHE_KEY, this.data)
  }

  /** 🔹 字段合并更新（更安全）*/
  async mergeField(field, obj) {
    await wx.cloud.callFunction({
      name: CLOUD_FN,
      data: {
        action: 'mergeField',
        payload: { field, data: obj }
      }
    })
    this.data[field] = {
      ...(this.data[field] || {}),
      ...obj
    }
    wx.setStorageSync(CACHE_KEY, this.data)
  }

  /** ✅ 快速更新 visited */
  async setVisited(key, value) {
    return await this.mergeField('visited', { [key]: value })
  }

  /** ✅ 快速获取全部 visited */
  async getVisited() {
    return await this.getField('visited')
  }

  /** ✅ 清理缓存 */
  clearCache() {
    wx.removeStorageSync(CACHE_KEY)
    this.loaded = false
    this.data = null
  }
}

export const userDataService = new UserDataService()
