# 健身教练：配置与维护

教练包含全局可拖动圆形入口、手机全屏/桌面弹窗、流式回答、对话历史、自动个人记忆、真实训练数据上下文，以及管理员维护的 RAG 知识库。教练回复下的「根据这条回复生成计划」可将对话建议转为草案；「训练计划」页签也可独立生成草案。两条路径都须经用户编辑、确认后才写入日历。

## 训练草案

用户直接打开「训练计划」页签时，教练逐题询问训练目标、经验、可训练的星期（1–4 天）、每次时长、器械和身体限制。教练读取本人最近 28 天记录、记忆、接下来 7 天的日历安排及本人可用动作目录，生成一次性力量训练草案。模型只能选择动作 ID 和组数、次数、休息时长，不设置负重。服务端校验动作归属、日期范围、参数上下限和重复动作；未通过校验的模型输出不能保存。

对话路径在当前聊天窗内打开计划确认卡片，不切换页签；关闭后可从同一条教练回复继续。用户已在对应对话中明确提出“练四休一”或“练五休一”时，卡片直接采用对应的五天或六天循环；否则先询问训练节奏。循环训练会询问完整循环次数（1–6 次）和开始日期，再逐题询问训练目标、经验、每次时长、器械和需要避开的动作或身体限制；无身体限制时可直接回答“无”。选择每周训练时，还会问接下来一周的 1–4 个可训练星期。用户可返回任一题修改，并在需求摘要中确认；之后才调用 `POST /v1/coach/messages/:id/plan-draft`。后端先验证该条完整回复属于登录用户，再取对应问题、回复及这条回复之前最多 16 条近期消息作为参考。已确认需求优先于旧对话与教练回复，日期由服务端固定，不允许模型自行改日。生成的卡片先显示日期摘要和休息日，展开后逐日查看及编辑动作，最终确认仍在卡片中完成。前端在参数不变时使用同一请求 ID 重试，修改需求则改用新请求 ID。教练对话本身不会写入计划。

用户在逐题问答中确认“练四天休息一天”时，对话转草案先生成连续四天的不同训练内容，再按五天节奏重复用户确认的循环次数，休息日不建立训练安排。例如 2 个循环为 10 天、8 次训练，休息日是第 5、10 天。预览展示全部训练日和休息日，用户可按训练日编辑动作与组数；固定节奏的日期不可逐项改动。确认时内容相同的训练日共用一个训练模板，避免在训练模板列表中留下重复内容。已有日历训练与计划冲突时可同日添加，或返回需求问答调整开始日期；不能跳过单个训练日破坏节奏。休息日已有训练时必须调整开始日期或先在日历中处理。当前不创建无限期重复规则。旧版 14 天草案仍可读取及确认。

“练五休一”每个循环为 6 天，连续五个训练日后休息一天。例如 2 个循环为 12 天、10 次训练，休息日为第 6、12 天。日期、冲突处理和最终确认规则与四练一休相同。

草案保存在 `coach_plan_draft`，24 小时内可重新打开和编辑。`POST /v1/coach/plan-drafts` 生成草案，`GET /v1/coach/plan-drafts/latest` 恢复最近一份，`PUT /v1/coach/plan-drafts/:id` 保存编辑，`POST /v1/coach/plan-drafts/:id/apply` 经用户确认后写入。界面先通过「预览并确认加入」展示将写入的日期，只有点击「确认加入计划」才调用确认接口。生成请求使用 `requestId` 幂等，并计入教练每日调用限额。保存使用版本号，确认写入时重新检查日期冲突；普通一周计划的冲突日期可选「同日添加」或「跳过」，四练一休只允许同日添加或调整开始日期，不会删除或覆盖原计划。

确认接口在一个数据库事务中创建用户训练模板、模板动作和一次性 `ScheduledSession`，并记录创建的 ID。重复确认返回原结果。此功能当前不生成循环训练、活动计划或具体训练时刻。负重由用户在开始训练前自行设置。

## 百炼接入

在部署环境的 `.env` 中设置以下变量。密钥只进入后端，不能放入 `VITE_` 变量或前端代码：

```dotenv
COACH_ENABLED=true
DASHSCOPE_API_KEY=填写自己的百炼APIKey
DASHSCOPE_BASE_URL=从百炼控制台复制兼容API的base_url
COACH_CHAT_MODEL=qwen-plus
COACH_MEMORY_MODEL=qwen-plus
COACH_EMBEDDING_MODEL=text-embedding-v4
COACH_EMBEDDING_DIMENSIONS=1024
```

