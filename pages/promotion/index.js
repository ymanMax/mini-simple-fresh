// pages/promotion/index.js —— 促销活动：限时抢购（场次+倒计时+进度条）/ 满减专区 / 领券中心
var mixin = require('../../utils/mixin.js')
var api = mixin.api

Page({
  data: {
    loading: true,
    tab: 'seckill', // seckill | fullreduce | coupon
    promotions: null,
    seckillGoods: [],
    sessions: [],
    activeSession: null,
    countdown: '00:00:00',
    couponCenter: [],
    fullReduceRules: [],
    fullReduceGoods: [],
    cartCount: 0,
    tabs: [{ key: 'seckill', name: '限时抢购' }, { key: 'fullreduce', name: '满减专区' }, { key: 'coupon', name: '领券中心' }]
  },

  onLoad: function (options) {
    if (options.tab) this.setData({ tab: options.tab })
  },
  onShow: function () {
    this.loadData()
    this.startTimer()
    mixin.updateTabBadge.call(this)
    this.setData({ cartCount: api.cartCount() })
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

  loadData: function () {
    var that = this
    this.setData({ loading: true })
    Promise.all([api.getPromotions(), api.getCouponCenter(), api.getProducts({ page: 1, pageSize: 40, sort: 'sales' })]).then(function (res) {
      var promotions = res[0]
      var db = api.loadDB()
      // 秒杀商品解析为完整商品
      var seckillGoods = promotions.seckill.seckillGoods.map(function (sg) {
        var g = db.goods.filter(function (x) { return x.id === sg.goodsId })[0]
        return Object.assign({}, sg, { name: g ? g.name : sg.goodsId, pic: g ? g.pic : '/images/default.png', originalPrice: g ? g.originalPrice : 0, vipPrice: g ? g.vipPrice : 0, stock: g ? g.stock : sg.stock })
      })
      // 场次状态（按当前时间自动判断）；预计算 statusText/active/cls（WXML纯字段绑定，无比较无三元）
      var sessions = promotions.seckill.sessions.map(function (s) {
        var status = that.sessionStatus(s)
        var statusText = status === 2 ? '抢购中' : status === 1 ? '未开始' : '已结束'
        return Object.assign({}, s, { status: status, statusText: statusText, active: false, cls: 'session' + (status === 3 ? ' ended' : '') })
      })
      var activeSession = sessions.filter(function (s) { return s.status === 2 })[0] || sessions[0]
      sessions.forEach(function (s) {
        s.active = (s.sessionId === activeSession.sessionId)
        s.cls = 'session' + (s.active ? ' active' : '') + (s.status === 3 ? ' ended' : '')
      })
      var countdownLabel = activeSession.status === 2 ? '距本场结束' : '距开场'
      // 满减专区参与商品：取销量前6
      var allProducts = res[2].list
      // 券面额文案预计算（WXML不支持方法调用）
      var couponCenter = res[1].map(function (c) {
        var amountText = c.type === 3 ? '¥' + (c.discount / 100).toFixed(0) : c.type === 2 ? (c.discount / 10).toFixed(1) + '折' : '¥' + (c.discount / 100).toFixed(0)
        return Object.assign({}, c, { amountText: amountText })
      })
      var tabs = that.data.tabs.map(function (t) {
        return Object.assign({}, t, { cls: 'top-tab' + (t.key === that.data.tab ? ' active' : '') })
      })
      that.setData({
        loading: false, promotions: promotions, seckillGoods: seckillGoods,
        sessions: sessions, activeSession: activeSession, countdownLabel: countdownLabel,
        couponCenter: couponCenter, fullReduceRules: promotions.fullReduce.fullReduceRules,
        fullReduceGoods: allProducts.slice(0, 6), tabs: tabs,
        seckillTabActive: that.data.tab === 'seckill',
        fullreduceTabActive: that.data.tab === 'fullreduce',
        couponEmpty: couponCenter.length === 0
      })
    })
  },

  // 场次状态：1未开始 2抢购中 3已结束（按真实时间）
  sessionStatus: function (s) {
    var now = new Date()
    var hour = now.getHours() + now.getMinutes() / 60
    var start = parseFloat(s.startTime.split(':')[0]) + parseFloat(s.startTime.split(':')[1]) / 60
    var end = parseFloat(s.endTime.split(':')[0]) + parseFloat(s.endTime.split(':')[1]) / 60
    if (hour >= end) return 3
    if (hour >= start) return 2
    return 1
  },

  // 倒计时：活跃场→距结束；未开始→距开始；已结束→00:00:00
  tick: function () {
    var s = this.data.activeSession
    if (!s) return
    var now = new Date()
    var targetH, targetM
    if (s.status === 2) { targetH = parseInt(s.endTime.split(':')[0]); targetM = parseInt(s.endTime.split(':')[1]) }
    else if (s.status === 1) { targetH = parseInt(s.startTime.split(':')[0]); targetM = parseInt(s.startTime.split(':')[1]) }
    else { this.setData({ countdown: '00:00:00' }); return }
    var target = new Date(now)
    target.setHours(targetH, targetM, 0, 0)
    var diff = Math.max(0, target - now)
    var h = Math.floor(diff / 3600000), m = Math.floor((diff % 3600000) / 60000), sec = Math.floor((diff % 60000) / 1000)
    function p(x) { return x < 10 ? '0' + x : x }
    this.setData({ countdown: p(h) + ':' + p(m) + ':' + p(sec) })
  },

  switchTab: function (e) {
    var tab = e.currentTarget.dataset.tab
    var tabs = this.data.tabs.map(function (t) {
      return Object.assign({}, t, { cls: 'top-tab' + (t.key === tab ? ' active' : '') })
    })
    this.setData({
      tab: tab, tabs: tabs,
      seckillTabActive: tab === 'seckill',
      fullreduceTabActive: tab === 'fullreduce',
      couponEmpty: this.data.couponCenter.length === 0
    })
  },

  // 选择场次（预计算cls：active/ended）
  pickSession: function (e) {
    var id = e.currentTarget.dataset.id
    var sessions = this.data.sessions.map(function (x) {
      var active = x.sessionId === id
      return Object.assign({}, x, { active: active, cls: 'session' + (active ? ' active' : '') + (x.status === 3 ? ' ended' : '') })
    })
    var s = sessions.filter(function (x) { return x.sessionId === id })[0]
    var countdownLabel = s.status === 2 ? '距本场结束' : '距开场'
    this.setData({ sessions: sessions, activeSession: s, countdownLabel: countdownLabel })
    this.tick()
  },

  // 秒杀商品"马上抢"：按抢购价加购（演示：加入购物车并toast）
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

  // 普通商品加购（满减专区）
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

  claim: function (e) {
    var that = this
    var id = e.currentTarget.dataset.id
    api.claimCoupon(id).then(function (res) {
      wx.showToast({ title: res.msg, icon: res.success ? 'success' : 'none' })
      if (res.success) that.loadData()
    })
  },

  goDetail: function (e) { mixin.goDetail.call(this, e.currentTarget.dataset.id) },
  goCart: function () { wx.switchTab({ url: '/pages/shop/shop' }) },

  onImgError: mixin.onImgError
})
