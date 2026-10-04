// pages/promotion/index.js 促销活动：限时抢购 / 满减专区 / 领券中心
var api = require('../../utils/api.js')
var F = require('../../utils/format.js')
var toast = require('../../utils/toast.js')
var img = require('../../utils/img.js')

Page({
  data: {
    tabs: [
      { key: 'seckill', name: '限时抢购' },
      { key: 'fullreduce', name: '满减专区' },
      { key: 'coupon', name: '领券中心' }
    ],
    activeTab: 'seckill',
    sessions: [],
    activeSession: null,
    seckillGoods: [],
    fullReduceRules: [],
    couponCenter: [],
    countdownText: '00:00:00',
    now: Date.now(),
    loading: true,
    DEFAULT_IMG: api.DEFAULT_IMG
  },

  onLoad: function (options) {
    if (options.tab) this.setData({ activeTab: options.tab })
    this.load()
    this.startCountdown()
  },

  onShow: function () {
    this.load()
  },

  onUnload: function () {
    if (this._timer) clearInterval(this._timer)
  },

  load: function () {
    var that = this
    api.getPromotions().then(function (p) {
      var goods = (p.seckillGoods || []).map(function (g) {
        return Object.assign({}, g, { pic: g.pic })
      })
      var coupons = (p.couponCenter || []).map(function (c) {
        var amountText = c.type === 2 ? (c.discount / 10) + '折' : '¥' + c.discount
        var condText = c.threshold > 0 ? ('满' + c.threshold + '元可用') : '无门槛'
        return Object.assign({}, c, { amountText: amountText, condText: condText })
      })
      that.setData({
        sessions: p.sessions,
        activeSession: p.activeSession,
        seckillGoods: goods,
        fullReduceRules: p.fullReduceRules,
        couponCenter: coupons,
        loading: false
      })
      that.updateCountdown(p.countdownMs)
    })
  },

  startCountdown: function () {
    var that = this
    this._timer = setInterval(function () {
      api.getPromotions().then(function (p) {
        that.updateCountdown(p.countdownMs)
        that.setData({ activeSession: p.activeSession, sessions: p.sessions })
      })
    }, 1000)
  },

  updateCountdown: function (ms) {
    this.setData({ countdownText: F.countDown(ms || 0) })
  },

  switchTab: function (e) {
    this.setData({ activeTab: e.currentTarget.dataset.key })
  },

  selectSession: function (e) {
    var id = Number(e.currentTarget.dataset.id)
    var session = this.data.sessions.filter(function (s) { return s.sessionId === id })[0]
    if (session && session.status === 1) { toast.toast('该场次未开始，敬请期待') }
    this.setData({ activeSession: session })
  },

  seckillBuy: function (e) {
    var goodsId = e.currentTarget.dataset.id
    var that = this
    api.seckillAddToCart(goodsId, 1).then(function (res) {
      if (res.ok) toast.success('抢购商品已加入购物车')
      else toast.toast(res.msg || '加入购物车失败')
    })
  },

  goDetail: function (e) {
    var id = e.currentTarget.dataset.id
    wx.navigateTo({ url: '/pages/detail/detail?id=' + id })
  },

  claim: function (e) {
    var id = e.currentTarget.dataset.id
    api.claimCoupon(id).then(function (res) {
      if (res.ok) toast.success('领取成功')
      else toast.toast(res.msg || '领取失败')
    })
    this.load()
  },

  goCouponMine: function () {
    wx.navigateTo({ url: '/pages/coupon/index?tab=mine' })
  },

  onImgError: function (e) { img.make(this)(e) }
})
