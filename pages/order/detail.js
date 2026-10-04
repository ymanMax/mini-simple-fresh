const api = require('../../utils/api.js')
const toast = require('../../utils/toast.js')
const dec = require('../../utils/decorate.js')

const STATUS_NAMES = { 1: '待付款', 2: '待发货', 3: '配送中', 4: '待收货', 5: '已完成', 6: '已取消', 7: '退款成功' }
const REFUND_REASONS = ['质量问题', '不新鲜', '送错货', '其他']

Page({
  data: {
    order: null, loading: true, id: null,
    showRefund: false, refundReasons: REFUND_REASONS, refundReason: ''
  },

  onLoad(options) {
    this.setData({ id: options.id })
    this.load()
  },
  onShow() { if (this.data.id) this.load() },

  load() {
    api.orderDetail(this.data.id).then(o => {
      this.setData({ order: Object.assign({}, dec.order(o), { statusName: STATUS_NAMES[o.status] || '' }), loading: false })
    }).catch(err => { toast.toast(err.message || '加载失败'); this.setData({ loading: false }) })
  },

  pay() {
    toast.loading('正在支付…')
    setTimeout(() => {
      api.payOrder(this.data.id).then(() => { toast.hideLoading(); toast.success('支付成功'); this.load() })
        .catch(err => { toast.hideLoading(); toast.toast(err.message) })
    }, 1500)
  },
  cancel() {
    toast.confirm('确定取消该订单吗？', '取消订单').then(ok => {
      if (!ok) return
      api.cancelOrder(this.data.id).then(() => { toast.success('订单已取消'); this.load() })
        .catch(err => toast.toast(err.message))
    })
  },
  confirm() {
    toast.confirm('确认已收到商品吗？', '确认收货').then(ok => {
      if (!ok) return
      api.confirmOrder(this.data.id).then(() => { toast.success('已确认收货'); this.load() })
        .catch(err => toast.toast(err.message))
    })
  },
  review() { wx.navigateTo({ url: '/pages/order/review?id=' + this.data.id }) },
  reorder() {
    const o = this.data.order
    Promise.all(o.items.map(it => api.addCart(it.goodsId, it.specText, it.count))).then(() => {
      toast.success('已加入购物车'); setTimeout(() => wx.switchTab({ url: '/pages/shop/shop' }), 800)
    }).catch(err => toast.toast(err.message))
  },

  // ---- 需求7：模拟配送进度推进（催发货/推进） ----
  advance() {
    const o = this.data.order
    if ([2, 3, 4].indexOf(o.status) < 0) return
    const label = o.status === 2 ? '已提醒商家尽快发货，正在推进配送进度…' : '正在推进配送进度…'
    toast.loading(label)
    setTimeout(() => {
      api.advanceOrder(this.data.id).then(updated => {
        toast.hideLoading()
        toast.success('状态已更新：' + (STATUS_NAMES[updated.status] || ''))
        this.load()
      }).catch(err => { toast.hideLoading(); toast.toast(err.message) })
    }, 1500)
  },

  // ---- 需求7：联系骑手（mock 拨号） ----
  callRider() {
    const rider = this.data.order && this.data.order.rider
    wx.showModal({
      title: '联系骑手',
      content: '骑手：' + (rider ? rider.name : '王骑手') + '\n电话：' + (rider ? rider.phone : '13700001234') + '\n演示环境，不产生真实通话。',
      confirmText: '拨打',
      success: res => { if (res.confirm) toast.toast('正在拨号（模拟）') }
    })
  },

  // ---- 需求7：申请退款（售后演示） ----
  openRefund() { this.setData({ showRefund: true, refundReason: '' }) },
  closeRefund() { this.setData({ showRefund: false }) },
  pickReason(e) { this.setData({ refundReason: e.currentTarget.dataset.reason }) },
  submitRefund() {
    if (!this.data.refundReason) { toast.toast('请选择退款原因'); return }
    api.refundOrder(this.data.id, this.data.refundReason).then(() => {
      toast.success('退款成功，金额原路退回')
      this.setData({ showRefund: false })
      this.load()
    }).catch(err => toast.toast(err.message || '退款失败'))
  },

  // ---- 复制订单号 ----
  copyOrderNo() {
    wx.setClipboardData({ data: this.data.order.orderNo, success: () => toast.success('订单号已复制') })
  }
})
