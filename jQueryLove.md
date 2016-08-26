# 无依赖，很轻巧，又强大？纯扯淡！

【[南漂一卒](http://git.oschina.net/Tech_Query) 拙笔】


---


近年来 **Web 前端工程界**百花齐放、百家争鸣，但也不乏浮躁的风气……


## 自相矛盾

很多开源项目的作者都宣称自己开发的框架/引擎 ——

> 功能强大，且不依赖 jQuery 等外部库，轻量级，适合移动端

你 TM 逗我呢？！

不依赖 **技术社区大牛们**多年磨砺出的强大开源库，又体积小，怎么“功能强大”？简直就是 ——

> 又想马儿跑得好，又想马儿不吃草！

无外部依赖，那就得自己写一套基础库内部用，或开放出来给 **应用开发者** ——

> 内置的 DOM API 与 **jQuery API** 极为相似，一看就会、开发方便

但当项目对 **BOM/DOM 封装 API** 的浏览器/插件兼容性 有要求时，这些“简化版 jQuery API”就歇菜了，还得引入原版 jQuery……（搞过 **Zepto 移动端开发**的同学一定有感触）

到头来，项目过了 Demo 阶段，复杂度上去了，用这些“无依赖库”基本等于加载俩 jQuery……


## 大跃进·浮夸风

jQuery 十年，作为 **Web 前端基础工具库**，`$` 从来被模仿、从未被超越！

其 **强大、精巧的内核**藏于 **简洁、易用的 API** 之下，哺育了 Web 前端最大量的新人。但也正因如此，半瓶醋们就觉得它太 low，要与之划清界限，再学个 fashion 的技术，才能显得自己不“幼稚”…… 若能再“高瞻远瞩”地黑它一番，吸粉效果也是极好的~

于是，在 **Node.JS** 走向“小包化”极端（几个简单的函数乃至一个函数 就是一个 NPM 包）的同时，Web 前端一些项目却走向另一个极端 —— PHP、Java 式的 **大而全框架**……

每出一个新引擎/框架，同样功能的控件就要重写套新的，或出一个“XXX 专版/兼容版”。这样大量的轮子，多数写着写着就没下文了，然后又得换，又是一套不同的 API，又是一坨文档一堆坑……

**软件工程**之所以用 **封装、分层**，是为了 ——
 1. 隔离复杂度
 2. 提高复用度
 3. 降低开发、维护成本

但…… 在逼格面前，什么都是浮云……

所以我劝那些一边大谈 Angular、Vue、React，却又基础不扎实的 jQuery 黑们，一如 **脑残果粉**们，尔等可以休矣！


## 做自己，很幸福

最后，欢迎广大 **Web 前端程序猿**使用本人基于 **jQuery 兼容 API** 开发的 **SPA 引擎** ——

http://tech_query.oschina.io/easywebapp

小时候，只知道，幸福很简单；长大了，才知道，简单很幸福……