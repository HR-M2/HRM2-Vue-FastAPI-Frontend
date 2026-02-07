<template>
  <div class="setup-area">
    <div class="setup-header">
      <div class="icon-wrapper simulation">
        <el-icon class="sim-icon"><Monitor /></el-icon>
      </div>
      <h3>AI 模拟面试演示</h3>
      <p class="desc">选择候选人简历，AI将根据简历内容和行为特征模拟候选人回答</p>
    </div>
    
    <!-- 准备步骤 -->
    <div class="prep-steps">
      <div class="step" :class="{ 'completed': step1Done }">
        <div class="step-icon">
          <el-icon v-if="step1Done"><Check /></el-icon>
          <span v-else>1</span>
        </div>
        <div class="step-content">
          <h5>选择行为特征</h5>
          <p v-if="!selectedType">选择AI模拟的候选人行为风格</p>
          <p v-else class="success">
            已选择: {{ candidatePresets[selectedType]?.name }}
          </p>
        </div>
      </div>
    </div>
    
    <!-- 候选人类型选择网格 -->
    <div class="candidate-grid">
      <div
        v-for="(profile, key) in candidatePresets"
        :key="key"
        class="candidate-card"
        :class="{ 'selected': selectedType === key }"
        @click="selectCandidate(key)"
      >
        <div class="card-avatar" :class="`avatar-${key}`">
          <span>{{ getAvatarEmoji(key) }}</span>
        </div>
        <div class="card-content">
          <h4>{{ profile.name }}</h4>
          <p class="card-desc">{{ getCandidateDescription(key) }}</p>
          <div class="skill-tags">
            <span 
              v-for="trait in getPersonalityTags(key as string)" 
              :key="trait"
              class="skill-tag"
            >
              {{ trait }}
            </span>
          </div>
          <div class="personality-bar">
            <span class="bar-label">综合能力</span>
            <div class="bar-track">
              <div class="bar-fill" :style="{ width: getAvgSkill(profile) + '%' }"></div>
            </div>
            <span class="bar-value">{{ getAvgSkill(profile) }}%</span>
          </div>
        </div>
        <div class="card-check" v-if="selectedType === key">
          <el-icon><Check /></el-icon>
        </div>
      </div>
    </div>
    
    <!-- 候选人特征说明 -->
    <transition name="fade">
      <div v-if="selectedType" class="candidate-traits">
        <div class="traits-header">
          <el-icon><InfoFilled /></el-icon>
          <span>{{ candidatePresets[selectedType]?.name }} 特征说明</span>
        </div>
        <div class="traits-content">
          <div class="trait-item" v-for="trait in getCandidateTraits(selectedType)" :key="trait.label">
            <span class="trait-icon">{{ trait.icon }}</span>
            <div class="trait-info">
              <span class="trait-label">{{ trait.label }}</span>
              <span class="trait-desc">{{ trait.desc }}</span>
            </div>
          </div>
        </div>
      </div>
    </transition>
    
    <!-- 继续准备步骤 -->
    <div class="prep-steps">
      <div class="step" :class="{ 'completed': step2Done }">
        <div class="step-icon">
          <el-icon v-if="step2Done"><Check /></el-icon>
          <span v-else>2</span>
        </div>
        <div class="step-content">
          <h5>检查麦克风</h5>
          <p v-if="!step2Done">确保您的麦克风正常工作（用于语音输入）</p>
          <p v-else class="success">麦克风已就绪</p>
        </div>
        <el-button 
          v-if="!step2Done" 
          size="small" 
          type="primary"
          @click="checkMicrophone"
          :loading="checkingMic"
        >
          检测
        </el-button>
      </div>
      
      <div class="step" :class="{ 'completed': step3Done, 'expanded': showCandidateSelector }">
        <div class="step-icon">
          <el-icon v-if="step3Done"><Check /></el-icon>
          <span v-else>3</span>
        </div>
        <div class="step-content">
          <h5>选择候选人</h5>
          <p v-if="!selectedCandidateInfo">从简历库中选择要模拟的候选人</p>
          <p v-else class="success">
            已选择: {{ selectedCandidateInfo.name }}
            <span v-if="selectedCandidateInfo.position"> - {{ selectedCandidateInfo.position }}</span>
          </p>
        </div>
        <el-button 
          v-if="!step3Done" 
          size="small"
          type="primary"
          @click="showCandidateSelector = !showCandidateSelector"
        >
          {{ showCandidateSelector ? '收起' : '选择' }}
        </el-button>
      </div>
      
      <!-- 候选人选择面板 -->
      <transition name="expand">
        <div v-if="showCandidateSelector && !step3Done" class="candidate-selector-panel">
          <div class="selector-header">
            <el-icon><User /></el-icon>
            <span>从简历库选择候选人</span>
          </div>
          <div class="selector-body">
            <div class="select-group">
              <label>选择岗位</label>
              <el-select
                v-model="selectedPositionId"
                placeholder="请选择岗位"
                clearable
                @change="handlePositionChange"
              >
                <el-option
                  v-for="pos in positions"
                  :key="pos.id"
                  :label="`${pos.title} (${pos.application_count || 0}人)`"
                  :value="pos.id"
                />
              </el-select>
            </div>
            <div class="select-group" v-if="currentApplications.length > 0">
              <label>选择候选人</label>
              <el-select
                v-model="selectedApplicationId"
                placeholder="请选择候选人"
                clearable
              >
                <el-option
                  v-for="app in currentApplications"
                  :key="app.id"
                  :label="app.candidate_name || '未知候选人'"
                  :value="app.id"
                />
              </el-select>
            </div>
            <div v-else-if="selectedPositionId && !loadingApplications" class="no-candidates">
              <el-icon><Warning /></el-icon>
              <span>该岗位暂无候选人</span>
            </div>
            <div v-if="loadingApplications" class="loading-hint">
              <el-icon class="is-loading"><Loading /></el-icon>
              <span>加载中...</span>
            </div>
            <div class="selector-actions">
              <el-button 
                type="primary" 
                :disabled="!selectedApplicationId"
                @click="confirmCandidateSelection"
              >
                确认选择
              </el-button>
            </div>
          </div>
        </div>
      </transition>
    </div>
    
    <!-- 开始按钮 -->
    <div class="action-area">
      <el-button
        type="primary"
        size="large"
        :disabled="!canStart"
        @click="handleStart"
        class="start-btn"
      >
        <el-icon class="mr-2"><VideoPlay /></el-icon>
        开始模拟面试
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { Monitor, VideoPlay, Check, InfoFilled, User, Warning, Loading } from '@element-plus/icons-vue'
import { candidatePresets, type CandidateProfile } from '../composables/useInterviewAssist'
import { getPositions, getApplications } from '@/api/sdk.gen'
import type { PositionListResponse, ApplicationResponse } from '@/api/types.gen'

