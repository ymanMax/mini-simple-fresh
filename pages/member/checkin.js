// pages/member/checkin.js —— 每日签到：当月日历 + 连签奖励梯度 + 签到写积分
var api = require('../../utils/api.js')
var fmt = require('../../utils/format.js')
var toast = require('../../utils/toast.js')

Page({
  data: {
    checkedToday: false,
    streak: 0,
    points: 0,
    signedDates: [],
    rewards: [],
    month: '',
    days: [],          // [{day, signed, isToday, disabled}]
    todayDay: 0,
    weekHeaders: ['一', '二', '三', '四', '五', '六', '日'],
    loading: true
  },

  onShow: function () {
    this.loadStatus()
  },

  loadStatus: function () {
    var that = this
    api.get('/api/checkin/status').then(function (data) {
      that.setData({
        checkedToday: data.checkedToday,
        streak: data.streak,
        points: data.points,
        signedDates: data.signedDates,
        rewards: data.rewards,
        month: data.month,
        loading: false
      })
      that.buildCalendar(data.month, data.signedDates)
    })
  },

  // 构建当月日历（周一起始）
  buildCalendar: function (month, signedDates) {
    var parts = month.split('-')
    var year = Number(parts[0])
    var m = Number(parts[1]) - 1
    var firstDay = new Date(year, m, 1)
    var daysInMonth = new Date(year, m + 1, 0).getDate()
    // 周一为一周起点：getDay() 0=周日 → 转换为 (getDay()+6)%7
    var startOffset = (firstDay.getDay() + 6) % 7
    var today = new Date()
    var todayStr = fmt.formatDate(Date.now())
    var days = []
    var i
    for (i = 0; i < startOffset; i++) {
      days.push({ day: '', blank: true })
    }
    for (i = 1; i <= daysInMonth; i++) {
      var dateStr = month + '-' + (i < 10 ? '0' + i : '' + i)
      days.push({
        day: i,
        blank: false,
        signed: signedDates.indexOf(dateStr) >= 0,
        isToday: dateStr === todayStr,
        future: dateStr > todayStr
      })
    }
    this.setData({ days: days })
  },

  doCheckin: function () {
    var that = this
    if (this.data.checkedToday) {
      toast.toast('今日已签到，明天再来吧')
      return
    }
    api.post('/api/checkin/do', {}).then(function (data) {
      wx.showModal({
        title: '签到成功 🎉',
        content: '本次获得 ' + data.earned + ' 积分，已连续签到 ' + data.streak + ' 天',
        showCancel: false,
        confirmText: '开心收下',
        confirmColor: '#e93b3d',
        success: function () {
          that.loadStatus()
        }
      })
    })
  },

  goPoints: function () {
    wx.navigateTo({ url: '/pages/member/points' })
  }
})
