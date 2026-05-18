import { learningPlanService } from '../../services/learningPlan'
import { questionService } from '../../services/question'
import { requireLogin } from '../../utils/guard'
import { miniappConfig } from '../../utils/config'
import { getSelectedMode, setExplainContext } from '../../utils/session'
import type { GeneratedQuestion } from '../../types/question'
import type { StudyMode } from '../../types/mode'

let pronunciationPlayer: WechatMiniprogram.InnerAudioContext | null = null
const resolveAudioURL = (url: string) =>
  /^https?:\/\//i.test(url) ? url : `${miniappConfig.apiBaseUrl}${url.startsWith('/') ? url : `/${url}`}`

type PracticeData = {
  mode: StudyMode | null
  loading: boolean
  submitting: boolean
  error: string
  generated: GeneratedQuestion[]
  answers: string[]
  issues: string[][]
}

Page<PracticeData>({
  data: {
    mode: getSelectedMode(),
    loading: false,
    submitting: false,
    error: '',
    generated: [],
    answers: [],
    issues: [],
  },
  onShow() {
    if (!requireLogin()) return
    void this.ensureLearningReady()
  },
  async ensureLearningReady() {
    try {
      const learningStatus = await learningPlanService.current()
      if (learningStatus.goal_required || learningStatus.assessment_required) {
        wx.showModal({
          title: '先完成学习设置',
          content: '你还没有完成学习目标或水平测试，系统将带你去设置页继续。',
          showCancel: false,
          success: () => wx.switchTab({ url: '/pages/modes/index' }),
        })
        return
      }
      const mode = getSelectedMode()
      this.setData({ mode })
    } catch (error) {
      this.setData({
        error: error instanceof Error ? error.message : '加载学习状态失败',
      })
    }
  },
  async generateQuestions() {
    const { mode, loading } = this.data
    if (!mode || loading) {
      if (!mode) wx.showToast({ title: '请先去模式页选择模式', icon: 'none' })
      return
    }
    this.setData({ loading: true, error: '', generated: [], answers: [], issues: [] })
    try {
      const generated = await questionService.generate(mode.id)
      this.setData({
        generated,
        answers: generated.map(() => ''),
        issues: generated.map(() => []),
      })
      this.syncExplainContext()
    } catch (error) {
      this.setData({
        error: error instanceof Error ? error.message : '生成题目失败',
      })
    } finally {
      this.setData({ loading: false })
    }
  },
  onAnswerInput(event: WechatMiniprogram.CustomEvent<{ value: string }>) {
    const index = Number(event.currentTarget.dataset.index)
    const answers = [...this.data.answers]
    answers[index] = event.detail.value
    this.setData({ answers })
    this.syncExplainContext()
  },
  async submitAnswer(event: WechatMiniprogram.CustomEvent) {
    const index = Number(event.currentTarget.dataset.index)
    const current = this.data.generated[index]
    const mode = this.data.mode
    if (!current || !mode || this.data.submitting) return
    const answer = this.data.answers[index] ?? ''
    this.setData({ submitting: true, error: '' })
    try {
      const issues = await questionService.analyze({
        mode_id: mode.id,
        question: current.question,
        answer_text: answer,
        answer_key: current.answer_key,
      })
      const issueMatrix = [...this.data.issues]
      issueMatrix[index] = issues
      this.setData({ issues: issueMatrix })
      await questionService.create({
        mode_id: mode.id,
        question: current.question,
        answer_key: current.answer_key,
        answer_text: answer,
        score: issues.length === 0 ? 100 : Math.max(60, 100 - issues.length * 10),
        pre_generated_id: current.pre_generated_id,
      })
      this.syncExplainContext(index + 1)
      wx.showToast({ title: '已提交', icon: 'success' })
    } catch (error) {
      this.setData({
        error: error instanceof Error ? error.message : '提交答案失败',
      })
    } finally {
      this.setData({ submitting: false })
    }
  },
  playPronunciation(event: WechatMiniprogram.CustomEvent<{ url: string }>) {
    const url = String(event.currentTarget.dataset.url || '')
    if (!url) return
    if (!pronunciationPlayer) {
      pronunciationPlayer = wx.createInnerAudioContext()
    }
    pronunciationPlayer.src = resolveAudioURL(url)
    pronunciationPlayer.play()
  },
  goChat() {
    this.syncExplainContext()
    wx.navigateTo({ url: '/pages/chat/index?source=practice' })
  },
  syncExplainContext(currentQuestionIndex?: number) {
    const mode = this.data.mode
    setExplainContext({
      page: 'practice',
      mode_id: mode?.id,
      study_type: mode?.type,
      translation_mode: mode?.mode,
      current_question_index,
      question_snapshots: this.data.generated.map((item, index) => ({
        index: index + 1,
        question: item.question,
        answer_key: item.answer_key,
        user_answer: this.data.answers[index] ?? '',
      })),
    })
  },
  onUnload() {
    pronunciationPlayer?.stop()
  },
})
