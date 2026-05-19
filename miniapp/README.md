# Miniapp

微信小程序前端目录，和现有 `frontend/` 网页端并行维护。

## 目标能力

- 微信登录
- 学习总览
- 学习计划
- 模式选择
- 练习答题
- 历史记录
- AI 讲解
- 设置中心

## 本地开发

1. 在微信开发者工具中打开本目录 `miniapp/`
2. 将 `project.private.config.example.json` 复制为 `project.private.config.json`
3. 填写真实 `appid`
4. 在 [utils/config.ts](/Users/shanwang/company/study_english/miniapp/utils/config.ts:1) 中配置后端 API 域名
5. 后端补齐微信配置后，即可联调 `/api/v1/auth/wechat-mini-login`

## 代码规范

- 小程序业务源码只保留 `TypeScript`，不要再手动维护同名 `.js` 文件
- 微信开发者工具负责将 `.ts` 编译为可运行代码；如果新建页面时自动生成了空 `.js`，请删除，避免覆盖 `.ts` 逻辑
- 页面单一职责，接口访问统一走 `services/`
- 鉴权、存储、跳转、请求封装统一走 `utils/`
- 发布前执行 `npm run check`

## 发布

- 构建校验：`npm run check`
- 上传体验版：`npm run upload -- --version 0.1.0 --desc "miniapp init"`
- 项目根目录也提供了 [scripts/deploy-miniapp.sh](/Users/shanwang/company/study_english/scripts/deploy-miniapp.sh:1)
