// 角标：购物车（tabBar index=2）、我的未读消息（tabBar index=3）
function setCartBadge(count) {
  count = Number(count) || 0
  if (count > 0) {
    wx.setTabBarBadge({ index: 2, text: count > 99 ? '99+' : String(count) })
  } else {
    wx.removeTabBarBadge({ index: 2, fail: function() {} })
  }
}
function setMessageBadge(count) {
  count = Number(count) || 0
  if (count > 0) {
    wx.setTabBarBadge({ index: 3, text: count > 99 ? '99+' : String(count) })
  } else {
    wx.removeTabBarBadge({ index: 3, fail: function() {} })
  }
}
function removeMessageBadge() { wx.removeTabBarBadge({ index: 3, fail: function() {} }) }
// 兼容旧调用名
function setTabBarBadgeMsg(count) { setMessageBadge(count) }

module.exports = { setCartBadge: setCartBadge, setMessageBadge: setMessageBadge, removeMessageBadge: removeMessageBadge, setTabBarBadgeMsg: setTabBarBadgeMsg }
