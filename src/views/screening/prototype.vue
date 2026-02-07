<template>
  <div class="app-container">
    <aside class="sidebar">
      <div class="sidebar-header">
        <div class="sidebar-title">招聘岗位</div>
        <div class="sidebar-subtitle">
          {{ positions.length }} 个岗位 · 拖拽候选人调整岗位
        </div>
      </div>

      <div class="sidebar-list">
        <div
          v-for="pos in positions"
          :key="pos.id"
          :ref="(el) => { if (el) positionRefs[pos.id] = el }"
          class="pos-item"
          :class="{
            'drag-over': dragOverPosition === pos.id,
            'pos-item-receive': dropAnimation?.toPos === pos.id,
            'active': activePosition === pos.id
          }"
          @click="handlePositionClick(pos.id)"
          @dragover.prevent="handleDragOver($event, pos.id)"
          @dragleave="handleDragLeave(pos.id)"
          @drop="handleDrop($event, pos.id)"
        >
          <div class="pos-header">
            <span class="pos-title" :class="{ 'active-text': activePosition === pos.id }">
              {{ pos.title }}
            </span>
            <span class="pos-count" :class="{ 'active-badge': activePosition === pos.id }">
              {{ getStats(pos.id).total }}
            </span>
          </div>
          <div class="pos-info">
            <span>{{ pos.department }}</span>
            <span v-if="getStats(pos.id).unscreened > 0" class="pos-badge-warning">
              待筛 {{ getStats(pos.id).unscreened }}
            </span>
          </div>

          <div v-if="dragOverPosition === pos.id && draggingCandidate" class="drag-hint">
            松开以将「{{ draggingCandidate.name }}」移至此岗位
          </div>
        </div>
      </div>

      <div class="sidebar-footer">
        <button class="add-pos-btn">+ 管理岗位</button>
      </div>
    </aside>

    <main class="main-content">
      <header class="top-bar">
        <div class="top-bar-left">
          <h2 class="page-title">
            {{ positions.find((p) => p.id === activePosition)?.title }}
          </h2>
          <div class="stats-row">
            <span class="stat-item">共 <b>{{ getStats(activePosition).total }}</b></span>
            <span class="stat-item completed">✓{{ getStats(activePosition).completed }}</span>
            <span v-if="getStats(activePosition).processing > 0" class="stat-item processing">
              ⟳{{ getStats(activePosition).processing }}
            </span>
          </div>
        </div>
        <div class="top-bar-right">
          <button
            v-for="tab in tabs"
            :key="tab.key"
            @click="activeTab = tab.key"
            class="tab-btn"
            :class="{ active: activeTab === tab.key }"
          >
            {{ tab.icon }} {{ tab.label }}
            <span v-if="tab.key === 'upload' && uploadedFiles.length > 0" class="badge-count">
              {{ uploadedFiles.length }}
            </span>
          </button>
        </div>
      </header>

      <div class="content-area">
        <div v-if="activeTab === 'candidates'" class="tab-pane candidates-pane">
          <div class="toolbar">
            <span class="label">状态:</span>
            <button
              v-for="key in ['all', 'completed', 'processing', 'pending', 'failed']"
              :key="key"
              @click="statusFilter = key"
              class="filter-btn"
              :class="{ active: statusFilter === key }"
            >
              {{ statusLabels[key] }}
            </button>
            <div class="spacer"></div>
            <select v-model="sortBy" class="sort-select">
              <option value="matchScore">按匹配度</option>
              <option value="score">按综合分</option>
              <option value="time">按时间</option>
            </select>

            <button
              @click="handleBatchScreening"
              :disabled="batchScreening || !canBatchScreen"
              class="action-btn primary"
              :class="{ disabled: batchScreening || !canBatchScreen }"
            >
              {{ batchScreening ? "⟳ 初筛进行中..." : "⚡ 一键初筛" }}
            </button>
          </div>

          <div v-if="batchScreening" class="batch-progress-panel">
            <div class="progress-header">
              <span class="progress-title">
                ⚡ 批量初筛中 ({{ batchScreenProgress.current }}/{{ batchScreenProgress.total }})
              </span>
              <span class="progress-percent">
                {{ Math.round((batchScreenProgress.current / batchScreenProgress.total) * 100) }}%
              </span>
            </div>
            <div class="progress-bar-bg">
              <div
                class="progress-bar-fill"
                :style="{ width: `${(batchScreenProgress.current / batchScreenProgress.total) * 100}%` }"
              ></div>
            </div>
            <div class="progress-items">
              <span
                v-for="item in batchScreenProgress.items"
                :key="item.id"
                class="batch-progress-item"
                :class="item.status"
              >
                {{ item.status === "done" ? "✓" : item.status === "running" ? "⟳" : "○" }} {{ item.name }}
              </span>
            </div>
          </div>

          <div class="table-container">
            <div class="table-header">
              <span>候选人 (可拖拽 ←)</span>
              <span class="text-center">匹配度</span>
              <span>初筛评分</span>
              <span>状态</span>
              <span>时间</span>
              <span class="text-right">操作</span>
            </div>

            <div
              v-for="c in currentCandidates"
              :key="c.id"
              draggable="true"
              @dragstart="handleDragStart($event, c)"
              @dragend="handleDragEnd"
              @click="selectedCandidate = c"
              class="candidate-row"
              :class="{
                'is-dragging': draggingCandidate?.id === c.id,
                'fly-out': dropAnimation?.candidateId === c.id,
                'selected': selectedCandidate?.id === c.id
              }"
            >
              <div class="col-name">
                <span class="drag-handle">⠿</span>
                <span class="name-text">{{ c.name }}</span>
                <span
                  v-if="c.matchConfidence"
                  class="confidence-badge"
                  :style="getConfidenceStyle(c.matchConfidence)"
                >
                  {{ getConfidenceLabel(c.matchConfidence) }}
                </span>
              </div>

              <div class="col-match text-center">
                <span
                  v-if="c.matchScore"
                  class="match-score"
                  :style="{ color: getScoreColor(c.matchScore) }"
                >
                  {{ c.matchScore }}%
                </span>
                <span v-else class="text-gray-300">—</span>
              </div>

              <div class="col-score">
                <template v-if="c.score != null">
                  <span
                    class="score-badge"
                    :style="{
                      color: getScoreColor(c.score),
                      background: getScoreBg(c.score)
                    }"
                  >
                    {{ c.score }}
                  </span>
                  <span class="score-detail">HR:{{ c.hr }} 技:{{ c.tech }} 管:{{ c.mgr }}</span>
                </template>
                <template v-else-if="c.status === 'processing' || c.status === 'screening'">
                  <div class="progress-mini-track">
                    <div
                      class="progress-mini-bar"
                      :style="{
                        width: `${c.progress || 50}%`,
                        background: c.status === 'screening' ? 'linear-gradient(90deg, #6366f1, #a78bfa)' : 'linear-gradient(90deg, #3b82f6, #818cf8)'
                      }"
                    ></div>
                  </div>
                </template>
                <span v-else class="text-gray-300">—</span>
              </div>

              <div class="col-status">
                <span class="status-dot" :style="{ color: getStatusInfo(c.status).color }">
                  <span
                    class="dot"
                    :style="{
                      background: getStatusInfo(c.status).color,
                      animation: ['processing', 'matching', 'screening'].includes(c.status) ? 'pulse 1.5s ease-in-out infinite' : 'none'
                    }"
                  ></span>
                  {{ getStatusInfo(c.status).label }}
                </span>
              </div>

              <div class="col-time">{{ c.time }}</div>

              <div class="col-action text-right">
                <button v-if="c.status === 'completed'" class="action-btn-small green">报告</button>
                <button v-if="c.status === 'failed'" class="action-btn-small red">重试</button>
              </div>
            </div>

            <div v-if="currentCandidates.length === 0" class="empty-state">
              <div class="empty-icon">📭</div>
              <div class="empty-text">暂无候选人</div>
              <button @click="activeTab = 'upload'" class="empty-btn">上传简历</button>
            </div>
          </div>
        </div>

        <div v-if="activeTab === 'upload'" class="tab-pane upload-pane">
          <div class="upload-container">
            <div class="upload-header">
              <h3>上传简历</h3>
              <p>上传简历后，系统将自动进行智能岗位匹配。无需指定岗位，AI 将推荐最适合的岗位。</p>
            </div>

            <div class="drop-zone">
              <div class="drop-icon">📄</div>
              <p class="drop-text">拖拽简历文件到此处</p>
              <button @click="addMockFiles" class="select-file-btn">点击选择文件</button>
              <p class="drop-hint">支持 PDF、DOCX、TXT、Markdown，单文件 ≤ 10MB</p>
            </div>

            <div v-if="uploadedFiles.length > 0" class="file-list-card">
              <div class="file-list-header">
                <span class="title">已上传 {{ uploadedFiles.length }} 份简历</span>
                <button @click="clearUploads" class="clear-btn">清空</button>
              </div>

              <div
                v-for="f in uploadedFiles"
                :key="f.id"
                class="file-row"
                :class="{ 'match-glow': f.matched }"
                :style="{ background: getFileBg(f) }"
              >
                <div class="file-info">
                  <span class="file-icon">📄</span>
                  <div>
                    <div class="file-name">{{ f.name }}</div>
                    <div class="file-size">{{ f.size }}</div>
                  </div>
                </div>

                <div v-if="f.matched" class="match-info">
                  <div class="match-details">
                    <div class="match-pos">→ {{ f.matchedPosition.title }}</div>
                    <div class="match-stats">
                      <span
                        class="match-score"
                        :style="{ color: getScoreColor(f.matchScore) }"
                      >
                        {{ f.matchScore }}%
                      </span>
                      <span
                        class="confidence-badge"
                        :style="getConfidenceStyle(f.confidence)"
                      >
                        {{ getConfidenceLabel(f.confidence) }}
                      </span>
                    </div>
                  </div>
                  <select
                    v-model="f.matchedPosition"
                    class="pos-select"
                    @change="handleFilePosChange(f)"
                  >
                    <option v-for="p in positions" :key="p.id" :value="p">
                      {{ p.title }}
                    </option>
                  </select>
                </div>
                <span v-else class="pending-text">待匹配</span>
              </div>

              <div class="file-actions">
                <template v-if="!showUploadMatchResult">
                  <button
                    @click="handleBatchMatch"
                    :disabled="isAutoMatching"
                    class="action-btn block-btn"
                    :class="isAutoMatching ? 'matching' : 'start-match'"
                  >
                    {{ isAutoMatching ? "⟳ AI 智能匹配中..." : "🤖 一键智能匹配岗位" }}
                  </button>
                </template>
                <template v-else>
                  <button @click="confirmUploadMatches" class="action-btn block-btn confirm">
                    ✓ 确认分配并开始初筛
                  </button>
                  <button @click="handleBatchMatch" class="action-btn retry">重新匹配</button>
                </template>
              </div>
            </div>

            <div v-if="isAutoMatching" class="auto-match-progress">
              <div class="amp-header">
                <span class="amp-title">🤖 AI 正在分析简历与岗位匹配度...</span>
                <span class="amp-percent">{{ Math.round(autoMatchProgress) }}%</span>
              </div>
              <div class="amp-track">
                <div class="amp-fill" :style="{ width: `${autoMatchProgress}%` }"></div>
              </div>
              <p class="amp-hint">正在分析简历关键技能、经验与各岗位 JD 的匹配程度，低置信度匹配将标注提醒</p>
            </div>

            <div class="guide-card">
              <div class="guide-title">📌 使用流程</div>
              <div class="steps-row">
                <div v-for="(s, i) in steps" :key="s.step" class="step-item">
                  <div class="step-circle" :style="{ background: s.color }">{{ s.step }}</div>
                  <div class="step-title">{{ s.title }}</div>
                  <div class="step-desc">{{ s.desc }}</div>
                  <div v-if="i < 3" class="step-arrow">→</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <aside class="details-panel">
          <template v-if="selectedCandidate">
            <div class="panel-scroll">
              <div class="panel-header">
                <div class="ph-top">
                  <div>
                    <h3 class="ph-name">{{ selectedCandidate.name }}</h3>
                    <div class="ph-badges">
                      <span class="status-dot" :style="{ color: getStatusInfo(selectedCandidate.status).color }">
                        <span class="dot" :style="{ background: getStatusInfo(selectedCandidate.status).color }"></span>
                        {{ getStatusInfo(selectedCandidate.status).label }}
                      </span>
                      <span
                        v-if="selectedCandidate.matchConfidence"
                        class="confidence-badge"
                        :style="getConfidenceStyle(selectedCandidate.matchConfidence)"
                      >
                        {{ getConfidenceLabel(selectedCandidate.matchConfidence) }}
                      </span>
                    </div>
                  </div>
                  <button @click="selectedCandidate = null" class="close-btn">✕</button>
                </div>
              </div>

              <div v-if="selectedCandidate.status === 'completed'">
                <div class="section">
                  <div class="section-title">🤖 人岗匹配</div>
                  <div class="match-display">
                    <div
                      class="match-ring"
                      :style="{
                        background: `conic-gradient(${getScoreColor(selectedCandidate.matchScore)} ${(selectedCandidate.matchScore || 0) * 3.6}deg, #f0f0f0 0deg)`
                      }"
                    >
                      <div class="match-ring-inner">{{ selectedCandidate.matchScore }}</div>
                    </div>
                    <div>
                      <div class="match-val-text">匹配度 {{ selectedCandidate.matchScore }}%</div>
                      <div class="match-sub-text">
                        与「{{ positions.find((p) => p.id === activePosition)?.title }}」
                      </div>
                    </div>
                  </div>
                  <div class="reason-box">
                    {{ selectedCandidate.matchReason }}
                  </div>
                </div>

                <div class="section">
                  <div class="section-title">📊 初筛评分</div>
                  <div class="score-display">
                    <span class="score-big" :style="{ color: getScoreColor(selectedCandidate.score) }">
                      {{ selectedCandidate.score }}
                    </span>
                    <span class="score-label">综合</span>
                  </div>
                  <div class="score-grid">
                    <div
                      v-for="d in [{ label: 'HR', value: selectedCandidate.hr, color: '#3b82f6' }, { label: '技术', value: selectedCandidate.tech, color: '#f59e0b' }, { label: '管理', value: selectedCandidate.mgr, color: '#8b5cf6' }]"
                      :key="d.label"
                      class="score-item"
                    >
                      <div class="si-val" :style="{ color: d.color }">{{ d.value }}</div>
                      <div class="si-label">{{ d.label }}</div>
                    </div>
                  </div>
                </div>

                <div class="section actions">
                  <button class="action-btn primary block">📥 下载初筛报告</button>
                  <button class="action-btn default block">💬 进入面试</button>
                </div>
              </div>

              <div v-else-if="selectedCandidate.status === 'processing' || selectedCandidate.status === 'screening'" class="empty-panel">
                <div class="emoji-lg">⏳</div>
                <div class="empty-title">
                  {{ selectedCandidate.status === "screening" ? "初筛分析中" : "处理中" }}...
                </div>
                <div class="progress-mini-track w-full">
                  <div
                    class="progress-mini-bar"
                    :style="{
                      width: `${selectedCandidate.progress || 50}%`,
                      animation: 'pulse 1.5s infinite',
                      background: 'linear-gradient(90deg, #6366f1, #a78bfa)'
                    }"
                  ></div>
                </div>
              </div>

              <div v-else-if="selectedCandidate.status === 'failed'" class="empty-panel">
                <div class="emoji-lg">❌</div>
                <div class="empty-title red">处理失败</div>
                <button class="action-btn-small red">重新检测</button>
              </div>

              <div v-else-if="selectedCandidate.status === 'pending'" class="empty-panel">
                <div class="emoji-lg">🕐</div>
                <div class="empty-title gray">等待初筛</div>
                <p class="empty-desc">使用"一键初筛"或等待队列处理</p>
              </div>
            </div>
          </template>

          <template v-else>
            <div class="panel-scroll">
              <div class="panel-header">
                <h3 class="ph-title-sm">🤖 智能匹配总览</h3>
                <p class="ph-desc">当前岗位的候选人匹配情况</p>
              </div>

              <div class="section">
                <div class="section-title">匹配度分布</div>
                <div
                  v-for="b in distributionStats"
                  :key="b.label"
                  class="dist-row"
                  :style="{ background: b.bg }"
                >
                  <span class="dist-label" :style="{ color: b.color }">{{ b.label }}</span>
                  <span class="dist-count" :style="{ color: b.color }">{{ b.count }}</span>
                </div>
              </div>

              <div class="section">
                <div class="section-title">🏆 最佳匹配</div>
                <div
                  v-for="(c, i) in topCandidates"
                  :key="c.id"
                  @click="selectedCandidate = c"
                  class="top-candidate-row"
                >
                  <span
                    class="rank-num"
                    :style="{
                      background: i === 0 ? '#fbbf24' : i === 1 ? '#d1d5db' : i === 2 ? '#cd7c2f' : '#f3f4f6',
                      color: i < 3 ? '#fff' : '#9ca3af'
                    }"
                  >
                    {{ i + 1 }}
                  </span>
                  <div class="tc-info">
                    <div class="tc-name">{{ c.name }}</div>
                    <div class="tc-reason">{{ c.matchReason }}</div>
                  </div>
                  <span class="tc-score" :style="{ color: getScoreColor(c.matchScore) }">
                    {{ c.matchScore }}%
                  </span>
                </div>
              </div>

              <div class="section">
                <div class="tip-box">
                  <b>💡 调岗提示：</b>如果 AI 匹配的岗位不正确，可以直接拖拽候选人行到左侧岗位列表进行调整。
                </div>
              </div>
            </div>
          </template>
        </aside>
      </div>
    </main>

    <div v-if="draggingCandidate" class="drag-overlay">
      <div class="drag-sidebar-highlight">
        <div class="drag-msg">← 拖至目标岗位</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, reactive } from "vue";

