---
Task ID: 1
Agent: Main Agent
Task: 检查所有API接口，修复bug后提交部署

Work Log:
- 审计了全部23个API路由文件，发现9个bug
- 修复 Bug 1: architecture/generate/route.ts - request.json()被调用两次导致状态重置静默失败
- 修复 Bug 2: chapter-outlines/generate/route.ts - 同上问题
- 修复 Bug 3: chapter-contents/route.ts - wordCount未根据content重新计算
- 修复 Bug 4: projects/[id]/route.ts - PATCH直接传递未验证body给Prisma，添加字段白名单
- 修复 Bug 5: characters/[id]/route.ts - DELETE返回500而非404（记录不存在时）
- 修复 Bug 6: world-settings/[id]/route.ts - 同上问题
- 修复 Bug 7: characters/route.ts - POST缺少arc和relationships字段
- 修复 Bug 8: chapter-contents/refine/route.ts - 添加check（一致性检查）动作映射
- 修复 projects/[id]/architecture/route.ts - request.json()双重消费问题
- 修复 projects/[id]/outline/route.ts - 同上问题
- 修复 projects/[id]/route.ts - DELETE返回404而非500
- 发现DATABASE_URL系统环境变量指向旧SQLite路径，覆盖了.env中的PostgreSQL URL
- 更新Vercel环境变量：删除空的DATABASE_URL和DIRECT_URL，创建包含正确Neon PostgreSQL连接串的变量
- 代码推送到GitHub并触发Vercel重新部署
- 验证部署成功：https://my-project-seven-xi-98.vercel.app API正常工作

Stage Summary:
- 所有API bug已修复，代码已提交推送（commit: 7c6fb38）
- Vercel部署环境变量已更新为正确的PostgreSQL连接串
- 线上API验证通过：projects/ai-settings/characters等接口均正常返回
- GitHub仓库Homepage更新为正确的部署URL
