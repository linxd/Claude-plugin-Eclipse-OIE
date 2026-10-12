# Claude Assistant — Open Integration Engine 插件

OIE 管理器的一个扩展，让您在 GUI 内部与 Claude 谈论服务器：通道、消息、错误、脚本、代码模板和服务器状态。Claude 通过与 `oie-mcp-server` 相同的工具自行查找事实，并可以提议仅在您批准后才执行的操作。

**初次使用？** 请阅读[用户手册](docs/USER_MANUAL.md)了解安装、设置、日常使用和故障排除。

**培训：** Eclipse OIE 学院的在线课程 [Claude Assistant for Eclipse OIE](https://eclipse-oie.moodiy.cloud/course/view.php?id=3) 涵盖相同的主题，并提供测验和测试通道的实操练习。

> **非官方插件。** 这是一个社区构建的插件。它与 Anthropic 无关、未经其认可或支持。Claude 和 Anthropic 是 Anthropic, PBC 的商标。
>
> **您的责任。** 每个安装此插件的组织负责其自己的使用：法律基础和与 Anthropic 的数据处理协议（涉及发送的任何患者数据），以及其用户在 OIE 中批准的更改。插件按原样提供，不提供保证（参见 [Mozilla Public License 2.0](LICENSE)）。

## 在管理器中找到 Claude 的位置

| 位置 | 任务 | 发送的上下文 |
|---|---|---|
| 左侧菜单，**其他** | *Claude 助手* | 无：关于整个服务器的问题 |
| **仪表盘**（任务 + 右键） | *询问 Claude* | 选中的通道/连接器 |
| **消息浏览器**（任务 + 右键） | *询问 Claude* | 选中的消息（通道、消息 ID、连接器） |
| **通道编辑器**（任务 + 右键） | *询问 Claude* | 当前打开的通道（已保存版本） |
| **代码模板**（任务 + 右键，选中一个模板） | *询问 Claude* | 选中的代码模板及其库 |
| **全局脚本**（任务 + 右键） | *询问 Claude* | 全局部署/卸载/前置/后置处理器脚本 |
| **Claude 页面**，按钮 **全局脚本** | 全局脚本作为上下文 |
| **命令面板** (Ctrl+K) | *Claude 助手*、*询问 Claude 关于全局脚本* |
| **设置**，选项卡 **Claude 助手** | 与 Swing 相同的设置和用量 |

两个界面使用相同的 REST API，因此脱敏、权限、操作批准和审计日志完全相同；对话在您在 Claude 页面和其他视图之间移动时保持打开。

### Web 管理器

此扩展还包含 OIE Web 管理器（`oie-webadmin`）的界面。它需要引擎上的 **Web Support**（`websupport`）扩展，用于服务插件的 `webadmin/` 文件夹。

| 位置 | 功能 |
|---|---|
| 左侧导航，**Plugins > Claude 助手** | 全屏聊天页面 |
| **通道编辑器**，选项卡 **Claude** | 以当前通道为上下文的聊天 |
| **通道** 视图，右键 | *询问 Claude* 关于选中的通道 |
| **消息浏览器**，右键 | *询问 Claude* 关于选中的消息（Web 管理器 API 4.7+） |
| **代码模板**，右键 | *询问 Claude* 关于选中的代码模板 |
| **Claude 页面**，按钮 **全局脚本** | 全局脚本作为上下文（Web 管理器本身没有全局脚本视图的钩子） |

## Claude 能做什么

**读取**（立即）：服务器信息、带状态和计数器的通道、通道配置和脚本、全局脚本、每个连接器的统计信息、搜索和查看消息、事件、服务器日志、代码模板和配置映射的键（从不包含值）。

**操作**（仅在批准对话框中点击 *执行* 后）：部署/卸载通道、启动/停止/暂停/恢复、重置统计、重新处理消息、向通道发送消息，以及更改 JavaScript 脚本（部署/卸载/前置/后置处理器、过滤规则或转换器步骤）或全局脚本，更改连接器的过滤规则或转换器步骤（任何类型：Mapper、Message Builder、Rule Builder、Iterator、XSLT 等），以及创建新通道（或其更改后的副本）。脚本、过滤器或转换器更改会以新修订版本保存通道但不会部署它；如果通道在此期间发生了更改，则不会保存。批准对话框显示当前和新的规则或步骤，以及 OIE 为每个新规则生成的脚本。新通道以禁用和未部署状态创建，凭据留空由您填写。每个执行的操作都会写入审计日志，事件为 `Claude Assistant: …`，以批准用户的名义。

## 隐私

发送到 Anthropic API 的所有内容（您的问题、上下文、消息内容、日志、错误、通道配置）首先经过与 oie-mcp-server 中 `mask.ts` 相同规则的脱敏器处理：

- **HL7 v2**：PID 段字段 2-7、9、11、13、14、18-21、23、29 和 PV1 段字段 7-9、17、19、50（医生、就诊号）；整个 NK1、GT1、IN1、IN2 和 MRG 段（除 set ID 外）（ER7 和 XML）
- **FHIR** JSON 和 XML 资源：Patient、RelatedPerson、Person 和 Practitioner 中的姓名、标识符、电话、地址、出生日期、照片、联系人和个人扩展（如母亲婚前姓）；每个资源的标识符值、引用显示、叙述（`text.div`）和 XML 注释。结构、代码和其他资源保持可读
- **HL7 v2 NTE** 注释（NTE-3 起）和每个超过 30 个字符的 HL7 文本值（ER7 和 XML）
- **GDT** 患者字段 3000-3107（原始和 XML）
- **EDIFACT** 医疗消息：MEDLAB 中的患者（PID、PAD）、医生（ART、ARA、KOP）和样本号（IDE）；其他 MED* 消息中的 PID、NAD、PNA、ADR、COM、出生日期和 FTX 文本
- 通过十一校验的 9 位数字（荷兰 BSN）
- 通道配置中的凭据：名为 password、passphrase、secret、token 或 apiKey 的元素
- 您在 *设置 > Claude 助手* 中自定义的模式

**发送前审查。** 在消息内容、日志行或事件发送给 Claude 之前，对话框会显示脱敏后将发送的内容。您可以编辑文本并发送（*发送给 Claude*）或扣留（*不发送*，或关闭对话框）；编辑后的文本会再次脱敏。*设置 > Claude 助手 > 发送前审查* 设置范围：*消息内容、日志和事件*（默认）、*所有内容，包括我的问题*或*关闭*。

这是安全网而非匿名化。仅当您有法律基础和与 Anthropic 的数据处理协议时才发送真实患者数据。对话仅对启动它们的用户可见。默认情况下它们仅存在于服务器内存中（在最后使用 4 小时后或重启时清除）；设置 *保留对话*（天）后，它们也会保存在 OIE 应用数据文件夹（`claude-assistant/conversations/`）中，完全按发送给 Claude 时的脱敏方式保存，以便在重启后继续。将其设回 0 会删除已保存的对话。

## 权限

此扩展添加三个权限（在 RBAC 扩展中可见）：

- **使用 Claude 助手**：聊天（只读）
- **运行 Claude 助手操作**：批准提议的操作
- **管理 Claude 助手设置**：更改 API 密钥、模型和脱敏模式

Claude 只能获得用户在 OIE 中可以看到或执行的内容：每个工具都会检查用户自己的 OIE 权限（安装了 RBAC 扩展时通过它检查），例如消息搜索需要 *查看消息* 权限。用户缺少的工具会被跳过，并告知 Claude 缺少哪个权限；操作在批准时会再次检查。拥有通道限制的用户无法使用助手，因为工具可以看到所有通道。

每次向 Anthropic 发送消息数据、日志行或事件时，审计日志会记录事件 `Claude Assistant: data sent to Anthropic`，包含用户、工具、通道、消息 ID 和是否已审查。内容本身从不记录。

## 设置

1. 通过 *设置 > 扩展 > 安装扩展* 安装 `claude-assistant-<version>.zip`（或解压到 `<OIE_HOME>/extensions/`）并重启 OIE 服务。检查 `extensions/claude-assistant/lib/` 是否包含引擎 jar 文件。
2. 转到 *设置 > Claude 助手*，输入 Anthropic API 密钥（来自 [console.anthropic.com](https://console.anthropic.com)）并点击 *保存*。密钥加密存储，永远不会发送回管理器；保存后字段会清空，下方显示 *已设置：sk-ant-…xxxx*。
3. 默认值：模型 `claude-opus-5`，努力程度 `high`，每个问题最多 25 次工具调用，响应语言 *自动*（Claude 以问题的语言回答）。**模型** 列表来自 Anthropic 的 Models API（按新旧排序，每天刷新），因此新模型无需插件更新即可出现；无连接时显示固定列表。在 **响应语言** 中选择固定语言可让 Claude 始终以该语言回答。

### 用量：费用和额度

*设置 > Claude 助手* 的 *用量* 部分显示整个组织的 **本月用量**，以及插件 API 密钥所属工作区的单独用量。数据来自 Anthropic [Cost API](https://platform.claude.com/docs/en/manage-claude/usage-cost-api)，需要可选的 **管理员 API 密钥**（`sk-ant-admin01-…`），只有组织管理员可以在控制台中创建。金额以美元计，从每月 1 日（UTC）开始，最多延迟约 5 分钟，缓存一分钟；*刷新* 会重新获取。**本月令牌**（来自 Usage API，同一密钥）显示插件密钥的输入、提示缓存读写和输出。查看用量需要 *管理 Claude 助手设置* 权限。

组织的 **信用余额** 无法通过任何 Anthropic API 获取，因此选项卡提供 *在控制台中打开账单* 按钮。

### 无网络连接

只有助手停止工作；通道、消息处理和两个管理器不受影响，插件在启动时或后台不建立连接。问题会以 *无法从 OIE 服务器访问 Anthropic API (…)* 结尾，并说明原因（例如 `UnknownHostException` 或 `Connect timed out`）；对话会保留，因此您可以在连接恢复后再次提问。连接在 10 秒后超时，并尝试三次，因此即使是静默丢弃数据包的防火墙也会在约半分钟内给出消息。回答本身可能仍需要最多 10 分钟。

OIE 服务器必须能够访问 `https://api.anthropic.com`。在网关或代理后面？在 `conf/custom.vmoptions` 中添加例如 `-Doie.claude.baseUrl=https://gateway.example/anthropic`。

## 构建

JDK 11+ 和 Maven；引擎 jar 从 OIE 安装获取（`-Doie.home=...`，默认 `C:/Program Files/OpenIntegrationEngine`）。

```bash
mvn package
```

结果：`target/claude-assistant-<version>.zip`。

参见[开发指南](docs/development.md)了解要安装的引擎 jar、架构（隔离引擎、工具、批准、脱敏、权限）、测试和发布。

### 结构

- `shared` – REST 接口（`/api/extensions/claude`）；JSON 作为文本传输，因此插件类无需经过 OIE 的 XStream 序列化器。
- `server` – 服务插件、servlet、工具、脱敏器、对话和作业。运行在 OIE 类路径上。
- `engine` – Anthropic Java SDK 上的循环。它与 SDK、Jackson 2.19、Kotlin 和 OkHttp 一起位于 `lib/` 中，并在其自己的子优先类加载器中加载：OIE 附带 Jackson 2.14，SDK 的 Kotlin 反射在重命名（shading）后无法工作。
- `client` – Swing：聊天窗口、仪表盘/消息浏览器/通道编辑器中的任务、设置界面。

引擎从 API 流式传输每个回答；客户端每 0.8 秒轮询进度（`GET /jobs/{id}`）并在 Claude 写入时显示回答增长（作业中的 `partial`），因此长回答不会触发管理器的 HTTP 超时。

## 许可证

[Mozilla Public License 2.0](LICENSE)
