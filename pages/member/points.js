const api = require('../../utils/api.js')
const toast = require('../../utils/toast.js')

const EXCHANGE = [
  { id: 'ex1', cost: 100, name: '10元无门槛券', desc: '全场通用 · 立即到账', icon: '🎫' },
  { id: 'ex2', cost: 300, name: '水果叉套装', desc: '精美餐具 · 实物配送', icon: '🍴' },
  { id: 'ex3', cost: 500, name: '满99减30券', desc: '全场通用 · 立即到账', icon: '🎟️' },
  { id: 'ex4', cost: 880, name: '当季水果3斤装', desc: '产地直供 · 实物配送', icon: '🍉' },
]

Page({
  data: {
    tab: 'points', balance: 0, records: [], page: 1, hasMore: true, loading: true,
    exchange: EXCHANGE, checkin: null, checkinStreak: 0, lastDate: ''
  },

  onLoad(options) {
    if (options.tab === 'checkin') this.setData({ tab: 'checkin' })
    this.loadPoints(1)
    this.loadCheckin()
  },
  onShow() { this.loadPoints(1); this.loadCheckin() },

  setTab(e) { this.setData({ tab: e.currentTarget.dataset.tab }) },

  loadPoints(page) {
    this.setData({ loading: page === 1 })
    api.points(page).then(res => {
      const records = page === 1 ? res.records.list : this.data.records.concat(res.records.list)
      this.setData({ balance: res.balance, records: records, page: page, hasMore: res.records.hasMore, loading: false })
    }).catch(() => this.setData({ loading: false }))
  },

  loadCheckin() {
    // 通过 member 接口获取签到状态（从 storage 读取）
    api.member().then(() => {}).catch(() => {})
    // checkin 状态直接读 storage
    const rawCk = wx.getStorageSync('fl_checkin')
    const ck = (rawCk && typeof rawCk === 'object' && !Array.isArray(rawCk)) ? rawCk : { lastDate: '', streak: 0, monthRecords: [] }
    this.setData({ checkin: ck, checkinStreak: ck.streak || 0, lastDate: ck.lastDate || '' })
  },

  onReachBottom() { if (this.data.hasMore && !this.data.loading) this.loadPoints(this.data.page + 1) },

  doCheckin() {
    api.checkin().then(res => {
      toast.success('签到成功 +5积分')
      this.loadCheckin()
      this.loadPoints(1)
    }).catch(err => toast.toast(err.message || '今日已签到'))
  },

  exchange(e) {
    const id = e.currentTarget.dataset.id
    const item = EXCHANGE.find(x => x.id === id)
    if (this.data.balance < item.cost) { toast.toast('积分不足'); return }
    toast.confirm('使用 ' + item.cost + ' 积分兑换「' + item.name + '」？', '确认兑换').then(ok => {
      if (!ok) return
      api.exchange(id).then(() => { toast.success('兑换成功'); this.loadPoints(1); this.loadCheckin() })
        .catch(err => toast.toast(err.message || '兑换失败'))
    })
  }
})