// ==================== Mock Data ====================
const initialPositions = [
  { id: "1", title: "大模型工程师", department: "AI研发部" },
  { id: "2", title: "新东方大厨", department: "餐饮部" },
  { id: "3", title: "拜占庭瓦兰吉卫队", department: "安全部" },
  { id: "4", title: "碧桂园物业保安", department: "物业部" },
];

const initialCandidates = [
  { id: "c1", name: "测试张三", score: 90, hr: 92, tech: 95, mgr: 85, status: "completed", positionId: "1", matchScore: 94, matchReason: "深度学习经验丰富，符合大模型方向", matchConfidence: "high", time: "02/07 15:51", screened: true },
  { id: "c2", name: "测试张七", score: null, hr: null, tech: null, mgr: null, status: "processing", positionId: "1", progress: 68, matchScore: 81, matchReason: "有相关经验，技能待评估", matchConfidence: "medium", time: "02/07 15:52", screened: false },
  { id: "c3", name: "郑苹辉", score: 82, hr: 80, tech: 85, mgr: 78, status: "completed", positionId: "1", matchScore: 78, matchReason: "有NLP项目经验，但缺乏大规模训练经验", matchConfidence: "medium", time: "02/06 10:20", screened: true },
  { id: "c4", name: "李浩", score: 84, hr: 86, tech: 82, mgr: 80, status: "completed", positionId: "1", matchScore: 82, matchReason: "系统架构能力强，GPU集群经验匹配", matchConfidence: "high", time: "02/06 09:15", screened: true },
  { id: "c5", name: "罗龙娟", score: 81, hr: 79, tech: 83, mgr: 78, status: "completed", positionId: "1", matchScore: 71, matchReason: "偏传统ML背景，大模型方向需补强", matchConfidence: "low", time: "02/05 14:30", screened: true },
  { id: "c6", name: "王小明", score: 76, hr: 78, tech: 74, mgr: 72, status: "completed", positionId: "1", matchScore: 65, matchReason: "基础不错但经验不足", matchConfidence: "low", time: "02/05 11:00", screened: true },
  { id: "c7", name: "赵薇薇", score: null, hr: null, tech: null, mgr: null, status: "failed", positionId: "1", matchScore: null, matchReason: null, matchConfidence: null, time: "02/04 16:00", screened: false },
  { id: "c8", name: "黄艳", score: 75, hr: 77, tech: 73, mgr: 70, status: "completed", positionId: "2", matchScore: 80, matchReason: "川菜功底扎实", matchConfidence: "high", time: "02/06 08:30", screened: true },
  { id: "c9", name: "测试张六", score: null, hr: null, tech: null, mgr: null, status: "pending", positionId: "2", matchScore: 55, matchReason: "经验偏少", matchConfidence: "low", time: "02/07 16:00", screened: false },
];

