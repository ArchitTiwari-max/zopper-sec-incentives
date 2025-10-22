// Run this in browser console to populate sample test data
function populateTestData() {
  const sampleSubmissions = [
    {
      secId: "SEC001",
      sessionToken: "token1",
      responses: [
        { questionId: 1, selectedAnswer: "B", answeredAt: "2024-01-20T10:30:00Z" },
        { questionId: 2, selectedAnswer: "C", answeredAt: "2024-01-20T10:31:00Z" },
        { questionId: 3, selectedAnswer: "B", answeredAt: "2024-01-20T10:32:00Z" },
        { questionId: 4, selectedAnswer: "B", answeredAt: "2024-01-20T10:33:00Z" },
        { questionId: 5, selectedAnswer: "B", answeredAt: "2024-01-20T10:34:00Z" },
        { questionId: 6, selectedAnswer: "C", answeredAt: "2024-01-20T10:35:00Z" },
        { questionId: 7, selectedAnswer: "B", answeredAt: "2024-01-20T10:36:00Z" },
        { questionId: 8, selectedAnswer: "B", answeredAt: "2024-01-20T10:37:00Z" },
        { questionId: 9, selectedAnswer: "B", answeredAt: "2024-01-20T10:38:00Z" },
        { questionId: 10, selectedAnswer: "C", answeredAt: "2024-01-20T10:39:00Z" }
      ],
      score: 90,
      totalQuestions: 10,
      submittedAt: "2024-01-20T10:39:30Z",
      completionTime: 570
    },
    {
      secId: "SEC002",
      sessionToken: "token2",
      responses: [
        { questionId: 1, selectedAnswer: "A", answeredAt: "2024-01-20T11:30:00Z" },
        { questionId: 2, selectedAnswer: "B", answeredAt: "2024-01-20T11:31:00Z" },
        { questionId: 3, selectedAnswer: "B", answeredAt: "2024-01-20T11:32:00Z" },
        { questionId: 4, selectedAnswer: "A", answeredAt: "2024-01-20T11:33:00Z" },
        { questionId: 5, selectedAnswer: "B", answeredAt: "2024-01-20T11:34:00Z" },
        { questionId: 6, selectedAnswer: "A", answeredAt: "2024-01-20T11:35:00Z" },
        { questionId: 7, selectedAnswer: "B", answeredAt: "2024-01-20T11:36:00Z" }
      ],
      score: 40,
      totalQuestions: 10,
      submittedAt: "2024-01-20T11:36:30Z",
      completionTime: 390
    },
    {
      secId: "SEC003",
      sessionToken: "token3",
      responses: [
        { questionId: 1, selectedAnswer: "B", answeredAt: "2024-01-20T12:30:00Z" },
        { questionId: 2, selectedAnswer: "C", answeredAt: "2024-01-20T12:31:00Z" },
        { questionId: 3, selectedAnswer: "B", answeredAt: "2024-01-20T12:32:00Z" },
        { questionId: 4, selectedAnswer: "B", answeredAt: "2024-01-20T12:33:00Z" },
        { questionId: 5, selectedAnswer: "A", answeredAt: "2024-01-20T12:34:00Z" },
        { questionId: 6, selectedAnswer: "C", answeredAt: "2024-01-20T12:35:00Z" },
        { questionId: 7, selectedAnswer: "B", answeredAt: "2024-01-20T12:36:00Z" },
        { questionId: 8, selectedAnswer: "B", answeredAt: "2024-01-20T12:37:00Z" },
        { questionId: 9, selectedAnswer: "B", answeredAt: "2024-01-20T12:38:00Z" },
        { questionId: 10, selectedAnswer: "C", answeredAt: "2024-01-20T12:39:00Z" }
      ],
      score: 80,
      totalQuestions: 10,
      submittedAt: "2024-01-20T12:39:30Z",
      completionTime: 570,
      isProctoringFlagged: true
    }
  ]

  localStorage.setItem('test_submissions', JSON.stringify(sampleSubmissions))
  console.log('Sample test data populated!')
  console.log('You can now view the results in the Admin Test Results page')
}