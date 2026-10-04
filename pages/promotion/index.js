// pages/promotion/index.js —— 促销活动：限时抢购 / 满减专区 / 领券中心（需求9）
var api = require('../../utils/api.js')
var fmt = require('../../utils/format.js')
var toast = require('../../utils/toast.js')
var badge = require('../../utils/badge.js')

var TABS = [
  { key: 'seckill', name: '限时抢购' },
  { key: 'fullReduce', name: '满减专区' },
  { key: 'coupon', name: '领券中心' }
]

Page({
  data: {
    tabs: TABS,
    activeTab: 'seckill',
    sessions: [],
    seckillList: [],
    activeSession: null,
    fullReduceRules: [],
    fullReduceGoods: [],
    couponList: [],
    countdown: '00:00:00',
    countdownLabel: '场次倒计时',
    loading: true
  },

  onLoad: function (options) {
    if (options.tab) this.setData({ activeTab: options.tab })
  },

  onShow: function () {
    this.loadData()
  },

  onUnload: function () {
    if (this._timer) clearInterval(this._timer)
  },

  loadData: function () {
    var that = this
    this.setData({ loading: true })
    Promise.all([
      api.get('/api/promotion/home'),
      api.get('/api/coupons/center')
    ]).then(function (res) {
      var promo = res[0]
      that.setData({
        sessions: promo.sessions,
        seckillList: promo.seckillList,
        activeSession: promo.activeSession,
        fullReduceRules: promo.fullReduceRules,
        fullReduceGoods: promo.fullReduceGoods,
        couponList: res[1].list.map(function (c) {
          c.amountLabel = c.type === 2 ? (c.discount / 10) + '折' : '￥' + fmt.yuan(c.discount)
          c.ruleLabel = c.type === 1 ? '满' + fmt.yuan(c.threshold) + '元可用' : (c.type === 3 ? '无门槛通用' : c.scope)
          return c
        }),
        loading: false
      })
      that.startCountdown()
    }).catch(function () { that.setData({ loading: false }) })
  },

  switchTab: function (e) {
    var key = e.currentTarget.dataset.key
    this.setData({ activeTab: key })
  },

  pickSession: function (e) {
    var sid = e.currentTarget.dataset.id
    var sess = this.data.sessions.filter(function (s) { return s.sessionId === sid })[0]
    this.setData({ activeSession: sess })
    this.startCountdown()
  },

  // 倒计时：抢购中→距结束(开始+4h)；未开始→距开始；已结束→00:00:00
  startCountdown: function () {
    if (this._timer) clearInterval(this._timer)
    var sess = this.data.activeSession
    if (!sess) return
    var now = new Date()
    var start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), sess.hour, sess.minute, 0)
    var target = sess.status === 2 ? new Date(start.getTime() + 4 * 3600 * 1000) : start
    var label = sess.status === 2 ? '距' + sess.name + '结束' : (sess.status === 1 ? '距' + sess.name + '开始' : sess.name + '已结束')
    var tick = function () {
      var diff = target.getTime() - Date.now()
      if (diff < 0) diff = 0
      var h = Math.floor(diff / 3600000)
      var m = Math.floor(diff % 3600000 / 60000)
      var s = Math.floor(diff % 60000 / 1000)
      var p = function (n) { return n < 10 ? '0' + n : '' + n }
      this.setData({ countdown: p(h) + ':' + p(m) + ':' + p(s), countdownLabel: label })
    }.bind(this)
    tick()
    this._timer = setInterval(tick, 1000)
  },

  // 抢购加购
  seckillBuy: function (e) {
    var gid = e.currentTarget.dataset.gid
    api.post('/api/seckill/buy', { goodsId: gid }).then(function () {
      toast.success('已加入购物车（抢购价）')
      badge.refreshCartBadge()
    })
  },

  goDetail: function (e) {
    wx.navigateTo({ url: '/pages/detail/detail?id=' + e.currentTarget.dataset.id })
  },

  // 满减商品加购
  addCart: function (e) {
    var id = e.currentTarget.dataset.id
    api.post('/api/cart/add', { goodsId: id, specLabel: '标准装', count: 1 }).then(function () {
      toast.success('加入购物车成功')
      badge.refreshCartBadge()
    })
  },

  // 领券
  claim: function (e) {
    var id = e.currentTarget.dataset.id
    var that = this
    api.post('/api/coupons/claim', { couponId: id }).then(function () {
      toast.success('领取成功')
      that.loadData()
    })
  },

  goCouponPage: function () {
    wx.navigateTo({ url: '/pages/coupon/index' })
  }
})