// ==================== State ====================
const positions = ref(initialPositions);
const candidates = ref(initialCandidates);
const activePosition = ref("1");
const activeTab = ref("candidates");
const selectedCandidate = ref(null);
const statusFilter = ref("all");
const sortBy = ref("matchScore");

// Drag state
const draggingCandidate = ref(null);
const dragOverPosition = ref(null);
const dropAnimation = ref(null); // { candidateId, fromPos, toPos }

// Batch operation states
const batchMatching = ref(false); // (Unused in logic but kept for consistency)
const batchScreening = ref(false);
const batchScreenProgress = ref({ current: 0, total: 0, items: [] });

// Upload state
const uploadedFiles = ref([]);
const showUploadMatchResult = ref(false);
const uploadMatchResults = ref([]);
const isAutoMatching = ref(false);
const autoMatchProgress = ref(0);

const positionRefs = reactive({});

const tabs = [
  { key: "candidates", icon: "📋", label: "候选人列表" },
  { key: "upload", icon: "📤", label: "上传简历" },
];

const statusLabels = {
  all: "全部",
  completed: "已完成",
  processing: "进行中",
  pending: "待处理",
  failed: "失败",
};

const steps = [
  { step: "1", title: "上传简历", desc: "拖拽或选择简历文件", color: "#6366f1" },
  { step: "2", title: "一键匹配", desc: "AI 自动推荐最佳岗位", color: "#f59e0b" },
  { step: "3", title: "确认调整", desc: "检查并手动调整匹配", color: "#059669" },
  { step: "4", title: "一键初筛", desc: "批量启动所有初筛", color: "#8b5cf6" },
];

