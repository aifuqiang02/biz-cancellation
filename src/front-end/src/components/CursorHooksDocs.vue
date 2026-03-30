<template>
  <div class="hooks-docs">
    <h3>Cursor Hooks 配置说明</h3>
    <p>
      Cursor IDE 支持通过 hooks 系统在文件编辑后自动执行脚本。本文档介绍如何配置和使用 hooks 功能。
    </p>

    <h4>文件路径</h4>
    <ul>
      <li><strong>Hooks 配置文件：</strong> <code>.cursor/hooks.json</code></li>
      <li><strong>Hooks 脚本文件：</strong> <code>.cursor/hooks/afterFileEdit.sh</code></li>
      <li><strong>日志文件：</strong> <code>cursor-hooks.log</code></li>
    </ul>

    <h4>Hooks 配置 (hooks.json)</h4>
    <p>hooks.json 文件定义了在特定事件触发时要执行的脚本：</p>
    <pre><code>{{
  `{
  "version": 1,
  "hooks": {
    "stop": [
      {
        "command": "& 'C:\\\\Program Files\\\\Git\\\\bin\\\\bash.exe' /d/git-projects/business-deregistration/.cursor/hooks/stop.sh"
      }
    ],
    "beforeSubmitPrompt": [
      {
        "command": "& 'C:\\\\Program Files\\\\Git\\\\bin\\\\bash.exe' /d/git-projects/business-deregistration/.cursor/hooks/beforeSubmitPrompt.sh"
      }
    ],
    "beforeShellExecution": [
      {
        "command": "& 'C:\\\\Program Files\\\\Git\\\\bin\\\\bash.exe' /d/git-projects/business-deregistration/.cursor/hooks/before_shell_execution.sh"
      }
    ]
  }
}`
    }}</code></pre>

    <h4>Hooks 脚本</h4>
    <p>项目包含三个主要的hook脚本文件：</p>

    <h5>stop.sh - 停止AI执行</h5>
    <p>在Cursor停止时调用的脚本，负责停止AI执行：</p>
    <pre><code>{{ stopScriptCode }}</code></pre>

    <h5>beforeSubmitPrompt.sh - 启动AI执行</h5>
    <p>在提交提示前调用的脚本，负责启动AI执行：</p>
    <pre><code>{{ startScriptCode }}</code></pre>

    <h5>before_shell_execution.sh - Shell命令安全检查</h5>
    <p>在执行shell命令前调用的脚本，进行命令安全检查和过滤。目前阻止以下命令：</p>
    <ul>
      <li><code>npm run ...</code> - 阻止npm脚本执行</li>
      <li><code>npx tsx ...</code> - 阻止npx tsx执行</li>
    </ul>
    <p>黑名单配置在脚本顶部的 <code>BLACKLIST_PATTERNS</code> 数组中，可以方便地添加更多规则。</p>
    <pre><code>{{ shellExecutionScriptCode }}</code></pre>

    <h4>Hook 类型</h4>
    <ul>
      <li><strong>stop</strong>：在Cursor停止时触发，调用停止AI执行的API</li>
      <li><strong>beforeSubmitPrompt</strong>：在提交提示前触发，调用启动AI执行的API</li>
      <li><strong>beforeShellExecution</strong>：在执行shell命令前触发，进行命令安全检查</li>
    </ul>

    <h4>工作原理</h4>
    <ol>
      <li>Cursor IDE 在特定事件触发时调用配置的脚本</li>
      <li>脚本接收 JSON 格式的输入数据</li>
      <li>脚本执行自定义逻辑，如调用AI执行API</li>
      <li>所有日志输出都写入到 cursor-hooks.log 文件中</li>
      <li>脚本执行完成后正常退出，不向 stdout 输出任何内容</li>
    </ol>

    <h4>日志格式</h4>
    <p>生成的日志文件包含带时间戳的执行记录：</p>
    <pre><code>[2024-01-08 20:45:30] Hook executed: {"file":"example.js","action":"edit"}
[2024-01-08 20:45:30] Hook completed successfully
[2024-01-08 20:45:30] Hook execution cycle finished</code></pre>

    <h4>注意事项</h4>
    <ul>
      <li>hooks.json 文件必须放在项目的 .cursor 目录下</li>
      <li>脚本文件路径必须是相对于项目根目录的路径</li>
      <li>脚本不应向 stdout 输出内容，以避免干扰 Cursor IDE</li>
      <li>所有日志都记录到项目根目录的 cursor-hooks.log 文件中</li>
      <li>Windows 环境下需要使用完整的 bash 路径</li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

// Cursor Hooks 文档组件
// 展示 hooks 配置和使用的详细说明

interface Props {
  selectedProjectId?: string
}

const props = withDefaults(defineProps<Props>(), {
  selectedProjectId: 'cmk45w91s000068rlzq35mz4v',
})

// 使用动态项目ID，如果未选择则使用默认值
const stopProjectId = ref(props.selectedProjectId || 'cmk45w91s000068rlzq35mz4v')
const startProjectId = ref(props.selectedProjectId || 'cmk5g3gyd0000qwrl3o13kyku')

// 脚本代码模板
const stopScriptCode = ref('')
const startScriptCode = ref('')
const shellExecutionScriptCode = ref('')

