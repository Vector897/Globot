---
trigger: always_on
---

# 大模型的 API_Keys 调用安全规范

## 密钥存储位置

- Gemini 密钥：已存储在 `GEMINI_API_KEY` 环境变量

## 代码要求

1. **绝对禁止**硬编码密钥
2. **必须**使用 `os.getenv()` 或类似方法读取环境变量
3. **必须**包含密钥验证代码（如检查是否为 None）
4. **建议**使用配置类或函数封装 API 调用

## 错误处理

- 如果密钥不存在，应给出明确提示
- 不要在生产代码中暴露任何密钥相关信息

## 示例结构

请按照以下模式编写代码：

```python
import os

def get_api_key(service_name):
    key = os.getenv(f"{service_name.upper()}_API_KEY")
    if not key:
        raise ValueError(f"请在环境变量中设置{service_name.upper()}_API_KEY")
    return key

```

#

## 🛡️ **多层防护策略**

除了提示词，还应该实施这些防护：

### **1. 代码层面防护**

```python
# safe_api.py - 安全封装示例
import os
import hashlib

class SecureAPIClient:
    def __init__(self, service_name):
        self.service_name = service_name
        self.api_key = self._load_key()

    def _load_key(self):
        """安全加载API密钥"""
        env_var = f"{self.service_name.upper()}_API_KEY"
        key = os.getenv(env_var)

        if not key:
            raise ValueError(
                f"请设置环境变量 {env_var}\n"
                f"例如：export {env_var}='your-key-here'"
            )

        # 记录密钥哈希（用于日志，不暴露密钥）
        key_hash = hashlib.sha256(key.encode()).hexdigest()[:8]
        print(f"[安全提示] 已加载{self.service_name} API密钥（哈希: ...{key_hash}）")
        return key

```

### **2. 建立环境变量检查脚本**

```python
# check_env.py - 环境变量安全检查
import os

REQUIRED_KEYS = ['GEMINI_API_KEY']

def check_environment():
    missing = []
    for key in REQUIRED_KEYS:
        if not os.getenv(key):
            missing.append(key)

    if missing:
        print("❌ 缺少以下环境变量：")
        for key in missing:
            print(f"   - {key}")
        print("\n💡 设置方法：")
        print(f"   export {missing[0]}='your-key-here'")
        return False

    print("✅ 所有API密钥配置正常（安全存储在环境变量中）")
    return True

if __name__ == "__main__":
    check_environment()

```

### **3. API Key 存在性检查**

做 API Key 存在性检查：

```python
print("API key loaded:", bool(os.getenv("GEMINI_API_KEY")))
```
