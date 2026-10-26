# 自选股财报日历｜GitHub自动更新

这是 JOJO0527 的财报订阅项目。程序在 GitHub Actions 定时运行，电脑无需开机。

## 订阅

- [打开订阅与管理页面](https://jojo0527.github.io/my-stock-earnings-calendar/)
- [Apple 日历订阅](webcal://jojo0527.github.io/my-stock-earnings-calendar/ics/customstock.ics)
- HTTPS 订阅地址：`https://jojo0527.github.io/my-stock-earnings-calendar/ics/customstock.ics`

Mac：日历 → 文件 → 新建日历订阅 → 粘贴 HTTPS 地址，名称设为“自选股财报｜GitHub自动更新”，位置选 iCloud。选择自动刷新；需要提醒时不要忽略提醒。

## 当前名单（16只）

`BE,SNDK,GOOG,AEHR,AVGO,ALAB,LITE,COHR,DELL,TSM,INTC,AMD,SPCX,MRVL,MU,FORM`

这是观察名单，不代表持仓。日历只显示 Nasdaq 数据源在滚动窗口内提供的事件；未显示不等于公司没有财报。日期与盘前/盘后信息可能调整，以公司投资者关系公告为准。

## 时间与提醒（2026-10-26 优化）

- 盘后参考点取美东16:00，盘前参考点取美东08:00；使用 America/New_York 的当日偏移自动处理夏令时，再输出 UTC 时间。苹果日历按设备时区显示，北京时间的盘后提醒通常在次日凌晨。
- 这些时刻仅是提醒参考，标题始终标明“预计”，不能当作公司确认的精确发布时间。实际发布可能更早或更晚。
- 数据源未给出盘前/盘后时，保留“美国日期、时间待确认”的全天占位，不猜测北京时间，也不设置误导性的定时提醒。
- 电话会与财报发布是不同事件。当前源只有财报日期/时段，不把电话会时间替代成新闻稿发布时间。
- 保留原 UID，更新同一事件。订阅链接不变，无需重新订阅。
- 已知时段的事件保留参考点前2小时提醒；苹果日历的“忽略提醒”和移除提醒选项需关闭才能接收。

例如 LITE 美东2026-11-05盘后，参考点在北京时间2026-11-06 05:00；DELL 若源只给出2026-11-24日期，则明确标为美国日期、时间待确认。

## 抓取失败保护

每个响应检查状态、结构和日期。单日失败只允许使用48小时内的有效缓存；有缺失日期、完全没有新数据或整个窗口都空时，任务直接失败，不发布覆盖旧订阅文件。单次任务最多运行15分钟。测试在每次云端部署前执行。

## 查看运行状态

[打开 Actions](https://github.com/JOJO0527/my-stock-earnings-calendar/actions/workflows/earnings.yml)，检查最近一次 Update earnings calendar 是否成功，并查看 Fetch earnings window 日志。绿色结果也应结合获取数据的日志检查。

计划为北京时间每天 00:34 和 12:34，实际启动可能延迟。苹果日历另有自己的刷新周期。

GitHub 对公开仓库有一个长期运行限制：连续60天没有仓库活动时，会自动停用计划工作流；仅打开网页不应当作保活保证。可在到期前更新本说明并提交；若工作流已停用，在运行页面点击 Enable workflow，然后 Run workflow。参见 [GitHub 官方说明](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule)。

## 修改股票

[打开变量设置](https://github.com/JOJO0527/my-stock-earnings-calendar/settings/variables/actions)，修改 CUSTOM_STOCKS，使用英文逗号分隔代码。然后在 Actions → Update earnings calendar → Run workflow 手动运行，或等待下一次计划运行。订阅地址保持不变。

SHOULD_GEN_ALL=false，SHOULD_GEN_SELECTED=false；订阅 customstock.ics 即可。

## 停止自动更新

[打开工作流](https://github.com/JOJO0527/my-stock-earnings-calendar/actions/workflows/earnings.yml) → 右上角菜单 → Disable workflow。只有财报工作流被启用；指数更新工作流保持停用。以后需要恢复时选择 Enable workflow。

停用后，网页和旧日历文件可能仍可访问。

## 从苹果日历移除

找到“自选股财报｜GitHub自动更新”，取消订阅/删除订阅日历。仅取消勾选只是隐藏，不会停止 GitHub 更新任务。

## 完全清除

1. 在苹果日历取消订阅。
2. 先按上面的步骤停用工作流。
3. [仓库设置](https://github.com/JOJO0527/my-stock-earnings-calendar/settings) → General → Danger Zone → Delete this repository。删除前确认仓库名为 JOJO0527/my-stock-earnings-calendar。仓库删除后订阅网址将失效。

## 项目来源

基于 [jason5ng32/OhEarningsCal](https://github.com/jason5ng32/OhEarningsCal) 部署。数据来自 Nasdaq，使用 GitHub Actions 执行、GitHub Pages 托管文件。项目与订阅网址为公开访问，请勿存放账号密码、持仓金额等私密信息。
