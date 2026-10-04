const api = require('../../utils/api.js')
const toast = require('../../utils/toast.js')
const dec = require('../../utils/decorate.js')

Page({
  data: { groups: [], loading: true },

  onShow() { this.load() },

  load() {
    api.footprints().then(list => {
      const items = list.map(dec.goods)
      // 按日期分组：今天 / 昨天 / 更早
      const today = new Date()
      const pad = n => n < 10 ? '0' + n : '' + n
      const todayStr = today.getFullYear() + '-' + pad(today.getMonth()+1) + '-' + pad(today.getDate())
      const y = new Date(Date.now() - 86400000)
      const yesterdayStr = y.getFullYear() + '-' + pad(y.getMonth()+1) + '-' + pad(y.getDate())
      const groups = [
        { label: '今天', items: items.filter(i => (i.visitTime || '').indexOf(todayStr) === 0) },
        { label: '昨天', items: items.filter(i => (i.visitTime || '').indexOf(yesterdayStr) === 0) },
        { label: '更早', items: items.filter(i => (i.visitTime || '').indexOf(todayStr) !== 0 && (i.visitTime || '').indexOf(yesterdayStr) !== 0) }
      ].filter(g => g.items.length)
      this.setData({ groups: groups, loading: false })
    }).catch(() => this.setData({ loading: false }))
  },

  goDetail(e) { wx.navigateTo({ url: '/pages/detail/detail?sku=' + e.currentTarget.dataset.sku }) },

  remove(e) {
    const sku = e.currentTarget.dataset.sku
    api.removeFootprint(sku).then(() => { toast.success('已删除'); this.load() })
      .catch(err => toast.toast(err.message))
  },

  clearAll() {
    toast.confirm('清空全部浏览记录？', '清空足迹').then(ok => {
      if (!ok) return
      api.clearFootprints().then(() => { toast.success('已清空'); this.load() })
        .catch(err => toast.toast(err.message))
    })
  },

  goHome() { wx.switchTab({ url: '/pages/index/index' }) }
})
