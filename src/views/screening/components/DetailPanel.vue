<template>
  <div class="detail-panel">
    <!-- 候选列表 Tab：选中了候选人 -->
    <template v-if="activeTab === 'candidates' && selectedCandidate">
      <div class="panel-scroll">
        <div class="panel-header">
          <div class="panel-header-top">
            <div>
              <h3 class="candidate-name">{{ selectedCandidate.candidateName }}</h3>
              <div class="candidate-badges">
                <el-tag :type="getStatusType(selectedCandidate.screeningStatus)" size="small">
                  {{ getStatusText(selectedCandidate.screeningStatus) }}
                </el-tag>
              </div>
            </div>
            <el-button link @click="$emit('closeDetail')">
              <el-icon :size="18"><Close /></el-icon>
            </el-button>
          </div>
        </div>

        <!-- 已完成状态 -->
        <div v-if="selectedCandidate.screeningStatus === 'completed'">
          <div class="section">
            <div class="section-title">初筛评分</div>
            <div class="score-display">
              <span class="score-big" :style="{ color: getScoreColor(selectedCandidate.screeningScore || 0) }">
                {{ selectedCandidate.screeningScore }}
              </span>
              <span class="score-label">综合</span>
            </div>
            <div class="score-grid">
              <div class="score-item">
                <div class="si-val" style="color: #409eff">{{ selectedCandidate.technicalScore || '-' }}</div>
                <div class="si-label">技术</div>
              </div>
              <div class="score-item">
                <div class="si-val" style="color: #e6a23c">{{ selectedCandidate.projectScore || '-' }}</div>
                <div class="si-label">项目</div>
              </div>
              <div class="score-item">
                <div class="si-val" style="color: #67c23a">{{ selectedCandidate.careerScore || '-' }}</div>
                <div class="si-label">职业</div>
              </div>
            </div>
          </div>

          <div class="section actions">
            <el-button type="primary" @click="$emit('viewReport', selectedCandidate)">
              <el-icon><View /></el-icon>
              查看初筛报告
            </el-button>
            <el-button @click="$emit('downloadReport', selectedCandidate)">
              <el-icon><Download /></el-icon>
              下载报告
            </el-button>
            <el-button type="success" @click="$emit('goInterview', selectedCandidate)">
              <el-icon><ChatLineSquare /></el-icon>
              进入面试
            </el-button>
          </div>

          <!-- 可折叠的 AI 分析过程（仅当有思维链数据时显示） -->
          <div v-if="hasAgenticHistory" class="section agentic-history">
            <button class="history-header collapse-trigger" @click="toggleAgenticHistoryExpanded">
              <el-icon color="#409eff"><cpu-icon /></el-icon>
              <span class="history-title">AI 分析过程</span>
              <span class="history-summary">
                {{ selectedCandidate.agenticState.totalLoops || selectedCandidate.agenticState.nodes.length }} 轮 · 
                {{ selectedCandidate.agenticState.toolCallCount }} 次工具调用
              </span>
              <el-icon class="collapse-arrow" :class="{ expanded: isAgenticHistoryExpanded }">
                <ArrowDown />
              </el-icon>
            </button>
            <Transition name="history-expand">
              <div v-show="isAgenticHistoryExpanded" class="history-content">
                <div class="agentic-timeline-readonly">
                  <div
                    v-for="(node, nodeIdx) in selectedCandidate.agenticState.nodes"
                    :key="node.loop"
                    class="chain-node"
                  >
                    <div class="connector" :class="{ last: nodeIdx === selectedCandidate.agenticState.nodes.length - 1 }" />
                    <div class="dot-wrap">
                      <span class="dot dot-done">✓</span>
                    </div>
                    <div class="node-header">
                      <span class="loop-label">{{ getNodeHeaderText(node) }}</span>
                      <span class="loop-num">{{ node.loop }}/{{ selectedCandidate.agenticState.maxLoops }}</span>
                    </div>
                    <div v-if="node.tool_calls.length > 0" class="node-tools">
                      <div v-for="(tc, idx) in node.tool_calls" :key="idx" class="tool-item">
                        <button
                          class="tool-header collapse-trigger"
                          @click="toggleToolExpanded(node.loop, idx, isToolExpanded(node.loop, idx, tc.result, node.loop, 0))"
                        >
                          <span class="tool-icon">{{ getToolIcon(tc.tool) }}</span>
                          <span class="tool-name">{{ getToolLabel(tc.tool) }}</span>
                          <span class="tool-badge done">✓</span>
                          <el-icon class="collapse-arrow" :class="{ expanded: isToolExpanded(node.loop, idx, tc.result, node.loop, 0) }">
                            <ArrowDown />
                          </el-icon>
                        </button>
                        <div v-show="isToolExpanded(node.loop, idx, tc.result, node.loop, 0)" class="tool-body">
                          <p v-if="tc.args?.query" class="tool-query">🔎 {{ tc.args.query }}</p>
                          <p v-if="tc.args?.reason" class="tool-reason">{{ tc.args.reason }}</p>
                          <div v-if="tc.result" class="tool-result markdown-content" v-html="renderMarkdown(tc.result)" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div v-if="selectedCandidate.agenticState.finalReport" class="history-final">
                  <div class="final-label">
                    <el-icon color="#67c23a"><DocumentChecked /></el-icon>
                    <span>最终评估报告</span>
                  </div>
                  <div class="final-content markdown-content" v-html="renderMarkdown(selectedCandidate.agenticState.finalReport)" />
                </div>
              </div>
            </Transition>
          </div>
        </div>

        <!-- 处理中状态：链式调用过程可视化（还原实验性 webapp 效果） -->
        <div v-else-if="['running', 'pending'].includes(selectedCandidate.screeningStatus)" class="agentic-panel">
          <!-- 顶部进度条 -->
          <div class="agentic-header">
            <div class="header-title">
              <el-icon class="is-loading" color="#409eff"><Loading /></el-icon>
              <span>{{ selectedCandidate.screeningStatus === 'running' ? 'AI 分析中' : '等待处理' }}</span>
            </div>
            <div class="header-progress">
              <el-progress
                :percentage="selectedCandidate.screeningProgress || 0"
                :stroke-width="6"
                :show-text="false"
              />
              <span class="progress-text">{{ selectedCandidate.screeningProgress || 0 }}%</span>
            </div>
          </div>

          <!-- 链式调用时间线 -->
          <div ref="agenticTimelineRef" class="agentic-timeline" v-if="selectedCandidate.agenticState.nodes.length > 0">
            <TransitionGroup name="chain-slide">
              <div
                v-for="(node, nodeIdx) in selectedCandidate.agenticState.nodes"
                :key="node.loop"
                class="chain-node"
              >
                <!-- 竖线连接器 -->
                <div
                  class="connector"
                  :class="{
                    active: isNodeActive(node, selectedCandidate.agenticState),
                    last: nodeIdx === selectedCandidate.agenticState.nodes.length - 1
                  }"
                />
                
                <!-- 状态圆点 -->
                <div class="dot-wrap">
                  <template v-if="isNodeActive(node, selectedCandidate.agenticState)">
                    <span class="ping" />
                    <span class="dot dot-active" />
                  </template>
                  <template v-else-if="isNodeDone(node)">
                    <span class="dot dot-done">✓</span>
                  </template>
                  <template v-else>
                    <span class="dot dot-idle" />
                  </template>
                </div>

                <!-- 节点头部：思考内容作为标题 -->
                <div class="node-header">
                  <span class="loop-label" :class="{ active: isNodeActive(node, selectedCandidate.agenticState) }">
                    {{ getNodeHeaderText(node) }}
                  </span>
                  <span v-if="isNodeActive(node, selectedCandidate.agenticState)" class="spinner" />
                  <span class="loop-num">{{ node.loop }}/{{ selectedCandidate.agenticState.maxLoops }}</span>
                </div>

                <!-- 工具调用列表 -->
                <div v-if="node.tool_calls.length > 0" class="node-tools">
                  <div v-for="(tc, idx) in node.tool_calls" :key="idx" class="tool-item" :class="{ pending: !tc.result }">
                    <button
                      class="tool-header collapse-trigger"
                      @click="toggleToolExpanded(node.loop, idx, isToolExpanded(node.loop, idx, tc.result, node.loop, selectedCandidate.agenticState.currentLoop))"
                    >
                      <span class="tool-icon">{{ getToolIcon(tc.tool) }}</span>
                      <span class="tool-name">{{ getToolLabel(tc.tool) }}</span>
                      <span v-if="!tc.result" class="tool-badge pending">···</span>
                      <span v-else class="tool-badge done">✓</span>
                      <el-icon class="collapse-arrow" :class="{ expanded: isToolExpanded(node.loop, idx, tc.result, node.loop, selectedCandidate.agenticState.currentLoop) }">
                        <ArrowDown />
                      </el-icon>
                    </button>
                    <div
                      v-show="isToolExpanded(node.loop, idx, tc.result, node.loop, selectedCandidate.agenticState.currentLoop)"
                      class="tool-body"
                    >
                      <p v-if="tc.args?.query" class="tool-query">🔎 {{ tc.args.query }}</p>
                      <p v-if="tc.args?.reason" class="tool-reason">{{ tc.args.reason }}</p>
                      <div
                        v-if="tc.result"
                        class="tool-result markdown-content"
                        v-html="renderMarkdown(tc.result)"
                      />
                      <div v-else class="tool-pending">执行中...</div>
                    </div>
                  </div>
                </div>
              </div>
            </TransitionGroup>
          </div>

          <!-- 等待状态 -->
          <div v-else class="agentic-waiting">
            <el-icon :size="32" color="#c0c4cc"><Timer /></el-icon>
            <span>{{ selectedCandidate.currentSpeaker || '正在初始化...' }}</span>
          </div>

          <!-- 最终报告流式输出 -->
          <div v-if="selectedCandidate.agenticState.isFinalStreaming || selectedCandidate.agenticState.finalReport" class="agentic-final">
            <button class="final-header collapse-trigger" @click="toggleFinalExpanded">
              <el-icon color="#67c23a"><DocumentChecked /></el-icon>
              <span>最终评估报告</span>
              <el-icon v-if="selectedCandidate.agenticState.isFinalStreaming" class="is-loading" :size="14"><Loading /></el-icon>
              <el-icon class="collapse-arrow" :class="{ expanded: isFinalExpanded }">
                <ArrowDown />
              </el-icon>
            </button>
            <div v-show="isFinalExpanded" class="final-content markdown-content">
              <div
                v-if="selectedCandidate.agenticState.finalReport"
                v-html="renderMarkdown(selectedCandidate.agenticState.finalReport)"
              />
              <span v-if="selectedCandidate.agenticState.isFinalStreaming" class="typing-cursor">|</span>
            </div>
          </div>

          <!-- 底部统计 -->
          <div class="agentic-footer">
            <span>轮次: {{ selectedCandidate.agenticState.currentLoop }}/{{ selectedCandidate.agenticState.maxLoops }}</span>
            <span>工具调用: {{ selectedCandidate.agenticState.toolCallCount }}</span>
          </div>
        </div>

        <!-- 失败状态 -->
        <div v-else-if="selectedCandidate.screeningStatus === 'failed'" class="empty-panel">
          <el-icon :size="48" color="#f56c6c"><CircleCloseFilled /></el-icon>
          <div class="empty-title" style="color: #f56c6c">处理失败</div>
          <p v-if="selectedCandidate.errorMessage" class="error-msg">{{ selectedCandidate.errorMessage }}</p>
          <el-button type="warning" size="small" @click="$emit('retryScreening', selectedCandidate)">
            <el-icon><RefreshRight /></el-icon>
            重新初筛
          </el-button>
        </div>

        <!-- 未初筛状态 -->
        <div v-else class="empty-panel">
          <el-icon :size="48" color="#909399"><Clock /></el-icon>
          <div class="empty-title" style="color: #909399">等待初筛</div>
          <p class="empty-desc">使用"一键初筛"或单独对此候选人启动初筛</p>
          <el-button type="primary" size="small" @click="$emit('retryScreening', selectedCandidate)">
            <el-icon><VideoPlay /></el-icon>
            启动初筛
          </el-button>
        </div>
      </div>
    </template>

    <!-- 候选列表 Tab：未选中候选人 => 岗位概览 -->
    <template v-else-if="activeTab === 'candidates'">
      <div class="panel-scroll">
        <div class="panel-header">
          <h3 class="panel-title">岗位概览</h3>
          <p class="panel-desc">{{ positionTitle || '当前岗位' }} 的候选人情况</p>
        </div>

        <div class="section">
          <div class="section-title">状态统计</div>
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-value">{{ positionStats.total }}</div>
              <div class="stat-label">总候选人</div>
            </div>
            <div class="stat-card">
              <div class="stat-value" style="color: #67c23a">{{ positionStats.completed }}</div>
              <div class="stat-label">已初筛</div>
            </div>
            <div class="stat-card">
              <div class="stat-value" style="color: #409eff">{{ positionStats.processing }}</div>
              <div class="stat-label">处理中</div>
            </div>
            <div class="stat-card">
              <div class="stat-value" style="color: #e6a23c">{{ positionStats.unscreened }}</div>
              <div class="stat-label">待筛选</div>
            </div>
          </div>
        </div>

        <!-- 综合分数排名 -->
        <div v-if="topCandidates.length > 0" class="section">
          <div class="section-title">综合分数排名</div>
          <div class="ranking-list">
            <div
              v-for="(c, i) in topCandidates"
              :key="c.id"
              class="ranking-item"
              @click="$emit('selectCandidate', c)"
            >
              <span
                class="rank-num"
                :class="{ gold: i === 0, silver: i === 1, bronze: i === 2 }"
              >
                {{ i + 1 }}
              </span>
              <span class="rank-name">{{ c.candidateName }}</span>
              <el-tag :type="getScoreType(c.screeningScore || 0)" size="small">
                {{ c.screeningScore }}
              </el-tag>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="tip-box">
            <el-icon><InfoFilled /></el-icon>
            <span>拖拽候选人行到左侧岗位列表可以调整岗位分配</span>
          </div>
        </div>
      </div>
    </template>

    <!-- 智能匹配 Tab：临时匹配池 -->
    <template v-else-if="activeTab === 'matching'">
      <div class="panel-scroll">
        <div class="panel-header">
          <h3 class="panel-title">匹配结果池</h3>
          <p class="panel-desc">AI 匹配完成后，可在此调整结果</p>
        </div>

        <div v-if="matchResults.length > 0">
          <div class="section">
            <div class="section-title">
              已匹配 {{ matchedCount }}/{{ matchResults.length }}
            </div>
            <div class="match-result-list">
              <div v-for="result in matchResults" :key="result.resumeId" class="match-result-item">
                <div class="result-name">{{ result.candidateName }}</div>
                <div class="result-position">
                  <el-select
                    :model-value="result.matchedPositionId || ''"
                    size="small"
                    placeholder="选择岗位"
                    style="width: 100%"
                    @change="(val: string) => $emit('updateMatchPosition', result.resumeId, val)"
                  >
                    <el-option
                      v-for="pos in positions"
                      :key="pos.id"
                      :label="pos.title"
                      :value="pos.id"
                    />
                  </el-select>
                </div>
                <div v-if="result.error" class="result-error">
                  <el-tag type="danger" size="small">{{ result.error }}</el-tag>
                </div>
                <el-button type="danger" link size="small" @click="$emit('removeMatchResult', result.resumeId)">
                  <el-icon><Delete /></el-icon>
                </el-button>
              </div>
            </div>
          </div>

          <div class="section actions">
            <el-button
              type="primary"
              :loading="isConfirming"
              :disabled="matchedCount === 0"
              @click="$emit('confirmMatches')"
            >
              一键添加 ({{ matchedCount }})
            </el-button>
            <el-button @click="$emit('clearMatchResults')">清空</el-button>
          </div>
        </div>

        <div v-else class="empty-panel">
          <el-icon :size="48" color="#c0c4cc"><Box /></el-icon>
          <div class="empty-title" style="color: #909399">暂无匹配结果</div>
          <p class="empty-desc">在左侧上传简历并点击"一键智能匹配"后，匹配结果将显示在这里</p>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { nextTick, ref, computed, watch } from 'vue'
