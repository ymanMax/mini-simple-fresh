// pages/index/index.js —— 首页：搜索栏 + banner + 金刚区 + 限时抢购模块 + 商品列表（分页）
var api = require('../../utils/api.js')
var toast = require('../../utils/toast.js')
var badge = require('../../utils/badge.js')
var imgBehavior = require('../../utils/imgBehavior.js')

Page({
  behaviors: [imgBehavior],
  data: {
    banner: [],
    lanterns: [],
    goods: [],
    page: 1,
    pageSize: 10,
    hasMore: true,
    loading: true,
    refreshing: false,
    hotGoods: [],
    seckillList: []
  },

  onLoad: function () {
    this.loadHome(true)
  },

  onShow: function () {
    badge.refreshCartBadge()
  },

  loadHome: function (reset) {
    var that = this
    if (reset) { this.setData({ loading: true, page: 1, goods: [] }) }
    api.get('/api/home').then(function (home) {
      that.setData({
        banner: home.banner,
        lanterns: home.lanterns,
        hotGoods: home.hotGoods,
        loading: false
      })
      // 限时抢购模块
      api.get('/api/promotion/home').then(function (promo) {
        that.setData({ seckillList: promo.seckillList })
      }).catch(function () {})
      that.loadGoods(1, true)
    }).catch(function () {
      that.setData({ loading: false })
    })
  },

  loadGoods: function (page, reset) {
    var that = this
    if (reset) this.setData({ loading: true })
    api.get('/api/goods/list', { page: page, pageSize: this.data.pageSize, sort: 'sells' }).then(function (data) {
      var list = data.list
      var goods = reset ? list : that.data.goods.concat(list)
      that.setData({
        goods: goods,
        page: page,
        hasMore: data.hasMore,
        loading: false,
        refreshing: false
      })
    }).catch(function () {
      that.setData({ loading: false, refreshing: false })
    })
  },

  onReachBottom: function () {
    if (this.data.hasMore && !this.data.loading) {
      this.loadGoods(this.data.page + 1, false)
    }
  },

  onPullDownRefresh: function () {
    var that = this
    this.loadHome(true)
    setTimeout(function () { wx.stopPullDownRefresh() }, 800)
  },

  goSearch: function () {
    wx.navigateTo({ url: '/pages/search/search' })
  },

  goCategory: function () {
    wx.navigateTo({ url: '/pages/category/index' })
  },

  goDetail: function (e) {
    var id = e.currentTarget.dataset.id
    wx.navigateTo({ url: '/pages/detail/detail?id=' + id })
  },

  goPromotion: function () {
    wx.navigateTo({ url: '/pages/promotion/index?tab=seckill' })
  },

  lanternTap: function (e) {
    var link = e.currentTarget.dataset.link
    if (link) {
      wx.navigateTo({ url: link, fail: function () { wx.switchTab({ url: link, fail: function () {} }) } })
      return
    }
    wx.navigateTo({ url: '/pages/category/index' })
  },

  // banner 点击：轮播图可跳促销/分类
  bannerTap: function (e) {
    var idx = e.currentTarget.dataset.index
    var banner = this.data.banner[idx]
    if (banner && banner.link) {
      wx.navigateTo({ url: banner.link })
    }
  },

  bannerUnused: function () {},

  addCart: function (e) {
    var id = e.currentTarget.dataset.id
    api.post('/api/cart/add', { goodsId: id, specLabel: '标准装', count: 1 }).then(function () {
      toast.success('加入购物车成功')
      badge.refreshCartBadge()
    })
  },

  seckillBuy: function (e) {
    var gid = e.currentTarget.dataset.gid
    api.post('/api/seckill/buy', { goodsId: gid }).then(function () {
      toast.success('已加入购物车（抢购价）')
      badge.refreshCartBadge()
    })
  }
})
