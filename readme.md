# Textboard

Something similar to note.ms

Can set view password and edit password

Some code from Hackchat client: <https://github.com/hack-chat/main>, which is under MIT license.

## 更新日志

### beta

0.1：项目开始。

0.2：完成读取页面、写入页面、查询页面状态的API。

0.3：完成读取、写入json数据功能。

0.4：完成网页客户端。

0.5：支持创建页面、编辑页面，完善网页客户端和API。

0.5.X：修复含特殊符号的页面名导致的问题。

0.6：支持markdown。

0.6.1：修复css导致的markdown行距过大bug。增加一些防止数据错误的备份措施。

0.6.2：修复输入框自适应高度超过网页高度导致的滚动bug。

0.6.3：试图建立备份机制。

0.6.4：试图建立数据修复机制。

0.6.5：试图修复数据修复机制。

0.6.6：使用WSGI服务器，并且优化CSS、将remarkable.js更换为cdnjs上的最新版。

0.6.7：添加favicon。

0.6.8：添加圣诞节特效；若干优化。

1.0：重写客户端JS，优化代码逻辑；删除旧客户端；增加管理密码，创建时设置了管理密码的页面可以被修改密码。

1.1：现在可以输入Tab；现在在编辑中刷新或关闭标签页会被提示修改未保存。