import {
  Close, View, Download, ChatLineSquare, Loading,
  CircleCloseFilled, Clock, RefreshRight, Delete, InfoFilled, VideoPlay,
  Timer, DocumentChecked, ArrowDown
} from '@element-plus/icons-vue'
import { useScreeningUtils } from '@/composables/useScreeningUtils'
import type { CandidateItem } from '../composables/useCandidateList'
import type { MatchResult } from '../composables/useSmartMatching'
import type { PositionData } from '@/types'

// Box 图标
const Box = { template: '<svg viewBox="0 0 1024 1024"><path d="M868 160H156c-17.7 0-32 14.3-32 32v96h776v-96c0-17.7-14.3-32-32-32zM124 832c0 17.7 14.3 32 32 32h712c17.7 0 32-14.3 32-32V352H124v480z" fill="currentColor"/></svg>' }

const props = defineProps<{
  activeTab: string
  selectedCandidate: CandidateItem | null
  positionTitle: string
  positionStats: { total: number; completed: number; processing: number; unscreened: number; failed: number }
  topCandidates: CandidateItem[]
  matchResults: MatchResult[]
  matchedCount: number
  isConfirming: boolean
  positions: PositionData[]
}>()

defineEmits<{
  closeDetail: []
  viewReport: [candidate: CandidateItem]
  downloadReport: [candidate: CandidateItem]
  goInterview: [candidate: CandidateItem]
  retryScreening: [candidate: CandidateItem]
  selectCandidate: [candidate: CandidateItem]
  updateMatchPosition: [resumeId: string, positionId: string]
  removeMatchResult: [resumeId: string]
  confirmMatches: []
  clearMatchResults: []
}>()

