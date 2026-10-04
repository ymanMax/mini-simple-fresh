// pages/index/index.js —— 首页：搜索入口 + banner + 金刚区 + 限时抢购模块（倒计时）+ 商品列表（加购、角标、骨架屏、分页）
var mixin = require('../../utils/mixin.js')
var api = mixin.api

Page({
  data: {
    loading: true,
    banners: [],
    lanternArea: [],
    tileArea: [],
    goods: [],
    page: 1,
    total: 0,
    pageSize: 10,
    noMore: false,
    cartCount: 0,
    hotWords: [],
    // 需求9.3：首页限时抢购模块
    seckillGoods: [],
    countdown: '00:00:00',
    activeSession: null
  },

  onLoad: function () {
    this.loadHome()
    this.startTimer()
  },
  onShow: function () {
    this.setData({ cartCount: api.cartCount() })
    mixin.updateTabBadge.call(this)
  },
  onHide: function () { this.stopTimer() },
  onUnload: function () { this.stopTimer() },

  timer: null,
  startTimer: function () {
    this.stopTimer()
    this.timer = setInterval(this.tick.bind(this), 1000)
    this.tick()
  },
  stopTimer: function () { if (this.timer) { clearInterval(this.timer); this.timer = null } },

  // 秒杀倒计时：按当前时间判断最近场次
  tick: function () {
    var s = this.data.activeSession
    if (!s) return
    var now = new Date()
    var targetH = parseInt(s.endTime.split(':')[0]), targetM = parseInt(s.endTime.split(':')[1])
    var target = new Date(now)
    target.setHours(targetH, targetM, 0, 0)
    var diff = Math.max(0, target - now)
    var h = Math.floor(diff / 3600000), m = Math.floor((diff % 3600000) / 60000), sec = Math.floor((diff % 60000) / 1000)
    function p(x) { return x < 10 ? '0' + x : x }
    this.setData({ countdown: p(h) + ':' + p(m) + ':' + p(sec) })
  },

  loadHome: function () {
    var that = this
    this.setData({ loading: true })
    Promise.all([api.getHomeData(), api.getPromotions()]).then(function (res) {
      var home = res[0]
      var promo = res[1]
      // 解析秒杀商品为完整商品
      var db = api.loadDB()
      var seckillGoods = promo.seckill.seckillGoods.map(function (sg) {
        var g = db.goods.filter(function (x) { return x.id === sg.goodsId })[0]
        return Object.assign({}, sg, { name: g ? g.name : sg.goodsId, pic: g ? g.pic : '/images/default.png', originalPrice: g ? g.originalPrice : 0 })
      })
      // 当前活跃场次（按真实时间）
      var sessions = promo.seckill.sessions.map(function (s) {
        var now = new Date()
        var hour = now.getHours() + now.getMinutes() / 60
        var start = parseFloat(s.startTime.split(':')[0]) + parseFloat(s.startTime.split(':')[1]) / 60
        var end = parseFloat(s.endTime.split(':')[0]) + parseFloat(s.endTime.split(':')[1]) / 60
        var status = hour >= end ? 3 : hour >= start ? 2 : 1
        return Object.assign({}, s, { status: status })
      })
      var active = sessions.filter(function (s) { return s.status === 2 })[0] || sessions[0]
      that.setData({
        banners: home.banners, lanternArea: home.lanternArea, tileArea: home.tileArea,
        hotWords: home.hotWords, loading: false,
        seckillGoods: seckillGoods, activeSession: active
      })
      that.tick()
      that.loadProducts(true)
    })
  },

  loadProducts: function (reset) {
    var that = this
    var page = reset ? 1 : this.data.page + 1
    api.getProducts({ page: page, pageSize: this.data.pageSize, sort: 'hotScore' }).then(function (res) {
      var list = reset ? res.list : that.data.goods.concat(res.list)
      that.setData({
        goods: list, page: res.page, total: res.total,
        noMore: list.length >= res.total, loading: false
      })
    })
  },

  onReachBottom: function () {
    if (!this.data.noMore && !this.data.loading) this.loadProducts(false)
  },
  onPullDownRefresh: function () {
    var that = this
    this.loadHome()
    setTimeout(function () { wx.stopPullDownRefresh() }, 600)
  },

  goSearch: mixin.goSearch,
  goDetail: function (e) { mixin.goDetail.call(this, e.currentTarget.dataset.id) },

  addCart: function (e) {
    var that = this
    var id = e.currentTarget.dataset.id
    api.addToCart(id, '标准装 · 常规包装', 1).then(function (res) {
      if (res.success) {
        wx.showToast({ title: '加入购物车成功', icon: 'none' })
        that.setData({ cartCount: api.cartCount() })
        mixin.updateTabBadge.call(that)
      }
    })
  },

  // 秒杀加购（按抢购价）
  seckillBuy: function (e) {
    var that = this
    var id = e.currentTarget.dataset.id
    var sg = this.data.seckillGoods.filter(function (x) { return x.goodsId === id })[0]
    api.addToCart(id, '秒杀专享 · 标准装', 1, { specText: '秒杀专享 · ' + (sg ? sg.name : '标准装'), priceOverride: sg ? sg.seckillPrice : undefined }).then(function (res) {
      if (res.success) {
        wx.showToast({ title: '秒杀商品已加入购物车', icon: 'none' })
        that.setData({ cartCount: api.cartCount() })
        mixin.updateTabBadge.call(that)
      }
    })
  },

  // banner/金刚区点击：支持带 ?tab= 参数跳促销页
  tapBanner: function (e) {
    var link = e.currentTarget.dataset.link
    if (link && link.indexOf('/pages') === 0) {
      wx.navigateTo({ url: link })
    }
  },
  tapLantern: function (e) {
    var link = e.currentTarget.dataset.link
    if (link && link.indexOf('/pages') === 0) {
      wx.navigateTo({ url: link })
    } else {
      wx.showToast({ title: '活动即将上线', icon: 'none' })
    }
  },
  // 抢购模块"更多 >"跳促销活动页
  goPromotion: function () {
    wx.navigateTo({ url: '/pages/promotion/index?tab=seckill' })
  },

  onImgError: mixin.onImgError
})
