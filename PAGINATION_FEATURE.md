# Agent分页功能说明

## 功能概述

为MCPX项目的Agent页面添加了完整的分页功能，提供更好的数据加载和用户体验。

## 主要特性

### 1. 分页数据加载
- **服务端分页**: 支持从后端API分页获取Agent数据
- **智能缓存**: 本地缓存已加载的分页数据
- **搜索集成**: 分页模式下的搜索通过API实现
- **兼容性模式**: 保持与原有非分页模式的兼容

### 2. 用户界面功能

#### 分页控制
- **页码导航**: 显示当前页、总页数，支持点击跳转
- **智能省略**: 大量页数时自动省略中间页码 (...)
- **上一页/下一页**: 快速导航按钮
- **加载更多**: 支持追加模式加载下一页数据

#### 分页设置
- **模式切换**: 可以在分页模式和非分页模式之间切换
- **页面大小**: 支持调整每页显示的Agent数量 (10/20/50/100)
- **设置持久化**: 用户设置保存到localStorage

#### 状态显示
- **分页信息**: 显示当前页/总页数、总Agent数量
- **加载状态**: 显示加载中、加载更多等状态
- **错误处理**: 网络错误时显示重试按钮

### 3. 技术实现

#### 后端API支持
```typescript
// 分页参数
interface PaginationParams {
  page: number;        // 页码 (从1开始)
  pageSize: number;    // 每页大小
  keyword?: string;    // 搜索关键词
}

// 分页响应
interface PaginatedResponse<T> {
  data: T[];           // 当前页数据
  total: number;       // 总记录数
  page: number;        // 当前页码
  pageSize: number;    // 每页大小
  totalPages: number;  // 总页数
  hasNextPage: boolean; // 是否有下一页
  hasPreviousPage: boolean; // 是否有上一页
}
```

#### 状态管理
- **agentPaginationAtom**: 分页信息状态
- **agentPaginationModeAtom**: 分页模式开关 (持久化)
- **agentLoadingStateAtom**: 增加了isLoadingMore状态

#### Hook扩展
新增分页相关方法：
- `fetchAgentListWithPagination()`: 获取分页数据
- `goToPage(page)`: 跳转到指定页面
- `loadMoreAgents()`: 加载更多数据
- `setPageSize(size)`: 设置每页大小
- `togglePaginationMode()`: 切换分页模式

## 使用说明

### 1. 启用分页功能
1. 点击Agent侧边栏右上角的齿轮图标 ⚙️
2. 勾选"启用分页模式"
3. 可选择每页显示数量 (10/20/50/100)

### 2. 分页导航
- **页码跳转**: 点击页码数字直接跳转
- **上下翻页**: 使用 ‹ › 按钮
- **加载更多**: 点击"加载更多"按钮追加下一页数据

### 3. 搜索功能
- **分页模式**: 搜索会重新从第1页开始，通过API过滤
- **非分页模式**: 在本地已加载数据中进行前端过滤

## 性能优化

### 1. 数据加载
- **按需加载**: 只加载当前页面的数据
- **智能缓存**: 避免重复请求已加载的数据
- **错误恢复**: 网络错误时提供重试机制

### 2. 用户体验
- **加载状态**: 清晰的加载提示和进度指示
- **响应式设计**: 适配不同屏幕尺寸
- **平滑动画**: CSS过渡效果增强视觉体验

### 3. 兼容性
- **渐进增强**: 新功能不影响现有用户流程
- **降级支持**: API不可用时自动降级到本地模式
- **配置持久化**: 用户选择的设置会被保存

## API要求

后端API需要支持以下查询参数：
```
GET /web/mcp/agent/list?page=1&pageSize=20&keyword=搜索词
```

响应格式：
```json
{
  "total": 156,
  "rows": [
    {
      "id": 1,
      "name": "Agent名称",
      "description": "描述",
      // ... 其他Agent字段
    }
  ]
}
```

## 配置选项

### localStorage配置
- `mcpx-agent-pagination-mode`: 是否启用分页模式 (boolean)
- `mcpx-agent-config`: Agent配置信息 (包含其他设置)

### 默认值
- **默认分页模式**: 启用 (true)
- **默认页面大小**: 20条/页
- **最大页码按钮**: 显示5个页码按钮

## 开发说明

### 文件修改
1. **服务层**: `src/services/agentService.ts` - 添加分页API支持
2. **状态管理**: `src/atoms/agentState.ts` - 分页状态定义
3. **Hook**: `src/hooks/useAgent.ts` - 分页操作方法
4. **组件**: `src/components/AgentSidebar.tsx` - UI界面
5. **样式**: `src/styles/components/_AgentSidebar.scss` - 分页样式

### 向后兼容
- 保留原有的`fetchAgentList()`和`searchAgents()`方法
- `filteredAgentListAtom`根据分页模式自动切换行为
- 现有组件无需修改即可继续工作

## 未来扩展

### 可能的改进
1. **虚拟滚动**: 处理超大数据集
2. **预加载**: 预先加载下一页数据
3. **缓存策略**: 更智能的缓存管理
4. **排序功能**: 添加多种排序选项
5. **筛选器**: 按标签、作者等筛选Agent

### 监控指标
- 页面加载时间
- API响应时间
- 用户操作频率
- 错误率统计

---

## 总结

新的分页功能大大改善了大量Agent数据的浏览体验，提供了灵活的配置选项和良好的性能表现。通过渐进增强的方式实现，确保了与现有功能的完全兼容。 