const { getStatusType, getStatusText, renderMarkdown } = useScreeningUtils()

const agenticTimelineRef = ref<HTMLElement | null>(null)
const toolExpandedMap = ref<Record<string, boolean>>({})
const isFinalExpanded = ref(true)
const isAgenticHistoryExpanded = ref(false)

const hasAgenticHistory = computed(() => {
  return (props.selectedCandidate?.agenticState?.nodes?.length ?? 0) > 0
})

const toggleAgenticHistoryExpanded = () => {
  isAgenticHistoryExpanded.value = !isAgenticHistoryExpanded.value
}

const cpuIcon = {
  template: '<svg viewBox="0 0 1024 1024"><path d="M512 128c-35.3 0-64 28.7-64 64v64h128v-64c0-35.3-28.7-64-64-64zm256 192V192c0-35.3-28.7-64-64-64h-64v128h128zm0 64H256v256h512V384zm0 320H256v128h64c35.3 0 64 28.7 64 64v64h256v-64c0-35.3 28.7-64 64-64h64V704zm64-64v128c0 35.3-28.7 64-64 64v64c0 35.3-28.7 64-64 64H384c-35.3 0-64-28.7-64-64v-64c-35.3 0-64-28.7-64-64V640h-64c-35.3 0-64-28.7-64-64V448c0-35.3 28.7-64 64-64h64V256c0-35.3 28.7-64 64-64V128c0-35.3 28.7-64 64-64h256c35.3 0 64 28.7 64 64v64c35.3 0 64 28.7 64 64v128h64c35.3 0 64 28.7 64 64v128c0 35.3-28.7 64-64 64h-64zM192 384h64v256h-64V384zm576 0h64v256h-64V384z" fill="currentColor"/></svg>'
}