const emit = defineEmits<{
  start: [candidateType: string, candidateInfo: { name: string; position: string; applicationId: string } | null]
}>()

// 准备步骤状态
const step1Done = ref(false)
const step2Done = ref(false)
const step3Done = ref(false)
const checkingMic = ref(false)
const selectedType = ref<string>('')

// 候选人选择状态
const showCandidateSelector = ref(false)
const positions = ref<PositionListResponse[]>([])
const selectedPositionId = ref<string | null>(null)
const selectedApplicationId = ref<string | null>(null)
const selectedCandidateInfo = ref<{ name: string; position: string; applicationId: string } | null>(null)
const currentApplications = ref<ApplicationResponse[]>([])
const loadingApplications = ref(false)

// 计算是否可以开始
const canStart = computed(() => step1Done.value && step2Done.value && step3Done.value)

// 监听行为类型选择
watch(selectedType, (val) => {
  step1Done.value = !!val
})

// 加载岗位列表
const loadPositions = async () => {
  try {
    const result = await getPositions({ query: { page_size: 100 } })
    if (result.data?.data?.items) {
      positions.value = result.data.data.items
    }
  } catch (err) {
    console.error('加载岗位列表失败:', err)
  }
}

// 岗位变更处理
const handlePositionChange = async () => {
  selectedApplicationId.value = null
  currentApplications.value = []
  
  if (!selectedPositionId.value) return
  
  loadingApplications.value = true
  try {
    const result = await getApplications({ 
      query: { 
        position_id: selectedPositionId.value,
        page_size: 100 
      } 
    })
    if (result.data?.data?.items) {
      currentApplications.value = result.data.data.items as ApplicationResponse[]
    }
  } catch (err) {
    console.error('加载应聘申请失败:', err)
  } finally {
    loadingApplications.value = false
  }
}

