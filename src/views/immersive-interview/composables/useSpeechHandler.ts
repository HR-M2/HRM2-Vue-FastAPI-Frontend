import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useSpeechRecognition, getAliyunConfig, saveAliyunConfig } from '@/composables/useSpeechRecognition'

interface SpeechHandlerDeps {
  switchSpeaker: (content?: string) => void
  syncMessages: () => any
}

/**
 * 语音转写处理 composable
 * 封装阿里云语音识别配置、转写启停、发言人切换等逻辑
 */
export function useSpeechHandler(deps: SpeechHandlerDeps) {
  const { switchSpeaker, syncMessages } = deps

  // 累积转录文本
  const accumulatedTranscript = ref('')

  // 阿里云配置
  const showAliyunConfigDialog = ref(false)
  const aliyunConfig = ref({
    appKey: '',
    token: ''
  })

  // 语音识别
  const {
    isSupported: speechSupported,
    isListening: isSpeechListening,
    isConfigured: isSpeechConfigured,
    interimTranscript: speechInterim,
    start: startSpeech,
    stop: stopSpeech,
    reset: resetSpeech,
    updateConfig: updateSpeechConfig
  } = useSpeechRecognition({
    lang: 'zh-CN',
    continuous: true,
    interimResults: true,
    onResult: (text, isFinal) => {
      if (isFinal && text.trim()) {
        if (accumulatedTranscript.value) {
          accumulatedTranscript.value += ' ' + text.trim()
        } else {
          accumulatedTranscript.value = text.trim()
        }
      }
    },
    onError: (errorMsg) => {
      console.error('语音识别错误:', errorMsg)
    }
  })

  // 加载阿里云配置
  const loadAliyunConfig = () => {
    const saved = getAliyunConfig()
    if (saved) {
      aliyunConfig.value.appKey = saved.appKey || ''
      aliyunConfig.value.token = saved.token || ''
    }
  }

  // 更新阿里云配置字段
  const handleUpdateAliyunConfig = (key: 'appKey' | 'token', value: string) => {
    aliyunConfig.value[key] = value
  }

  // 保存阿里云配置
  const handleSaveAliyunConfig = async () => {
    if (!aliyunConfig.value.appKey || !aliyunConfig.value.token) {
      ElMessage.warning('请填写完整的阿里云配置')
      return
    }
    
    saveAliyunConfig({
      type: 'aliyun',
      appKey: aliyunConfig.value.appKey,
      token: aliyunConfig.value.token
    })
    
    const success = await updateSpeechConfig({
      type: 'aliyun',
      appKey: aliyunConfig.value.appKey,
      token: aliyunConfig.value.token
    })
    
    if (success) {
      ElMessage.success('阿里云配置已保存')
      showAliyunConfigDialog.value = false
    }
  }

  // 切换语音识别
  const handleToggleSpeech = async () => {
    if (isSpeechListening.value) {
      // 正在录音，切换发言人
      handleSwitchSpeaker()
    } else {
      // 未录音，开始录音
      if (!isSpeechConfigured.value) {
        showAliyunConfigDialog.value = true
        return
      }
      
      const success = await startSpeech()
      if (success) {
        accumulatedTranscript.value = ''
        ElMessage.success('语音转写已开始')
      }
    }
  }

  // 切换发言人
  const handleSwitchSpeaker = () => {
    // 保存当前转录内容
    const content = accumulatedTranscript.value.trim()
    if (content) {
      switchSpeaker(content)
      // 同步到后端
      syncMessages()
    } else {
      // 即使没有内容也切换发言人
      switchSpeaker()
    }
    
    // 重置累积文本
    accumulatedTranscript.value = ''
    resetSpeech()
    
    // 重新开始语音识别
    startSpeech()
  }

  // 停止语音转写
  const handleStopSpeech = () => {
    // 保存最后的内容
    const content = accumulatedTranscript.value.trim()
    if (content) {
      switchSpeaker(content)
      syncMessages()
    }
    
    stopSpeech()
    accumulatedTranscript.value = ''
    ElMessage.info('语音转写已停止')
  }

  // 结束面试前的语音清理（供外部调用）
  const flushAndStopSpeech = () => {
    if (isSpeechListening.value) {
      const content = accumulatedTranscript.value.trim()
      if (content) {
        switchSpeaker(content)
      }
      stopSpeech()
      accumulatedTranscript.value = ''
    }
  }

  return {
    // 状态
    accumulatedTranscript,
    showAliyunConfigDialog,
    aliyunConfig,
    speechSupported,
    isSpeechListening,
    isSpeechConfigured,
    speechInterim,
    // 方法
    loadAliyunConfig,
    handleUpdateAliyunConfig,
    handleSaveAliyunConfig,
    handleToggleSpeech,
    handleSwitchSpeaker,
    handleStopSpeech,
    flushAndStopSpeech
  }
}
