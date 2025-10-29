# 知识库功能设置说明

## 问题说明
知识库功能的后端API路由 `/api/knowledge` 返回404错误。

## 解决方案

### 1. 重启开发服务器
知识库路由已经添加到后端代码中，但需要重启服务器来加载新的路由配置。

请停止当前的开发服务器并重新启动：

```bash
# 停止当前服务器 (Ctrl+C)
# 然后重新启动
npm run dev:electron
```

### 2. 验证路由工作
重启后，可以通过以下方式验证知识库路由是否正常工作：

1. **测试路由**: 访问 `http://localhost:61990/api/knowledge/test`
   - 应该返回: `{"success": true, "message": "知识库路由工作正常", "timestamp": "..."}`

2. **知识库API**: 访问 `http://localhost:61990/api/knowledge`
   - 应该返回: `{"success": true, "data": []}`（空的文档列表）

### 3. 已修复的内容

1. **后端路由**: 
   - 在 `services/routes/_index.ts` 中添加了知识库路由
   - 导入了 `knowledgeRouter` 并注册到 `/api/knowledge`

2. **数据库表**: 
   - 创建了 `knowledge_documents` 表的schema定义
   - 添加了数据库迁移文件

3. **前端修复**:
   - 修复了ModelSelect在知识库页面的显示问题
   - 改进了导航状态管理
   - 增强了错误处理

### 4. 功能验证步骤

重启服务器后，请按以下步骤验证：

1. **访问知识库页面**: 点击侧边栏的"知识库"按钮
2. **检查控制台**: 不应该有404错误
3. **上传测试**: 尝试上传一个txt文件
4. **搜索测试**: 在知识库中搜索文档
5. **引用测试**: 在聊天中点击知识库按钮引用文档

如果仍有问题，请检查：
- 服务器控制台是否有错误信息
- 网络请求的实际URL是否正确
- 数据库文件是否可写

## 技术细节

### 修改的文件
- `services/routes/_index.ts`: 添加知识库路由
- `services/routes/knowledge.ts`: 知识库API实现
- `services/database/schema.ts`: 数据库表定义
- `src/views/Layout.tsx`: 前端导航修复
- `src/components/SideNav.tsx`: 导航组件修复

### 数据库表结构
```sql
CREATE TABLE knowledge_documents (
  id TEXT PRIMARY KEY,
  filename TEXT NOT NULL,
  content TEXT,
  file_type TEXT NOT NULL DEFAULT 'txt',
  file_size INTEGER,
  embedding_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

## 后续优化建议

1. **自动重载**: 考虑添加热重载功能，避免手动重启
2. **数据库迁移**: 实现自动数据库迁移机制
3. **错误处理**: 添加更详细的错误日志和用户提示
4. **性能优化**: 对大文件和大量文档的处理优化
