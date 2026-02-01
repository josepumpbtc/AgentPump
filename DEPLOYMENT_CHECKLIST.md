# Base Sepolia 测试网部署检查清单

## ✅ 已完成的功能

### 智能合约
- ✅ Launch功能（签名验证、nonce、chainId、deadline、devBuyAmount）
- ✅ Buy/Sell功能（Virtual AMM）
- ✅ 动态费用系统（pump.fun风格）
- ✅ Graduation机制（20 ETH阈值）
- ✅ 安全特性（ReentrancyGuard、Pausable）
- ✅ 费用分配（立即转账）
- ✅ Symbol必须以MOLTPUMP结尾（前端验证）

### 前端
- ✅ Launch页面（单页表单，类似pump.fun）
- ✅ Token详情页
- ✅ 交易界面（Buy/Sell）
- ✅ 首页（显示真实token列表）
- ✅ 图片上传和预览
- ✅ 描述和社交链接字段
- ✅ Moltbook验证集成

### 部署配置
- ✅ 部署脚本（`scripts/deploy.js`）
- ✅ Hardhat配置（Base Sepolia网络）
- ✅ 环境变量示例文件

## ⚠️ 部署前必须完成的配置

### 1. 环境变量配置

#### 后端（项目根目录 `.env`）
```bash
# 必需
PRIVATE_KEY=your_private_key_without_0x_prefix
SIGNER_ADDRESS=0x... # 用于生成签名的地址（可以是部署者地址）
UNISWAP_V2_ROUTER=0x... # Base Sepolia的Uniswap Router地址（见下方说明）

# 可选
BASESCAN_API_KEY=your_basescan_api_key # 用于合约验证
VERIFY=false # 设置为true以自动验证合约
```

#### 前端（`frontend/.env`）
```bash
# 必需
NEXT_PUBLIC_FACTORY_ADDRESS=0x... # 部署后填入
NEXT_PUBLIC_WALLET_CONNECT_ID=your_walletconnect_project_id
SIGNER_PRIVATE_KEY=0x... # 与SIGNER_ADDRESS对应的私钥（仅用于API路由）

# 可选
MOLTBOOK_READ_KEY=moltbook_sk_... # Moltbook API密钥
NEXT_PUBLIC_ALCHEMY_KEY=your_alchemy_key # 或使用公共RPC
```

### 2. Base Sepolia Uniswap Router地址 ⚠️

**重要问题**: Base Sepolia可能没有部署Uniswap V2。

**解决方案**:
1. **选项A**: 查找Base Sepolia上的Uniswap V2 Router地址
   - 检查Base官方文档
   - 或联系Base团队

2. **选项B**: 部署Mock Router用于测试
   - 创建一个简单的Mock Uniswap Router合约
   - 仅实现`addLiquidityETH`函数用于测试

3. **选项C**: 使用其他DEX的Router（如果有）

**当前状态**: 需要确认Base Sepolia是否有Uniswap V2部署

### 3. Moltbook API验证 ⚠️

**当前状态**: 代码依赖Moltbook API进行agent验证

**需要确认**:
- [ ] Moltbook API是否可用
- [ ] API密钥是否正确配置
- [ ] API端点是否正确（`https://moltbook.com/api/v1/agents/profile`）

**如果Moltbook API不可用**:
- 可以考虑暂时跳过验证（仅用于测试）
- 或实现替代验证方案

### 4. 测试

**运行测试**:
```bash
npx hardhat test
```

**注意**: 测试文件使用Mock Router，需要确保Mock Router可以正常部署

## 📋 部署步骤

### Step 1: 准备环境变量
```bash
# 1. 复制环境变量示例文件
cp .env.example .env
cp frontend/.env.example frontend/.env

# 2. 填写所有必需的环境变量（见上方）
```

### Step 2: 安装依赖
```bash
# 安装合约依赖
npm install

# 安装前端依赖
cd frontend && npm install && cd ..
```

### Step 3: 编译合约
```bash
npx hardhat compile
```

### Step 4: 运行测试（可选但推荐）
```bash
npx hardhat test
```

### Step 5: 部署到Base Sepolia
```bash
# 确保.env中配置了正确的PRIVATE_KEY和SIGNER_ADDRESS
npx hardhat run scripts/deploy.js --network baseSepolia
```

**部署后**:
1. 记录Factory合约地址
2. 更新`frontend/.env`中的`NEXT_PUBLIC_FACTORY_ADDRESS`
3. 如果需要，运行合约验证：
   ```bash
   npx hardhat verify --network baseSepolia <FACTORY_ADDRESS> <SIGNER_ADDRESS> <UNISWAP_ROUTER_ADDRESS>
   ```

### Step 6: 启动前端
```bash
cd frontend
npm run dev
```

访问 `http://localhost:3000` 测试功能

## 🔍 部署后测试清单

### 基础功能测试
- [ ] 连接钱包
- [ ] 创建token（需要Moltbook验证）
- [ ] 查看token详情页
- [ ] 买入token
- [ ] 卖出token
- [ ] 查看价格和费用

### 高级功能测试
- [ ] 测试dev buy功能
- [ ] 测试图片上传
- [ ] 测试社交链接
- [ ] 测试symbol验证（必须以MOLTPUMP结尾）
- [ ] 测试graduation机制（需要达到20 ETH）

### 边界情况测试
- [ ] 测试无效输入
- [ ] 测试签名过期
- [ ] 测试nonce重放攻击
- [ ] 测试slippage保护

## ⚠️ 已知问题和限制

### 1. Base Sepolia Uniswap Router
- **状态**: 未确认是否存在
- **影响**: Graduation功能可能无法测试
- **解决方案**: 使用Mock Router或跳过graduation测试

### 2. Moltbook API依赖
- **状态**: 需要确认可用性
- **影响**: Launch功能需要Moltbook验证
- **解决方案**: 如果不可用，需要实现替代方案

### 3. 图片存储
- **状态**: 当前使用base64存储在前端
- **影响**: 图片不会持久化存储
- **解决方案**: 未来可以集成IPFS或其他存储服务

## ✅ 项目Ready状态评估

### 核心功能: ✅ Ready
- Launch功能完整
- Buy/Sell功能完整
- Token详情页完整
- 前端UI完整

### 部署配置: ⚠️ 需要配置
- 环境变量需要填写
- Base Sepolia Router地址需要确认
- Moltbook API需要验证

### 测试: ✅ 基础测试已创建
- 单元测试文件存在
- 需要运行测试确认

## 🚀 结论

**项目状态**: **基本Ready，但需要完成配置**

**可以开始部署，但需要**:
1. ✅ 配置所有环境变量
2. ⚠️ 确认Base Sepolia Uniswap Router地址（或使用Mock）
3. ⚠️ 确认Moltbook API可用性
4. ✅ 运行测试确保功能正常

**建议部署流程**:
1. 先完成环境变量配置
2. 运行本地测试
3. 部署到Base Sepolia
4. 进行功能测试
5. 根据测试结果修复问题

**预计部署时间**: 30-60分钟（包括配置和测试）