const getScoreColor = (score: number) => {
  if (score >= 85) return '#67c23a'
  if (score >= 70) return '#e6a23c'
  return '#f56c6c'
}

const getScoreType = (score: number) => {
  if (score >= 85) return 'success'
  if (score >= 70) return 'warning'
  return 'danger'
}

// 工具图标映射
const getToolIcon = (tool: string): string => {
  const icons: Record<string, string> = {
    check_basic_qualifications: '📋',
    evaluate_technical_fit: '💻',
    evaluate_project_depth: '📊',
    evaluate_career_trajectory: '📈',
    identify_red_flags: '🚩',
    estimate_salary_match: '💰',
    web_search: '🔍'
  }
  return icons[tool] || '🔧'
}

// 工具标签映射
const getToolLabel = (tool: string): string => {
  const labels: Record<string, string> = {
    check_basic_qualifications: '基础条件核查',
    evaluate_technical_fit: '技术能力评估',
    evaluate_project_depth: '项目经验分析',
    evaluate_career_trajectory: '职业轨迹分析',
    identify_red_flags: '红旗识别',
    estimate_salary_match: '薪资匹配评估',
    web_search: '网络搜索'
  }
  return labels[tool] || tool
}

const getToolKey = (loop: number, idx: number): string => `${loop}-${idx}`

