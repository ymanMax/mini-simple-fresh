// pages/order/detail.js —— 订单详情：状态头、配送timeline、骑手卡片、催发货推进、售后退款、信息区、操作按钮
var mixin = require('../../utils/mixin.js')
var api = mixin.api
var fmt = require('../../utils/format.js')

Page({
  data: {
    loading: true,
    order: null,
    statusName: '',
    timeline: [],
    refund: null,
    urging: false
  },

  onLoad: function (options) {
    this.orderId = options.id
    this.loadDetail()
  },

  onShow: function () {
    if (!this.data.loading && this.orderId) this.loadDetail()
  },

  loadDetail: function () {
    var that = this
    this.setData({ loading: true })
    api.getOrderDetail(this.orderId).then(function (o) {
      if (!o) {
        wx.showToast({ title: '订单不存在', icon: 'none' })
        setTimeout(function () { wx.navigateBack() }, 1200)
        return
      }
      // 预计算状态副标题（WXML不使用嵌套三元）
      var statusSubMap = {
        1: '请尽快完成支付',
        2: '仓库正在为您备货，可点击催发货模拟配送进度',
        3: '骑手正在为您配送，可点击联系骑手',
        4: '请耐心等待收货，可确认收货',
        5: '感谢惠顾，欢迎再次光临',
        6: '订单已取消',
        7: '退款已完成，金额原路退回'
      }
      // 预计算配送费文案、timeline节点样式（WXML不使用字符串拼接/复杂嵌套）
      var timeline = (o.timeline || []).map(function (t, i) {
        return Object.assign({}, t, { active: i === 0, done: i > 0 })
      })
      var freightText = o.freight === 0 ? '免运费' : '¥' + (o.freight / 100)
      that.setData({
        order: o, statusName: fmt.statusName(o.status), timeline: timeline,
        refund: o.refund || null, statusSub: statusSubMap[o.status] || '',
        freightText: freightText, loading: false
      })
    })
  },

  // 取消订单
  cancelOrder: function () {
    var that = this
    wx.showModal({
      title: '取消订单', content: '确定取消该订单吗？退款将原路返回（演示环境，不产生真实交易）',
      success: function (res) {
        if (res.confirm) {
          api.cancelOrder(that.orderId).then(function (r) {
            if (r.success) { wx.showToast({ title: '订单已取消', icon: 'none' }); that.loadDetail() }
            else wx.showToast({ title: r.msg, icon: 'none' })
          })
        }
      }
    })
  },

  // 模拟支付（2秒loading）
  payOrder: function () {
    var that = this
    wx.showLoading({ title: '支付中...', mask: true })
    setTimeout(function () {
      wx.hideLoading()
      api.payOrder(that.orderId).then(function (r) {
        if (r.success) {
          wx.showModal({
            title: '支付成功', content: '实付 ¥' + (r.order.payAmount / 100).toFixed(2) + '（演示环境，不产生真实交易）',
            showCancel: false, success: function () { that.loadDetail() }
          })
        } else wx.showToast({ title: r.msg, icon: 'none' })
      })
    }, 2000)
  },

  // 确认收货
  confirmReceive: function () {
    var that = this
    wx.showModal({
      title: '确认收货', content: '请确认已收到商品，确认后订单完成，可进行评价。',
      success: function (res) {
        if (res.confirm) {
          api.confirmReceive(that.orderId).then(function (r) {
            if (r.success) { wx.showToast({ title: '已确认收货', icon: 'success' }); that.loadDetail() }
            else wx.showToast({ title: r.msg, icon: 'none' })
          })
        }
      }
    })
  },

  // 催发货 / 模拟配送进度（需求7.1）：点击后每3秒自动推进一个状态节点并写入timeline+消息
  urgeShip: function () {
    var that = this
    if (this.data.urging) return
    this.setData({ urging: true })
    wx.showToast({ title: '已提醒商家尽快发货', icon: 'none' })
    // 3秒后自动推进一次（演示用自动流转）
    setTimeout(function () {
      api.advanceOrder(that.orderId).then(function (r) {
        that.setData({ urging: false })
        if (r.success) {
          wx.showModal({
            title: '配送进度更新', content: '订单状态已推进：' + (r.order.statusName || fmt.statusName(r.order.status)) + '，新节点已加入配送跟踪并生成消息通知。',
            showCancel: false, success: function () { that.loadDetail() }
          })
        } else wx.showToast({ title: r.msg || '当前状态无法推进', icon: 'none' })
      })
    }, 3000)
  },

  // 联系骑手（mock拨号提示）
  callRider: function () {
    var rider = this.data.order.rider
    if (!rider) return
    wx.showModal({
      title: '联系骑手', content: '骑手：' + rider.name + '\n电话：' + rider.phone + '（演示，拨打不会真实接通）',
      confirmText: '拨打', success: function (res) {
        if (res.confirm) wx.makePhoneCall({ phoneNumber: rider.phone, fail: function () {} })
      }
    })
  },

  // 售后退款（需求7.3）：选择退款原因 → 提交 → 退款成功 → 消息
  requestRefund: function () {
    var that = this
    wx.showActionSheet({
      itemList: ['质量问题', '不新鲜', '送错货', '其他'],
      success: function (res) {
        var reasons = ['质量问题', '不新鲜', '送错货', '其他']
        var reason = reasons[res.tapIndex]
        wx.showModal({
          title: '申请退款', content: '退款原因：' + reason + '\n退款金额 ¥' + (that.data.order.payAmount / 100).toFixed(2) + ' 将原路退回（演示环境，不产生真实交易）',
          success: function (r) {
            if (r.confirm) {
              api.requestRefund(that.orderId, reason).then(function (rr) {
                if (rr.success) { wx.showToast({ title: '退款成功', icon: 'success' }); that.loadDetail() }
                else wx.showToast({ title: rr.msg, icon: 'none' })
              })
            }
          }
        })
      }
    })
  },

  // 复制订单号
  copyOrderNo: function () {
    wx.setClipboardData({ data: this.data.order.orderNo, success: function () { wx.showToast({ title: '订单号已复制', icon: 'none' }) } })
  },

  // 去评价
  goReview: function () {
    wx.navigateTo({ url: '/pages/order/review?id=' + this.orderId })
  },

  // 再来一单：把商品加入购物车
  reorder: function () {
    var that = this
    var items = this.data.order.items
    Promise.all(items.map(function (it) {
      return api.addToCart(it.goodsId, it.specText || '标准装 · 常规包装', it.count)
    })).then(function () {
      wx.showToast({ title: '已加入购物车', icon: 'none' })
      mixin.updateTabBadge.call(that)
    })
  },

  onImgError: mixin.onImgError
})
