/**
 * 数据同步管理器
 * 用于批量数据处理、同步队列管理和定时器机制
 */

import type { 
  SyncDataRequest, 
  TranscriptRecord, 
  SpeakerSegment, 
  StateRecord,
  ImmersiveConfig 
} from './useImmersiveInterview'

export interface DataSyncManagerOptions {
  sessionId: string
  config: ImmersiveConfig
  apiCall: <T>(url: string, options?: RequestInit) => Promise<{ success: boolean; data?: T; message?: string }>
  onSyncSuccess?: (data: SyncDataRequest) => void
  onSyncError?: (error: any, data: SyncDataRequest) => void
  onRetryExhausted?: (data: SyncDataRequest) => void
}

export class DataSyncManager {
  private syncQueue: SyncDataRequest = {
    transcripts: [],
    speaker_segments: [],
    state_records: []
  }
  
  private syncTimer: number | null = null
  private readonly sessionId: string
  private readonly config: ImmersiveConfig
  private readonly apiCall: <T>(url: string, options?: RequestInit) => Promise<{ success: boolean; data?: T; message?: string }>
  
  // 回调函数
  private readonly onSyncSuccess?: (data: SyncDataRequest) => void
  private readonly onSyncError?: (error: any, data: SyncDataRequest) => void
  private readonly onRetryExhausted?: (data: SyncDataRequest) => void
  
  // 重试管理
  private retryAttempts = new Map<string, number>()
  private readonly MAX_RETRIES = 3
  private readonly RETRY_DELAYS = [1000, 2000, 4000, 8000] // 指数退避，最大8秒
  
  // 性能监控
  private syncStats = {
    totalSyncs: 0,
    successfulSyncs: 0,
    failedSyncs: 0,
    totalRetries: 0,
    avgSyncTime: 0,
    lastSyncTime: 0
  }
  
  // API端点常量
  private readonly API_BASE = '/api/v1/immersive'
  
  constructor(options: DataSyncManagerOptions) {
    this.sessionId = options.sessionId
    this.config = options.config
    this.apiCall = options.apiCall
    this.onSyncSuccess = options.onSyncSuccess
    this.onSyncError = options.onSyncError
    this.onRetryExhausted = options.onRetryExhausted
  }
  
  /**
   * 添加转录记录到同步队列
   */
  addTranscript(transcript: TranscriptRecord): void {
    this.syncQueue.transcripts = this.syncQueue.transcripts || []
    this.syncQueue.transcripts.push(transcript)
    this.checkAutoSync()
  }
  
  /**
   * 添加说话人片段到同步队列
   */
  addSpeakerSegment(segment: SpeakerSegment): void {
    this.syncQueue.speaker_segments = this.syncQueue.speaker_segments || []
    this.syncQueue.speaker_segments.push(segment)
    this.checkAutoSync()
  }
  
  /**
   * 添加状态记录到同步队列
   */
  addStateRecord(state: StateRecord): void {
    this.syncQueue.state_records = this.syncQueue.state_records || []
    this.syncQueue.state_records.push(state)
    this.checkAutoSync()
  }
  
  /**
   * 批量添加多种类型的数据
   */
  addBatchData(data: Partial<SyncDataRequest>): void {
    if (data.transcripts?.length) {
      this.syncQueue.transcripts = this.syncQueue.transcripts || []
      this.syncQueue.transcripts.push(...data.transcripts)
    }
    
    if (data.speaker_segments?.length) {
      this.syncQueue.speaker_segments = this.syncQueue.speaker_segments || []
      this.syncQueue.speaker_segments.push(...data.speaker_segments)
    }
    
    if (data.state_records?.length) {
      this.syncQueue.state_records = this.syncQueue.state_records || []
      this.syncQueue.state_records.push(...data.state_records)
    }
    
    this.checkAutoSync()
  }
  
  /**
   * 检查是否需要自动同步
   */
  private checkAutoSync(): void {
    if (this.shouldSync() && !this.syncTimer) {
      // 立即同步，不等待定时器
      this.performSync()
    }
  }
  
  /**
   * 判断是否应该进行同步
   */
  private shouldSync(): boolean {
    const totalItems = this.getTotalQueueSize()
    return totalItems >= this.config.maxBatchSize
  }
  
  /**
   * 获取队列中的总数据量
   */
  private getTotalQueueSize(): number {
    return (this.syncQueue.transcripts?.length || 0) +
           (this.syncQueue.speaker_segments?.length || 0) +
           (this.syncQueue.state_records?.length || 0)
  }
  
  /**
   * 获取队列状态信息
   */
  getQueueStatus(): {
    totalItems: number
    transcripts: number
    speakerSegments: number
    stateRecords: number
    isEmpty: boolean
  } {
    return {
      totalItems: this.getTotalQueueSize(),
      transcripts: this.syncQueue.transcripts?.length || 0,
      speakerSegments: this.syncQueue.speaker_segments?.length || 0,
      stateRecords: this.syncQueue.state_records?.length || 0,
      isEmpty: this.isEmpty()
    }
  }
  
  /**
   * 获取同步统计信息
   */
  getSyncStats(): typeof this.syncStats {
    return { ...this.syncStats }
  }
  
