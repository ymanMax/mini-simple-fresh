// pages/my/collect.js 我的收藏
var api = require('../../utils/api.js')
var F = require('../../utils/format.js')
var toast = require('../../utils/toast.js')
var img = require('../../utils/img.js')

Page({
  data: {
    list: [],
    loading: true,
    DEFAULT_IMG: api.DEFAULT_IMG
  },

  onShow: function () {
    this.load()
  },

  load: function () {
    var that = this
    api.getFavorites().then(function (list) {
      list = (list || []).map(function (g) {
        return Object.assign({}, g, { priceYuan: F.fen2yuan(g.minPrice) })
      })
      that.setData({ list: list, loading: false })
    })
  },

  goDetail: function (e) {
    var id = e.currentTarget.dataset.id
    wx.navigateTo({ url: '/pages/detail/detail?id=' + id })
  },

  removeFav: function (e) {
    var id = e.currentTarget.dataset.id
    var that = this
    toast.confirm('取消收藏该商品？').then(function (ok) {
      if (!ok) return
      api.toggleFavorite(id).then(function () {
        toast.success('已取消收藏')
        that.load()
      })
    })
  },

  addToCart: function (e) {
    var id = e.currentTarget.dataset.id
    var g = this.data.list.filter(function (x) { return x.id === id })[0]
    if (!g) return
    api.addToCart({
      goodsId: g.id, name: g.name, pic: g.pic,
      specText: '标准装', price: g.minPrice, count: 1
    }).then(function (res) {
      if (res.ok) toast.success('加入购物车成功')
      else toast.toast(res.msg || '加入购物车失败')
    })
  },

  goShop: function () { wx.switchTab({ url: '/pages/index/index' }) },

  onImgError: function (e) { img.make(this)(e) }
})
