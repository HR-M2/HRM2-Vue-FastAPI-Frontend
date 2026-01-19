<template>
  <div class="settings-view">
    <!-- 页面标题 -->
    <div class="page-header">
      <h1 class="page-title">系统设置</h1>
      <p class="page-desc">配置系统参数和个人偏好</p>
    </div>

    <!-- 设置内容 -->
    <div class="settings-content">
      <!-- API 配置 -->
      <el-card class="settings-card" shadow="hover">
        <template #header>
          <div class="card-header">
            <span class="card-title">API 配置</span>
          </div>
        </template>
        <el-form label-width="120px" :model="apiSettings">
          <el-form-item label="后端地址">
            <el-input v-model="apiSettings.baseUrl" placeholder="http://localhost:8000" />
            <div class="form-tip">设置后端 API 服务地址</div>
          </el-form-item>
          <el-form-item label="请求超时">
            <el-input-number v-model="apiSettings.timeout" :min="5000" :max="60000" :step="1000" />
            <span class="unit-text">毫秒</span>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="saveApiSettings">保存配置</el-button>
            <el-button @click="testConnection" :loading="testingConnection">测试连接</el-button>
          </el-form-item>
        </el-form>
      </el-card>

      <!-- 系统偏好 -->
      <el-card class="settings-card" shadow="hover">
        <template #header>
          <span class="card-title">系统偏好</span>
        </template>
        <el-form label-width="120px" :model="systemSettings">
          <el-form-item label="自动刷新">
            <el-switch v-model="systemSettings.autoRefresh" />
            <span class="switch-label">自动刷新任务状态</span>
          </el-form-item>
          <el-form-item label="刷新间隔" v-if="systemSettings.autoRefresh">
            <el-input-number v-model="systemSettings.refreshInterval" :min="1" :max="60" />
            <span class="unit-text">秒</span>
          </el-form-item>
          <el-form-item label="通知提醒">
            <el-switch v-model="systemSettings.notifications" />
            <span class="switch-label">任务完成时发送通知</span>
          </el-form-item>
          <el-form-item label="语言">
            <el-select v-model="systemSettings.language" style="width: 200px">
              <el-option label="简体中文" value="zh-CN" />
              <el-option label="English" value="en-US" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="saveSystemSettings">保存设置</el-button>
          </el-form-item>
        </el-form>
      </el-card>

      <!-- 语音识别设置 -->
      <el-card class="settings-card" shadow="hover">
        <template #header>
          <div class="card-header">
            <span class="card-title">语音识别设置</span>
            <el-tag v-if="speechSettings.currentProvider" size="small" type="info">
              当前: {{ speechSettings.currentProviderName }}
            </el-tag>
          </div>
        </template>
        <el-form label-width="120px" :model="speechSettings">
          <el-form-item label="识别引擎">
            <el-select 
              v-model="speechSettings.providerType" 
              style="width: 300px"
              @change="onProviderTypeChange"
            >
              <el-option 
                v-for="provider in availableProviders" 
                :key="provider.type"
                :label="provider.name" 
                :value="provider.type"
              >
                <div class="provider-option">
                  <span>{{ provider.name }}</span>
                  <span class="provider-desc">{{ provider.description }}</span>
                </div>
              </el-option>
            </el-select>
            <div class="form-tip">选择语音识别服务提供商</div>
          </el-form-item>

          <!-- 阿里云配置 -->
          <template v-if="speechSettings.providerType === 'aliyun'">
            <el-divider content-position="left">阿里云配置</el-divider>
            <el-alert 
              type="info" 
              :closable="false"
              style="margin-bottom: 16px"
            >
              <template #title>
                <span>配置信息仅保存在浏览器本地，不会上传到服务器</span>
              </template>
              <div style="margin-top: 8px; font-size: 12px;">
                获取方式：登录<a href="https://nls-portal.console.aliyun.com/" target="_blank" style="color: #409eff;">阿里云智能语音交互控制台</a>
                → 创建项目获取 AppKey → 点击"获取Token"获取临时Token（有效期24小时）
              </div>
            </el-alert>
            <el-form-item label="AppKey" required>
              <el-input 
                v-model="speechSettings.aliyunConfig.appKey" 
                placeholder="从阿里云智能语音交互控制台获取"
                style="width: 300px"
              />
              <div class="form-tip">在智能语音交互控制台创建项目后获取</div>
            </el-form-item>
            <el-form-item label="Token" required>
              <el-input 
                v-model="speechSettings.aliyunConfig.token" 
                type="password"
                show-password
                placeholder="从阿里云控制台获取，有效期24小时"
                style="width: 300px"
              />
              <div class="form-tip">Token 有效期为24小时，过期后需要重新获取</div>
            </el-form-item>
            <el-form-item label="服务地址">
              <el-input 
                v-model="speechSettings.aliyunConfig.url" 
                placeholder="可选，默认使用阿里云上海节点"
                style="width: 300px"
              />
              <div class="form-tip">默认: wss://nls-gateway-cn-shanghai.aliyuncs.com/ws/v1</div>
            </el-form-item>
          </template>

          <el-form-item>
            <el-button type="primary" @click="saveSpeechSettings" :loading="savingSpeechSettings">
              保存设置
            </el-button>
            <el-button @click="testSpeechRecognition" :loading="testingSpeech">
              测试语音识别
            </el-button>
          </el-form-item>
        </el-form>
      </el-card>

      <!-- 数据管理 -->
      <el-card class="settings-card" shadow="hover">
        <template #header>
          <span class="card-title">数据管理</span>
        </template>
        <div class="data-actions">
          <div class="action-item">
            <div class="action-info">
              <h4>导出数据</h4>
              <p>导出所有本地设置数据</p>
            </div>
            <el-button type="primary" @click="exportData">导出</el-button>
          </div>
          <div class="action-item">
            <div class="action-info">
              <h4>导入数据</h4>
              <p>从文件导入配置数据</p>
            </div>
            <el-button @click="importData">导入</el-button>
          </div>
          <div class="action-item danger">
            <div class="action-info">
              <h4>清除缓存</h4>
              <p>清除本地缓存的数据和设置</p>
            </div>
            <el-button type="danger" @click="clearCache">清除</el-button>
          </div>
        </div>
      </el-card>

      <!-- 关于 -->
      <el-card class="settings-card" shadow="hover">
        <template #header>
          <span class="card-title">关于系统</span>
        </template>
        <div class="about-info">
          <div class="info-row">
            <span class="label">系统名称:</span>
            <span class="value">HRM2 招聘管理系统</span>
          </div>
          <div class="info-row">
            <span class="label">版本号:</span>
            <span class="value">v2.0.0</span>
          </div>
          <div class="info-row">
            <span class="label">技术栈:</span>
            <span class="value">Vue 3 + TypeScript + Element Plus</span>
          </div>
          <div class="info-row">
            <span class="label">后端:</span>
            <span class="value">FastAPI + SQLAlchemy</span>
          </div>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { client } from '@/api/client.gen'
