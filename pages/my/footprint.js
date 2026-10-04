// pages/my/footprint.js 浏览足迹（按日期分组）
var api = require('../../utils/api.js')
var F = require('../../utils/format.js')
var toast = require('../../utils/toast.js')
var img = require('../../utils/img.js')

Page({
  data: {
    groups: [], // [{label, items:[]}]
    loading: true,
    DEFAULT_IMG: api.DEFAULT_IMG
  },

  onShow: function () {
    this.load()
  },

  load: function () {
    var that = this
    api.getFootprints().then(function (list) {
      list = (list || []).map(function (g) {
        return Object.assign({}, g, { priceYuan: F.fen2yuan(g.minPrice) })
      })
      // 按日期分组：今天 / 昨天 / 更早
      var today = F.formatDate(Date.now())
      var yesterday = F.formatDate(Date.now() - 86400000)
      var gToday = [], gYesterday = [], gOld = []
      list.forEach(function (g) {
        var day = F.formatDate(g.viewTime)
        if (day === today) gToday.push(g)
        else if (day === yesterday) gYesterday.push(g)
        else gOld.push(g)
      })
      var groups = []
      if (gToday.length) groups.push({ label: '今天', items: gToday })
      if (gYesterday.length) groups.push({ label: '昨天', items: gYesterday })
      if (gOld.length) groups.push({ label: '更早', items: gOld })
      that.setData({ groups: groups, loading: false })
    })
  },

  goDetail: function (e) {
    var id = e.currentTarget.dataset.id
    wx.navigateTo({ url: '/pages/detail/detail?id=' + id })
  },

  removeOne: function (e) {
    var id = e.currentTarget.dataset.id
    var that = this
    api.removeFootprint(id).then(function () {
      toast.success('已删除')
      that.load()
    })
  },

  clearAll: function () {
    var that = this
    toast.confirm('清空所有浏览足迹？').then(function (ok) {
      if (!ok) return
      api.clearFootprints().then(function () {
        toast.success('已清空')
        that.load()
      })
    })
  },

  goShop: function () { wx.switchTab({ url: '/pages/index/index' }) },

  onImgError: function (e) { img.make(this)(e) }
})