const toggleToolExpanded = (loop: number, idx: number, currentExpanded: boolean) => {
  const key = getToolKey(loop, idx)
  toolExpandedMap.value[key] = !currentExpanded
}

const isToolExpanded = (
  loop: number,
  idx: number,
  result: string | null,
  nodeLoop: number,
  currentLoop: number
): boolean => {
  const key = getToolKey(loop, idx)
  if (toolExpandedMap.value[key] !== undefined) {
    return toolExpandedMap.value[key]
  }
  if (!result) return true
  return nodeLoop === currentLoop
}

const toggleFinalExpanded = () => {
  isFinalExpanded.value = !isFinalExpanded.value
}

// 判断节点是否处于活跃状态
const isNodeActive = (node: { loop: number; is_thinking: boolean }, agenticState: { currentLoop: number }): boolean => {
  return node.is_thinking || node.loop === agenticState.currentLoop
}

// 判断节点是否已完成
const isNodeDone = (node: { is_thinking: boolean; tool_calls: Array<{ result: string | null }> }): boolean => {
  return !node.is_thinking && node.tool_calls.length > 0 && node.tool_calls.every(tc => tc.result !== null)
}

// 获取节点标题文本（思考内容或默认标题）
const getNodeHeaderText = (node: { loop: number; think_text: string; is_thinking: boolean }): string => {
  const text = node.think_text || ''
  if (!text && node.is_thinking) return '正在思考...'
  if (!text) return `第 ${node.loop} 轮决策`
  return text.trim()
}

watch(
  () => props.selectedCandidate?.id,
  () => {
    toolExpandedMap.value = {}
    isFinalExpanded.value = true
    isAgenticHistoryExpanded.value = false
  },
  { immediate: true }
)

watch(
  () => props.selectedCandidate?.agenticState.isFinalStreaming,
  (isStreaming) => {
    if (isStreaming) {
      isFinalExpanded.value = true
    }
  }
)

watch(
  () => [
    props.selectedCandidate?.agenticState.nodes.length ?? 0,
    props.selectedCandidate?.agenticState.finalReport.length ?? 0,
    props.selectedCandidate?.agenticState.currentLoop ?? 0
  ],
  async () => {
    await nextTick()
    if (agenticTimelineRef.value) {
      agenticTimelineRef.value.scrollTop = agenticTimelineRef.value.scrollHeight
    }
  }
)
</script>

<style scoped lang="scss">
.detail-panel {
  height: 100%;
  background: #fff;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.panel-scroll {
  flex: 1;
  overflow-y: auto;
}

.panel-header {
  padding: 16px;
  border-bottom: 1px solid #ebeef5;

  .panel-header-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }

  .candidate-name {
    margin: 0 0 6px;
    font-size: 16px;
    font-weight: 600;
    color: #303133;
  }

  .candidate-badges {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .panel-title {
    margin: 0 0 4px;
    font-size: 15px;
    font-weight: 600;
    color: #303133;
  }

  .panel-desc {
    margin: 0;
    font-size: 12px;
    color: #909399;
  }
}

