// app.js —— 应用入口：初始化本地 mock 数据层（无需后端服务）
var mock = require('./utils/mock.js')
mock.setup()
var badge = require('./utils/badge.js')
badge.refreshAllBadges()

App({
  globalData: {
    userInfo: null,
    // 默认游客用户（未授权时展示）
    guestUser: { nickName: '鲜生活用户', avatar: '/images/avatar/default.png' }
  },

  onLaunch: function () {
    // 展示本地存储能力（模板原生日志）
    var logs = wx.getStorageSync('logs') || []
    logs.unshift(Date.now())
    wx.setStorageSync('logs', logs)

    wx.login({ success: function () {} })

    // 获取用户信息（已授权则更新）
    wx.getSetting({
      success: function (res) {
        if (res.authSetting['scope.userInfo']) {
          wx.getUserInfo({
            success: function (r) {
              this.globalData.userInfo = r.userInfo
              if (this.userInfoReadyCallback) this.userInfoReadyCallback(r)
            }.bind(this)
          })
        }
      }.bind(this)
    })
  },

  // 头像昵称：优先授权用户，否则用默认游客
  getUser: function () {
    if (this.globalData.userInfo) return this.globalData.userInfo
    return this.globalData.guestUser
  }
})