// 确认选择候选人
const confirmCandidateSelection = () => {
  const app = currentApplications.value.find((a: ApplicationResponse) => a.id === selectedApplicationId.value)
  if (app) {
    selectedCandidateInfo.value = {
      name: app.candidate_name || '未知候选人',
      position: app.position_title || '',
      applicationId: app.id
    }
    showCandidateSelector.value = false
    step3Done.value = true
  }
}

// 检查麦克风
const checkMicrophone = async () => {
  checkingMic.value = true
  try {
    await new Promise(resolve => setTimeout(resolve, 1500))
    step2Done.value = true
  } catch {
    // 处理错误
  } finally {
    checkingMic.value = false
  }
}

// 选择行为类型
const selectCandidate = (type: string) => {
  selectedType.value = type
}

// 组件挂载时加载岗位
onMounted(() => {
  loadPositions()
})

// 开始面试
const handleStart = () => {
  if (selectedType.value) {
    emit('start', selectedType.value, selectedCandidateInfo.value)
  }
}

// 获取头像 emoji
const getAvatarEmoji = (type: string) => {
  const emojis: Record<string, string> = {
    ideal: '⭐',
    junior: '👶',
    nervous: '😰',
    overconfident: '😎'
  }
  return emojis[type] || '👤'
}

// 获取平均技能分数
const getAvgSkill = (profile: CandidateProfile) => {
  const skills = Object.values(profile.skills)
  return Math.round(skills.reduce((a, b) => a + b, 0) / skills.length * 10)
}

// 获取候选人描述
const getCandidateDescription = (type: string): string => {
  const descriptions: Record<string, string> = {
    ideal: '经验丰富、表达清晰、技术扎实的优秀候选人',
    junior: '缺乏经验、知识储备有限的初级求职者',
    nervous: '能力尚可但面试时容易紧张、表达不畅',
    overconfident: '喜欢夸大能力、可能不懂装懂的候选人'
  }
  return descriptions[type] || ''
}

// 获取性格特质标签
const getPersonalityTags = (type: string): string[] => {
  const tags: Record<string, string[]> = {
    ideal: ['自信沉稳', '逻辑清晰', '善于表达'],
    junior: ['谦虚好学', '态度诚恳', '潜力型'],
    nervous: ['内向敏感', '容易紧张', '实力隐藏'],
    overconfident: ['过度自信', '夸夸其谈', '需要验证']
  }
  return tags[type] || []
}