.section {
  padding: 16px;
  border-bottom: 1px solid #ebeef5;

  &.actions {
    display: flex;
    flex-direction: column;
    gap: 8px;
    border-bottom: none;

    :deep(.el-button) {
      width: 100%;
      margin-left: 0;
    }
  }

  .section-title {
    font-size: 12px;
    font-weight: 600;
    color: #909399;
    margin-bottom: 12px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
}

.score-display {
  text-align: center;
  margin-bottom: 12px;

  .score-big {
    font-size: 36px;
    font-weight: 700;
  }

  .score-label {
    font-size: 13px;
    color: #909399;
    margin-left: 4px;
  }
}

.score-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 8px;

  .score-item {
    text-align: center;
    padding: 8px 0;
    background: #f5f7fa;
    border-radius: 6px;

    .si-val {
      font-size: 18px;
      font-weight: 700;
    }

    .si-label {
      font-size: 11px;
      color: #909399;
      margin-top: 2px;
    }
  }
}

.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;

  .stat-card {
    text-align: center;
    padding: 12px 8px;
    background: #f5f7fa;
    border-radius: 8px;

    .stat-value {
      font-size: 24px;
      font-weight: 700;
      color: #303133;
    }

    .stat-label {
      font-size: 12px;
      color: #909399;
      margin-top: 4px;
    }
  }
}

