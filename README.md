<p align="center">
  <!-- <img src="frontend/src/assets/logo.svg" width="120" alt="Grindify Logo" /> -->
</p>

<h1 align="center">Grindify</h1>

  <p align="center">一个基于 NestJS 和 Vue 3 构建的自托管健身追踪 Web 应用。</p>
    <p align="center">
<a href="LICENSE" target="_blank"><img src="https://img.shields.io/badge/license-AGPL--3.0-blue.svg" alt="许可证" /></a>
<a href="https://nestjs.com/" target="_blank"><img src="https://img.shields.io/badge/backend-NestJS-E0234E.svg" alt="后端" /></a>
<a href="https://vuejs.org/" target="_blank"><img src="https://img.shields.io/badge/frontend-Vue.js-4FC08D.svg" alt="前端" /></a>
<a href="https://www.postgresql.org/" target="_blank"><img src="https://img.shields.io/badge/database-PostgreSQL-336791.svg" alt="数据库" /></a>
</p>

---

## 项目概览

Grindify 是一款全栈训练应用，面向希望完全掌控个人数据、无需订阅费用或网络连接的用户。它提供了一整套工具，用于规划训练计划、实时记录训练，并随时间推移可视化进步情况。平台采用移动端优先设计，适合在健身房使用，同时也为计划制定和数据分析提供了完善的桌面端界面。

## 功能特性

- **训练管理**：创建并整理自定义训练计划，为每个动作设置具体的组数和目标。
- **训练记录**：通过针对移动设备优化的界面实时记录训练。
- **动作库**：管理动作数据库，支持自定义图片和肌群分类。
- **进步分析**：查看每个动作的训练量、频率和个人纪录等详细统计数据。
- **身体指标**：记录体重并上传进度照片，跟踪身体变化。
- **隐私优先**：训练记录由用户掌控，不使用第三方追踪；可选的 AI 教练会将对话及相关训练信息发送给配置的阿里云百炼服务。
- **健身教练**：全局悬浮聊天、自动记忆和管理员维护的 RAG 知识库。启用步骤与演示数据说明见 [健身教练配置](docs/fitness-coach.md)。

## 技术栈

### 后端

- **框架**：NestJS（v11）
- **数据库**：PostgreSQL 17
- **ORM**：TypeORM
- **身份验证**：Passport.js（JWT 和本地策略）
- **数据校验**：class-validator 和 class-transformer
- **媒体处理**：Sharp（图片处理）和 Multer（文件上传）
- **文档**：Swagger/OpenAPI

### 前端

- **框架**：Vue 3（组合式 API）
- **构建工具**：Vite
- **UI 库**：Vuetify 3
- **状态管理**：Pinia（支持持久化）
- **可视化**：Chart.js 和 Vue-Chartjs
- **路由**：Vue Router

## 快速开始

### 环境要求

- **Docker** 和 **Docker Compose**（推荐）
- 或
- **Node.js** v18+
- **PostgreSQL** v15+

### 安装（推荐使用 Docker）

1. **克隆仓库**

   ```bash
   git clone https://github.com/FalkenDev/Grindify.git
   cd Grindify
   ```

2. **启动应用**

   ```bash
   docker compose up -d --build
   ```

   应用启动时会自动执行数据库迁移。

3. **初始化种子数据**（可选）
   填充默认动作和肌群：

   ```bash
   docker exec -it grindify_backend npm run seed
   ```

4. **访问应用**
   - **前端**：http://localhost:3000
   - **API 文档**：http://localhost:1337/api
   - **后端 API**：http://localhost:1337

### 安装（手动安装）

1. **克隆仓库**

   ```bash
   git clone https://github.com/FalkenDev/Grindify.git
   cd Grindify
   ```

2. **配置环境**
   复制示例环境变量文件，并配置数据库凭据：

   ```bash
   cp .env.example .env
   ```

3. **配置后端**

   ```bash
   cd backend
   npm install

   # 确保 PostgreSQL 正在运行，并使用凭据更新 .env

   npm run build
   npm run start:prod
   ```

4. **配置前端**
   ```bash
   cd frontend
   npm install
   npm run build
   npm run preview
   ```

## 开发

### 项目结构

```
Grindify/
├── backend/          # NestJS API 应用
│   ├── src/          # 源代码
│   └── test/         # E2E 测试
├── frontend/         # Vue 3 应用
│   └── src/          # 源代码
├── docker-compose.yml # 开发环境编排
└── Dockerfile.*      # 容器定义
```

### 以开发模式运行

启动启用热重载的两个服务：

```bash
docker compose -f docker-compose.yml up
```

- 后端代码发生变化时会自动重启。
- 前端代码会通过 Vite HMR 立即生效。

## GitHub OAuth

Grindify 支持可选的 GitHub 登录。将 `GITHUB_CLIENT_ID` 留空即可完全禁用此功能——不配置它，应用也能正常运行。

### 配置步骤