// 获取候选人特征列表
const getCandidateTraits = (type: string) => {
  const traits: Record<string, Array<{ icon: string; label: string; desc: string }>> = {
    ideal: [
      { icon: '💡', label: '回答特点', desc: '结构清晰、有具体案例支撑、数据详实' },
      { icon: '🎯', label: '技术深度', desc: '能深入解释原理，有自己的技术见解' },
      { icon: '🤝', label: '沟通能力', desc: '表达流畅、逻辑性强、善于总结' }
    ],
    junior: [
      { icon: '📚', label: '回答特点', desc: '回答较简短，缺乏实际项目经验' },
      { icon: '❓', label: '知识盲区', desc: '对进阶概念不熟悉，可能坦诚说不知道' },
      { icon: '🌱', label: '学习态度', desc: '态度谦虚、愿意学习、有成长潜力' }
    ],
    nervous: [
      { icon: '😓', label: '回答特点', desc: '说话可能结巴、用词重复、容易遗漏要点' },
      { icon: '⏱️', label: '时间表现', desc: '可能需要更多时间组织语言' },
      { icon: '💪', label: '实际能力', desc: '实际能力可能比表现出来的要好' }
    ],
    overconfident: [
      { icon: '🎭', label: '回答特点', desc: '回答自信但可能缺乏深度和具体细节' },
      { icon: '⚠️', label: '识别要点', desc: '注意追问细节，验证其真实能力水平' },
      { icon: '🔍', label: '面试建议', desc: '多问具体实现和技术细节以辨别真伪' }
    ]
  }
  return traits[type] || []
}
</script>

<style scoped lang="scss">
.setup-area {
  padding: 40px;
  display: flex;
  flex-direction: column;
  align-items: center;
  max-width: 1000px;
  margin: 0 auto;
  
  .setup-header {
    text-align: center;
    margin-bottom: 32px;
    
    .icon-wrapper {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 20px;
      
      &.simulation {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        animation: pulse-purple 2s infinite;
      }
      
      .sim-icon {
        font-size: 40px;
        color: white;
      }
    }
    
    h3 {
      font-size: 28px;
      font-weight: 700;
      color: #1a1a2e;
      margin: 0 0 12px;
    }
    
    .desc {
      font-size: 16px;
      color: #6b7280;
      margin: 0;
    }
  }
}

@keyframes pulse-purple {
  0%, 100% { box-shadow: 0 0 0 0 rgba(102, 126, 234, 0.4); }
  50% { box-shadow: 0 0 0 15px rgba(102, 126, 234, 0); }
}

.prep-steps {
  width: 100%;
  margin-bottom: 32px;
  
  .step {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 20px;
    background: white;
    border-radius: 12px;
    margin-bottom: 12px;
    border: 2px solid #e5e7eb;
    transition: all 0.3s;
    
    &.completed {
      border-color: #10b981;
      background: #f0fdf4;
    }
    
    &.expanded {
      border-color: #667eea;
    }
    
    .step-icon {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: #e5e7eb;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      color: #6b7280;
      flex-shrink: 0;
      
      .completed & {
        background: #10b981;
        color: white;
      }
    }
    
    .step-content {
      flex: 1;
      
      h5 {
        font-size: 15px;
        font-weight: 600;
        color: #1a1a2e;
        margin: 0 0 4px;
      }
      
      p {
        font-size: 13px;
        color: #9ca3af;
        margin: 0;
        
        &.success { color: #10b981; }
      }
    }
  }
}

.candidate-selector-panel {
  background: white;
  border-radius: 12px;
  border: 2px solid #667eea;
  margin-bottom: 12px;
  overflow: hidden;
  
  .selector-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 14px 20px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    font-weight: 500;
    
    .el-icon {
      font-size: 18px;
    }
  }
  
  .selector-body {
    padding: 20px;
    
    .select-group {
      margin-bottom: 16px;
      
      label {
        display: block;
        font-size: 13px;
        font-weight: 500;
        color: #374151;
        margin-bottom: 8px;
      }
      
      .el-select {
        width: 100%;
      }
    }
    
    .no-candidates, .loading-hint {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 24px;
      background: #fef3c7;
      border-radius: 8px;
      color: #92400e;
      font-size: 14px;
      margin-bottom: 16px;
    }
    
    .loading-hint {
      background: #f3f4f6;
      color: #6b7280;
    }
    
    .selector-actions {
      display: flex;
      justify-content: flex-end;
      padding-top: 8px;
      border-top: 1px solid #e5e7eb;
    }
  }
}

.expand-enter-active,
.expand-leave-active {
  transition: all 0.3s ease;
  overflow: hidden;
}

.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  max-height: 0;
  margin-bottom: 0;
  transform: translateY(-10px);
}

