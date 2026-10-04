// pages/buy/buy.js —— 订单确认：地址 / 商品清单 / 配送时间 / 配送费 / 优惠券 / 支付 / 提交订单
var api = require('../../utils/api.js')
var fmt = require('../../utils/format.js')
var toast = require('../../utils/toast.js')
var badge = require('../../utils/badge.js')
var checkout = require('../../utils/checkout.js')
var imgBehavior = require('../../utils/imgBehavior.js')

var SLOTS = [
  '尽快送达（预计45分钟）',
  '今天 14:00-16:00',
  '今天 16:00-18:00',
  '今天 18:00-20:00',
  '明天 09:00-11:00',
  '明天 14:00-16:00'
]

Page({
  behaviors: [imgBehavior],
  data: {
    mode: 'cart',
    items: [],
    address: null,
    coupons: [],
    selectedCouponId: null,
    couponSheet: false,
    payType: 1,
    remark: '',
    deliveryMode: 'fast',
    slots: SLOTS,
    selectedSlot: SLOTS[0],
    showSlots: false,
    total: 0,
    totalYuan: '0.00',
    discount: 0,
    discountYuan: '0.00',
    freight: 0,
    freightYuan: '0.00',
    payAmount: 0,
    payAmountYuan: '0.00',
    submitting: false,
    loading: true,
    couponList: []
  },

  onLoad: function (options) {
    this.setData({ mode: options.mode || 'cart' })
  },

  onShow: function () {
    // 地址选择返回回填
    var selId = wx.getStorageSync('selected_address_id')
    if (selId) {
      wx.removeStorageSync('selected_address_id')
      this._pendingAddressId = selId
    }
    this.loadAll()
  },

  loadAll: function () {
    var that = this
    var tasks = []
    if (this.data.mode === 'buyNow') {
      var ck = checkout.getCheckout()
      this._buyItems = (ck && ck.items) || []
      this.setData({ loading: true })
      tasks.push(Promise.resolve())
    } else {
      tasks.push(api.get('/api/cart').then(function (cart) {
        that._buyItems = cart.validItems.filter(function (i) { return i.checked })
      }))
    }
    Promise.all(tasks).then(function () {
      var items = (that._buyItems || []).map(function (it) {
        return Object.assign({}, it, { priceYuan: fmt.yuan(it.price), subtotalYuan: fmt.yuan(it.price * it.count) })
      })
      that.setData({ items: items, loading: false })
      that.compute()
      return Promise.all([
        api.get('/api/addresses/list'),
        api.get('/api/coupons/mine', { status: 1 })
      ])
    }).then(function (res) {
      var addrs = res[0].list
      var coupons = res[1].list
      var address
      if (that._pendingAddressId) {
        address = addrs.filter(function (a) { return a.id === that._pendingAddressId })[0]
        that._pendingAddressId = null
      }
      address = address || addrs.filter(function (a) { return a.isDefault })[0] || addrs[0]
      that.setData({ address: address, coupons: coupons })
      that.compute()
      that.autoPickCoupon()
    })
  },

  // ===== 金额计算（先满减，后用券，再算配送费）=====
  compute: function () {
    var items = this.data.items || []
    var total = items.reduce(function (s, it) { return s + it.price * it.count }, 0)
    // 满减阶梯（自动最高）
    var fullReduce = this.maxFullReduce(total)
    var afterFull = total - fullReduce
    // 优惠券（作用于满减后金额）
    var coupon = this.data.coupons.filter(function (c) { return c.id === this.data.selectedCouponId })[0]
    var discount = 0
    if (coupon) {
      discount = this.calcDiscount(coupon, afterFull)
    }
    var finalAmount = afterFull - discount
    var freight = finalAmount >= 5900 ? 0 : 600
    var payAmount = finalAmount + freight
    this.setData({
      total: total, totalYuan: fmt.yuan(total),
      fullReduce: fullReduce, fullReduceYuan: fmt.yuan(fullReduce),
      discount: discount, discountYuan: fmt.yuan(discount),
      freight: freight, freightYuan: fmt.yuan(freight),
      payAmount: payAmount, payAmountYuan: fmt.yuan(payAmount)
    })
  },

  // 最高满减阶梯
  maxFullReduce: function (total) {
    var rules = [
      { threshold: 5900, reduce: 800 },
      { threshold: 9900, reduce: 2000 },
      { threshold: 19900, reduce: 5000 }
    ]
    var reduce = 0
    rules.forEach(function (r) {
      if (total >= r.threshold && r.reduce > reduce) reduce = r.reduce
    })
    return reduce
  },

  calcDiscount: function (coupon, base) {
    if (coupon.type === 1) return base >= coupon.threshold ? coupon.discount : 0
    if (coupon.type === 3) return coupon.discount
    if (coupon.type === 2) return Math.round(base * (1 - coupon.discount / 100))
    return 0
  },

  // 可用券（含原因与展示字段）：满减后金额作为用券基数，实时校验门槛
  couponAvailability: function () {
    var total = this.data.total
    var afterFull = total - this.maxFullReduce(total)
    return this.data.coupons.map(function (c) {
      var usable = true
      var reason = ''
      if (c.type === 1 && afterFull < c.threshold) {
        usable = false
        reason = '满减后 ' + fmt.yuan(afterFull) + ' 元，未达 ' + fmt.yuan(c.threshold) + ' 元门槛'
      }
      var amountText, ruleText
      if (c.type === 1) { amountText = '￥' + fmt.yuan(c.discount); ruleText = '满' + fmt.yuan(c.threshold) + '元可用' }
      else if (c.type === 3) { amountText = '￥' + fmt.yuan(c.discount); ruleText = '无门槛通用' }
      else { amountText = (c.discount / 10) + '折'; ruleText = c.scope }
      var effect = this.calcDiscount(c, afterFull)
      return Object.assign({}, c, {
        usable: usable,
        reason: reason,
        amountText: amountText,
        ruleText: ruleText,
        effect: effect,
        effectYuan: fmt.yuan(effect)
      })
    }.bind(this))
  },

  autoPickCoupon: function () {
    var avail = this.couponAvailability().filter(function (c) { return c.usable && c.effect > 0 })
    avail.sort(function (a, b) { return b.effect - a.effect })
    this.setData({ selectedCouponId: avail.length ? avail[0].id : null })
    this.compute()
  },

  // ===== 优惠券弹层 =====
  openCoupon: function () {
    var list = this.couponAvailability()
    this.setData({ couponSheet: true, couponList: list })
  },
  closeCoupon: function () { this.setData({ couponSheet: false }) },
  stopProp: function () {},
  pickCoupon: function (e) {
    var id = e.currentTarget.dataset.id
    this.setData({ selectedCouponId: id, couponSheet: false })
    this.compute()
  },
  noCoupon: function () {
    this.setData({ selectedCouponId: null, couponSheet: false })
    this.compute()
  },

  // ===== 配送时间 =====
  toggleSlots: function (e) {
    var mode = e.currentTarget.dataset.mode
    if (mode) {
      this.setData({ deliveryMode: mode })
      if (mode === 'fast') {
        this.setData({ selectedSlot: SLOTS[0], showSlots: false })
        return
      }
    }
    this.setData({ showSlots: !this.data.showSlots })
  },
  pickSlot: function (e) {
    this.setData({ selectedSlot: e.currentTarget.dataset.slot, showSlots: false })
  },

  // ===== 支付方式 =====
  setPay: function (e) {
    this.setData({ payType: Number(e.currentTarget.dataset.type) })
  },

  onRemark: function (e) {
    this.setData({ remark: e.detail.value.slice(0, 50) })
  },

  // ===== 地址 =====
  goAddress: function () {
    wx.navigateTo({ url: '/pages/address/list?mode=select' })
  },

  goHome: function () {
    wx.switchTab({ url: '/pages/index/index' })
  },

  // ===== 提交订单 =====
  submit: function () {
    if (this.data.submitting) return
    if (!this.data.items.length) {
      toast.toast('没有可结算的商品')
      return
    }
    if (!this.data.address) {
      toast.toast('请先添加收货地址')
      return
    }
    var that = this
    this.setData({ submitting: true })
    var payload = {
      addressId: this.data.address.id,
      payType: this.data.payType,
      remark: this.data.remark,
      deliverySlot: this.data.selectedSlot,
      couponId: this.data.selectedCouponId
    }
    if (this.data.mode === 'buyNow') {
      payload.items = this._buyItems.map(function (it) {
        return { goodsId: it.goodsId, sku: it.sku, name: it.name, pic: it.pic, specText: it.specText, price: it.price, count: it.count }
      })
    }
    api.post('/api/orders/create', payload).then(function (res) {
      var orderId = res.orderId
      // mock 支付：2 秒 loading
      wx.showLoading({ title: '支付中...', mask: true })
      setTimeout(function () {
        wx.hideLoading()
        // 货到付款不调支付接口；微信支付调用 pay
        var doPay = function () {
          if (that.data.payType === 1) {
            return api.post('/api/orders/pay', { orderId: orderId })
          }
          return Promise.resolve()
        }
        doPay().then(function () {
          checkout.clearCheckout()
          badge.refreshCartBadge()
          wx.showModal({
            title: '下单成功',
            content: '实付 ' + res.payAmount + ' 元（演示环境，不产生真实交易）',
            showCancel: false,
            confirmText: '查看订单',
            confirmColor: '#e93b3d',
            success: function () {
              wx.redirectTo({ url: '/pages/order/detail?id=' + orderId })
            }
          })
          that.setData({ submitting: false })
        })
      }, 2000)
    }).catch(function () {
      that.setData({ submitting: false })
    })
  }
})