接入地址须与 API Key 的地域和业务空间一致。北京地域的地址格式示例为 `https://实际业务空间ID.cn-beijing.maas.aliyuncs.com/compatible-mode/v1`；以自己控制台显示的地址为准。环境变量中填写基础地址，不追加 `/chat/completions` 或 `/embeddings`。所选模型须已在该空间开通。实现使用原生 HTTP 调用百炼的兼容接口，不需要安装 SDK。

- [百炼对话接口](https://help.aliyun.com/zh/model-studio/qwen-api-via-openai-chat-completions)
- [百炼文本向量接口](https://help.aliyun.com/zh/model-studio/text-embedding-synchronous-api)

聊天和记忆提取使用非思考模式。若换成其他模型，需确认其支持 `enable_thinking=false`；记忆模型还需支持 JSON 输出。更换向量模型或维度后，需要重新发布所有资料，旧模型生成的向量不会参与新模型检索。

未配置或关闭时不会调用百炼；用户仍能管理历史对话，后台仍能编辑草稿。后台“已配置”仅表示必要配置齐全，不代表已成功连接；发布资料、检索测试和实际问答才会验证服务可用性。

## 数据库与部署

数据库需要 PostgreSQL 的 `vector` 扩展。三个 Compose 文件已使用 `pgvector/pgvector:pg17`，继续使用原有 PostgreSQL 17 数据目录与数据卷。普通数据库镜像不包含这个扩展。

已有部署应先备份数据库，准备好 pgvector 镜像，再按原有发布流程更新。不要删除数据库卷。新增迁移会执行 `CREATE EXTENSION IF NOT EXISTS vector` 并创建 `coach_*` 表；数据库账号需要有安装扩展的权限。生产环境使用正常迁移；`DATABASE_SYNCHRONIZE=true` 的本地开发环境会单独初始化教练表。

请求路径均位于 `/v1/coach` 和 `/v1/admin/coach`。Nginx 需允许长连接和流式响应；聊天接口返回 `X-Accel-Buffering: no` 并每 15 秒发送心跳。代理读超时建议至少 90 秒。

本次修改没有配置真实密钥，也没有执行线上部署。

## 演示资料与管理后台

后台左侧进入“教练知识库”，点击“添加演示资料”可生成 6 篇草稿，覆盖训练目标、训练记录、训练进阶、器械选择、训练复盘和体重记录。重复添加不会覆盖已编辑的资料。所有样例均标注为演示内容，未经过专业审核，不伪造作者、论文或权威来源。

正文支持直接编辑或导入 UTF-8 TXT / Markdown，最多 100,000 个字符。第一版尚不解析 PDF、Word、扫描件或网页链接；“来源”字段用于标注出处，不会抓取网页。

发布流程：保存草稿 → 发布并建立索引 → 等待处理 / 向量化中 → 已就绪。更新中的旧版继续参与检索；只有新版全部向量化成功才原子替换。处理失败可重新发布，下架立即停止检索；正在处理的下架资料不会被后台任务重新发布。服务重启后会继续未完成的索引任务。

检索测试展示实际命中的片段与余弦相似度。默认检索 5 个片段，阈值为 0.35，可通过 `COACH_MIN_SIMILARITY_PERCENT` 调整；需要用正式资料和代表性问题评估，不能把相似度当作事实正确率。当前使用精确向量检索，适合初期小型资料库，尚未加入近似索引或重排模型。

## 对话与个人记忆

每个账号的数据由后端登录身份限定，不能由请求传入其他用户 ID。聊天记录保存在本地 PostgreSQL，模型只收到当前请求所需的最近对话、历史摘要、长期记忆、相关知识片段和当前用户的训练上下文，不包含邮箱、密码或其他账号的数据。

训练上下文包含最近 28 天完成次数、记录训练量、每日汇总、体重及最近训练明细。为限制请求大小，最多提供 15 次训练的明细，每次最多 8 个动作、每个动作最多 6 组；上下文明确告知模型截断范围。当前未读取 28 天以前的记录、活动日志、饮食或睡眠数据。教练无法替用户修改训练数据。

每轮成功回答后，后台从用户原话自动提取目标、经验、时间、器械和偏好，并更新对话摘要。模型提取结果必须包含可在该轮用户消息中找到的原文证据。临时状态、模型建议与健康诊断不作为长期记忆。提取失败不影响聊天记录；后台记录失败状态，不无限重试消耗额度。待处理任务在重启后继续执行。

“教练记忆”允许修改或删除。手动修改会固定该类记忆，自动提取不会覆盖它；删除会清空内容和证据，并保留类别的空标记，阻止队列或后续自动提取恢复它。第一版没有恢复已停用类别的界面。删除对话会删除其中消息，但不会同时删除独立长期记忆；记忆需单独管理。删除账号通过数据库外键级联删除其教练数据。

回答只展示模型实际引用且来自本次检索结果的资料；资料名称、来源和片段由服务端提供。引用演示资料会显示“演示资料”。检索失败时明确提示本次没有知识库支持，仍可结合对话和训练记录回答。

## 初期用量限制

以下是不到 100 名用户规模的可调初始设置，不是已验证的并发容量或费用保证：

| 配置 | 默认值 | 行为 |
|---|---:|---|
| `COACH_DAILY_USER_LIMIT` | 30 | 每人每天最多 30 次回答尝试 |
| `COACH_DAILY_TOTAL_LIMIT` | 1000 | 全站每天最多 1000 次回答尝试 |
| `COACH_MAX_CONCURRENT` | 3 | 单个后端进程同时最多 3 个回答 |
| `COACH_MAX_OUTPUT_TOKENS` | 1500 | 每次回答的输出上限 |
| `COACH_TIMEOUT_MS` | 60000 | 每次百炼 HTTP 请求超时 |

每日额度按北京时间重置，保存在数据库中。失败和取消也可能已产生上游费用，因此计入次数；同一请求 ID 的已完成回答重放不会再次调用模型或扣次数。每个用户同一时间只能生成一个回答。知识向量化、查询向量化和后台记忆提取也会产生百炼费用，未计入“回答次数”。实际费用以百炼账单为准。

## 验证

后端、用户前端和管理前端分别使用现有构建命令。百炼边界测试：在 `backend` 中运行 `npm test -- --runInBand bailian.service.spec.ts`。

集成测试使用隔离的 PostgreSQL + pgvector 数据库和模拟百炼，禁止指向正式环境。下面的容器仅为测试创建，不连接项目原有数据卷：

```powershell
docker run -d --name grindify-coach-test -p 127.0.0.1:15439:5432 -e POSTGRES_USER=coach_test -e POSTGRES_PASSWORD=coach-test-only -e POSTGRES_DB=coach_test pgvector/pgvector:pg17
cd backend
npm run test:coach:integration
docker rm -f -v grindify-coach-test
```

集成脚本固定连接 localhost:15439 的 `coach_test` 数据库，会重建其教练表；测试认证与越权隔离、向量检索、版本切换、发布期间下架、真实训练查询、重试幂等、记忆提取与手动控制、每日限额和迁移回退。真实百炼可用性、正式资料检索质量与 100 人负载需要配置后再验证。


## AI coach administration

The sidebar now groups knowledge, Coach Settings, Test Playground, Operations and User Feedback under AI Coach. Existing administration language and superadmin access remain unchanged.

- Settings persist in `coach_settings`; new replies immediately use the saved style, user/site quotas and maximum answer tokens. The launcher fetches display name, welcome and quick questions when opened. Both the server `COACH_ENABLED` switch and the saved switch must be enabled for user replies. Provider secrets and model IDs stay in server environment variables.
- Playground uses the same base coach instructions, saved style and published RAG documents, with no training records, conversation history or memory. Inputs/outputs are returned to the administrator but not stored. Tests and connection checks share 20 attempts per administrator per Beijing calendar day and count toward the site conversation quota. Only one admin test runs at a time. Knowledge indexing and memory extraction are separate provider calls and do not consume conversation quotas.
- Operations records provider metadata from installation onward: call type/model, success/failure/cancellation, latency and reported tokens. Missing provider usage is shown as unknown, never estimated cost. An embedding operation can batch multiple HTTP requests. Error codes expose only HTTP status or a generic network/response failure, never provider response bodies or credentials. Recent calls show 100 entries, audits 50, feedback 200; historical metadata remains in PostgreSQL.
- Health distinguishes configuration presence from an explicit, billable live chat + embedding check. Test success is shown with its time, only in the current view.
- Feedback initially shares only a rating and optional comment. A separate unchecked consent box enables a snapshot of exactly one question, answer and citations. Other chat messages and memories are never exposed. Re-submitting without consent clears a previously shared snapshot. Conversation deletion does not delete already submitted feedback; deleting the user account cascades feedback deletion. Administrators can set open/reviewing/resolved and associate a knowledge document. Detail access and administrative actions are audited.
- New migration: `1791001000000-AddCoachManagement.ts`. Development synchronization initializes these SQL-owned tables too; production applies normal migrations. Restart the backend after updating code if Docker bind-mount file watching misses changes.

Integration tests cover settings validation and permissions, runtime enable/disable, playground context isolation and quota, feedback ownership/consent/revocation, audit metadata, and migration lifecycle. Provider unit tests additionally verify SSE token reporting and error redaction. Tests use a disposable database and stub provider.
