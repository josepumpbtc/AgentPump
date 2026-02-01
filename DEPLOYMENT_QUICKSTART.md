# 部署快速开始指南

本指南帮助你快速开始 Base Sepolia 和 Railway 部署。

## 🚀 部署流程概览

```
1. 准备环境变量
   ↓
2. 部署智能合约到 Base Sepolia
   ↓
3. 配置前端环境变量
   ↓
4. 部署前端到 Railway
   ↓
5. 测试部署
```

---

## 📋 步骤 1: 准备环境变量

### 1.1 创建后端 `.env` 文件

在项目根目录创建 `.env` 文件：

```bash
cp .env.example .env
```

编辑 `.env` 文件，填写以下内容：

```bash
# 部署者私钥（不带 0x 前缀）
PRIVATE_KEY=your_private_key_without_0x

# 签名者地址（用于生成签名，可以是部署者地址）
SIGNER_ADDRESS=0xYourSignerAddress

# Base Sepolia Uniswap Router（见下方说明）
UNISWAP_V2_ROUTER=0xYourRouterAddress

# Basescan API Key（可选，用于合约验证）
BASESCAN_API_KEY=your_basescan_api_key

# 是否自动验证合约
VERIFY=false
```

**重要**: 
- Base Sepolia 可能没有 Uniswap V2，可以先使用零地址或 Mock Router
- 获取 Base Sepolia ETH: https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet

### 1.2 创建前端 `.env` 文件

在 `frontend` 目录创建 `.env` 文件：

```bash
cd frontend
cp .env.example .env
```

**暂时不填写** `NEXT_PUBLIC_FACTORY_ADDRESS`，部署合约后再填写。

---

## 📋 步骤 2: 部署智能合约到 Base Sepolia

### 2.1 安装依赖

```bash
# 在项目根目录
npm install
```

### 2.2 编译合约

```bash
npx hardhat compile
```

### 2.3 运行测试（推荐）

```bash
npx hardhat test
```

### 2.4 部署合约

**部署当前模式**:
```bash
npx hardhat run scripts/deploy.js --network baseSepolia
```

**或部署 Pump.fun 模式**:
```bash
npx hardhat run scripts/deploy-pumpfun.js --network baseSepolia
```

### 2.5 记录部署信息

部署成功后，记录以下信息：

```
✅ Factory 合约地址: 0x...
✅ 部署交易哈希: 0x...
✅ 部署者地址: 0x...
```

### 2.6 更新前端环境变量

编辑 `frontend/.env`，添加 Factory 地址：

```bash
NEXT_PUBLIC_FACTORY_ADDRESS=0x... # 从步骤 2.5 获取
```

---

## 📋 步骤 3: 准备 Railway 部署

### 3.1 获取 WalletConnect Project ID

1. 访问 https://cloud.walletconnect.com
2. 登录或注册
3. 创建新项目
4. 复制 Project ID

### 3.2 准备 Railway 环境变量

准备以下环境变量（将在 Railway 中配置）：

```bash
# 必需
NEXT_PUBLIC_FACTORY_ADDRESS=0x... # 从步骤 2.5 获取
NEXT_PUBLIC_WALLET_CONNECT_ID=your_walletconnect_project_id
SIGNER_PRIVATE_KEY=0x... # 与 SIGNER_ADDRESS 对应的私钥

# 可选
MOLTBOOK_READ_KEY=moltbook_sk_... # Moltbook API 密钥
NEXT_PUBLIC_ALCHEMY_KEY=your_alchemy_key # Alchemy RPC 密钥
```

---

## 📋 步骤 4: 部署前端到 Railway

### 4.1 注册 Railway 账号

1. 访问 https://railway.app
2. 使用 GitHub 账号登录

### 4.2 创建新项目

1. 点击 "New Project"
2. 选择 "Deploy from GitHub repo"
3. 选择 AgentPump 仓库

### 4.3 配置项目

1. 设置 Root Directory 为 `frontend`
2. Railway 会自动检测 Next.js 项目

### 4.4 配置环境变量

在 Railway 项目设置中：

1. 点击 "Variables" 标签
2. 添加所有环境变量（见步骤 3.2）

### 4.5 部署

Railway 会自动开始构建和部署，等待 2-5 分钟。

### 4.6 获取部署 URL

部署完成后，Railway 会提供一个 `.railway.app` 域名。

---

## 📋 步骤 5: 测试部署

### 5.1 测试前端

1. 访问 Railway 提供的 URL
2. 连接钱包到 Base Sepolia 网络
3. 检查首页是否正常加载

### 5.2 测试 API

```bash
# 测试 tokens API
curl https://your-app.railway.app/api/tokens?chainId=84532
```

### 5.3 测试完整流程

1. **创建 Token**:
   - 访问 Launch 页面
   - 填写 token 信息
   - 完成 Moltbook 验证
   - 提交交易

2. **交易 Token**:
   - 访问 Token 详情页
   - 买入一些 tokens
   - 卖出一些 tokens

---

## ⚠️ 常见问题

### Base Sepolia Uniswap Router

**问题**: Base Sepolia 可能没有 Uniswap V2

**解决方案**:
1. 查找 Base Sepolia 上的 Uniswap Router 地址
2. 或使用 Mock Router 用于测试
3. 或暂时使用零地址（Graduation 功能无法测试）

### Moltbook API

**问题**: Moltbook API 不可用

**解决方案**:
1. 获取 Moltbook API Key: https://moltbook.com
2. 或暂时跳过验证（仅用于测试）

### Railway 构建失败

**问题**: 构建失败

**解决方案**:
1. 检查 Node.js 版本（需要 18+）
2. 查看 Railway 构建日志
3. 确认 `package.json` 配置正确

---

## 📚 详细文档

- **Base Sepolia 部署**: 查看 `DEPLOY_BASE_SEPOLIA.md`
- **Railway 部署**: 查看 `DEPLOY_RAILWAY.md`
- **故障排除**: 查看 `TROUBLESHOOTING.md`
- **测试指南**: 查看 `TESTING_GUIDE.md`

---

## ✅ 部署检查清单

### Base Sepolia 部署前
- [ ] 环境变量已配置
- [ ] 依赖已安装
- [ ] 合约已编译
- [ ] 测试已通过（可选）
- [ ] Base Sepolia ETH 已准备

### Railway 部署前
- [ ] Factory 合约已部署
- [ ] Factory 地址已记录
- [ ] 环境变量已准备
- [ ] WalletConnect Project ID 已获取
- [ ] Railway 账号已创建

### 部署后验证
- [ ] 前端可以访问
- [ ] 钱包可以连接
- [ ] API 端点正常工作
- [ ] 可以创建 token
- [ ] 可以交易 token

---

## 🎯 下一步

部署成功后：

1. **分享 URL**: 分享 Railway URL 给测试用户
2. **收集反馈**: 收集用户反馈和 bug 报告
3. **监控**: 监控 Railway 日志和指标
4. **优化**: 根据测试结果优化代码
5. **主网准备**: 准备主网部署

---

**开始部署**: 按照上述步骤逐步执行，遇到问题查看详细文档或 `TROUBLESHOOTING.md`。
