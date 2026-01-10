#!/usr/bin/env python
"""
后端服务启动脚本
"""
import os
os.environ['KMP_DUPLICATE_LIB_OK'] = 'TRUE'

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=False,
        log_level="info"
    )

