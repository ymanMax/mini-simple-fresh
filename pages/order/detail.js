// pages/order/detail.js —— 订单详情：状态头 + timeline + 骑手 + 催发货/模拟推进 + 售后退款（需求4/7）
var api = require('../../utils/api.js')
var fmt = require('../../utils/format.js')
var toast = require('../../utils/toast.js')

Page({
  data: {
    order: null,
    loading: true,
    refundReasons: ['质量问题', '不新鲜', '送错货', '包装破损', '其他'],
    advancing: false
  },

  onLoad: function (options) {
    this._id = options.id
  },

  onShow: function () {
    this.loadDetail()
  },

  loadDetail: function () {
    var that = this
    this.setData({ loading: true })
    api.get('/api/orders/detail', { id: this._id }).then(function (data) {
      that.setData({ order: data.order, loading: false })
    }).catch(function () { that.setData({ loading: false }) })
  },

  pay: function () {
    var that = this
    toast.mockPay('', function () {
      api.post('/api/orders/pay', { orderId: that._id }).then(function () {
        toast.success('支付成功')
        that.loadDetail()
      })
    })
  },

  cancel: function () {
    var that = this
    toast.confirm('确定取消该订单吗？', '取消订单', function () {
      api.post('/api/orders/cancel', { orderId: that._id }).then(function () {
        toast.success('订单已取消')
        that.loadDetail()
      })
    })
  },

  confirmReceive: function () {
    var that = this
    toast.confirm('确认已收到货物吗？', '确认收货', function () {
      api.post('/api/orders/confirm', { orderId: that._id }).then(function () {
        toast.success('已确认收货')
        that.loadDetail()
      })
    })
  },

  goReview: function () {
    wx.navigateTo({ url: '/pages/order/review?id=' + this._id })
  },

  rebuy: function () {
    var that = this
    var order = this.data.order
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
  },

  // 催发货 / 模拟配送进度推进：待发货→配送中→待收货→已完成
  urgeOrAdvance: function () {
    var that = this
    var o = this.data.order
    if (o.status === 2) {
      toast.toast('已提醒商家尽快发货')
    }
    this.setData({ advancing: true })
    // 演示：3 秒后自动推进一个节点
    setTimeout(function () {
      api.post('/api/orders/advance', { orderId: that._id }).then(function (res) {
        that.setData({ advancing: false })
        if (res.errno === 0) {
          toast.success('配送状态已更新')
          that.loadDetail()
        } else {
          toast.toast(res.msg)
        }
      })
    }, 3000)
  },

  // 连续自动推进到送达（演示全流程）
  autoDelivery: function () {
    var that = this
    wx.showModal({
      title: '配送演示',
      content: '将自动推进：取货 → 派送 → 送达，每步间隔3秒，是否开始？',
      confirmText: '开始演示',
      confirmColor: '#e93b3d',
      success: function (res) {
        if (!res.confirm) return
        that.advanceChain(0)
      }
    })
  },

  advanceChain: function (step) {
    var that = this
    api.post('/api/orders/advance', { orderId: this._id }).then(function (res) {
      if (res.errno === 0) {
        that.loadDetail()
        var status = res.order.status
        if (status < 5 && step < 4) {
          setTimeout(function () { that.advanceChain(step + 1) }, 3000)
        } else {
          toast.success('配送完成，订单已送达')
        }
      }
    })
  },

  // 联系骑手
  callRider: function () {
    var rider = this.data.order.rider
    wx.showModal({
      title: '联系骑手',
      content: '骑手：' + rider.name + '\n电话：' + rider.phone + '\n（演示环境，不真实拨号）',
      confirmText: '拨打',
      confirmColor: '#e93b3d',
      success: function (res) {
        if (res.confirm) {
          wx.makePhoneCall({ phoneNumber: rider.phone, fail: function () {} })
        }
      }
    })
  },

  // 申请退款（售后）
  refund: function () {
    var that = this
    wx.showActionSheet({
      itemList: this.data.refundReasons,
      success: function (res) {
        var reason = that.data.refundReasons[res.tapIndex]
        toast.confirm('退款原因：' + reason + '\n' + '将原路退回 ' + that.data.order.payAmountYuan + ' 元（演示），确认申请？', '申请退款', function () {
          api.post('/api/orders/refund', { orderId: that._id, reason: reason }).then(function () {
            wx.showModal({
              title: '退款成功',
              content: '金额已原路退回（演示环境，不产生真实交易）',
              showCancel: false,
              confirmColor: '#e93b3d',
              success: function () { that.loadDetail() }
            })
          })
        })
      }
    })
  },

  copyOrderNo: function () {
    wx.setClipboardData({ data: this.data.order.orderNo, success: function () {
      toast.success('订单号已复制')
    }})
  }
})
