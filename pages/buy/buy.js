// pages/buy/buy.js —— 订单确认：地址、商品清单、配送时间、配送费、优惠券、支付方式、提交订单（mock支付）
var mixin = require('../../utils/mixin.js')
var api = mixin.api
var fmt = require('../../utils/format.js')

Page({
  data: {
    loading: true,
    items: [],
    address: null,
    // 配送时间
    deliveryType: 'fast', // fast | appoint
    deliverySlot: '尽快送达（预计45分钟）',
    slots: ['尽快送达（预计45分钟）', '今天 14:00-16:00', '今天 16:00-18:00', '明天 09:00-11:00', '明天 14:00-16:00'],
    // 优惠券
    coupons: [],
    selectedCoupon: null,
    // 支付方式
    payType: 1, // 1微信 2货到付款
    remark: '',
    // 金额（分）
    goodsTotal: 0,
    discount: 0,
    freight: 0,
    payAmount: 0,
    submitting: false,
    showCouponPanel: false
  },

  onLoad: function () {
    this.loadData()
  },

  onShow: function () {
    // 地址选择返回：读取选中的地址并回填
    var selected = wx.getStorageSync('selected_address')
    if (selected) {
      wx.removeStorageSync('selected_address')
      this.setData({ address: selected })
    } else if (!this.data.address) {
      this.loadAddresses()
    }
  },

  loadData: function () {
    var that = this
    this.setData({ loading: true })
    var items = wx.getStorageSync('buy_items') || []
    if (!items.length) {
      // 直接进入则从购物车选中项取
      api.getCart().then(function (cart) {
        var checked = cart.filter(function (c) { return c.checked && !c.invalid })
        that.setData({ loading: false, items: checked.map(function (c) {
          return { goodsId: c.goodsId, name: c.name, pic: c.pic, specText: c.specText, price: c.price, count: c.count }
        }) })
        that.loadAddresses()
        that.loadCoupons()
        that.loadMember()
        that.recalc()
      })
      return
    }
    this.setData({ items: items })
    this.loadAddresses()
    this.loadCoupons()
    this.loadMember()
    this.recalc()
  },

  loadMember: function () {
    var that = this
    api.getMember().then(function (m) { that.setData({ member: m }); that.recalc() })
  },

  loadAddresses: function () {
    var that = this
    api.getAddresses().then(function (list) {
      var def = list.filter(function (a) { return a.isDefault })[0] || list[0] || null
      that.setData({ address: def })
    })
  },

  loadCoupons: function () {
    var that = this
    api.getMyCoupons(1).then(function (list) {
      that.setData({ coupons: list, couponList: that.buildCouponList(list) })
      that.pickBestCoupon(list)
    })
  },

  // 券列表渲染：预计算可用性与面额文案（WXML 不支持函数调用）
  buildCouponList: function (list) {
    var goodsTotal = this.data.goodsTotal
    return list.map(function (c) {
      var usable
      if (c.type === 3) usable = true
      else usable = goodsTotal >= c.threshold
      var amountText
      if (c.type === 3) amountText = '¥' + (c.discount / 100).toFixed(0)
      else if (c.type === 2) amountText = (c.discount / 10).toFixed(1) + '折'
      else amountText = '¥' + (c.discount / 100).toFixed(0)
      return Object.assign({}, c, { usable: usable, amountText: amountText })
    })
  },

  // 最优券自动选中：在可用券中选优惠最大的
  pickBestCoupon: function (coupons) {
    var goodsTotal = this.data.goodsTotal
    var usable = coupons.filter(function (c) { return that_canUse(c, goodsTotal) })
    function that_canUse(c, total) {
      if (c.type === 3) return true // 无门槛
      if (c.type === 2) return total >= c.threshold
      return total >= c.threshold
    }
    usable.sort(function (a, b) { return discountOf(b) - discountOf(a) })
    function discountOf(c) {
      if (c.type === 2) return Math.round(goodsTotal * c.discount / 100)
      return c.discount
    }
    var best = usable[0] || null
    this.setData({ selectedCoupon: best })
    this.recalc()
  },

  // 配送时间 Tab
  chooseDeliveryType: function (e) {
    var type = e.currentTarget.dataset.type
    this.setData({ deliveryType: type })
  },
  chooseSlot: function (e) {
    var slot = e.currentTarget.dataset.slot
    this.setData({ deliverySlot: slot })
  },

  // 优惠券面板
  openCouponPanel: function () { this.setData({ showCouponPanel: true }) },
  closeCouponPanel: function () { this.setData({ showCouponPanel: false }) },
  chooseCoupon: function (e) {
    var id = e.currentTarget.dataset.id
    var c = this.data.coupons.filter(function (x) { return x.id === id })[0]
    if (!this.canUse(c)) { wx.showToast({ title: '该券不可用', icon: 'none' }); return }
    this.setData({ selectedCoupon: c, showCouponPanel: false })
    this.recalc()
  },
  clearCoupon: function () { this.setData({ selectedCoupon: null }); this.recalc() },

  canUse: function (c) {
    var goodsTotal = this.data.goodsTotal
    if (c.type === 3) return true
    if (c.type === 2) return goodsTotal >= c.threshold
    return goodsTotal >= c.threshold
  },

  // 支付方式
  choosePay: function (e) {
    var type = Number(e.currentTarget.dataset.type)
    this.setData({ payType: type })
  },

  // 备注
  onRemarkInput: function (e) {
    this.setData({ remark: e.detail.value.slice(0, 50) })
  },

  // 金额计算：商品总价 - 满减优惠 - 优惠券优惠 + 配送费 = 应付（需求9.2：先满减后用券）
  recalc: function () {
    var goodsTotal = this.data.items.reduce(function (s, i) { return s + i.price * i.count }, 0)
    // 满减优惠（自动按最高可享阶梯）
    var fullReduce = api.fullReduceOf(goodsTotal)
    // 优惠券优惠（后用券）
    var couponDiscount = 0
    var c = this.data.selectedCoupon
    if (c) {
      if (c.type === 2) couponDiscount = Math.round(goodsTotal * c.discount / 100)
      else couponDiscount = c.discount
    }
    // 会员免配送费门槛：银卡39，普通59
    var freeThreshold = (this.data.member && this.data.member.level >= 2) ? 3900 : 5900
    var afterDiscount = goodsTotal - fullReduce - couponDiscount
    var freight = afterDiscount >= freeThreshold ? 0 : 600
    var payAmount = Math.max(0, afterDiscount + freight)
    // 预计算展示文本（WXML不使用嵌套三元/复杂表达式）
    var fullReduceTip = ''
    if (fullReduce > 0) {
      var tier = fullReduce === 5000 ? '满199减50' : fullReduce === 2000 ? '满99减20' : '满59减8'
      fullReduceTip = '🎉 本单已享满减优惠 -¥' + (fullReduce / 100) + '（' + tier + '），优惠券可叠加使用。'
    }
    var freightText = freight === 0 ? '免运费' : '¥' + (freight / 100)
    var patch = {
      goodsTotal: goodsTotal, fullReduce: fullReduce, couponDiscount: couponDiscount,
      discount: fullReduce + couponDiscount, freight: freight, payAmount: payAmount,
      fullReduceTip: fullReduceTip, freightText: freightText
    }
    if (this.data.coupons) patch.couponList = this.buildCouponList(this.data.coupons)
    this.setData(patch)
  },

  // 选择地址
  goChooseAddress: function () {
    wx.navigateTo({ url: '/pages/address/list?mode=select' })
  },

  // 提交订单 → mock支付（2秒loading）→ 成功 → 订单详情
  submitOrder: function () {
    var that = this
    if (!this.data.address) {
      wx.showToast({ title: '请先选择收货地址', icon: 'none' })
      return
    }
    if (!this.data.items.length) {
      wx.showToast({ title: '订单商品为空', icon: 'none' })
      return
    }
    this.setData({ submitting: true })
    api.createOrder({
      items: this.data.items,
      payType: this.data.payType,
      couponId: this.data.selectedCoupon ? this.data.selectedCoupon.id : null,
      remark: this.data.remark,
      deliverySlot: this.data.deliverySlot,
      addressSnapshot: {
        name: this.data.address.name, phone: this.data.address.phone,
        detail: this.data.address.province + this.data.address.city + this.data.address.district + this.data.address.detail,
        tag: this.data.address.tag
      }
    }).then(function (res) {
      if (!res.success) {
        that.setData({ submitting: false })
        wx.showToast({ title: res.msg || '下单失败', icon: 'none' })
        return
      }
      // mock 支付：2秒 loading（货到付款则跳过支付）
      if (that.data.payType === 1) {
        wx.showLoading({ title: '支付中...', mask: true })
        setTimeout(function () {
          wx.hideLoading()
          that.setData({ submitting: false })
          wx.showModal({
            title: '支付成功', content: '实付 ¥' + (res.order.payAmount / 100).toFixed(2) + '（演示环境，不产生真实交易）',
            showCancel: false,
            success: function () {
              wx.redirectTo({ url: '/pages/order/detail?id=' + res.order.id })
            }
          })
        }, 2000)
      } else {
        that.setData({ submitting: false })
        wx.showModal({
          title: '下单成功', content: '订单已提交，货到付款 ¥' + (res.order.payAmount / 100).toFixed(2),
          showCancel: false,
          success: function () {
            wx.redirectTo({ url: '/pages/order/detail?id=' + res.order.id })
          }
        })
      }
    })
  },

  onImgError: mixin.onImgError
})
