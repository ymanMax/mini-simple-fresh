// pages/my/footprint.js —— 浏览足迹（需求6.3）：按日期分组，单条删除/全部清空
var api = require('../../utils/api.js')
var toast = require('../../utils/toast.js')

Page({
  data: { groups: [], loading: true },

  onShow: function () {
    this.loadList()
  },

  loadList: function () {
    var that = this
    api.get('/api/footprints/list').then(function (data) {
      // 按日期分组
      var today = new Date(); today.setHours(0,0,0,0)
      var yesterday = today.getTime() - 86400000
      var groups = [{ title: '今天', list: [] }, { title: '昨天', list: [] }, { title: '更早', list: [] }]
      data.list.forEach(function (item) {
        if (item.time >= today.getTime()) groups[0].list.push(item)
        else if (item.time >= yesterday) groups[1].list.push(item)
        else groups[2].list.push(item)
      })
      groups = groups.filter(function (g) { return g.list.length > 0 })
      that.setData({ groups: groups, loading: false })
    }).catch(function () { that.setData({ loading: false }) })
  },

  goDetail: function (e) {
    wx.navigateTo({ url: '/pages/detail/detail?id=' + e.currentTarget.dataset.id })
  },

  removeOne: function (e) {
    var gid = e.currentTarget.dataset.gid
    var that = this
    api.post('/api/footprints/remove', { goodsId: gid }).then(function () {
      toast.success('已删除')
      that.loadList()
    })
  },

  clearAll: function () {
    var that = this
    toast.confirm('清空全部浏览足迹吗？', '清空', function () {
      api.post('/api/footprints/clear', {}).then(function () {
        toast.success('已清空')
        that.loadList()
      })
    })
  },

  goShop: function () {
    wx.switchTab({ url: '/pages/index/index' })
  }
})
