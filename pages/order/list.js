const api = require('../../utils/api.js')
const toast = require('../../utils/toast.js')
const dec = require('../../utils/decorate.js')

const STATUS_NAMES = { 1: '待付款', 2: '待发货', 3: '配送中', 4: '待收货', 5: '已完成', 6: '已取消', 7: '退款成功' }
function withStatusName(o) {
  const d = dec.order(o)
  return Object.assign({}, d, {
    statusName: STATUS_NAMES[o.status] || '',
    thumbs: (o.items || []).slice(0, 3).map(it => it.pic),
    itemCount: (o.items || []).length,
    firstName: o.items && o.items[0] ? o.items[0].name : ''
  })
}

Page({
  data: {
    tabs: [
      { key: 0, name: '全部' }, { key: 1, name: '待付款' }, { key: 2, name: '待发货' },
      { key: 3, name: '配送中' }, { key: 4, name: '待收货' }, { key: 5, name: '已完成' }
    ],
    status: 0, orders: [], page: 1, hasMore: true, loading: true, loadingMore: false
  },

  onLoad(options) {
    if (options && options.status) this.setData({ status: Number(options.status) })
    this.loadOrders(1)
  },
  onShow() { if (this.data.orders.length) this.loadOrders(1) },

  loadOrders(page) {
    this.setData({ loading: page === 1, loadingMore: page > 1 })
    api.orders({ status: this.data.status, page: page, size: 10 }).then(res => {
      const list = res.list.map(withStatusName)
      const merged = page === 1 ? list : this.data.orders.concat(list)
      this.setData({ orders: merged, page: page, hasMore: res.hasMore, loading: false, loadingMore: false })
    }).catch(() => { this.setData({ loading: false, loadingMore: false }) })
  },

  switchTab(e) {
    const status = Number(e.currentTarget.dataset.status)
    this.setData({ status: status, page: 1, orders: [] })
    this.loadOrders(1)
  },

  onReachBottom() { if (this.data.hasMore && !this.data.loadingMore) this.loadOrders(this.data.page + 1) },
  onPullDownRefresh() { this.loadOrders(1); setTimeout(() => wx.stopPullDownRefresh(), 500) },

  goDetail(e) { wx.navigateTo({ url: '/pages/order/detail?id=' + e.currentTarget.dataset.id }) },
  goShopping() { wx.switchTab({ url: '/pages/index/index' }) },

  pay(e) {
    const id = e.currentTarget.dataset.id
    toast.loading('正在支付…')
    setTimeout(() => {
      api.payOrder(id).then(() => {
        toast.hideLoading(); toast.success('支付成功'); this.loadOrders(1)
      }).catch(err => { toast.hideLoading(); toast.toast(err.message) })
    }, 1500)
  },
  cancel(e) {
    const id = e.currentTarget.dataset.id
    toast.confirm('确定取消该订单吗？', '取消订单').then(ok => {
      if (!ok) return
      api.cancelOrder(id).then(() => { toast.success('订单已取消'); this.loadOrders(1) })
        .catch(err => toast.toast(err.message))
    })
  },
  confirm(e) {
    const id = e.currentTarget.dataset.id
    toast.confirm('确认已收到商品吗？', '确认收货').then(ok => {
      if (!ok) return
      api.confirmOrder(id).then(() => { toast.success('已确认收货'); this.loadOrders(1) })
        .catch(err => toast.toast(err.message))
    })
  },
  advance(e) {
    const id = e.currentTarget.dataset.id
    toast.loading('正在推进配送进度…')
    setTimeout(() => {
      api.advanceOrder(id).then(() => { toast.hideLoading(); toast.success('状态已更新'); this.loadOrders(1) })
        .catch(err => { toast.hideLoading(); toast.toast(err.message) })
    }, 1500)
  },

  review(e) { wx.navigateTo({ url: '/pages/order/review?id=' + e.currentTarget.dataset.id }) },
  reorder(e) {
    const id = e.currentTarget.dataset.id
    api.orderDetail(id).then(o => {
      return Promise.all(o.items.map(it => api.addCart(it.goodsId, it.specText, it.count)))
    }).then(() => {
      toast.success('已加入购物车'); setTimeout(() => wx.switchTab({ url: '/pages/shop/shop' }), 800)
    }).catch(err => toast.toast(err.message))
  }
})