// ==================== Computed ====================

const currentCandidates = computed(() => {
  return candidates.value
    .filter((c) => c.positionId === activePosition.value)
    .filter((c) => statusFilter.value === "all" || c.status === statusFilter.value)
    .sort((a, b) => {
      if (sortBy.value === "matchScore") return (b.matchScore || 0) - (a.matchScore || 0);
      if (sortBy.value === "score") return (b.score || 0) - (a.score || 0);
      return 0; // time sort omitted for simplicity as per original
    });
});

const canBatchScreen = computed(() => {
  return currentCandidates.value.filter(
    (c) => !c.screened && c.status !== "failed" && c.status !== "processing" && c.status !== "screening"
  ).length > 0;
});

const topCandidates = computed(() => {
  return candidates.value
    .filter((c) => c.positionId === activePosition.value && c.matchScore != null)
    .sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0))
    .slice(0, 4);
});

const distributionStats = computed(() => {
  const list = candidates.value.filter(c => c.positionId === activePosition.value);
  return [
    { label: "高匹配 ≥85%", count: list.filter((c) => c.matchScore >= 85).length, color: "#059669", bg: "#ecfdf5" },
    { label: "中匹配 70-84%", count: list.filter((c) => c.matchScore >= 70 && c.matchScore < 85).length, color: "#d97706", bg: "#fffbeb" },
    { label: "低匹配 <70%", count: list.filter((c) => c.matchScore != null && c.matchScore < 70).length, color: "#dc2626", bg: "#fef2f2" },
    { label: "待分析", count: list.filter((c) => c.matchScore == null).length, color: "#9ca3af", bg: "#f9fafb" },
  ];
});

// ==================== Methods ====================

const getStats = (posId) => {
  const list = candidates.value.filter((c) => c.positionId === posId);
  return {
    total: list.length,
    completed: list.filter((c) => c.status === "completed").length,
    processing: list.filter((c) => ["processing", "pending", "matching", "screening"].includes(c.status)).length,
    unscreened: list.filter((c) => !c.screened && c.status !== "failed").length,
  };
};

// Styling Helpers
const getStatusInfo = (status) => {
  const map = {
    completed: { color: "#10b981", label: "已完成" },
    screening: { color: "#6366f1", label: "初筛中" },
    processing: { color: "#3b82f6", label: "处理中" },
    matching: { color: "#f59e0b", label: "匹配中" },
    pending: { color: "#94a3b8", label: "待处理" },
    failed: { color: "#ef4444", label: "失败" },
    unmatched: { color: "#f97316", label: "待分配" },
  };
  return map[status] || map.pending;
};

