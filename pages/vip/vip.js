const api = require('../../utils/api.js')
const toast = require('../../utils/toast.js')
const dec = require('../../utils/decorate.js')

// 五级成长体系：普通(1) 银卡(2) 金卡(3) 铂金(4) 钻石(5)
const LEVELS = [
  { level: 1, name: '普通会员', growth: 0, discount: '98折', freightFree: '满59免配送费' },
  { level: 2, name: '银卡会员', growth: 500, discount: '96折', freightFree: '满39免配送费' },
  { level: 3, name: '金卡会员', growth: 1500, discount: '94折', freightFree: '满39免配送费' },
  { level: 4, name: '铂金会员', growth: 3000, discount: '93折', freightFree: '免配送费' },
  { level: 5, name: '钻石会员', growth: 5000, discount: '92折', freightFree: '免配送费' }
]

Page({
  data: {
    privileges: [], redbags: [], products: [], loading: true,
    openPriceYuan: '8.00', saveYuan: '1121.30',
    member: null, growthPercent: 0, nextLevelName: '', needGrowth: 0,
    levels: LEVELS, birthdayGift: false
  },

  onLoad() { this.load() },
  onShow() { this.load() },

  load() {
    Promise.all([api.vip(), api.member()]).then(([v, member]) => {
      const products = (v.products || []).map(p => Object.assign({}, p, {
        originPriceYuan: (p.originPrice / 100).toFixed(2),
        vipPriceYuan: (p.vipPrice / 100).toFixed(2)
      }))
      const redbags = (v.redbags || []).map(b => Object.assign({}, b, {
        amountText: b.amount === 88 ? '8.8折' : '￥' + (b.amount / 100).toFixed(2)
      }))
      // 成长值进度
      const cur = LEVELS.find(l => l.level === member.level) || LEVELS[0]
      const next = LEVELS.find(l => l.level === member.level + 1) || null
      const growthPercent = next ? Math.min(100, Math.round((member.growthValue - cur.growth) / (next.growth - cur.growth) * 100)) : 100
      this.setData({
        privileges: v.privileges, redbags: redbags, products: products,
        loading: false, openPriceYuan: (v.openPrice / 100).toFixed(2), saveYuan: (v.savePerYear / 100).toFixed(2),
        member: member, growthPercent: growthPercent,
        nextLevelName: next ? next.name : '钻石会员（满级）',
        needGrowth: next ? (next.growth - member.growthValue) : 0,
        birthdayGift: v.birthdayGift
      })
    }).catch(() => this.setData({ loading: false }))
  },

  claimBag(e) {
    const cid = e.currentTarget.dataset.cid
    const bag = this.data.redbags.find(b => b.cid === cid)
    if (!bag || bag.received) { toast.toast('已领取过该红包'); return }
    api.claimCoupon(cid).then(() => {
      toast.success('红包领取成功，已放入我的优惠券')
      this.load()
    }).catch(err => toast.toast(err.message || '领取失败'))
  },

  openVip() {
    wx.showModal({
      title: '开通优享会员',
      content: '￥8.00/月，全场95折、每月赠券、满39免配送费、优先配送、专属客服。\n演示环境，不产生真实交易。',
      confirmText: '立即开通',
      success: res => { if (res.confirm) toast.success('开通成功！欢迎加入') }
    })
  },

  goDetail(e) { wx.navigateTo({ url: '/pages/detail/detail?sku=' + e.currentTarget.dataset.sku }) },
  goCoupon() { wx.navigateTo({ url: '/pages/coupon/index?tab=my' }) },
  goPoints() { wx.navigateTo({ url: '/pages/member/points' }) },
  goCheckin() { wx.navigateTo({ url: '/pages/member/checkin' }) }
})
