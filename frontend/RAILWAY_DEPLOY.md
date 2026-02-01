# Railway 部署指南

Railway 非常适合部署 Next.js 应用进行测试。本指南将帮助你快速部署 AgentPump 前端到 Railway。

## ✅ Railway 部署的优势

1. **简单快速**: 几分钟内完成部署
2. **自动 HTTPS**: 自动提供 HTTPS 域名
3. **环境变量管理**: 方便管理敏感信息
4. **自动部署**: 连接 GitHub 后自动部署
5. **免费额度**: 有免费试用额度

## 📋 部署前准备

### 1. 确保合约已部署

在部署前端之前，你需要先部署智能合约到 Base Sepolia：

```bash
# 在项目根目录
npx hardhat run scripts/deploy.js --network baseSepolia
```

记录部署的 Factory 合约地址。

### 2. 准备环境变量

需要以下环境变量（在 Railway 中配置）：

**必需的环境变量**:
```
NEXT_PUBLIC_FACTORY_ADDRESS=0x... # 部署的Factory合约地址
NEXT_PUBLIC_WALLET_CONNECT_ID=your_walletconnect_project_id
SIGNER_PRIVATE_KEY=0x... # 用于生成签名的私钥
```

**可选的环境变量**:
```
MOLTBOOK_READ_KEY=moltbook_sk_... # Moltbook API密钥
NEXT_PUBLIC_ALCHEMY_KEY=your_alchemy_key # 或使用公共RPC
```

## 🚀 部署步骤

### 方法1: 通过 Railway Web UI 部署

1. **注册 Railway 账号**
   - 访问 https://railway.app
   - 使用 GitHub 账号登录

2. **创建新项目**
   - 点击 "New Project"
   - 选择 "Deploy from GitHub repo"
   - 选择你的 AgentPump 仓库

3. **配置项目**
   - Railway 会自动检测 Next.js 项目
   - 设置 Root Directory 为 `frontend`
   - 或者直接部署整个项目，然后设置工作目录

4. **配置环境变量**
   - 在项目设置中找到 "Variables"
   - 添加所有必需的环境变量（见上方列表）

5. **部署**
   - Railway 会自动开始构建和部署
   - 等待部署完成（通常 2-5 分钟）

6. **获取域名**
   - 部署完成后，Railway 会提供一个 `.railway.app` 域名
   - 可以在项目设置中配置自定义域名

### 方法2: 通过 Railway CLI 部署

```bash
# 1. 安装 Railway CLI
npm i -g @railway/cli

# 2. 登录
railway login

# 3. 初始化项目（在frontend目录）
cd frontend
railway init

# 4. 设置环境变量
railway variables set NEXT_PUBLIC_FACTORY_ADDRESS=0x...
railway variables set NEXT_PUBLIC_WALLET_CONNECT_ID=your_id
railway variables set SIGNER_PRIVATE_KEY=0x...

# 5. 部署
railway up
```

## ⚙️ Railway 配置说明

### Root Directory 设置

如果从项目根目录部署，需要设置 Root Directory 为 `frontend`：

1. 在 Railway 项目设置中
2. 找到 "Settings" → "Root Directory"
3. 设置为 `frontend`

### Build Command

Railway 会自动检测 Next.js，但也可以手动设置：

```
npm install && npm run build
```

### Start Command

```
npm start
```

### Node.js 版本

Railway 会自动检测，但建议使用 Node.js 18+：

在 `frontend/package.json` 中添加：
```json
{
  "engines": {
    "node": ">=18.0.0"
  }
}
```

## 🔧 环境变量配置

### 在 Railway Web UI 中配置

1. 进入项目设置
2. 点击 "Variables" 标签
3. 添加以下变量：

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `NEXT_PUBLIC_FACTORY_ADDRESS` | `0x...` | Factory合约地址（必需） |
| `NEXT_PUBLIC_WALLET_CONNECT_ID` | `your_id` | WalletConnect项目ID（必需） |
| `SIGNER_PRIVATE_KEY` | `0x...` | 签名私钥（必需，仅API使用） |
| `MOLTBOOK_READ_KEY` | `moltbook_sk_...` | Moltbook API密钥（可选） |
| `NEXT_PUBLIC_ALCHEMY_KEY` | `your_key` | Alchemy RPC密钥（可选） |

**注意**: 
- `NEXT_PUBLIC_*` 变量会暴露给前端，不要放敏感信息
- `SIGNER_PRIVATE_KEY` 不会暴露给前端，只在服务器端API路由使用

## 📝 部署后检查清单

部署完成后，检查以下功能：

- [ ] 网站可以正常访问
- [ ] 钱包连接功能正常
- [ ] 首页可以加载（即使没有tokens）
- [ ] Launch页面可以打开
- [ ] API路由正常工作（`/api/verify`, `/api/tokens`）

## 🐛 常见问题

### 1. 构建失败

**问题**: Build 失败，可能是依赖问题

**解决**:
- 检查 Node.js 版本（需要 18+）
- 检查 `package.json` 中的依赖版本
- 查看 Railway 构建日志

### 2. 环境变量未生效

**问题**: `NEXT_PUBLIC_*` 变量在前端无法访问

**解决**:
- 确保变量名以 `NEXT_PUBLIC_` 开头
- 重新部署应用（环境变量更改后需要重新构建）
- 检查变量值是否正确

### 3. API 路由返回 500 错误

**问题**: `/api/verify` 或 `/api/tokens` 返回错误

**解决**:
- 检查服务器日志（Railway 提供日志查看）
- 确认 `SIGNER_PRIVATE_KEY` 和 `MOLTBOOK_READ_KEY` 已配置
- 确认 `NEXT_PUBLIC_FACTORY_ADDRESS` 已设置

### 4. 无法连接 Base Sepolia

**问题**: 前端无法连接到 Base Sepolia 网络

**解决**:
- 确认 WalletConnect 配置正确
- 检查 RPC URL 是否正确
- 可以在 Railway 环境变量中添加自定义 RPC URL

## 🔄 更新部署

### 自动部署（推荐）

连接 GitHub 后，每次 push 到主分支会自动触发部署。

### 手动部署

```bash
railway up
```

## 📊 监控和日志

Railway 提供：
- **实时日志**: 在 Web UI 中查看应用日志
- **指标监控**: CPU、内存使用情况
- **部署历史**: 查看所有部署记录

## 💰 费用说明

Railway 提供：
- **免费额度**: $5/月免费额度（通常足够测试）
- **按量付费**: 超出免费额度后按使用量付费
- **暂停功能**: 可以暂停服务节省费用

## ✅ 测试建议

部署到 Railway 后，建议测试：

1. **基础功能**
   - 连接钱包（MetaMask/RainbowKit）
   - 切换到 Base Sepolia 网络
   - 查看首页

2. **Launch 功能**
   - 创建 token（需要 Moltbook 验证）
   - 测试图片上传
   - 测试 symbol 验证（必须以 MOLTPUMP 结尾）

3. **交易功能**
   - 买入 token
   - 卖出 token
   - 查看价格和费用

4. **API 功能**
   - 测试 `/api/tokens` 端点
   - 测试 `/api/verify` 端点

## 🎯 下一步

部署成功后：
1. 分享 Railway 提供的 URL 给测试用户
2. 收集反馈和 bug 报告
3. 根据测试结果修复问题
4. 准备主网部署

## 📚 相关资源

- Railway 文档: https://docs.railway.app
- Next.js 部署: https://nextjs.org/docs/deployment
- Railway Discord: https://discord.gg/railway
