// pages/order/detail.js 订单详情（物流跟踪/骑手/售后）
var api = require('../../utils/api.js')
var F = require('../../utils/format.js')
var toast = require('../../utils/toast.js')
var img = require('../../utils/img.js')

Page({
  data: {
    order: null,
    loading: true,
    statusMap: { 1: '待付款', 2: '待发货', 3: '配送中', 4: '待收货', 5: '已完成', 6: '已取消' },
    totalYuan: '0.00',
    discountYuan: '0.00',
    fullReduceYuan: '0.00',
    freightYuan: '0.00',
    payYuan: '0.00',
    advancing: false,
    refundShow: false,
    refundReasons: ['质量问题', '不新鲜', '送错货', '其他'],
    DEFAULT_IMG: api.DEFAULT_IMG
  },

  onLoad: function (options) {
    this.orderId = Number(options.id)
    this.load()
  },

  onShow: function () {
    if (this.orderId) this.load()
  },

  load: function () {
    var that = this
    api.orderDetail(this.orderId).then(function (o) {
      if (!o) { toast.toast('订单不存在'); that.setData({ loading: false }); return }
      var items = (o.items || []).map(function (it) {
        return Object.assign({}, it, { priceYuan: F.fen2yuan(it.price), subtotalYuan: F.fen2yuan(it.price * it.count) })
      })
      that.setData({
        order: Object.assign({}, o, { items: items, createTimeText: F.formatTime(o.createTime) }),
        loading: false,
        totalYuan: F.fen2yuan(o.totalAmount),
        discountYuan: F.fen2yuan(o.discountAmount),
        fullReduceYuan: F.fen2yuan(o.fullReduceAmount || 0),
        freightYuan: F.fen2yuan(o.freight),
        payYuan: F.fen2yuan(o.payAmount)
      })
    })
  },

  // 模拟支付（2秒 loading）
  pay: function () {
    var that = this
    toast.showLoading('支付中...（演示环境）')
    setTimeout(function () {
      api.payOrder(that.orderId).then(function (res) {
        toast.hideLoading()
        if (res.ok) { toast.success('支付成功'); that.load() }
        else toast.toast(res.msg || '支付失败')
      })
    }, 2000)
  },

  cancel: function () {
    var that = this
    toast.confirm('确定取消该订单吗？').then(function (ok) {
      if (!ok) return
      api.cancelOrder(that.orderId).then(function (res) {
        if (res.ok) { toast.success('订单已取消'); that.load() }
        else toast.toast(res.msg || '取消失败')
      })
    })
  },

  confirmReceive: function () {
    var that = this
    toast.confirm('确认已收到商品？').then(function (ok) {
      if (!ok) return
      api.confirmReceive(that.orderId).then(function (res) {
        if (res.ok) { toast.success('确认收货成功'); that.load() }
        else toast.toast(res.msg || '操作失败')
      })
    })
  },

  // 催发货 / 模拟配送进度：3秒后自动推进一个状态节点，写入timeline+消息
  advanceProgress: function () {
    var that = this
    if (this.data.advancing) return
    this.setData({ advancing: true })
    toast.showLoading('正在推进配送进度...')
    setTimeout(function () {
      api.advanceOrder(that.orderId).then(function (res) {
        toast.hideLoading()
        that.setData({ advancing: false })
        if (res.ok) {
          toast.success(res.order.status === 3 ? '商家已发货，骑手配送中' : (res.order.status === 4 ? '骑手配送中，请保持电话畅通' : '订单已送达'))
          that.load()
        } else {
          toast.toast(res.msg || '当前状态无需推进')
        }
      })
    }, 3000)
  },

  // 联系骑手（mock 拨号）
  contactRider: function () {
    var rider = this.data.order && this.data.order.rider
    if (!rider) return
    wx.showModal({
      title: '联系骑手',
      content: '骑手：' + rider.name + '\n电话：' + rider.phone + '\n（演示环境，不真实拨号）',
      confirmText: '拨打',
      success: function () { toast.toast('演示环境，不产生真实通话') }
    })
  },

  // 售后退款
  openRefund: function () {
    this.setData({ refundShow: true })
  },
  closeRefund: function () {
    this.setData({ refundShow: false })
  },
  submitRefund: function (e) {
    var reason = e.currentTarget.dataset.reason
    var that = this
    this.setData({ refundShow: false })
    toast.showLoading('提交退款申请...')
    setTimeout(function () {
      api.refundOrder(that.orderId, reason).then(function (res) {
        toast.hideLoading()
        if (res.ok) { toast.success('退款成功，原路退回'); that.load() }
        else toast.toast(res.msg || '退款失败')
      })
    }, 1500)
  },

  goReview: function () {
    wx.navigateTo({ url: '/pages/order/review?orderId=' + this.orderId })
  },

  rebuy: function () {
    var that = this
    var items = this.data.order.items || []
    Promise.all(items.map(function (it) {
      return api.addToCart({
        goodsId: it.goodsId, name: it.name, pic: it.pic,
        specText: it.specText, price: it.price, count: it.count
      })
    })).then(function () {
      toast.success('已加入购物车')
      setTimeout(function () { wx.navigateTo({ url: '/pages/buy/buy' }) }, 500)
    })
  },

  copyOrderNo: function () {
    wx.setClipboardData({ data: this.data.order.orderNo, success: function () { toast.success('订单号已复制') } })
  },

  onImgError: function (e) { img.make(this)(e) }
})