import { 
  getAvailableProviders, 
  getSpeechProviderRegistry 
} from '@/services/speech'
import { 
  getSpeechSettings, 
  saveSpeechSettings as saveSpeechSettingsToStorage,
  type SpeechSettings,
  type SpeechProviderType
} from '@/composables/useSpeechRecognition'

// 测试连接状态
const testingConnection = ref(false)

// API 设置
const apiSettings = reactive({
  baseUrl: 'http://localhost:8000',
  timeout: 30000
})

// 系统设置
const systemSettings = reactive({
  autoRefresh: true,
  refreshInterval: 5,
  notifications: true,
  language: 'zh-CN'
})

// 语音识别设置
const availableProviders = getAvailableProviders()
const savingSpeechSettings = ref(false)
const testingSpeech = ref(false)

const speechSettings = reactive({
  providerType: 'browser' as SpeechProviderType,
  currentProvider: 'browser',
  currentProviderName: '浏览器原生',
  aliyunConfig: {
    appKey: '',
    token: '',
    url: ''
  }
})

// 初始化语音识别设置
const initSpeechSettings = () => {
  const saved = getSpeechSettings()
  speechSettings.providerType = saved.providerType
  speechSettings.currentProvider = saved.providerType
  
  const provider = availableProviders.find(p => p.type === saved.providerType)
  speechSettings.currentProviderName = provider?.name || '浏览器原生'
  
  if (saved.providerConfig) {
    if (saved.providerType === 'aliyun') {
      speechSettings.aliyunConfig = {
        appKey: (saved.providerConfig.appKey as string) || '',
        token: (saved.providerConfig.token as string) || '',
        url: (saved.providerConfig.url as string) || ''
      }
    }
  }
}

// Provider 类型变更处理
const onProviderTypeChange = (type: SpeechProviderType) => {
  speechSettings.providerType = type
}

// 保存语音识别设置
const saveSpeechSettings = async () => {
  savingSpeechSettings.value = true
  try {
    const settings: SpeechSettings = {
      providerType: speechSettings.providerType,
      providerConfig: {}
    }
    
    if (speechSettings.providerType === 'aliyun') {
      if (!speechSettings.aliyunConfig.appKey || !speechSettings.aliyunConfig.token) {
        ElMessage.warning('请填写完整的阿里云配置信息（AppKey 和 Token）')
        return
      }
      settings.providerConfig = {
        appKey: speechSettings.aliyunConfig.appKey,
        token: speechSettings.aliyunConfig.token,
        url: speechSettings.aliyunConfig.url || undefined
      }
    }
    
    saveSpeechSettingsToStorage(settings)
    
    speechSettings.currentProvider = speechSettings.providerType
    const provider = availableProviders.find(p => p.type === speechSettings.providerType)
    speechSettings.currentProviderName = provider?.name || '浏览器原生'
    
    ElMessage.success('语音识别设置已保存')
  } catch (err) {
    ElMessage.error('保存语音识别设置失败')
    console.error(err)
  } finally {
    savingSpeechSettings.value = false
  }
}

