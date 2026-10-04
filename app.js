// app.js —— 应用入口：安装 wx.request Mock 拦截器，获取用户信息（含默认游客）
var interceptor = require('./mock/interceptor.js')

App({
  onLaunch: function () {
    // 安装本地 Mock 拦截器：所有 https://localhost:3001/data/*.json 请求由内存数据库响应
    interceptor.install()

    // 展示本地存储日志能力
    var logs = wx.getStorageSync('logs') || []
    logs.unshift(Date.now())
    wx.setStorageSync('logs', logs)

    // 登录（演示环境，仅获取 code，不发起真实请求）
    wx.login({ success: function () {} })

    // 获取用户信息；未授权时使用默认 Mock 用户
    var that = this
    wx.getSetting({
      success: function (res) {
        if (res.authSetting['scope.userInfo']) {
          wx.getUserInfo({
            success: function (r) {
              that.globalData.userInfo = r.userInfo
              if (that.userInfoReadyCallback) that.userInfoReadyCallback(r)
            }
          })
        } else {
          that.globalData.userInfo = that.defaultUser
        }
      },
      fail: function () {
        that.globalData.userInfo = that.defaultUser
      }
    })
  },
  globalData: {
    userInfo: null,
    defaultUser: { nickName: '鲜生活家', avatarUrl: '/images/icons/person_active.png' }
  }
})
