---
trigger: always_on
---

## 基础规范

0. 本项目使用 utf-8 编码
1. 本项目中所有依赖均安装在虚拟环境 globot_env 中
2. 本项目中 .gitignore 中加入 node_modules、.env（实际项目可加入 .agent）
3. 本项目全程回复使用中文

## API 使用规范

4. 如项目需要使用大语言模型，则 API 的存放地址和使用原则从 `.agent/API.md` 文件中获取
5. 如果你需要的资源如 API key、GitHub 地址等无法找到则遍历 `.agent` 文件夹中所有 .md 文件

## 项目关联

6. 本项目中关联的唯一 GitHub 仓库为 https://github.com/Vector897/Globot

## 开发环境

7. 我已在本地安装了 Ollama、Docker
8. 始终使用中文与我交流

## 项目说明（按需填写）

# 9. Background.txt 中包含了项目的背景介绍

# 10. 文件夹 Project_Info 中存放着产品信息

# 11. 文件夹 Process_Documents 中存放着项目开发的过程文档

# 12. 启动项目是自动运行虚拟环境

## “渐进式披露”（Progressive Disclosure）
You have access to specialized knowledge modules. Do NOT rely on internal training for these topics; strictly READ the corresponding skill file first if the task involves:
- ROS 2 Navigation: read `.agent/skills/ros_navigation.md`
- Academic Writing: read `.agent/skills/paper_writing.md`

[Strategy]
Check user request -> Identify required skill -> Read skill file -> Execute task.

## 此项目是2026年 GEMINI 3 黑客马拉松的参赛项目，一切要求以此比赛要求为准

## 参考文档

- 项目结构说明：`.agent/project-structure.md`
- 技术栈说明：`.agent/tech-stack.md`
- API 规范：`.agent/API.md`