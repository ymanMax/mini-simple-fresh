// app.js —— 全局入口：安装 wx.request 拦截器，所有请求进入本地 Mock 数据库（无需后端服务）
var db = require('./utils/mock/db.js')

;(function installInterceptor() {
  var originalRequest = wx.request
  wx.request = function(options) {
    var url = options.url || ''
    var isMock = url.indexOf('/api') === 0 || url.indexOf('localhost:3001') >= 0 || url.indexOf('127.0.0.1:3001') >= 0
    if (!isMock) return originalRequest(options)
    db.handleRequest(options)
  }
})()

App({
  onLaunch: function() {
    // 登录（Mock）：wx.login 获取 code，实际由本地数据层处理用户态
    wx.login({ success: function() {} })
    // 获取用户信息；未授权时使用默认 Mock 用户
    wx.getSetting({
      success: function(res) {
        if (res.authSetting['scope.userInfo']) {
          wx.getUserInfo({
            success: function(r) { this.globalData.userInfo = r.userInfo }.bind(this)
          })
        }
      }.bind(this)
    })
  },
  globalData: {
    userInfo: null,
    guestUser: { nickName: '鲜生活用户', avatarUrl: '/images/avatar.png' }
  }
})
