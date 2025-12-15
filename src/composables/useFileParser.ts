/**
 * 文件解析 composable
 * 提供文件读取和解析功能，支持 PDF、DOCX、TXT、Markdown
 */

export function useFileParser() {
  // 读取文件为 ArrayBuffer
  const readFileAsArrayBuffer = (file: File): Promise<ArrayBuffer> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as ArrayBuffer)
      reader.onerror = () => reject(new Error('文件读取失败'))
      reader.readAsArrayBuffer(file)
    })
  }

  // 读取文件为文本（支持解析 PDF、Word、TXT、Markdown）
  const readFileAsText = async (file: File): Promise<string> => {
    const name = file.name.toLowerCase()
    const ext = name.split('.').pop() || ''

    // TXT、Markdown 文件直接读取
    if (file.type.includes('text') || ext === 'txt' || ext === 'md') {
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string || '')
        reader.onerror = () => reject(new Error('文件读取失败'))
        reader.readAsText(file)
      })
    }

    // Word 文件 (.docx) 使用 mammoth 解析
    if (ext === 'docx') {
      try {
        const mammothModule = await import('mammoth')
        const mammoth = mammothModule.default || mammothModule
        const arrayBuffer = await readFileAsArrayBuffer(file)
        const result = await mammoth.extractRawText({ arrayBuffer })
        return result.value || `[${file.name} 的内容解析为空]`
      } catch (err) {
        console.error('mammoth 解析失败:', err)
        return `[${file.name} - Word 解析失败: ${err}]`
      }
    }

    // PDF 文件使用 pdfjs-dist 解析
    if (ext === 'pdf') {
      try {
        const arrayBuffer = await readFileAsArrayBuffer(file)
        const pdfjsLib = await import('pdfjs-dist')
        
        // 使用 Vite 的 ?url 导入本地 worker
        const workerUrl = await import('pdfjs-dist/build/pdf.worker.min.mjs?url')
        pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl.default

        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer })
        const pdf = await loadingTask.promise

        let fullText = ''
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i)
          const content = await page.getTextContent()
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const strings = content.items.map((item: any) => item.str).join(' ')
          fullText += strings + '\n'
        }

        return fullText.trim() || `[${file.name} 的内容解析为空]`
      } catch (err) {
        console.error('pdf.js 解析失败:', err)
        return `[${file.name} - PDF 解析失败: ${err}]`
      }
    }

    // 其他格式
    return `[${file.name} - 不支持的文件格式]`
  }

  return {
    readFileAsArrayBuffer,
    readFileAsText
  }
}