const getConfidenceLabel = (c) => (c === 'high' ? '高置信' : c === 'medium' ? '中置信' : '低置信');
const getConfidenceStyle = (confidence) => {
  const map = {
    high: { background: "#ecfdf5", color: "#059669", border: "1px solid #a7f3d0" },
    medium: { background: "#fffbeb", color: "#d97706", border: "1px solid #fde68a" },
    low: { background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" },
  };
  return map[confidence] || {};
};

const getScoreColor = (score) => (score >= 85 ? "#059669" : score >= 70 ? "#d97706" : "#dc2626");
const getScoreBg = (score) => (score >= 85 ? "#ecfdf5" : score >= 70 ? "#fffbeb" : "#fef2f2");
const getFileBg = (f) => f.matched ? (f.confidence === "high" ? "#f0fdf4" : f.confidence === "medium" ? "#fffbeb" : "#fef2f2") : "#fff";

// Actions
const handlePositionClick = (id) => {
  if (!draggingCandidate.value) {
    activePosition.value = id;
    selectedCandidate.value = null;
    statusFilter.value = "all";
  }
};

// Drag & Drop
const handleDragStart = (e, candidate) => {
  draggingCandidate.value = candidate;
  e.dataTransfer.effectAllowed = "move";
  e.dataTransfer.setData("text/plain", candidate.id);
};

const handleDragOver = (e, posId) => {
  // .prevent modifier in template handles e.preventDefault()
  e.dataTransfer.dropEffect = "move";
  if (dragOverPosition.value !== posId) {
    dragOverPosition.value = posId;
  }
};

const handleDragLeave = (posId) => {
  if (dragOverPosition.value === posId) {
    dragOverPosition.value = null;
  }
};

const handleDrop = (e, toPositionId) => {
  dragOverPosition.value = null;
  if (!draggingCandidate.value) return;
  if (draggingCandidate.value.positionId === toPositionId) {
    draggingCandidate.value = null;
    return;
  }

  const fromPos = draggingCandidate.value.positionId;
  const cId = draggingCandidate.value.id;

  // Trigger animation
  dropAnimation.value = { candidateId: cId, fromPos, toPos: toPositionId };

  setTimeout(() => {
    // Update candidate position
    const idx = candidates.value.findIndex(c => c.id === cId);
    if (idx !== -1) {
      candidates.value[idx].positionId = toPositionId;
    }

    dropAnimation.value = null;
    draggingCandidate.value = null;
    if (selectedCandidate.value?.id === cId) {
      selectedCandidate.value = null;
    }
  }, 500);
};

const handleDragEnd = () => {
  draggingCandidate.value = null;
  dragOverPosition.value = null;
};

// Batch Match
const handleBatchMatch = async () => {
  const unmatched = uploadedFiles.value.filter((f) => !f.matched);
  if (unmatched.length === 0) return;

  isAutoMatching.value = true;
  autoMatchProgress.value = 0;

  const results = [];
  for (let i = 0; i < unmatched.length; i++) {
    await new Promise((r) => setTimeout(r, 600 + Math.random() * 800));
    autoMatchProgress.value = ((i + 1) / unmatched.length) * 100;

    const bestPos = positions.value[Math.floor(Math.random() * positions.value.length)];
    const matchScore = Math.floor(55 + Math.random() * 40);
    const confidence = matchScore >= 85 ? "high" : matchScore >= 70 ? "medium" : "low";
    results.push({
      ...unmatched[i],
      matched: true,
      matchedPosition: bestPos,
      matchScore,
      confidence,
      reason: confidence === "high" ? "技能高度匹配" : confidence === "medium" ? "部分技能匹配" : "匹配度较低，建议确认",
    });
  }

  uploadedFiles.value = uploadedFiles.value.map((f) => {
    const r = results.find((res) => res.id === f.id);
    return r || f;
  });

  setUploadMatchResults(results); // Helper below
  setShowUploadMatchResult(true);
  isAutoMatching.value = false;
};

const setUploadMatchResults = (results) => {
  uploadMatchResults.value = results;
};

const handleFilePosChange = (f) => {
  // In Vue using v-model handles the update, we just need to sync the results mirror
  const idx = uploadMatchResults.value.findIndex(ur => ur.id === f.id);
  if (idx !== -1) {
    uploadMatchResults.value[idx].matchedPosition = f.matchedPosition;
  }
}

// Batch Screening
const handleBatchScreening = () => {
  const toScreen = currentCandidates.value.filter(
    (c) => !c.screened && c.status !== "failed" && c.status !== "processing" && c.status !== "screening"
  );
  if (toScreen.length === 0) return;

  batchScreening.value = true;
  batchScreenProgress.value = {
    current: 0,
    total: toScreen.length,
    items: toScreen.map((c) => ({ id: c.id, name: c.name, status: "waiting" }))
  };

  let idx = 0;
  const interval = setInterval(() => {
    if (idx >= toScreen.length) {
      clearInterval(interval);
      setTimeout(() => {
        batchScreening.value = false;
        // Batch update candidates
        candidates.value.forEach(c => {
          if (toScreen.find(t => t.id === c.id)) {
            c.status = "completed";
            c.screened = true;
            c.score = Math.floor(65 + Math.random() * 30);
            c.hr = Math.floor(65 + Math.random() * 30);
            c.tech = Math.floor(65 + Math.random() * 30);
            c.mgr = Math.floor(65 + Math.random() * 30);
          }
        });
      }, 500);
      return;
    }

    // Update status to screening
    const targetId = toScreen[idx].id;
    const cIdx = candidates.value.findIndex(c => c.id === targetId);
    if (cIdx !== -1) candidates.value[cIdx].status = "screening";

    // Update progress
    batchScreenProgress.value.current = idx + 1;
    batchScreenProgress.value.items = batchScreenProgress.value.items.map((item, i) => ({
      ...item,
      status: i < idx ? "done" : i === idx ? "running" : "waiting",
    }));

    idx++;
  }, 900);
};

// Files
const addMockFiles = () => {
  const names = ["陈思远_简历.pdf", "刘梦琪_简历.docx", "张伟_工作经历.pdf", "林小红_CV.pdf"];
  const newFiles = names.map((name, i) => ({
    id: `f_${Date.now()}_${i}`,
    name,
    candidateName: name.split("_")[0],
    size: `${(Math.random() * 3 + 0.5).toFixed(1)} MB`,
    status: "parsed",
    matched: false,
    matchedPosition: null, // Object placeholder
    matchScore: null,
    confidence: null,
    reason: null,
  }));
  uploadedFiles.value = [...uploadedFiles.value, ...newFiles];
  setShowUploadMatchResult(false);
};

const confirmUploadMatches = () => {
  const newCandidates = uploadMatchResults.value.map((r, i) => ({
    id: `new_${Date.now()}_${i}`,
    name: r.name.split('_')[0], // Extract name
    score: null,
    hr: null,
    tech: null,
    mgr: null,
    status: "pending",
    positionId: r.matchedPosition.id,
    matchScore: r.matchScore,
    matchReason: r.reason,
    matchConfidence: r.confidence,
    time: new Date().toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }),
    screened: false,
  }));
  candidates.value = [...candidates.value, ...newCandidates];
  uploadedFiles.value = [];
  uploadMatchResults.value = [];
  setShowUploadMatchResult(false);
  activeTab.value = "candidates";
};

