// pages/my/footprint.js —— 浏览足迹：按日期分组（今天/昨天/更早）、横滑卡片、单条删除、全部清空
var mixin = require('../../utils/mixin.js')
var api = mixin.api

Page({
  data: {
    loading: true,
    groups: [], // [{label:'今天'|'昨天'|更早日期, items:[]}]
    all: []
  },

  onShow: function () { this.loadData() },

  loadData: function () {
    var that = this
    this.setData({ loading: true })
    api.getFootprints().then(function (list) {
      that.setData({ loading: false, all: list })
      that.buildGroups(list)
    })
  },

  // 按日期分组：今天 / 昨天 / 更早（日期）
  buildGroups: function (list) {
    var today = new Date()
    function p(x) { return x < 10 ? '0' + x : x }
    var todayStr = today.getFullYear() + '-' + p(today.getMonth() + 1) + '-' + p(today.getDate())
    var y = new Date(today.getTime() - 86400000)
    var yesterdayStr = y.getFullYear() + '-' + p(y.getMonth() + 1) + '-' + p(y.getDate())
    var groups = {}
    list.forEach(function (f) {
      var day = (f.viewTime || '').slice(0, 10)
      var label = day === todayStr ? '今天' : day === yesterdayStr ? '昨天' : day
      if (!groups[label]) groups[label] = []
      groups[label].push(f)
    })
    var order = ['今天', '昨天'].concat(Object.keys(groups).filter(function (k) { return k !== '今天' && k !== '昨天' }))
    var result = order.filter(function (k) { return groups[k] }).map(function (k) { return { label: k, items: groups[k] } })
    this.setData({ groups: result })
  },

  goDetail: function (e) { mixin.goDetail.call(this, e.currentTarget.dataset.id) },

  // 单条删除
  removeOne: function (e) {
    var that = this
    var id = e.currentTarget.dataset.id
    wx.showModal({
      title: '删除记录', content: '确定删除这条浏览记录吗？',
      success: function (res) {
        if (res.confirm) {
          api.deleteFootprint(id).then(function () { that.loadData(); wx.showToast({ title: '已删除', icon: 'none' }) })
        }
      }
    })
  },

  // 全部清空（二次确认）
  clearAll: function () {
    var that = this
    wx.showModal({
      title: '清空足迹', content: '确定清空全部浏览记录吗？',
      success: function (res) {
        if (res.confirm) {
          api.clearFootprints().then(function () { that.loadData(); wx.showToast({ title: '已清空', icon: 'success' }) })
        }
      }
    })
  },

  goShopping: function () { wx.switchTab({ url: '/pages/index/index' }) },

  onImgError: mixin.onImgError
})