.ranking-list {
  .ranking-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 10px;
    margin-bottom: 4px;
    border-radius: 6px;
    background: #fafafa;
    cursor: pointer;
    transition: background 0.2s;

    &:hover {
      background: #ecf5ff;
    }

    .rank-num {
      width: 22px;
      height: 22px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      font-weight: 700;
      background: #f0f2f5;
      color: #909399;
      flex-shrink: 0;

      &.gold { background: #fbbf24; color: #fff; }
      &.silver { background: #d1d5db; color: #fff; }
      &.bronze { background: #cd7c2f; color: #fff; }
    }

    .rank-name {
      flex: 1;
      font-size: 13px;
      font-weight: 500;
      color: #303133;
    }
  }
}

.tip-box {
  padding: 10px 14px;
  background: #ecf5ff;
  border-radius: 6px;
  font-size: 12px;
  color: #409eff;
  display: flex;
  align-items: center;
  gap: 6px;
  line-height: 1.5;
}

.empty-panel {
  padding: 40px 16px;
  text-align: center;

  .empty-title {
    font-size: 15px;
    font-weight: 500;
    color: #303133;
    margin: 12px 0 8px;
  }

  .empty-desc {
    font-size: 12px;
    color: #909399;
    margin: 6px 0 16px;
  }

  .error-msg {
    font-size: 12px;
    color: #f56c6c;
    margin: 6px 0 12px;
    word-break: break-all;
  }

  .speaker-info {
    font-size: 13px;
    color: #409eff;
    margin-top: 12px;
  }
}

// Agentic 链式调用面板（还原实验性 webapp 效果）
.agentic-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;

  .agentic-header {
    padding: 12px 16px;
    border-bottom: 1px solid #ebeef5;
    background: #f5f7fa;
    flex-shrink: 0;

    .header-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      font-weight: 600;
      color: #303133;
      margin-bottom: 8px;
    }

    .header-progress {
      display: flex;
      align-items: center;
      gap: 8px;

      .el-progress {
        flex: 1;
      }

      .progress-text {
        font-size: 12px;
        color: #909399;
        min-width: 36px;
      }
    }
  }

  .agentic-timeline {
    flex: 1;
    overflow-y: auto;
    padding: 12px 16px;
    scroll-behavior: smooth;
  }

  .collapse-trigger {
    width: 100%;
    padding: 0;
    border: 0;
    background: transparent;
    cursor: pointer;
    text-align: left;
  }

  .collapse-arrow {
    margin-left: auto;
    color: #c0c4cc;
    transition: transform 0.2s ease, color 0.2s ease;

    &.expanded {
      transform: rotate(180deg);
      color: #409eff;
    }
  }

  // 链式节点
  .chain-node {
    position: relative;
    padding-left: 22px;
    margin-bottom: 4px;
  }

  // 竖线连接器
  .connector {
    position: absolute;
    left: 7px;
    top: 18px;
    bottom: 0;
    width: 1px;
    background: #e4e7ed;

    &.active {
      background: linear-gradient(to bottom, #409eff, transparent);
    }

    &.last {
      display: none;
    }
  }

  // 圆点容器
  .dot-wrap {
    position: absolute;
    left: 0;
    top: 3px;
    width: 15px;
    height: 15px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .dot {
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
  }

  .dot-active {
    width: 9px;
    height: 9px;
    background: #409eff;
    position: relative;
    z-index: 1;
  }

  .dot-done {
    width: 15px;
    height: 15px;
    background: #f0f9eb;
    color: #67c23a;
    font-size: 9px;
    font-weight: 700;
  }

  .dot-idle {
    width: 7px;
    height: 7px;
    background: #c0c4cc;
  }

  .ping {
    position: absolute;
    width: 15px;
    height: 15px;
    border-radius: 50%;
    background: rgba(64, 158, 255, 0.25);
    animation: ping 1.2s ease-out infinite;
  }

  // 节点头部
  .node-header {
    display: flex;
    align-items: flex-start;
    gap: 6px;
    margin-bottom: 2px;
  }

  .loop-label {
    font-size: 12px;
    font-weight: 500;
    color: #303133;
    flex: 1;
    white-space: pre-wrap;
    word-break: break-word;
    line-height: 1.5;

    &.active {
      color: #409eff;
    }
  }

  .loop-num {
    font-size: 10px;
    color: #c0c4cc;
    flex-shrink: 0;
  }

  .spinner {
    display: inline-block;
    width: 11px;
    height: 11px;
    border: 1.5px solid #ecf5ff;
    border-top-color: #409eff;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    flex-shrink: 0;
  }

  // 工具调用
  .node-tools {
    margin-top: 4px;

    .tool-item {
      padding: 6px 8px;
      margin-bottom: 4px;
      background: #f5f7fa;
      border-radius: 4px;
      border: 1px solid #e4e7ed;

      &.pending {
        border-color: #409eff;
        border-style: dashed;
      }

      .tool-header {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 12px;

        .tool-icon {
          font-size: 14px;
        }

        .tool-name {
          color: #303133;
          font-weight: 500;
          flex: 1;
        }

        .tool-badge {
          font-size: 10px;
          padding: 1px 4px;
          border-radius: 3px;

          &.pending {
            color: #409eff;
            background: #ecf5ff;
          }

          &.done {
            color: #67c23a;
            background: #f0f9eb;
          }
        }
      }

      .tool-body {
        margin-top: 4px;
        padding-top: 4px;
        border-top: 1px dashed #e4e7ed;

        .tool-query {
          font-size: 11px;
          color: #409eff;
          margin: 0 0 2px;
        }

        .tool-reason {
          font-size: 10px;
          color: #909399;
          margin: 0 0 4px;
        }
      }

      .tool-result {
        font-size: 11px;
        color: #606266;
        line-height: 1.4;
        word-break: break-word;
        max-height: 220px;
        overflow-y: auto;

        :deep(p) {
          margin: 0 0 4px;
          &:last-child { margin-bottom: 0; }
        }
        :deep(ul), :deep(ol) {
          margin: 2px 0;
          padding-left: 16px;
        }
      }

      .tool-pending {
        font-size: 11px;
        color: #c0c4cc;
        font-style: italic;
        margin-top: 4px;
      }
    }
  }

  .agentic-waiting {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    color: #909399;
    font-size: 13px;
  }

  .agentic-final {
    padding: 12px 16px;
    border-top: 1px solid #e4e7ed;
    background: #f0f9eb;
    flex-shrink: 0;

    .final-header {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      font-weight: 600;
      color: #67c23a;
    }

    .final-content {
      font-size: 12px;
      color: #606266;
      line-height: 1.6;
      word-break: break-word;
      margin-top: 8px;
      max-height: 260px;
      overflow-y: auto;

      :deep(p) {
        margin: 0 0 8px;
        &:last-child { margin-bottom: 0; }
      }
      :deep(ul), :deep(ol) {
        margin: 4px 0;
        padding-left: 18px;
      }
      :deep(li) {
        margin: 2px 0;
      }
      :deep(h1), :deep(h2), :deep(h3), :deep(h4) {
        margin: 8px 0 6px;
        font-weight: 600;
      }

      .typing-cursor {
        display: inline-block;
        width: 6px;
        height: 14px;
        background: #409eff;
        margin-left: 2px;
        vertical-align: text-bottom;
        animation: blink 0.8s infinite;
      }
    }
  }

  .agentic-footer {
    padding: 8px 16px;
    border-top: 1px solid #ebeef5;
    background: #fafafa;
    display: flex;
    justify-content: space-between;
    font-size: 11px;
    color: #909399;
    flex-shrink: 0;
  }
}

// 入场动画
.chain-slide-enter-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.chain-slide-enter-from {
  opacity: 0;
  transform: translateY(12px);
}

@keyframes ping {
  0% { transform: scale(1); opacity: 1; }
  100% { transform: scale(2.2); opacity: 0; }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

// 已完成状态下的可折叠思维链历史
.agentic-history {
  padding: 12px 16px !important;
  border-bottom: none !important;

  .history-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 12px;
    background: #f5f7fa;
    border-radius: 8px;
    transition: background 0.2s ease;

    &:hover {
      background: #ecf5ff;
    }

    .history-title {
      font-size: 13px;
      font-weight: 600;
      color: #303133;
    }

    .history-summary {
      flex: 1;
      font-size: 11px;
      color: #909399;
      text-align: right;
      margin-right: 4px;
    }
  }

  .history-content {
    margin-top: 12px;
    padding: 12px;
    background: #fafafa;
    border-radius: 8px;
    border: 1px solid #ebeef5;
    max-height: 400px;
    overflow-y: auto;
  }

  .agentic-timeline-readonly {
    .chain-node {
      position: relative;
      padding-left: 22px;
      margin-bottom: 8px;
    }

    .connector {
      position: absolute;
      left: 7px;
      top: 18px;
      bottom: 0;
      width: 1px;
      background: #e4e7ed;

      &.last {
        display: none;
      }
    }

    .dot-wrap {
      position: absolute;
      left: 0;
      top: 3px;
      width: 15px;
      height: 15px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .dot {
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
    }

    .dot-done {
      width: 15px;
      height: 15px;
      background: #f0f9eb;
      color: #67c23a;
      font-size: 9px;
      font-weight: 700;
    }

    .node-header {
      display: flex;
      align-items: flex-start;
      gap: 6px;
      margin-bottom: 4px;
    }

    .loop-label {
      font-size: 12px;
      font-weight: 500;
      color: #303133;
      flex: 1;
      white-space: pre-wrap;
      word-break: break-word;
      line-height: 1.5;
    }

    .loop-num {
      font-size: 10px;
      color: #c0c4cc;
      flex-shrink: 0;
    }

    .node-tools {
      margin-top: 4px;

      .tool-item {
        padding: 6px 8px;
        margin-bottom: 4px;
        background: #fff;
        border-radius: 4px;
        border: 1px solid #e4e7ed;

        .tool-header {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;

          .tool-icon {
            font-size: 14px;
          }

          .tool-name {
            color: #303133;
            font-weight: 500;
            flex: 1;
          }

          .tool-badge {
            font-size: 10px;
            padding: 1px 4px;
            border-radius: 3px;

            &.done {
              color: #67c23a;
              background: #f0f9eb;
            }
          }
        }

        .tool-body {
          margin-top: 4px;
          padding-top: 4px;
          border-top: 1px dashed #e4e7ed;

          .tool-query {
            font-size: 11px;
            color: #409eff;
            margin: 0 0 2px;
          }

          .tool-reason {
            font-size: 10px;
            color: #909399;
            margin: 0 0 4px;
          }
        }

        .tool-result {
          font-size: 11px;
          color: #606266;
          line-height: 1.4;
          word-break: break-word;
          max-height: 150px;
          overflow-y: auto;

          :deep(p) {
            margin: 0 0 4px;
            &:last-child { margin-bottom: 0; }
          }
          :deep(ul), :deep(ol) {
            margin: 2px 0;
            padding-left: 16px;
          }
        }
      }
    }
  }

  .history-final {
    margin-top: 12px;
    padding: 10px 12px;
    background: #f0f9eb;
    border-radius: 6px;

    .final-label {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      font-weight: 600;
      color: #67c23a;
      margin-bottom: 8px;
    }

    .final-content {
      font-size: 12px;
      color: #606266;
      line-height: 1.6;
      word-break: break-word;
      max-height: 200px;
      overflow-y: auto;

      :deep(p) {
        margin: 0 0 6px;
        &:last-child { margin-bottom: 0; }
      }
      :deep(ul), :deep(ol) {
        margin: 4px 0;
        padding-left: 18px;
      }
    }
  }

  .collapse-trigger {
    width: 100%;
    padding: 0;
    border: 0;
    background: transparent;
    cursor: pointer;
    text-align: left;
  }

  .collapse-arrow {
    margin-left: auto;
    color: #c0c4cc;
    transition: transform 0.25s ease, color 0.2s ease;

    &.expanded {
      transform: rotate(180deg);
      color: #409eff;
    }
  }
}

// 思维链展开/折叠过渡动画
.history-expand-enter-active,
.history-expand-leave-active {
  transition: all 0.3s ease;
  overflow: hidden;
}

.history-expand-enter-from,
.history-expand-leave-to {
  opacity: 0;
  max-height: 0;
  margin-top: 0;
  padding: 0 12px;
}

.history-expand-enter-to,
.history-expand-leave-from {
  opacity: 1;
  max-height: 500px;
}

.match-result-list {
  .match-result-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 10px;
    margin-bottom: 6px;
    border-radius: 6px;
    background: #fafafa;
    border: 1px solid #ebeef5;

    .result-name {
      font-size: 13px;
      font-weight: 500;
      color: #303133;
      min-width: 60px;
    }

    .result-position {
      flex: 1;
    }

    .result-error {
      flex-shrink: 0;
    }
  }
}
</style>
