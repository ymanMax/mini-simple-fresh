// app.js
var api = require('./utils/api.js')

App({
  onLaunch: function () {
    // 安装 Mock：拦截 wx.request，内存数据库 + storage 持久化
    api.install()

    // 展示本地存储能力
    var logs = wx.getStorageSync('logs') || []
    logs.unshift(Date.now())
    wx.setStorageSync('logs', logs)

    // 登录（演示环境，不产生真实交易）
    wx.login({
      success: function () {
        // 演示环境无需真实换 token
      }
    })

    // 获取用户信息：已授权则读取，未授权使用默认 Mock 用户
    wx.getSetting({
      success: function (res) {
        if (res.authSetting['scope.userInfo']) {
          wx.getUserInfo({
            success: function (r) {
              this.globalData.userInfo = r.userInfo
              if (this.userInfoReadyCallback) this.userInfoReadyCallback(r)
            }.bind(this)
          })
        } else {
          this.globalData.userInfo = {
            nickName: '鲜果达人',
            avatarUrl: '/https/images/me-icon/01.png'
          }
        }
      }.bind(this)
    })
  },
  globalData: {
    userInfo: {
      nickName: '鲜果达人',
      avatarUrl: '/https/images/me-icon/01.png'
    }
  }
})
