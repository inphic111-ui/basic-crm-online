#!/bin/bash
# 設置 PostgreSQL 連接字串
export DATABASE_PUBLIC_URL="postgresql://postgres:ogzTiXiZsfxqloDQwcjwVdIpQkgEQxFe@junction.proxy.rlwy.net:18663/railway"
export ONLINE_DB_URL="postgresql://postgres:ogzTiXiZsfxqloDQwcjwVdIpQkgEQxFe@junction.proxy.rlwy.net:18663/railway"

# 啟動伺服器
cd /home/ubuntu/basic-crm-online
node server.mjs
