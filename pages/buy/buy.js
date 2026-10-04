const api = require('../../utils/api.js')
const toast = require('../../utils/toast.js')
const badge = require('../../utils/badge.js')
const F = require('../../utils/format.js')

Page({
  data: {
    items: [], totalAmount: 0, totalYuan: '0.00',
    addresses: [], address: null,
    deliveryMode: 'now', slots: ['今天 10:00-12:00', '今天 14:00-16:00', '今天 16:00-18:00', '明天 09:00-11:00'],
    slotIndex: 1, deliverySlot: '尽快送达（预计45分钟）',
    coupons: [], selectedCoupon: null, showCoupon: false,
    payType: 1, remark: '', remarkLen: 0,
    discount: 0, discountYuan: '0.00', fullReduction: 0, fullReductionYuan: '0.00', freight: 600, freightYuan: '6.00', payAmount: 0, payAmountYuan: '0.00',
    loading: true, submitting: false, payLoading: false,
    buyNow: false, buyNowSku: ''
  },

  onLoad(options) {
    this.options = options || {}
    this.buyNow = !!options.buyNow
    this.buyNowSku = options.sku || ''
    this.init()
  },

  init() {
    this.setData({ loading: true })
    Promise.all([api.addresses(), api.myCoupons(1), api.member()]).then(([addresses, coupons, member]) => {
      const defaultAddr = addresses.find(a => a.isDefault) || addresses[0]
      this.setData({ addresses: addresses, address: defaultAddr, coupons: coupons.map(c => Object.assign({}, c, {
        conditionText: c.threshold > 0 ? '满' + F.fenToYuan(c.threshold) + '可用' : '无门槛',
        discountText: c.type === 2 ? (c.discount / 10).toFixed(1) + '折' : F.fenToYuan(c.discount) + '元'
      })), member: member })
      return this.loadItems()
    }).then(() => { this.recalc(); this.setData({ loading: false }) })
      .catch(err => { toast.toast(err.message || '加载失败'); this.setData({ loading: false }) })
  },

  decorateItems(items) {
    return items.map(it => Object.assign({}, it, { priceYuan: (it.price / 100).toFixed(2), totalYuan: (it.price * it.count / 100).toFixed(2) }))
  },

  loadItems() {
    if (this.buyNow) {
      // 立即购买：单商品
      return api.goodsDetail(this.buyNowSku).then(g => {
        const spec = decodeURIComponent(this.options.spec || '标准装 · 1份')
        const count = Number(this.options.count) || 1
        this.setData({ items: this.decorateItems([{ sku: g.sku, name: g.name, pic: g.pic, specText: spec, price: g.price, count: count, unit: g.unit }]) })
      })
    }
    return api.cart().then(cart => {
      const checked = cart.filter(i => i.checked && !i.invalid)
      this.setData({ items: this.decorateItems(checked.map(i => ({ sku: i.sku, name: i.name, pic: i.pic, specText: i.specText, price: i.price, count: i.count, unit: i.unit }))) })
    })
  },

  // 地址选择返回
  onShow() {
    // 从地址选择页返回时刷新地址
    const selectedAddr = wx.getStorageSync('fl_selected_address')
    if (selectedAddr && typeof selectedAddr === 'object' && selectedAddr.id) {
      wx.removeStorageSync('fl_selected_address')
      const addr = this.data.addresses.find(a => a.id === selectedAddr.id) || selectedAddr
      this.setData({ address: addr })
    }
    // 立即购买返回购物车刷新角标
    api.cart().then(c => badge.setCartBadge(c.reduce((s, x) => s + x.count, 0))).catch(() => {})
  },

  goAddress() { wx.navigateTo({ url: '/pages/address/list?select=1' }) },

  // ---- 配送方式 ----
  setDeliveryMode(e) {
    const mode = e.currentTarget.dataset.mode
    this.setData({ deliveryMode: mode, deliverySlot: mode === 'now' ? '尽快送达（预计45分钟）' : this.data.slots[this.data.slotIndex] })
  },
  pickSlot(e) {
    const idx = e.currentTarget.dataset.idx
    this.setData({ slotIndex: idx, deliverySlot: this.data.slots[idx] })
  },

  // ---- 优惠券 ----
  openCoupon() { this.setData({ showCoupon: true }) },
  closeCoupon() { this.setData({ showCoupon: false }) },
  pickCoupon(e) {
    const id = e.currentTarget.dataset.id
    const coupon = this.data.coupons.find(c => c.id === id)
    if (!coupon.usable) { toast.toast(coupon.reason); return }
    this.noAutoCoupon = false
    this.setData({ selectedCoupon: coupon, showCoupon: false })
    this.recalc()
  },
  noCoupon() {
    this.noAutoCoupon = true
    this.setData({ selectedCoupon: null, showCoupon: false })
    this.recalc()
  },

  // ---- 支付方式 / 备注 ----
  setPayType(e) { this.setData({ payType: Number(e.currentTarget.dataset.type) }) },
  onRemarkInput(e) {
    const val = e.detail.value.slice(0, 50)
    this.setData({ remark: val, remarkLen: val.length })
  },

  // ---- 金额重算 ----
  recalc() {
    const total = this.data.items.reduce((s, x) => s + x.price * x.count, 0)

    // 1) 给每张券标注可用性
    const coupons = this.data.coupons.map(c => {
      let usable = true, reason = ''
      if (c.status !== 1) { usable = false; reason = '优惠券不可用' }
      else if (c.threshold > 0 && total < c.threshold) { usable = false; reason = '订单满' + F.fenToYuan(c.threshold) + '元可用' }
      else if (c.scope.indexOf('水果') >= 0 && !this.hasFruit()) { usable = false; reason = '仅限水果品类使用' }
      return Object.assign({}, c, { usable: usable, reason: reason })
    })

    // 2) 确定使用的券：当前选中券仍可用则保留；用户主动"不使用"则不自动选；否则自动选最优券
    let coupon = this.data.selectedCoupon
    const selectedUsable = coupon && coupons.find(c => c.id === coupon.id && c.usable)
    if (!selectedUsable && !this.noAutoCoupon) {
      coupon = coupons.filter(c => c.usable)
        .sort((a, b) => (b.type === 2 ? F.discountPrice(total, b.discount) : b.discount) - (a.type === 2 ? F.discountPrice(total, a.discount) : a.discount))[0] || null
    } else if (!selectedUsable && this.noAutoCoupon) {
      coupon = null
    }

    // 3) 满减阶梯（自动按最高可享减免，先满减后用券）
    const fullReductionRules = [[19900, 5000], [9900, 2000], [5900, 800]]
    let fullReduction = 0
    for (const [th, reduce] of fullReductionRules) { if (total >= th) { fullReduction = reduce; break } }

    // 4) 优惠券折扣（满减后计算折扣券）
    let discount = 0
    if (coupon) discount = coupon.type === 2 ? F.discountPrice(total - fullReduction, coupon.discount) : coupon.discount

    // 5) 配送费：按优惠后金额判断（银卡39免/普通59免）
    const freeThreshold = this.data.member && this.data.member.level >= 2 ? 3900 : 5900
    const afterDiscount = total - fullReduction - discount
    const freight = afterDiscount >= freeThreshold ? 0 : 600
    const payAmount = afterDiscount + freight

    this.setData({
      totalAmount: total, totalYuan: (total / 100).toFixed(2),
      discount: discount, discountYuan: (discount / 100).toFixed(2),
      fullReduction: fullReduction, fullReductionYuan: (fullReduction / 100).toFixed(2),
      freight: freight, freightYuan: (freight / 100).toFixed(2),
      payAmount: payAmount, payAmountYuan: (payAmount / 100).toFixed(2),
      freeThreshold: freeThreshold, coupons: coupons, selectedCoupon: coupon
    })
  },

  hasFruit() {
    // 简化：从商品数据判断品类
    return this.data.items.some(it => it.sku && ['p-hbclz400-1h','p-HBxjwzlpt-1h','p-HBnfxy-2g','p-hbnfsc-2g','p-hbjkxj1j-1d','p-hbzzlm-1h','p-hbhlsl-2g','p-hbqxxfq-1h','p-sdapple-500g'].indexOf(it.sku) >= 0)
  },

  // ---- 提交订单 ----
  submit() {
    if (!this.data.address) { toast.toast('请选择收货地址'); return }
    if (!this.data.items.length) { toast.toast('没有可结算商品'); return }
    if (this.data.submitting || this.data.payLoading) return
    this.setData({ submitting: true })

    const payload = {
      items: this.data.items.map(it => ({ sku: it.sku, specText: it.specText, count: it.count, price: it.price })),
      addressId: this.data.address.id,
      couponId: this.data.selectedCoupon ? this.data.selectedCoupon.couponId || this.data.selectedCoupon.id : null,
      payType: this.data.payType,
      remark: this.data.remark,
      deliverySlot: this.data.deliverySlot
    }

    api.createOrder(payload).then(order => {
      this.setData({ submitting: false })
      // 货到付款：直接成功
      if (this.data.payType === 2) {
        return this.paySuccess(order, false)
      }
      // 微信支付：2秒 loading 模拟支付
      this.setData({ payLoading: true })
      setTimeout(() => {
        api.payOrder(order.id).then(paidOrder => {
          this.setData({ payLoading: false })
          this.paySuccess(paidOrder, true)
        }).catch(err => { this.setData({ payLoading: false }); toast.toast(err.message) })
      }, 2000)
    }).catch(err => { this.setData({ submitting: false }); toast.toast(err.message || '下单失败') })
  },

  paySuccess(order, paid) {
    wx.showModal({
      title: '支付成功',
      content: paid ? '订单已支付成功，商家正在分拣，预计45分钟送达。' : '订单提交成功，货到付款，骑手上门收款。',
      showCancel: false,
      confirmText: '查看订单',
      success: () => {
        wx.redirectTo({ url: '/pages/order/detail?id=' + order.id })
      }
    })
  }
})