// 测试语音识别
const testSpeechRecognition = async () => {
  testingSpeech.value = true
  try {
    // 先保存当前设置
    await saveSpeechSettings()
    
    // 检查麦克风权限
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch (err) {
      ElMessage.error('无法访问麦克风，请确保已授予权限')
      return
    }
    
    // 创建临时 Provider 进行测试
    const registry = getSpeechProviderRegistry()
    const config = {
      type: speechSettings.providerType,
      ...speechSettings.aliyunConfig
    }
    const provider = registry.createProvider(config as any)
    
    if (!provider.checkSupport()) {
      ElMessage.error(`当前 Provider (${provider.name}) 不受支持`)
      return
    }
    
    ElMessage.success(`${provider.name} 可用，麦克风权限正常`)
  } catch (err) {
    ElMessage.error('测试语音识别失败')
    console.error(err)
  } finally {
    testingSpeech.value = false
  }
}

// 保存 API 配置
const saveApiSettings = () => {
  localStorage.setItem('apiSettings', JSON.stringify(apiSettings))
  // 更新 client 配置
  client.setConfig({ baseUrl: apiSettings.baseUrl })
  ElMessage.success('API 配置已保存（已生效）')
}

// 测试连接
const testConnection = async () => {
  testingConnection.value = true
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)
    
    const response = await fetch(`${apiSettings.baseUrl}/health`, {
      method: 'GET',
      signal: controller.signal
    })
    
    clearTimeout(timeoutId)
    
    if (response.ok) {
      const data = await response.json()
      ElMessage.success(`连接成功: ${data.message || 'OK'}`)
    } else {
      ElMessage.error(`连接失败: ${response.status}`)
    }
  } catch (err: any) {
    if (err.name === 'AbortError') {
      ElMessage.error('连接超时，请检查后端服务是否启动')
    } else {
      ElMessage.error('连接失败，请检查后端服务是否启动')
    }
  } finally {
    testingConnection.value = false
  }
}

// 保存系统设置
const saveSystemSettings = () => {
  localStorage.setItem('systemSettings', JSON.stringify(systemSettings))
  ElMessage.success('系统设置已保存')
}

// 导出数据
const exportData = () => {
  const data = {
    apiSettings,
    systemSettings,
    exportTime: new Date().toISOString()
  }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `hrm2_settings_${Date.now()}.json`
  a.click()
  URL.revokeObjectURL(url)
  ElMessage.success('数据已导出')
}

// 导入数据
const importData = () => {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.json'
  input.onchange = async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      const data = JSON.parse(text)
      if (data.apiSettings) {
        Object.assign(apiSettings, data.apiSettings)
        client.setConfig({ baseUrl: apiSettings.baseUrl })
      }
      if (data.systemSettings) Object.assign(systemSettings, data.systemSettings)
      ElMessage.success('数据已导入')
    } catch {
      ElMessage.error('导入失败，文件格式错误')
    }
  }
  input.click()
}

// 清除缓存
const clearCache = () => {
  ElMessageBox.confirm('确定要清除所有本地缓存吗？此操作不可恢复。', '确认清除', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    localStorage.clear()
    ElMessage.success('缓存已清除')
  }).catch(() => {})
}

// 初始化：读取本地存储的设置
const initSettings = () => {
  const savedApiSettings = localStorage.getItem('apiSettings')
  const savedSystemSettings = localStorage.getItem('systemSettings')
  
  if (savedApiSettings) {
    try {
      Object.assign(apiSettings, JSON.parse(savedApiSettings))
      client.setConfig({ baseUrl: apiSettings.baseUrl })
    } catch {}
  }
  
  if (savedSystemSettings) {
    try {
      Object.assign(systemSettings, JSON.parse(savedSystemSettings))
    } catch {}
  }
  
  // 初始化语音识别设置
  initSpeechSettings()
}

initSettings()
</script>

<style scoped lang="scss">
.settings-view {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.page-header {
  .page-title {
    margin: 0 0 8px 0;
    font-size: 24px;
    font-weight: 600;
    color: #303133;
  }

  .page-desc {
    margin: 0;
    font-size: 14px;
    color: #909399;
  }
}

.settings-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-width: 800px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.form-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

.unit-text {
  margin-left: 12px;
  color: #909399;
  font-size: 14px;
}

.switch-label {
  margin-left: 12px;
  font-size: 14px;
  color: #606266;
}

// 数据管理
.data-actions {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.action-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: #fafafa;
  border-radius: 8px;

  &.danger {
    background: #fef0f0;
  }

  .action-info {
    h4 {
      margin: 0 0 4px 0;
      font-size: 14px;
      color: #303133;
    }

    p {
      margin: 0;
      font-size: 12px;
      color: #909399;
    }
  }
}

// 关于信息
.about-info {
  .info-row {
    display: flex;
    margin-bottom: 12px;

    &:last-child {
      margin-bottom: 0;
    }

    .label {
      width: 80px;
      color: #909399;
      font-size: 14px;
    }

    .value {
      color: #303133;
      font-size: 14px;
    }
  }
}

// 语音识别 Provider 选项
.provider-option {
  display: flex;
  flex-direction: column;
  padding: 4px 0;

  .provider-desc {
    font-size: 12px;
    color: #909399;
    margin-top: 2px;
  }
}
</style>
