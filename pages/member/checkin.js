// pages/member/checkin.js —— 每日签到：当月日历7列网格、7天梯度奖励条、连签天数、翻月查看、签到写积分+消息
var mixin = require('../../utils/mixin.js')
var api = mixin.api
var CHECKIN_REWARDS = [5, 5, 10, 10, 15, 20, 50]

Page({
  data: {
    loading: true,
    member: null,
    calendar: [],
    monthLabel: '',
    viewYear: 0,
    viewMonth: 0,
    todayStr: '',
    rewards: CHECKIN_REWARDS,
    checked: false,
    checkinAnim: false
  },

  onShow: function () { this.loadData() },

  loadData: function () {
    var that = this
    this.setData({ loading: true })
    api.getMember().then(function (m) {
      var now = new Date()
      var todayStr = that.fmtDate(now)
      that.setData({
        loading: false, member: m, todayStr: todayStr,
        viewYear: now.getFullYear(), viewMonth: now.getMonth() + 1,
        checked: m.checkIn.lastDate === todayStr
      })
      that.buildCalendar(now.getFullYear(), now.getMonth() + 1)
    })
  },

  fmtDate: function (d) {
    function p(x) { return x < 10 ? '0' + x : x }
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())
  },

  // 构造某月日历网格（1号是周几 + 当月天数）；标记已签、今日、未来
  buildCalendar: function (year, month) {
    var firstDay = new Date(year, month - 1, 1).getDay()
    var days = new Date(year, month, 0).getDate()
    var records = (this.data.member.checkIn.monthRecords || [])
    var cells = []
    for (var i = 0; i < firstDay; i++) cells.push({ empty: true })
    for (var d = 1; d <= days; d++) {
      var dateStr = year + '-' + ('0' + month).slice(-2) + '-' + ('0' + d).slice(-2)
      cells.push({
        day: d, date: dateStr,
        isToday: dateStr === this.data.todayStr,
        checked: records.indexOf(dateStr) >= 0,
        future: dateStr > this.data.todayStr
      })
    }
    this.setData({ calendar: cells, monthLabel: year + '年' + month + '月' })
  },

  // 翻月查看历史
  prevMonth: function () {
    var vm = this.data.viewMonth - 1
    var vy = this.data.viewYear
    if (vm < 1) { vm = 12; vy-- }
    this.setData({ viewYear: vy, viewMonth: vm })
    this.buildCalendar(vy, vm)
  },
  nextMonth: function () {
    var vm = this.data.viewMonth + 1
    var vy = this.data.viewYear
    var now = new Date()
    if (vm > now.getMonth() + 1 || vy > now.getFullYear()) return
    if (vm === 13) { vm = 1; vy++ }
    this.setData({ viewYear: vy, viewMonth: vm })
    this.buildCalendar(vy, vm)
  },

  // 签到
  doSign: function () {
    var that = this
    api.checkIn().then(function (res) {
      if (!res.success) { wx.showToast({ title: res.msg, icon: 'none' }); return }
      that.setData({ checkinAnim: true })
      wx.showModal({
        title: '签到成功',
        content: res.msg + '，连续签到' + res.consecutive + '天，当前积分 ' + res.points,
        showCancel: false,
        success: function () {
          that.setData({ checkinAnim: false, checked: true })
          that.loadData()
        }
      })
    })
  },

  onImgError: mixin.onImgError
})
