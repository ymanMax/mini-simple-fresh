// pages/my/collect.js —— 商品收藏（需求6.2）
var api = require('../../utils/api.js')
var toast = require('../../utils/toast.js')

Page({
  data: { list: [], loading: true },

  onShow: function () {
    this.loadList()
  },

  loadList: function () {
    var that = this
    api.get('/api/favorites/list').then(function (data) {
      that.setData({ list: data.list, loading: false })
    }).catch(function () { that.setData({ loading: false }) })
  },

  goDetail: function (e) {
    wx.navigateTo({ url: '/pages/detail/detail?id=' + e.currentTarget.dataset.id })
  },

  removeFav: function (e) {
    var id = e.currentTarget.dataset.id
    var that = this
    toast.confirm('取消收藏该商品吗？', '取消收藏', function () {
      api.post('/api/favorites/toggle', { goodsId: id }).then(function () {
        toast.success('已取消收藏')
        that.loadList()
      })
    })
  },

  goShop: function () {
    wx.switchTab({ url: '/pages/index/index' })
  }
})