.expand-enter-to,
.expand-leave-from {
  opacity: 1;
  max-height: 400px;
}

.candidate-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
  width: 100%;
  margin-bottom: 24px;
}

.candidate-card {
  background: white;
  border-radius: 16px;
  padding: 24px;
  cursor: pointer;
  border: 2px solid transparent;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(90deg, #667eea, #764ba2);
    opacity: 0;
    transition: opacity 0.3s;
  }
  
  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 40px rgba(102, 126, 234, 0.15);
    
    &::before {
      opacity: 1;
    }
  }
  
  &.selected {
    border-color: #667eea;
    
    &::before {
      opacity: 1;
    }
  }
  
  .card-avatar {
    width: 56px;
    height: 56px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 28px;
    margin-bottom: 16px;
    
    &.avatar-ideal { background: linear-gradient(135deg, #fbbf24, #f59e0b); }
    &.avatar-junior { background: linear-gradient(135deg, #6ee7b7, #10b981); }
    &.avatar-nervous { background: linear-gradient(135deg, #fca5a5, #ef4444); }
    &.avatar-overconfident { background: linear-gradient(135deg, #93c5fd, #3b82f6); }
  }
  
  .card-content {
    h4 {
      font-size: 18px;
      font-weight: 600;
      color: #1a1a2e;
      margin: 0 0 8px;
    }
    
    .card-desc {
      font-size: 13px;
      color: #6b7280;
      margin: 0 0 12px;
      line-height: 1.5;
    }
    
    .skill-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 16px;
      
      .skill-tag {
        background: #f3f4f6;
        color: #4b5563;
        padding: 4px 10px;
        border-radius: 20px;
        font-size: 12px;
      }
    }
    
    .personality-bar {
      display: flex;
      align-items: center;
      gap: 10px;
      
      .bar-label {
        font-size: 12px;
        color: #9ca3af;
        white-space: nowrap;
      }
      
      .bar-track {
        flex: 1;
        height: 6px;
        background: #e5e7eb;
        border-radius: 3px;
        overflow: hidden;
        
        .bar-fill {
          height: 100%;
          background: linear-gradient(90deg, #667eea, #764ba2);
          border-radius: 3px;
          transition: width 0.5s ease;
        }
      }
      
      .bar-value {
        font-size: 12px;
        font-weight: 600;
        color: #667eea;
        min-width: 36px;
      }
    }
  }
  
  .card-check {
    position: absolute;
    top: 16px;
    right: 16px;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: #667eea;
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    animation: scaleIn 0.3s ease;
  }
}

@keyframes scaleIn {
  from { transform: scale(0); }
  to { transform: scale(1); }
}

.candidate-traits {
  width: 100%;
  background: white;
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 32px;
  border: 2px solid #e5e7eb;
  
  .traits-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 16px;
    font-weight: 600;
    color: #1a1a2e;
    
    .el-icon {
      color: #667eea;
    }
  }
  
  .traits-content {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
  }
  
  .trait-item {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 12px;
    background: #f8fafc;
    border-radius: 10px;
    
    .trait-icon {
      font-size: 24px;
      flex-shrink: 0;
    }
    
    .trait-info {
      .trait-label {
        display: block;
        font-size: 13px;
        font-weight: 600;
        color: #374151;
        margin-bottom: 4px;
      }
      
      .trait-desc {
        display: block;
        font-size: 12px;
        color: #6b7280;
        line-height: 1.5;
      }
    }
  }
}

.action-area {
  .start-btn {
    padding: 16px 48px;
    font-size: 18px;
    border-radius: 12px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border: none;
    
    &:hover:not(:disabled) {
      transform: scale(1.05);
    }
  }
}

.mr-2 {
  margin-right: 8px;
}

.fade-enter-active,
.fade-leave-active {
  transition: all 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

@media (max-width: 900px) {
  .candidate-grid {
    grid-template-columns: 1fr;
  }
  
  .candidate-traits .traits-content {
    grid-template-columns: 1fr;
  }
}
</style>
