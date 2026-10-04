// pages/buy/buy.js 订单确认
var api = require('../../utils/api.js')
var F = require('../../utils/format.js')
var toast = require('../../utils/toast.js')
var img = require('../../utils/img.js')

Page({
  data: {
    items: [],
    address: null,
    deliveryTab: 'fast', // fast / appoint
    slots: ['今天 10:00-12:00', '今天 14:00-16:00', '今天 18:00-20:00', '明天 09:00-11:00'],
    slotIndex: 0,
    payType: 1, // 1微信 2货到付款
    remark: '',
    couponPanel: false,
    coupons: [],
    selectedCoupon: null,
    // 金额（分）
    totalFen: 0,
    discountFen: 0,
    fullReduceFen: 0,
    freightFen: 600,
    payFen: 0,
    totalYuan: '0.00',
    discountYuan: '0.00',
    fullReduceYuan: '0.00',
    freightYuan: '6.00',
    payYuan: '0.00',
    submitting: false,
    isDirect: false,
    DEFAULT_IMG: api.DEFAULT_IMG
  },

  onLoad: function () {
    this.initCheckout()
    this.loadAddresses()
  },

  onShow: function () {
    // 地址选择返回回填
    var sel = wx.getStorageSync('fl_selected_address')
    if (sel) {
      this.setData({ address: sel })
      wx.removeStorageSync('fl_selected_address')
    }
    this.compute()
  },

  initCheckout: function () {
    // 立即购买：使用临时结算项（一次性，读取后清除）；否则使用购物车已勾选
    var direct = wx.getStorageSync('fl_checkout')
    wx.removeStorageSync('fl_checkout')
    if (direct && direct.length) {
      this.setData({ isDirect: true, items: direct })
    } else {
      var that = this
      api.getCart().then(function (cart) {
        var items = (cart || []).filter(function (c) { return c.checked && !c.invalid })
        that.setData({ items: items })
        that.compute()
      })
    }
  },

  loadAddresses: function () {
    var that = this
    api.getAddresses().then(function (list) {
      var def = (list || []).filter(function (a) { return a.isDefault })[0] || (list || [])[0]
      if (!that.data.address && def) that.setData({ address: def })
    })
  },

  // 配送费：满59元（5900分）免基础配送费，否则6元
  compute: function () {
    var items = (this.data.items || []).map(function (it) {
      return Object.assign({}, it, { priceYuan: F.fen2yuan(it.price) })
    })
    this.setData({ items: items })
    var totalFen = 0
    items.forEach(function (it) { totalFen += it.price * it.count })

    var freightFen = totalFen >= 5900 ? 0 : 600

    // 最优券自动选中
    var usable = api.usableCoupons(totalFen)
    var selected = this.data.selectedCoupon
    // 重新校验选中券是否仍可用
    var stillUsable = null
    if (selected) {
      stillUsable = usable.filter(function (c) { return c.id === selected.id })[0]
    }
    if (!stillUsable && usable.length) {
      selected = usable[0] // 最优（已按优惠额降序）
    } else if (stillUsable) {
      selected = stillUsable
    } else {
      selected = null
    }

    // 满减优惠（自动按最高可享阶梯）
    var fullReduceFen = api.fullReduce(totalFen)

    // 优惠券优惠：固定满减/无门槛=定额减免；折扣券在满减后金额上打折
    var discountFen = 0
    if (selected) {
      if (selected.type === 2) {
        discountFen = Math.round((totalFen - fullReduceFen) * (1 - selected.discount / 100))
      } else {
        discountFen = selected.discount * 100
      }
    }

    var payFen = totalFen - discountFen - fullReduceFen + freightFen
    if (payFen < 0) payFen = 0

    this.setData({
      coupons: usable,
      selectedCoupon: selected,
      totalFen: totalFen,
      discountFen: discountFen,
      fullReduceFen: fullReduceFen,
      freightFen: freightFen,
      payFen: payFen,
      totalYuan: F.fen2yuan(totalFen),
      discountYuan: F.fen2yuan(discountFen),
      fullReduceYuan: F.fen2yuan(fullReduceFen),
      freightYuan: F.fen2yuan(freightFen),
      payYuan: F.fen2yuan(payFen)
    })
  },

  // 配送时间 Tab
  setDeliveryTab: function (e) {
    this.setData({ deliveryTab: e.currentTarget.dataset.tab })
  },
  selectSlot: function (e) {
    this.setData({ slotIndex: Number(e.currentTarget.dataset.index) })
  },

  // 支付方式
  setPayType: function (e) {
    this.setData({ payType: Number(e.currentTarget.dataset.type) })
  },

  onRemarkInput: function (e) {
    this.setData({ remark: e.detail.value.slice(0, 50) })
  },

  // 地址选择
  chooseAddress: function () {
    wx.navigateTo({ url: '/pages/address/list?mode=select' })
  },

  // 优惠券面板
  openCouponPanel: function () {
    // 计算所有用户券，含不可用
    var that = this
    api.userCoupons(1).then(function (all) {
      var totalFen = that.data.totalFen
      all = all.map(function (c) {
        var usable = c.threshold <= totalFen
        var benefit
        if (c.type === 2) benefit = Math.round(totalFen * (1 - c.discount / 100))
        else benefit = c.discount * 100
        return Object.assign({}, c, { usable: usable, benefit: benefit, reason: usable ? '' : '满¥' + F.fen2yuan(c.threshold) + '可用' })
      })
      that.setData({ couponPanel: true, allCoupons: all })
    })
  },
  closeCouponPanel: function () { this.setData({ couponPanel: false }) },

  pickCoupon: function (e) {
    var id = e.currentTarget.dataset.id
    var coupon = this.data.allCoupons.filter(function (c) { return c.id === id })[0]
    if (!coupon || !coupon.usable) { toast.toast('该券不可用'); return }
    this.setData({ selectedCoupon: coupon, couponPanel: false })
    this.compute()
  },
  noCoupon: function () {
    this.setData({ selectedCoupon: null, couponPanel: false })
    this.compute()
  },

  // 提交订单 + mock 支付
  submit: function () {
    if (this.data.submitting) return
    if (!this.data.items.length) { toast.toast('购物车没有可结算商品'); return }
    if (!this.data.address) { toast.toast('请选择收货地址'); return }

    this.setData({ submitting: true })
    toast.showLoading('支付中...（演示环境，不产生真实交易）')

    var slot = this.data.deliveryTab === 'fast' ? '尽快送达（预计45分钟）' : this.data.slots[this.data.slotIndex]
    var payload = {
      items: this.data.items,
      totalAmount: this.data.totalFen,
      discountAmount: this.data.discountFen,
      fullReduceAmount: this.data.fullReduceFen,
      freight: this.data.freightFen,
      payAmount: this.data.payFen,
      couponId: this.data.selectedCoupon ? this.data.selectedCoupon.id : null,
      couponTitle: this.data.selectedCoupon ? this.data.selectedCoupon.name : '',
      payType: this.data.payType,
      remark: this.data.remark,
      deliveryDate: this.data.deliveryTab === 'fast' ? '尽快送达' : '预约配送',
      deliverySlot: slot,
      addressSnapshot: {
        name: this.data.address.name,
        phone: this.data.address.phone,
        address: this.data.address.province + this.data.address.city + this.data.address.district + this.data.address.detail
      },
      clearCart: !this.data.isDirect
    }

    // mock 支付 2 秒（用 that 捕获页面实例，避免 setTimeout 回调 this 丢失）
    var that = this
    setTimeout(function () {
      api.createOrder(payload).then(function (res) {
        toast.hideLoading()
        that.setData({ submitting: false })
        if (res.ok) {
          wx.removeStorageSync('fl_checkout')
          wx.removeStorageSync('fl_checkout_is_direct')
          toast.success('支付成功')
          setTimeout(function () {
            wx.redirectTo({ url: '/pages/order/detail?id=' + res.order.id })
          }, 600)
        } else {
          toast.toast(res.msg || '下单失败')
        }
      })
    }, 2000)
  },

  onImgError: function (e) { img.make(this)(e) }
})