1. 访问 [github.com/settings/developers](https://github.com/settings/developers) → **OAuth Apps** → **New OAuth App**
2. 填写以下信息：
   - **Application name**：Grindify
   - **Homepage URL**：`http://localhost:3000`（或你的域名）
   - **Authorization callback URL**：`http://localhost:1337/v1/auth/github/callback`
3. 复制 **Client ID** 并生成 **Client Secret**
4. 将以下配置添加到 `.env`：

```env
GITHUB_CLIENT_ID=your_client_id
GITHUB_CLIENT_SECRET=your_client_secret
BACKEND_URL=http://localhost:1337   # 必须与 GitHub 重定向到的地址一致
```

5. 重启后端

如果未设置 `GITHUB_CLIENT_ID`，登录页面仍会显示 GitHub 按钮，但不会加载对应策略；设置该变量后即可启用完整流程。

**账号关联**：如果 GitHub 邮箱与已有的密码账号匹配，系统会自动关联两个账号。之后用户可以使用任一方式登录。

## 邮箱验证与密码重置

Grindify 支持使用 [Resend](https://resend.com) 实现可选的邮箱验证和密码重置。

### 配置

在 `.env` 文件中设置以下变量：

```env
# 启用邮箱验证（默认为 false——用户注册后可以立即登录）
REQUIRE_EMAIL_VERIFICATION=false

# Resend API 密钥——仅在 REQUIRE_EMAIL_VERIFICATION=true 时必需
RESEND_API_KEY=re_your_api_key_here

# 发件人地址
EMAIL_FROM=noreply@yourdomain.com

# 前端公开 URL（用于邮件中的链接）
FRONTEND_URL=https://yourdomain.com
```

### 设置 Resend

1. 在 [resend.com](https://resend.com) 创建免费账号。
2. 进入 **API Keys** 并创建新密钥。
3. 在 **Domains** 中添加已验证的发信域名（使用自有域名发信时必需）。
4. 在 `.env` 中设置 `RESEND_API_KEY` 和 `EMAIL_FROM`。
5. 设置 `REQUIRE_EMAIL_VERIFICATION=true` 以强制用户完成验证。

### 工作方式

| `REQUIRE_EMAIL_VERIFICATION` | 行为                                                                                                                       |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `false`（默认）              | 用户注册后会自动验证，不会发送邮件。如果配置了 Resend，密码重置仍然可用。                                                |
| `true`                       | 用户注册后会通过邮件收到 6 位验证码，必须完成验证后才能登录。验证完成前，登录会被阻止。                                    |

**密码重置**（无论验证开关如何设置都可用）：

1. 用户在登录页面点击“忘记密码？”。
2. 输入邮箱地址，系统会发送 6 位重置验证码。
3. 在重置页面输入验证码和新密码。
4. 验证码将在 15 分钟后过期。

> **注意：**如果 `REQUIRE_EMAIL_VERIFICATION=false` 且未配置 Resend 凭据，密码重置邮件将静默发送失败。如果需要使用密码重置功能，请配置 Resend。

## 版本历史

Grindify 在“设置”中提供“版本历史”视图，用于比较：

- `installedVersion`：当前安装在设备上或由 PWA 缓存的构建版本
- `deployedVersion`：实时前端通过 `/version.json` 提供的版本
- `latestReleaseVersion`：由后端代理返回的最新官方 Gitee Release 版本

前端镜像会内置一个 `/version.json` 文件，其中包含：

- `version`
- `gitSha`
- `builtAt`
- `channel`

状态说明：

- `installedVersion == deployedVersion`：此设备使用的是当前部署服务器构建版本
- `installedVersion < deployedVersion`：此设备仍在使用较旧的 PWA 缓存版本，应进行更新
- `deployedVersion < latestReleaseVersion`：存在更新的官方版本，但服务器尚未部署该版本
- `installedVersion > latestReleaseVersion`：设备运行的是开发版或预发布版；此情况会显示为中性的版本不匹配

### Gitee Releases 代理

后端通过 `GET /v1/releases` 提供发布历史。默认情况下，它指向 `yang_taoo/grindify` 仓库；你也可以通过以下变量进行覆盖：

```env
GITEE_RELEASES_OWNER=yang_taoo
GITEE_RELEASES_REPO=grindify
GITEE_RELEASES_TOKEN=
```

如果仓库不可公开访问，请使用 `GITEE_RELEASES_TOKEN` 配置 Gitee API 访问令牌。

### 维护者说明

标签、发布和部署流程仅针对维护者，相关文档与 Homelab 仓库中的 Grindify 技术栈一同维护。贡献者和普通自托管用户无需创建 Gitee Releases 即可在本地运行 Grindify。

## 参与贡献

欢迎贡献代码。提交 Pull Request 前，请先阅读我们的[贡献指南](CONTRIBUTING.md)。

向 Grindify 贡献代码即表示你同意我们的[贡献者许可协议（CLA）](CLA.md)。

## 许可证

本项目采用 **GNU Affero 通用公共许可证 v3.0（AGPL-3.0）** 授权。详情请参阅 [LICENSE](LICENSE) 文件。

本软件按“现状”提供，不附带任何形式的保证。