const clearUploads = () => {
  uploadedFiles.value = [];
  setShowUploadMatchResult(false);
}

const setShowUploadMatchResult = (val) => {
  showUploadMatchResult.value = val;
};
</script>

<style scoped>
/* Keyframes */
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
@keyframes dropFly {
  0% { transform: scale(1); opacity: 1; }
  50% { transform: scale(0.7) translateX(-100px); opacity: 0.6; }
  100% { transform: scale(0.3) translateX(-200px); opacity: 0; }
}
@keyframes dropReceive {
  0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.4); }
  50% { transform: scale(1.04); box-shadow: 0 0 0 8px rgba(99, 102, 241, 0.1); }
  100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(99, 102, 241, 0); }
}
@keyframes progressPulse { 0%, 100% { opacity: 0.8; } 50% { opacity: 1; } }
@keyframes slideIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
@keyframes matchGlow { 0% { box-shadow: 0 0 0 0 rgba(245,158,11,0.4); } 100% { box-shadow: 0 0 0 12px rgba(245,158,11,0); } }

/* Base Layout */
.app-container {
  display: flex;
  height: 100vh;
  font-family: 'Noto Sans SC', 'PingFang SC', -apple-system, sans-serif;
  background: #f0f2f5;
  overflow: hidden;
  color: #1a1a2e;
}

/* Sidebar */
.sidebar {
  width: 230px;
  background: #fff;
  border-right: 1px solid #e8e8e8;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}
.sidebar-header {
  padding: 16px 14px 10px;
  border-bottom: 1px solid #f0f0f0;
}
.sidebar-title {
  font-size: 14px;
  font-weight: 700;
  color: #1a1a2e;
  margin-bottom: 2px;
}
.sidebar-subtitle {
  font-size: 11px;
  color: #9ca3af;
}
.sidebar-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}
.pos-item {
  padding: 10px 12px;
  border-radius: 10px;
  cursor: pointer;
  margin-bottom: 4px;
  background: #fff;
  border: 1.5px solid #f0f0f0;
  transition: all 0.2s;
}
.pos-item.active {
  background: linear-gradient(135deg, #e0e7ff 0%, #ede9fe 100%);
  border-color: #818cf8;
}
.pos-item.drag-over {
  background: linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%) !important;
  border-color: #6366f1 !important;
  transform: scale(1.02);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2), 0 4px 12px rgba(99, 102, 241, 0.15);
}
.pos-item-receive {
  animation: dropReceive 0.5s ease-out;
}
.pos-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}
.pos-title {
  font-size: 13px;
  font-weight: 500;
  color: #374151;
}
.pos-title.active-text {
  font-weight: 700;
  color: #4338ca;
}
.pos-count {
  font-size: 11px;
  font-weight: 600;
  padding: 1px 7px;
  border-radius: 10px;
  background: #f3f4f6;
  color: #6b7280;
}
.pos-count.active-badge {
  background: rgba(67,56,202,0.12);
  color: #4338ca;
}
.pos-info {
  font-size: 11px;
  color: #9ca3af;
  display: flex;
  gap: 8px;
}
.pos-badge-warning {
  color: #f59e0b;
  font-weight: 600;
}
.drag-hint {
  margin-top: 6px;
  padding: 6px 8px;
  border-radius: 6px;
  background: rgba(99, 102, 241, 0.08);
  border: 1px dashed #818cf8;
  font-size: 11px;
  color: #4338ca;
  text-align: center;
  font-weight: 500;
}
.sidebar-footer {
  padding: 10px;
  border-top: 1px solid #f0f0f0;
}
.add-pos-btn {
  width: 100%;
  padding: 7px;
  font-size: 12px;
  border: 1px dashed #d1d5db;
  border-radius: 8px;
  background: transparent;
  color: #6b7280;
  cursor: pointer;
}

/* Main Content */
.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.top-bar {
  background: #fff;
  border-bottom: 1px solid #e8e8e8;
  padding: 10px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}
