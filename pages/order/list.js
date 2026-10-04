// pages/order/list.js 订单列表
var api = require('../../utils/api.js')
var F = require('../../utils/format.js')
var toast = require('../../utils/toast.js')
var img = require('../../utils/img.js')

var STATUS_TABS = [
  { key: 'all', name: '全部' },
  { key: 1, name: '待付款' },
  { key: 2, name: '待发货' },
  { key: 3, name: '配送中' },
  { key: 4, name: '待收货' },
  { key: 5, name: '已完成' }
]

Page({
  data: {
    tabs: STATUS_TABS,
    activeTab: 'all',
    orders: [],
    page: 1,
    pageSize: 10,
    hasMore: true,
    loading: true,
    statusMap: { 1: '待付款', 2: '待发货', 3: '配送中', 4: '待收货', 5: '已完成', 6: '已取消' },
    DEFAULT_IMG: api.DEFAULT_IMG
  },

  onLoad: function (options) {
    if (options.status && options.status !== 'all') this.setData({ activeTab: Number(options.status) })
    this.loadOrders(1, true)
  },

  onShow: function () {
    // 返回时刷新（支付/取消/收货后同步）
    if (!this.data.loading) this.loadOrders(this.data.page, true)
  },

  loadOrders: function (page, reset) {
    var that = this
    this.setData({ loading: true })
    var params = { page: page, pageSize: this.data.pageSize }
    if (this.data.activeTab !== 'all') params.status = this.data.activeTab
    api.getOrders(params).then(function (res) {
      var list = (res && res.list) || []
      list = list.map(function (o) {
        return Object.assign({}, o, {
          payYuan: F.fen2yuan(o.payAmount),
          totalYuan: F.fen2yuan(o.totalAmount),
          createTimeText: F.formatTime(o.createTime),
          thumbs: (o.items || []).slice(0, 3).map(function (it) { return it.pic })
        })
      })
      that.setData({
        orders: reset ? list : that.data.orders.concat(list),
        page: page,
        hasMore: !!(res && res.hasMore),
        loading: false
      })
    })
  },

  switchTab: function (e) {
    var key = e.currentTarget.dataset.key
    this.setData({ activeTab: key, page: 1 })
    this.loadOrders(1, true)
  },

  onReachBottom: function () {
    if (this.data.hasMore && !this.data.loading) {
      this.loadOrders(this.data.page + 1, false)
    }
  },

  onPullDownRefresh: function () {
    this.loadOrders(1, true)
    wx.stopPullDownRefresh()
  },

  goDetail: function (e) {
    var id = e.currentTarget.dataset.id
    wx.navigateTo({ url: '/pages/order/detail?id=' + id })
  },

  // 快捷操作：去支付
  quickPay: function (e) {
    var id = e.currentTarget.dataset.id
    var that = this
    toast.showLoading('支付中...（演示环境）')
    setTimeout(function () {
      api.payOrder(id).then(function (res) {
        toast.hideLoading()
        if (res.ok) { toast.success('支付成功'); that.loadOrders(1, true) }
        else toast.toast(res.msg || '支付失败')
      })
    }, 2000)
  },

  quickCancel: function (e) {
    var id = e.currentTarget.dataset.id
    var that = this
    toast.confirm('确定取消该订单吗？').then(function (ok) {
      if (!ok) return
      api.cancelOrder(id).then(function (res) {
        if (res.ok) { toast.success('订单已取消'); that.loadOrders(1, true) }
        else toast.toast(res.msg || '取消失败')
      })
    })
  },

  quickConfirm: function (e) {
    var id = e.currentTarget.dataset.id
    var that = this
    toast.confirm('确认已收到商品？').then(function (ok) {
      if (!ok) return
      api.confirmReceive(id).then(function (res) {
        if (res.ok) { toast.success('确认收货成功'); that.loadOrders(1, true) }
        else toast.toast(res.msg || '操作失败')
      })
    })
  },

  goReview: function (e) {
    var id = e.currentTarget.dataset.id
    wx.navigateTo({ url: '/pages/order/review?orderId=' + id })
  },

  rebuy: function (e) {
    var id = e.currentTarget.dataset.id
    var that = this
    api.orderDetail(id).then(function (o) {
      if (!o) return
      Promise.all(o.items.map(function (it) {
        return api.addToCart({
          goodsId: it.goodsId, name: it.name, pic: it.pic,
          specText: it.specText, price: it.price, count: it.count
        })
      })).then(function () {
        toast.success('已加入购物车')
        setTimeout(function () { wx.switchTab({ url: '/pages/shop/shop' }) }, 500)
      })
    })
  },

  goShop: function () {
    wx.switchTab({ url: '/pages/index/index' })
  },

  onImgError: function (e) { img.make(this)(e) }
})
