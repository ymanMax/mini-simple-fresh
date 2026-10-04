const api = require('../../utils/api.js')
const toast = require('../../utils/toast.js')
const badge = require('../../utils/badge.js')
const dec = require('../../utils/decorate.js')

Page({
  data: {
    cart: [], validItems: [], invalidItems: [],
    allChecked: false, totalAmount: 0, totalYuan: '0.00', selectedCount: 0,
    freeThreshold: 5900, freight: 600, remainToFree: 0, remainToFreeYuan: '0.00',
    fullReduction: 0, fullReductionYuan: '0.00', fullReduceLabel: '',
    recommends: [], loading: true
  },

  onShow() { this.loadCart() },

  loadCart() {
    this.setData({ loading: true })
    api.cart().then(cart => {
      const items = cart.map(dec.cartItem)
      const validItems = items.filter(i => !i.invalid)
      const invalidItems = items.filter(i => i.invalid)
      this.computeSummary(validItems)
      this.setData({ cart: items, validItems: validItems, invalidItems: invalidItems, loading: false })
      badge.setCartBadge(items.reduce((s, x) => s + x.count, 0))
      this.loadRecommends()
    }).catch(() => { this.setData({ loading: false }) })
  },

  loadRecommends() {
    api.goodsList({ page: 1, size: 100 }).then(res => {
      const picks = res.list.filter(g => g.stock > 0).slice(0, 8).map(dec.goods)
      this.setData({ recommends: picks })
    }).catch(() => {})
  },

  computeSummary(validItems) {
    const selected = validItems.filter(i => i.checked)
    const total = selected.reduce((s, x) => s + x.price * x.count, 0)
    const selectedCount = selected.reduce((s, x) => s + x.count, 0)
    const allChecked = validItems.length > 0 && validItems.every(i => i.checked)
    const remain = Math.max(0, this.data.freeThreshold - total)
    // 满减阶梯：满59减8 / 满99减20 / 满199减50
    const rules = [[19900, 5000, '199'], [9900, 2000, '99'], [5900, 800, '59']]
    let fullReduction = 0, fullReduceLabel = ''
    for (const [th, reduce, label] of rules) { if (total >= th) { fullReduction = reduce; fullReduceLabel = label; break } }
    this.setData({
      totalAmount: total, totalYuan: (total / 100).toFixed(2),
      selectedCount: selectedCount, allChecked: allChecked,
      remainToFree: remain, remainToFreeYuan: (remain / 100).toFixed(2),
      fullReduction: fullReduction, fullReductionYuan: (fullReduction / 100).toFixed(2), fullReduceLabel: fullReduceLabel
    })
  },

  // ---- 操作 ----
  toggleItem(e) {
    const id = e.currentTarget.dataset.id
    const item = this.data.validItems.find(x => x.id === id)
    api.cartUpdate(id, undefined, !item.checked).then(cart => {
      this.refreshFromServer(cart)
    }).catch(() => {})
  },
  toggleAll() {
    api.cartCheckAll(!this.data.allChecked).then(cart => this.refreshFromServer(cart)).catch(() => {})
  },
  changeCount(e) {
    const { id, delta } = e.currentTarget.dataset
    const item = this.data.validItems.find(x => x.id === id)
    const count = item.count + Number(delta)
    if (count < 1) return
    if (count > item.stock) { toast.toast('库存不足，最多' + item.stock + '份'); return }
    api.cartUpdate(id, count, item.checked).then(cart => this.refreshFromServer(cart)).catch(err => toast.toast(err.message))
  },
  removeItem(e) {
    const id = e.currentTarget.dataset.id
    toast.confirm('确定删除该商品吗？', '删除商品').then(ok => {
      if (!ok) return
      api.cartRemove(id).then(cart => { this.refreshFromServer(cart); toast.success('已删除') }).catch(() => {})
    })
  },
  clearInvalid() {
    toast.confirm('清空所有失效商品？', '清空失效商品').then(ok => {
      if (!ok) return
      api.cartClearInvalid().then(cart => { this.refreshFromServer(cart); toast.success('已清空') }).catch(() => {})
    })
  },
  refreshFromServer(cart) {
    const items = cart.map(dec.cartItem)
    const validItems = items.filter(i => !i.invalid)
    const invalidItems = items.filter(i => i.invalid)
    this.computeSummary(validItems)
    this.setData({ cart: items, validItems: validItems, invalidItems: invalidItems })
    badge.setCartBadge(items.reduce((s, x) => s + x.count, 0))
  },

  addCartRecommend(e) {
    const sku = e.currentTarget.dataset.sku
    api.addCart(sku, '标准装 · 1份', 1).then(() => {
      toast.success('加入购物车成功')
      this.loadCart()
    }).catch(err => toast.toast(err.message || '加入失败'))
  },

  goCheckout() {
    if (!this.data.selectedCount) { toast.toast('请先选择商品'); return }
    wx.navigateTo({ url: '/pages/buy/buy' })
  },
  goShopping() { wx.switchTab({ url: '/pages/index/index' }) },
  goDetail(e) { wx.navigateTo({ url: '/pages/detail/detail?sku=' + e.currentTarget.dataset.sku }) },

  onPullDownRefresh() { this.loadCart(); setTimeout(() => wx.stopPullDownRefresh(), 500) }
})