.top-bar-left {
  display: flex;
  align-items: center;
  gap: 14px;
}
.page-title {
  margin: 0;
  font-size: 17px;
  font-weight: 700;
  color: #1a1a2e;
}
.stats-row {
  display: flex;
  gap: 10px;
  font-size: 12px;
}
.stat-item { color: #6b7280; }
.stat-item.completed { color: #10b981; }
.stat-item.processing { color: #3b82f6; }

.top-bar-right {
  display: flex;
  gap: 8px;
}
.tab-btn {
  padding: 6px 16px;
  font-size: 13px;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  font-weight: 500;
  background: #f3f4f6;
  color: #6b7280;
  display: flex;
  align-items: center;
  gap: 4px;
}
.tab-btn.active {
  background: #4338ca;
  color: #fff;
}
.badge-count {
  font-size: 10px;
  background: #ef4444;
  color: #fff;
  border-radius: 8px;
  padding: 1px 5px;
}

.content-area {
  flex: 1;
  display: flex;
  overflow: hidden;
}
.tab-pane {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.candidates-pane { flex: 1; }

/* Toolbar */
.toolbar {
  padding: 8px 24px;
  background: #fafafa;
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
  flex-wrap: wrap;
}
.label { font-size: 12px; color: #999; }
.filter-btn {
  padding: 3px 10px;
  font-size: 12px;
  border-radius: 4px;
  border: none;
  cursor: pointer;
  background: transparent;
  color: #6b7280;
}
.filter-btn.active {
  background: #e0e7ff;
  color: #4338ca;
  font-weight: 600;
}
.spacer { flex: 1; }
.sort-select {
  font-size: 12px;
  padding: 3px 8px;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  background: #fff;
}
.action-btn {
  padding: 5px 14px;
  font-size: 12px;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  font-weight: 600;
}
.action-btn.primary {
  background: #6366f1;
  color: #fff;
}
.action-btn.disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: #a5b4fc;
}

/* Batch Progress */
.batch-progress-panel {
  padding: 10px 24px;
  background: linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%);
  border-bottom: 1px solid #c7d2fe;
  animation: slideIn 0.3s;
}
.progress-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 6px;
}
.progress-title { font-size: 13px; font-weight: 600; color: #4338ca; }
.progress-percent { font-size: 12px; color: #6366f1; }
.progress-bar-bg {
  height: 6px;
  background: #c7d2fe;
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 8px;
}
.progress-bar-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.4s;
  background: linear-gradient(90deg, #6366f1, #818cf8);
}
.progress-items {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.batch-progress-item {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: 500;
  animation: slideIn 0.2s ease-out;
}
.batch-progress-item.done { background: #dcfce7; color: #16a34a; }
.batch-progress-item.running { background: #dbeafe; color: #2563eb; border: 1px solid #93c5fd; }
.batch-progress-item.waiting { background: #f3f4f6; color: #9ca3af; }

/* Table/List */
.table-container {
  flex: 1;
  overflow-y: auto;
  padding: 12px 24px;
}
.table-header {
  display: grid;
  grid-template-columns: minmax(100px,1fr) 80px 180px 90px 100px 80px;
  gap: 8px;
  padding: 6px 12px;
  font-size: 11px;
  color: #9ca3af;
  font-weight: 600;
  letter-spacing: 0.5px;
  border-bottom: 1px solid #e5e7eb;
  margin-bottom: 4px;
}
.text-center { text-align: center; }
.text-right { text-align: right; }
.text-gray-300 { color: #d1d5db; }

.candidate-row {
  display: grid;
  grid-template-columns: minmax(100px,1fr) 80px 180px 90px 100px 80px;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 8px;
  margin-bottom: 3px;
  background: #fff;
  border: 1px solid #f0f0f0;
  align-items: center;
  transition: all 0.15s;
  cursor: grab;
}
.candidate-row:active { cursor: grabbing; }
.candidate-row.selected {
  background: #ede9fe;
  border: 1.5px solid #818cf8;
}
.candidate-row.is-dragging {
  opacity: 0.3;
  background: #f0f0f0 !important;
}
.candidate-row.fly-out {
  animation: dropFly 0.5s ease-in forwards;
}

.col-name { display: flex; align-items: center; gap: 6px; }
.drag-handle { color: #c7d2fe; font-size: 14px; cursor: grab; }
.name-text { font-size: 13px; font-weight: 600; color: #1a1a2e; }
.confidence-badge {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 4px;
  font-weight: 600;
}

.match-score {
  font-size: 14px;
  font-weight: 700;
}

.col-score { display: flex; gap: 4px; align-items: center; }
.score-badge {
  font-size: 13px;
  font-weight: 600;
  padding: 1px 6px;
  border-radius: 4px;
}
.score-detail { font-size: 10px; color: #9ca3af; }

.progress-mini-track {
  flex: 1;
  height: 4px;
  background: #e5e7eb;
  border-radius: 2px;
  overflow: hidden;
}
.progress-mini-bar {
  height: 100%;
  border-radius: 2px;
  animation: progressPulse 1.5s infinite;
}

.status-dot {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
}
.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  display: inline-block;
}

.col-time { font-size: 11px; color: #9ca3af; }

.action-btn-small {
  font-size: 10px;
  padding: 2px 7px;
  border-radius: 4px;
  cursor: pointer;
}
.action-btn-small.green {
  border: 1px solid #d1fae5;
  background: #ecfdf5;
  color: #059669;
}
.action-btn-small.red {
  border: 1px solid #fecaca;
  background: #fef2f2;
  color: #dc2626;
}

.empty-state {
  text-align: center;
  padding: 48px;
  color: #9ca3af;
}
.empty-icon { font-size: 32px; margin-bottom: 8px; }
.empty-text { font-size: 14px; }
.empty-btn {
  margin-top: 12px;
  padding: 6px 18px;
  font-size: 13px;
  border-radius: 6px;
  border: none;
  background: #4338ca;
  color: #fff;
  cursor: pointer;
}

/* Upload Pane */
.upload-pane {
  padding: 24px;
  overflow-y: auto;
}
.upload-container {
  max-width: 720px;
  margin: 0 auto;
}
.upload-header { margin-bottom: 16px; }
.upload-header h3 { margin: 0 0 4px; font-size: 16px; font-weight: 700; color: #1a1a2e; }
.upload-header p { margin: 0; font-size: 13px; color: #9ca3af; }

.drop-zone {
  border: 2px dashed #d1d5db;
  border-radius: 12px;
  padding: 40px 24px;
  text-align: center;
  background: #fafafa;
  margin-bottom: 16px;
}
.drop-icon { font-size: 36px; margin-bottom: 6px; }
.drop-text { margin: 0 0 10px; font-size: 14px; color: #4b5563; }
.select-file-btn {
  padding: 8px 24px;
  font-size: 13px;
  border-radius: 6px;
  border: none;
  background: #4338ca;
  color: #fff;
  cursor: pointer;
  font-weight: 500;
}
.drop-hint { margin: 10px 0 0; font-size: 12px; color: #9ca3af; }

.file-list-card {
  background: #fff;
  border-radius: 10px;
  border: 1px solid #f0f0f0;
  overflow: hidden;
  margin-bottom: 16px;
}
.file-list-header {
  padding: 10px 16px;
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.file-list-header .title { font-size: 13px; font-weight: 600; color: #374151; }
.clear-btn { font-size: 12px; color: #ef4444; background: none; border: none; cursor: pointer; }

.file-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  border-bottom: 1px solid #f8f8f8;
  transition: background 0.5s;
}
.match-glow { animation: matchGlow 0.6s ease-out; }

.file-info { display: flex; align-items: center; gap: 10px; }
.file-icon { font-size: 16px; }
.file-name { font-size: 13px; font-weight: 500; color: #1a1a2e; }
.file-size { font-size: 11px; color: #9ca3af; }

.match-info { display: flex; align-items: center; gap: 8px; }
.match-details { text-align: right; }
.match-pos { font-size: 12px; font-weight: 600; color: #374151; }
.match-stats { display: flex; align-items: center; gap: 4px; justify-content: flex-end; }
.pos-select {
  font-size: 11px;
  padding: 3px 6px;
  border-radius: 4px;
  border: 1px solid #e5e7eb;
  background: #fff;
  width: 100px;
}
.pending-text { font-size: 12px; color: #9ca3af; }

.file-actions {
  padding: 12px 16px;
  display: flex;
  gap: 8px;
  align-items: center;
  background: #fafafa;
}
.block-btn { flex: 1; padding: 10px; font-size: 14px; border-radius: 8px; font-weight: 700; color: #fff; }
.start-match { background: linear-gradient(135deg, #f59e0b, #d97706); }
.matching { background: #a5b4fc; }
.confirm { background: #059669; }
.retry { padding: 10px 16px; font-size: 13px; border-radius: 8px; border: 1px solid #e5e7eb; background: #fff; color: #6b7280; }

.auto-match-progress {
  background: linear-gradient(135deg, #fffbeb, #fef3c7);
  border-radius: 10px;
  padding: 16px;
  border: 1px solid #fde68a;
  margin-bottom: 16px;
  animation: slideIn 0.3s;
}
.amp-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.amp-title { font-size: 13px; font-weight: 600; color: #92400e; }
.amp-percent { font-size: 12px; color: #d97706; font-weight: 600; }
.amp-track { height: 8px; background: #fde68a; border-radius: 4px; overflow: hidden; }
.amp-fill { height: 100%; border-radius: 4px; transition: width 0.3s; background: linear-gradient(90deg, #f59e0b, #d97706); }
.amp-hint { margin: 8px 0 0; font-size: 12px; color: #92400e; opacity: 0.8; }

.guide-card {
  background: #fff;
  border-radius: 10px;
  padding: 20px;
  border: 1px solid #f0f0f0;
}
.guide-title { font-size: 13px; font-weight: 600; color: #374151; margin-bottom: 12px; }
.steps-row { display: flex; gap: 12px; }
.step-item { flex: 1; text-align: center; position: relative; }
.step-circle {
  width: 32px; height: 32px; border-radius: 50%; color: #fff;
  display: flex; align-items: center; justify-content: center;
  font-size: 14px; font-weight: 700; margin: 0 auto 6px;
}
.step-title { font-size: 12px; font-weight: 600; color: #374151; margin-bottom: 2px; }
.step-desc { font-size: 11px; color: #9ca3af; }
.step-arrow { position: absolute; right: -20px; top: 16px; color: #d1d5db; }

/* Details Panel */
.details-panel {
  width: 320px;
  background: #fff;
  border-left: 1px solid #e8e8e8;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  flex-shrink: 0;
}
.panel-scroll { flex: 1; overflow-y: auto; }
.panel-header {
  padding: 16px 18px 12px;
  border-bottom: 1px solid #f0f0f0;
}
.ph-top { display: flex; justify-content: space-between; align-items: flex-start; }
.ph-name { margin: 0 0 4px; font-size: 17px; font-weight: 700; color: #1a1a2e; }
.ph-badges { display: flex; align-items: center; gap: 6px; }
.close-btn { background: none; border: none; font-size: 16px; color: #9ca3af; cursor: pointer; padding: 4px; }

.section { padding: 14px 18px; border-bottom: 1px solid #f0f0f0; }
.section.actions { display: flex; flexDirection: column; gap: 6px; }
.section-title { font-size: 11px; font-weight: 600; color: #6b7280; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; }

.match-display { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; }
.match-ring {
  width: 52px; height: 52px; border-radius: 50%;
  position: relative;
  display: flex; align-items: center; justify-content: center;
}
.match-ring-inner {
  width: 40px; height: 40px; border-radius: 50%; background: #fff;
  display: flex; align-items: center; justify-content: center;
  font-size: 15px; font-weight: 700;
}
.match-val-text { font-size: 13px; font-weight: 600; }
.match-sub-text { font-size: 11px; color: #6b7280; }
.reason-box { font-size: 12px; color: #4b5563; background: #f9fafb; padding: 8px; border-radius: 6px; line-height: 1.5; }

.score-display { text-align: center; margin-bottom: 10px; }
.score-big { font-size: 32px; font-weight: 800; }
.score-label { font-size: 12px; color: #9ca3af; margin-left: 4px; }
.score-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px; }
.score-item { text-align: center; padding: 6px 0; background: #f9fafb; border-radius: 6px; }
.si-val { font-size: 16px; font-weight: 700; }
.si-label { font-size: 10px; color: #9ca3af; }

.action-btn.block { width: 100%; padding: 9px; font-size: 13px; border-radius: 8px; margin-bottom: 6px; }
.action-btn.default { background: #fff; color: #6b7280; border: 1px solid #e5e7eb; }

.empty-panel { padding: 40px 18px; text-align: center; }
.emoji-lg { font-size: 36px; margin-bottom: 10px; }
.empty-title { font-size: 14px; font-weight: 500; color: #374151; margin-bottom: 12px; }
.empty-title.red { color: #dc2626; }
.empty-title.gray { color: #6b7280; }
.empty-desc { font-size: 12px; color: #9ca3af; margin-top: 6px; }
.w-full { width: 100%; }

/* Stats Panel (Right Sidebar when no selection) */
.ph-title-sm { margin: 0 0 2px; font-size: 14px; font-weight: 700; color: #1a1a2e; }
.ph-desc { margin: 0; font-size: 11px; color: #9ca3af; }

.dist-row {
  display: flex; justify-content: space-between; padding: 7px 10px;
  margin-bottom: 3px; border-radius: 6px;
}
.dist-label { font-size: 12px; font-weight: 500; }
.dist-count { font-size: 14px; font-weight: 700; }

.top-candidate-row {
  display: flex; align-items: center; gap: 8px; padding: 8px 10px;
  margin-bottom: 4px; border-radius: 8px; background: #fff; border: 1px solid #f0f0f0;
  cursor: pointer;
}
.rank-num {
  width: 22px; height: 22px; border-radius: 50%; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  font-size: 10px; font-weight: 700;
}
.tc-info { flex: 1; min-width: 0; }
.tc-name { font-size: 12px; font-weight: 600; color: #1a1a2e; }
.tc-reason { font-size: 10px; color: #9ca3af; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tc-score { font-size: 14px; font-weight: 700; flex-shrink: 0; }

.tip-box {
  padding: 10px; background: #ede9fe; border-radius: 8px;
  font-size: 12px; color: #4338ca; line-height: 1.5;
}

/* Drag Overlay */
.drag-overlay {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  pointer-events: none; z-index: 1000;
}
.drag-sidebar-highlight {
  position: absolute; left: 0; top: 0; width: 230px; height: 100%;
  background: rgba(99, 102, 241, 0.03);
  border-right: 2px solid rgba(99, 102, 241, 0.3);
}
.drag-msg {
  position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
  font-size: 13px; color: #4338ca; font-weight: 600; background: rgba(255,255,255,0.9);
  padding: 8px 16px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}
</style>