// 生成脚本代码的函数
const generateStopScript = (projectId: string) => {
  return `#!/bin/bash

# Log function
log() {
    local message="$1"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] $message" >> "./cursor-hooks.log"
}

# Read JSON input from stdin
json_input=$(cat)

# Log to file (not stdout!)
log "Hook executed: $json_input"
log "Hook completed successfully"

# Call API to stop AI execution
log "Calling API to stop AI execution..."

# Make API call and capture response
response=$(curl -X POST "http://127.0.0.1:1007/api/projects/${projectId}/ai-status-stop" \\
  -H "Content-Type: application/json" \\
  -d '{"status": "completed"}' \\
  -s -w "\\nHTTP_STATUS:%{http_code}")

# Extract HTTP status and response body
http_status=$(echo "$response" | grep "HTTP_STATUS:" | cut -d: -f2)
response_body=$(echo "$response" | sed '/HTTP_STATUS:/d')

log "API Response - Status: $http_status, Body: $response_body"
log "AI execution stop API called"
log "Hook execution cycle finished"

# Exit successfully without any stdout output
exit 0`
}

const generateStartScript = (projectId: string) => {
  return `#!/bin/bash

# Log function
log() {
    local message="$1"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] $message" >> "./cursor-hooks.log"
}

# Read JSON input from stdin
json_input=$(cat)

# Log to file (not stdout!)
log "BeforeSubmitPrompt Hook executed: $json_input"

# Call API to start AI execution
log "Calling API to start AI execution..."

# Make API call and capture response
response=$(curl -X POST "http://127.0.0.1:1007/api/projects/${projectId}/ai-status-start" \\
  -H "Content-Type: application/json" \\
  -s -w "\\nHTTP_STATUS:%{http_code}")

# Extract HTTP status and response body
http_status=$(echo "$response" | grep "HTTP_STATUS:" | cut -d: -f2)
response_body=$(echo "$response" | sed '/HTTP_STATUS:/d')

log "API Response - Status: $http_status, Body: $response_body"
log "AI execution start API called"
log "BeforeSubmitPrompt Hook execution cycle finished"

# Exit successfully without any stdout output
exit 0`
}

const generateShellExecutionScript = () => {
  return `#!/bin/bash

# Configuration
BLACKLIST_PATTERNS=(".*npx tsx.*" ".*npm run.*" ".*npm start.*")

# Log function
log() {
    local message="$1"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] $message" >> "./cursor-hooks.log"
}

# Check if command is in blacklist
is_blacklisted_command() {
    local command="$1"

    # Normalize command (remove extra spaces)
    local normalized_cmd=$(echo "$command" | sed 's/^[[:space:]]*//' | sed 's/[[:space:]]*$//')

    # Check against configured blacklist patterns
    for pattern in "\${BLACKLIST_PATTERNS[@]}"; do
        if [[ "$normalized_cmd" =~ ^\$pattern[[:space:]] ]]; then
            log "Command matches blacklist pattern: \$pattern"
            return 0  # true - command is blacklisted
        fi
    done

    return 1  # false - command is allowed
}

# Read JSON input from stdin
json_input=$(cat)

# Log to file (not stdout!)
log "BeforeShellExecution Hook executed: $json_input"

# Extract command from JSON input
command=$(echo "$json_input" | grep -o '"command":"[^"]*"' | sed 's/"command":"//' | sed 's/"$//')

log "Checking command: $command"

# Check if command is blacklisted
if is_blacklisted_command "$command"; then
    log "Command blocked: $command"

    # Return deny response
    response='{
        "continue": true,
        "permission": "deny",
        "userMessage": "⛔ Command blocked by security hook",
        "agentMessage": "BLOCKED: Blacklisted command detected: '"$command"'"
    }'
    echo "$response"
    exit 0
else
    log "Command allowed: $command"

    # Return allow response
    response='{
        "continue": true,
        "permission": "allow"
    }'
    echo "$response"
    exit 0
fi`
}

// 初始化脚本代码
stopScriptCode.value = generateStopScript(stopProjectId.value)
startScriptCode.value = generateStartScript(startProjectId.value)
shellExecutionScriptCode.value = generateShellExecutionScript()

// 监听项目ID变化，重新生成脚本代码
watch(
  () => props.selectedProjectId,
  (newProjectId) => {
    if (newProjectId) {
      stopProjectId.value = newProjectId
      startProjectId.value = newProjectId
      stopScriptCode.value = generateStopScript(newProjectId)
      startScriptCode.value = generateStartScript(newProjectId)
    }
  },
)
</script>

<style scoped>
.hooks-docs {
  margin-top: 20px;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
  border-left: 4px solid #007bff;
}

.hooks-docs h3 {
  color: #2c3e50;
  margin-bottom: 16px;
  font-size: 1.5em;
}

.hooks-docs h4 {
  color: #34495e;
  margin-top: 24px;
  margin-bottom: 12px;
  font-size: 1.2em;
}

.hooks-docs p {
  line-height: 1.6;
  color: #555;
  margin-bottom: 16px;
}

.hooks-docs ul,
.hooks-docs ol {
  margin-bottom: 16px;
  padding-left: 20px;
}

.hooks-docs li {
  margin-bottom: 8px;
  line-height: 1.5;
}

.hooks-docs code {
  background: #e9ecef;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'Monaco', 'Consolas', monospace;
  font-size: 0.9em;
}

.hooks-docs pre {
  background: #2d3748;
  color: #e2e8f0;
  padding: 16px;
  border-radius: 8px;
  overflow-x: auto;
  margin: 16px 0;
  font-family: 'Monaco', 'Consolas', monospace;
  font-size: 0.85em;
  line-height: 1.4;
}

.hooks-docs pre code {
  background: transparent;
  padding: 0;
  border-radius: 0;
}
</style>
