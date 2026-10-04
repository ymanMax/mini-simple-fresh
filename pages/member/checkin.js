const api = require('../../utils/api.js')
const toast = require('../../utils/toast.js')

// 7 天奖励梯度：+5/+5/+10/+10/+15/+20/+50
const REWARDS = [5, 5, 10, 10, 15, 20, 50]

Page({
  data: {
    month: new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0'),
    calendar: [], today: '', signedDays: [], streak: 0, reward: 5,
    rewards: REWARDS, checkinDone: false, loading: true,
    balance: 0
  },

  onLoad() { this.load() },
  onShow() { this.load() },

  load() {
    Promise.all([api.checkinMonth(), api.points(1)]).then(([ck, pts]) => {
      const today = new Date()
      const todayStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2,'0') + '-' + String(today.getDate()).padStart(2,'0')
      this.setData({
        today: todayStr, signedDays: ck.checkin.monthRecords || [],
        streak: ck.checkin.streak, checkinDone: ck.checkin.lastDate === todayStr,
        balance: pts.balance, rewards: REWARDS, loading: false
      })
      this.buildCalendar()
    }).catch(() => this.setData({ loading: false }))
  },

  buildCalendar() {
    const [y, m] = this.data.month.split('-').map(Number)
    const firstDay = new Date(y, m - 1, 1).getDay() // 0 周日
    const daysInMonth = new Date(y, m, 0).getDate()
    const cells = []
    for (let i = 0; i < firstDay; i++) cells.push(null)
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = y + '-' + String(m).padStart(2,'0') + '-' + String(d).padStart(2,'0')
      cells.push({ day: d, dateStr: dateStr, signed: this.data.signedDays.includes(dateStr), isToday: dateStr === this.data.today, future: dateStr > this.data.today })
    }
    // 按 7 列分组
    const weeks = []
    while (cells.length) weeks.push(cells.splice(0, 7))
    this.setData({ calendar: weeks })
  },

  prevMonth() { this.shiftMonth(-1) },
  nextMonth() { this.shiftMonth(1) },
  shiftMonth(delta) {
    const [y, m] = this.data.month.split('-').map(Number)
    const d = new Date(y, m - 1 + delta, 1)
    this.setData({ month: d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2,'0') })
    this.buildCalendar()
  },

  doCheckin() {
    if (this.data.checkinDone) { toast.toast('今日已签到，明天再来吧'); return }
    api.checkin().then(res => {
      toast.success('签到成功 +' + res.reward + '积分')
      this.load()
    }).catch(err => toast.toast(err.message || '签到失败'))
  }
})
