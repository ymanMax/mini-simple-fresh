// pages/logs/logs.js —— 启动日志页：读取本地 logs，支持清空
var mixin = require('../../utils/mixin.js')

Page({
  data: { logs: [], loading: true },

  onLoad: function () { this.loadLogs() },
  onShow: function () { this.loadLogs() },

  loadLogs: function () {
    var logs = wx.getStorageSync('logs') || []
    var list = logs.map(function (ts, i) {
      var d = new Date(ts)
      function p(x) { return x < 10 ? '0' + x : x }
      return {
        index: i + 1,
        time: d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds()),
        ts: ts
      }
    }).reverse()
    this.setData({ logs: list, loading: false })
  },

  clearLogs: function () {
    var that = this
    wx.showModal({
      title: '清空日志', content: '确定清空所有启动日志吗？',
      success: function (res) {
        if (res.confirm) { wx.setStorageSync('logs', []); that.loadLogs() }
      }
    })
  },

  onImgError: mixin.onImgError
})
