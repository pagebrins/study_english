package service

import "study_english/backend/internal/model"

func enrichGeneratedQuestions(items []GeneratedQuestion) {
	builder := NewPronunciationService()
	for index := range items {
		items[index].QuestionPronunciation = builder.TryBuildEnglish(items[index].Question)
		items[index].AnswerKeyPronunciation = builder.TryBuildEnglish(items[index].AnswerKey)
	}
}

func enrichWordsWithPronunciation(items []model.Word) {
	builder := NewPronunciationService()
	for index := range items {
		items[index].WordPronunciation = builder.TryBuildEnglish(items[index].Word)
		items[index].ExamplePronunciation = builder.TryBuildEnglish(items[index].Example)
	}
}

func enrichQuestionHistoryWithPronunciation(items []model.UserQuestion) {
	builder := NewPronunciationService()
	for index := range items {
		items[index].QuestionPronunciation = builder.TryBuildEnglish(items[index].Question)
		items[index].AnswerKeyPronunciation = builder.TryBuildEnglish(items[index].AnswerKey)
	}
}

func enrichAssessmentItemsWithPronunciation(items []model.LearningAssessmentItem) {
	builder := NewPronunciationService()
	for index := range items {
		items[index].QuestionPronunciation = builder.TryBuildEnglish(items[index].Question)
		items[index].AnswerKeyPronunciation = builder.TryBuildEnglish(items[index].AnswerKey)
	}
}
