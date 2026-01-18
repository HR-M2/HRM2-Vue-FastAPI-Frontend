/**
 * 数据同步管理器
 * 用于批量数据处理、同步队列管理和定时器机制
 * 根据新API规范，使用统一的 utterances 结构进行数据同步
 */

import type { 
  SyncDataRequest, 
  Utterance,
  ImmersiveConfig 
} from './useImmersiveInterview'

export interface DataSyncManagerOptions {
  sessionId: string
  config: ImmersiveConfig
  apiCall: <T>(url: string, options?: RequestInit) => Promise<{ success: boolean; data?: T; message?: string }>
  onSyncSuccess?: (utterances: Utterance[]) => void
  onSyncError?: (error: any, utterances: Utterance[]) => void
  onRetryExhausted?: (utterances: Utterance[]) => void
}

export class DataSyncManager {
  // 统一的 utterances 队列
  private utterancesQueue: Utterance[] = []
  
  private syncTimer: number | null = null
  private readonly sessionId: string
  private readonly config: ImmersiveConfig
  private readonly apiCall: <T>(url: string, options?: RequestInit) => Promise<{ success: boolean; data?: T; message?: string }>
  
  // 回调函数
  private readonly onSyncSuccess?: (utterances: Utterance[]) => void
  private readonly onSyncError?: (error: any, utterances: Utterance[]) => void
  private readonly onRetryExhausted?: (utterances: Utterance[]) => void
  
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
   * 添加单条发言记录到同步队列
   */
  addUtterance(utterance: Utterance): void {
    this.utterancesQueue.push(utterance)
    this.checkAutoSync()
  }
  
  /**
   * 批量添加发言记录
   */
  addUtterances(utterances: Utterance[]): void {
    this.utterancesQueue.push(...utterances)
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
    return this.utterancesQueue.length >= this.config.maxBatchSize
  }
  
  /**
   * 获取队列中的总数据量
   */
  private getTotalQueueSize(): number {
    return this.utterancesQueue.length
  }
  
  /**
   * 获取队列状态信息
   */
  getQueueStatus(): {
    totalItems: number
    utterances: number
    isEmpty: boolean
  } {
    return {
      totalItems: this.utterancesQueue.length,
      utterances: this.utterancesQueue.length,
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
    const utterancesToSync = [...this.utterancesQueue]
    const payload: SyncDataRequest = { utterances: utterancesToSync }
    
    this.syncStats.totalSyncs++
    
    try {
      const result = await this.apiCall(`${this.API_BASE}/${this.sessionId}/sync`, {
        method: 'POST',
        body: JSON.stringify(payload)
      })
      
      const syncTime = Date.now() - startTime
      this.updateSyncStats(syncTime, true)
      
      if (result.success) {
        this.clearQueue()
        this.retryAttempts.delete(syncId)
        this.onSyncSuccess?.(utterancesToSync)
        return true
      } else {
        console.error('数据同步失败:', result.message)
        this.onSyncError?.(new Error(result.message || '同步失败'), utterancesToSync)
        await this.retrySync(utterancesToSync, syncId, 1)
        return false
      }
    } catch (error) {
      const syncTime = Date.now() - startTime
      this.updateSyncStats(syncTime, false)
      
      console.error('数据同步异常:', error)
      this.onSyncError?.(error, utterancesToSync)
      await this.retrySync(utterancesToSync, syncId, 1)
      return false
    }
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
  private async retrySync(utterances: Utterance[], syncId: string, attempt: number): Promise<void> {
    if (attempt > this.MAX_RETRIES) {
      console.error('数据同步重试次数已达上限，放弃同步')
      this.onRetryExhausted?.(utterances)
      return
    }
    
    this.syncStats.totalRetries++
    const delayIndex = Math.min(attempt - 1, this.RETRY_DELAYS.length - 1)
    const delay = this.RETRY_DELAYS[delayIndex] ?? 8000
    
    console.log(`数据同步重试 ${attempt}/${this.MAX_RETRIES}，${delay}ms 后重试`)
    
    setTimeout(async () => {
      try {
        const payload: SyncDataRequest = { utterances }
        const result = await this.apiCall(`${this.API_BASE}/${this.sessionId}/sync`, {
          method: 'POST',
          body: JSON.stringify(payload)
        })
        
        if (result.success) {
          console.log(`数据同步重试成功 (第${attempt}次重试)`)
          this.retryAttempts.delete(syncId)
          this.onSyncSuccess?.(utterances)
        } else {
          await this.retrySync(utterances, syncId, attempt + 1)
        }
      } catch (error) {
        await this.retrySync(utterances, syncId, attempt + 1)
      }
    }, delay)
  }
  
  /**
   * 检查队列是否为空
   */
  private isEmpty(): boolean {
    return this.utterancesQueue.length === 0
  }
  
  /**
   * 清空同步队列
   */
  private clearQueue(): void {
    this.utterancesQueue = []
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