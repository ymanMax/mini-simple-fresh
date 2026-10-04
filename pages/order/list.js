// pages/order/list.js —— 订单列表：状态 Tab + 分页 + 操作（支付/取消/确认收货/评价/再来一单）
var api = require('../../utils/api.js')
var fmt = require('../../utils/format.js')
var toast = require('../../utils/toast.js')
var imgBehavior = require('../../utils/imgBehavior.js')

var TABS = [
  { key: 'all', name: '全部' },
  { key: '1', name: '待付款' },
  { key: '2', name: '待发货' },
  { key: '3', name: '配送中' },
  { key: '4', name: '待收货' },
  { key: '5', name: '已完成' }
]

Page({
  behaviors: [imgBehavior],
  data: {
    tabs: TABS,
    activeTab: 'all',
    orders: [],
    page: 1,
    pageSize: 10,
    hasMore: true,
    loading: true,
    counts: {}
  },

  onLoad: function (options) {
    if (options.status) {
      this.setData({ activeTab: options.status })
    }
    this.loadOrders(true)
  },

  onShow: function () {
    this.loadOrders(true)
  },

  switchTab: function (e) {
    var key = e.currentTarget.dataset.key
    if (key === this.data.activeTab) return
    this.setData({ activeTab: key, orders: [], page: 1 })
    this.loadOrders(true)
  },

  decorate: function (orders) {
    return orders.map(function (o) {
      o.preview = o.items.slice(0, 3)
      o.moreCount = o.items.length - o.preview.length
      return o
    })
  },

  loadOrders: function (reset) {
    var that = this
    this.setData({ loading: true })
    api.get('/api/orders/list', { status: this.data.activeTab, page: reset ? 1 : this.data.page, pageSize: this.data.pageSize })
      .then(function (data) {
        var orders = reset ? data.list : that.data.orders.concat(data.list)
        that.setData({
          orders: that.decorate(orders),
          page: reset ? 1 : that.data.page,
          hasMore: data.hasMore,
          loading: false
        })
        that.loadCounts()
      }).catch(function () { that.setData({ loading: false }) })
  },

  loadCounts: function () {
    var that = this
    api.get('/api/orders/list', { status: 'all', page: 1, pageSize: 100 }).then(function (data) {
      var counts = { all: data.total, '1': 0, '2': 0, '3': 0, '4': 0, '5': 0, '6': 0 }
      data.list.forEach(function (o) { counts[String(o.status)] += 1 })
      that.setData({ counts: counts })
    })
  },

  onReachBottom: function () {
    if (this.data.hasMore && !this.data.loading) {
      this.setData({ page: this.data.page + 1 })
      this.loadOrders(false)
    }
  },

  onPullDownRefresh: function () {
    var that = this
    this.loadOrders(true)
    setTimeout(function () { wx.stopPullDownRefresh() }, 800)
  },

  goDetail: function (e) {
    wx.navigateTo({ url: '/pages/order/detail?id=' + e.currentTarget.dataset.id })
  },

  goShop: function () {
    wx.switchTab({ url: '/pages/index/index' })
  },

  pay: function (e) {
    var id = e.currentTarget.dataset.id
    var that = this
    toast.mockPay('', function () {
      api.post('/api/orders/pay', { orderId: id }).then(function () {
        toast.success('支付成功')
        that.loadOrders(true)
      })
    })
  },

  cancel: function (e) {
    var id = e.currentTarget.dataset.id
    var that = this
    toast.confirm('确定取消该订单吗？', '取消订单', function () {
      api.post('/api/orders/cancel', { orderId: id }).then(function () {
        toast.success('订单已取消')
        that.loadOrders(true)
      })
    })
  },

  confirmReceive: function (e) {
    var id = e.currentTarget.dataset.id
    var that = this
    toast.confirm('确认已收到货物吗？', '确认收货', function () {
      api.post('/api/orders/confirm', { orderId: id }).then(function () {
        toast.success('已确认收货')
        that.loadOrders(true)
      })
    })
  },

  goReview: function (e) {
    wx.navigateTo({ url: '/pages/order/review?id=' + e.currentTarget.dataset.id })
  },

  rebuy: function (e) {
    var id = e.currentTarget.dataset.id
    var that = this
    api.get('/api/orders/detail?id=' + id).then(function (data) {
      var order = data.order
      // 逐个加购
      var chain = Promise.resolve()
      order.items.forEach(function (it) {
        chain = chain.then(function () {
          return api.post('/api/cart/add', { goodsId: it.goodsId, specLabel: it.specText, count: it.count })
        })
      })
      chain.then(function () {
        toast.success('商品已加入购物车')
        wx.switchTab({ url: '/pages/shop/shop' })
      })
    })
  }
})