  /**
   * 执行数据同步
   */
  async performSync(): Promise<boolean> {
    if (this.isEmpty()) {
      return true
    }
    
    const syncId = `sync_${Date.now()}`
    const startTime = Date.now()
    const dataToSync = this.createSyncPayload()
    
    this.syncStats.totalSyncs++
    
    try {
      const result = await this.apiCall(`${this.API_BASE}/${this.sessionId}/sync`, {
        method: 'POST',
        body: JSON.stringify(dataToSync)
      })
      
      const syncTime = Date.now() - startTime
      this.updateSyncStats(syncTime, true)
      
      if (result.success) {
        this.clearQueue()
        this.retryAttempts.delete(syncId)
        this.onSyncSuccess?.(dataToSync)
        return true
      } else {
        console.error('数据同步失败:', result.message)
        this.onSyncError?.(new Error(result.message || '同步失败'), dataToSync)
        await this.retrySync(dataToSync, syncId, 1)
        return false
      }
    } catch (error) {
      const syncTime = Date.now() - startTime
      this.updateSyncStats(syncTime, false)
      
      console.error('数据同步异常:', error)
      this.onSyncError?.(error, dataToSync)
      await this.retrySync(dataToSync, syncId, 1)
      return false
    }
  }
  
  /**
   * 创建同步负载，优化数据大小
   */
  private createSyncPayload(): SyncDataRequest {
    const payload: SyncDataRequest = {}
    
    // 只包含非空数组
    if (this.syncQueue.transcripts?.length) {
      payload.transcripts = [...this.syncQueue.transcripts]
    }
    
    if (this.syncQueue.speaker_segments?.length) {
      payload.speaker_segments = [...this.syncQueue.speaker_segments]
    }
    
    if (this.syncQueue.state_records?.length) {
      payload.state_records = [...this.syncQueue.state_records]
    }
    
    return payload
  }
  
  /**
   * 更新同步统计信息
   */
  private updateSyncStats(syncTime: number, success: boolean): void {
    if (success) {
      this.syncStats.successfulSyncs++
    } else {
      this.syncStats.failedSyncs++
    }
    
    // 计算平均同步时间
    const totalSuccessfulSyncs = this.syncStats.successfulSyncs
    if (totalSuccessfulSyncs > 0) {
      this.syncStats.avgSyncTime = (
        (this.syncStats.avgSyncTime * (totalSuccessfulSyncs - 1) + syncTime) / 
        totalSuccessfulSyncs
      )
    }
    
    this.syncStats.lastSyncTime = Date.now()
  }
  
  /**
   * 重试同步，使用指数退避策略
   */
  private async retrySync(data: SyncDataRequest, syncId: string, attempt: number): Promise<void> {
    if (attempt > this.MAX_RETRIES) {
      console.error('数据同步重试次数已达上限，放弃同步')
      this.onRetryExhausted?.(data)
      return
    }
    
    this.syncStats.totalRetries++
    const delayIndex = Math.min(attempt - 1, this.RETRY_DELAYS.length - 1)
    const delay = this.RETRY_DELAYS[delayIndex] ?? 8000
    
    console.log(`数据同步重试 ${attempt}/${this.MAX_RETRIES}，${delay}ms 后重试`)
    
    setTimeout(async () => {
      try {
        const result = await this.apiCall(`${this.API_BASE}/${this.sessionId}/sync`, {
          method: 'POST',
          body: JSON.stringify(data)
        })
        
        if (result.success) {
          console.log(`数据同步重试成功 (第${attempt}次重试)`)
          this.retryAttempts.delete(syncId)
          this.onSyncSuccess?.(data)
        } else {
          await this.retrySync(data, syncId, attempt + 1)
        }
      } catch (error) {
        await this.retrySync(data, syncId, attempt + 1)
      }
    }, delay)
  }
  
  /**
   * 检查队列是否为空
   */
  private isEmpty(): boolean {
    return (!this.syncQueue.transcripts?.length) &&
           (!this.syncQueue.speaker_segments?.length) &&
           (!this.syncQueue.state_records?.length)
  }
  
  /**
   * 清空同步队列
   */
  private clearQueue(): void {
    this.syncQueue = {
      transcripts: [],
      speaker_segments: [],
      state_records: []
    }
  }
  
  /**
   * 启动自动同步定时器
   */
  startAutoSync(): void {
    if (this.syncTimer) {
      console.warn('自动同步已经启动')
      return
    }
    
    console.log(`启动自动同步，间隔: ${this.config.syncInterval}秒`)
    
    this.syncTimer = window.setInterval(() => {
      if (!this.isEmpty()) {
        this.performSync()
      }
    }, this.config.syncInterval * 1000)
  }
  
  /**
   * 停止自动同步定时器
   */
  stopAutoSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer)
      this.syncTimer = null
      console.log('自动同步已停止')
    }
  }
  
  /**
   * 立即强制同步所有数据
   */
  async forceSyncNow(): Promise<boolean> {
    console.log('强制立即同步数据')
    return await this.performSync()
  }
  
  /**
   * 清空队列但不同步（用于紧急情况）
   */
  clearQueueWithoutSync(): void {
    const queueStatus = this.getQueueStatus()
    console.warn('清空同步队列但不同步数据:', queueStatus)
    this.clearQueue()
  }
  
  /**
   * 重置同步统计信息
   */
  resetStats(): void {
    this.syncStats = {
      totalSyncs: 0,
      successfulSyncs: 0,
      failedSyncs: 0,
      totalRetries: 0,
      avgSyncTime: 0,
      lastSyncTime: 0
    }
    this.retryAttempts.clear()
  }
  
  /**
   * 更新配置（动态配置更新）
   */
  updateConfig(newConfig: Partial<ImmersiveConfig>): void {
    Object.assign(this.config, newConfig)
    
    // 如果同步间隔改变，重启定时器
    if (newConfig.syncInterval !== undefined && this.syncTimer) {
      this.stopAutoSync()
      this.startAutoSync()
    }
  }
  
  /**
   * 销毁管理器，清理所有资源
   */
  destroy(): void {
    this.stopAutoSync()
    this.clearQueue()
    this.retryAttempts.clear()
    this.resetStats()
    console.log('DataSyncManager 已销毁')
  }
}