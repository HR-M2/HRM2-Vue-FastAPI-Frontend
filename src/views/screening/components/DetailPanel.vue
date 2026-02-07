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
                <div class="si-val" style="color: #409eff">{{ selectedCandidate.hrScore || '-' }}</div>
                <div class="si-label">HR</div>
              </div>
              <div class="score-item">
                <div class="si-val" style="color: #e6a23c">{{ selectedCandidate.techScore || '-' }}</div>
                <div class="si-label">技术</div>
              </div>
              <div class="score-item">
                <div class="si-val" style="color: #909399">{{ selectedCandidate.mgrScore || '-' }}</div>
                <div class="si-label">管理</div>
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
            <el-button v-if="selectedCandidate.hasInterview" type="success" @click="$emit('goInterview', selectedCandidate)">
              <el-icon><ChatLineSquare /></el-icon>
              进入面试
            </el-button>
          </div>
        </div>

        <!-- 处理中状态 -->
        <div v-else-if="['running', 'pending'].includes(selectedCandidate.screeningStatus)" class="empty-panel">
          <el-icon :size="48" color="#409eff" class="is-loading"><Loading /></el-icon>
          <div class="empty-title">
            {{ selectedCandidate.screeningStatus === 'running' ? '初筛分析中' : '等待处理' }}...
          </div>
          <el-progress
            :percentage="selectedCandidate.screeningProgress || 0"
            :stroke-width="8"
            style="width: 100%"
          />
          <div v-if="selectedCandidate.currentSpeaker" class="speaker-info">
            {{ getSpeakerText(selectedCandidate.currentSpeaker) }}
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
import {
  Close, View, Download, ChatLineSquare, Loading,
  CircleCloseFilled, Clock, RefreshRight, Delete, InfoFilled
} from '@element-plus/icons-vue'
import { useScreeningUtils } from '@/composables/useScreeningUtils'
import type { CandidateItem } from '../composables/useCandidateList'
import type { MatchResult } from '../composables/useSmartMatching'
import type { PositionData } from '@/types'

// Box 图标
const Box = { template: '<svg viewBox="0 0 1024 1024"><path d="M868 160H156c-17.7 0-32 14.3-32 32v96h776v-96c0-17.7-14.3-32-32-32zM124 832c0 17.7 14.3 32 32 32h712c17.7 0 32-14.3 32-32V352H124v480z" fill="currentColor"/></svg>' }

defineProps<{
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

const { getStatusType, getStatusText, getSpeakerText } = useScreeningUtils()

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
</script>

<style scoped lang="scss">
.detail-panel {
  height: 100%;
  background: #fff;
  border-left: 1px solid #e4e7ed;
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
