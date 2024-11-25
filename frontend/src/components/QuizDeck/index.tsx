import { useEffect, useState } from "react";
import "./styles.scss";
import http from "utils/api"; // Assuming `http` is the instance for API requests
import { useParams } from "react-router";

interface QuizProps {
  cards: { front: string; back: string; hint: string }[];
}

export default function Quiz({ cards }: QuizProps) {
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isQuizFinished, setIsQuizFinished] = useState(false);
  const [shuffledOptions, setShuffledOptions] = useState<string[]>([]);
  const [incorrectAnswers, setIncorrectAnswers] = useState(0);
  const [inputTime, setInputTime] = useState<string>(""); // Store the user input time
  const [quizTime, setQuizTime] = useState<number | null>(null); // Timer for the entire quiz
  const [timeLeft, setTimeLeft] = useState<number>(0); // Remaining time for the quiz
  const { id } = useParams();
  const currentCard = cards[currentCardIndex];
  const [incorrectQuestions, setIncorrectQuestions] = useState<
    { question: string; correctAnswer: string; userAnswer: string | null }[]
  >([]);

  // Set quiz time and initialize the timer
  const startQuiz = () => {
    const totalTimeInSeconds = parseInt(inputTime, 10) * 60;
    if (!isNaN(totalTimeInSeconds) && totalTimeInSeconds >= 0) {
      setQuizTime(totalTimeInSeconds);
      setTimeLeft(totalTimeInSeconds);
    } else {
      alert("Please enter a valid time in minutes.");
    }
  };

  useEffect(() => {
    if (currentCard) {
      setShuffledOptions(shuffleOptions(cards, currentCard.back));
    }
  }, [currentCard, cards]);

  useEffect(() => {
    if (timeLeft <= 0 && quizTime) {
      endQuiz(); // End quiz if time runs out
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prevTime) => prevTime - 1);
    }, 1000);

    return () => clearInterval(timer); // Clean up on component unmount or re-render
  }, [timeLeft, quizTime]);

  function shuffleOptions(cards: QuizProps["cards"], correctAnswer: string) {
    const otherOptions = cards
      .map((card) => card.back)
      .filter((answer) => answer !== correctAnswer);
    const shuffled = [correctAnswer, ...otherOptions.slice(0, 3)].sort(
      () => Math.random() - 0.5
    );
    return shuffled;
  }

  const handleOptionClick = (option: string) => {
    setSelectedOption(option);
    const isCorrect = option === currentCard.back;

    if (isCorrect) {
      // setScore((prevScore) => prevScore + 1);
      setScore((prevScore) => {
        const newScore = prevScore + 1;
        return newScore;
      });
    } else {
      setIncorrectAnswers((prevIncorrect) => {
        const newIncorrect = prevIncorrect + 1;
        return newIncorrect;
      });
      setIncorrectQuestions((prevIncorrectQuestions) => [
        ...prevIncorrectQuestions,
        {
          question: currentCard.front,
          correctAnswer: currentCard.back,
          userAnswer: option,
        },
      ]);
    }

    setTimeout(() => {
      setSelectedOption(null);

      goToNextQuestion(isCorrect);
    }, 1000);
  };

  const goToNextQuestion = (isCorrect: boolean) => {
    if (currentCardIndex + 1 < cards.length) {
      setCurrentCardIndex((prevIndex) => prevIndex + 1);
    } else {
      endQuiz();
    }
  };

  const endQuiz = () => {
    // Count unanswered questions as incorrect if the timer ran out
    const unansweredQuestions = cards.length - (currentCardIndex + 1);
    const finalIncorrectAnswers = incorrectAnswers + unansweredQuestions;
    setIncorrectAnswers(finalIncorrectAnswers);
    setIsQuizFinished(true);
    updateLeaderboard(score, finalIncorrectAnswers);
    console.log(score);
  };

  const updateLeaderboard = async (
    finalScore: number,
    finalIncorrectAnswers: number
  ) => {
    const flashCardUser = window.localStorage.getItem("flashCardUser");
    const { localId = "", email = "" } = flashCardUser
      ? JSON.parse(flashCardUser)
      : {};

    if (localId && email) {
      try {
        const response = await http.get(`/deck/${id}/user-score/${localId}`);

        const existingScore = response.data?.score["correct"];
        if (
          finalScore > existingScore ||
          (response.data.score["correct"] === 0 &&
            response.data.score["incorrect"] === 0)
        ) {
          await http.post(`/deck/${id}/update-leaderboard`, {
            userId: localId,
            userEmail: email,
            correct: finalScore,
            incorrect: finalIncorrectAnswers,
          });
        }

        // Create a unique attempt ID, you can use a timestamp or generate one
        const attemptId = new Date().toISOString();

        // Store the attempt in the quizAttempts collection
        await http.post(`/deck/${id}/add-quiz-attempt`, {
          userId: localId,
          userEmail: email,
          correct: finalScore, // Pass the final correct answers
          incorrect: finalIncorrectAnswers, // Pass the final incorrect answers
          lastAttempt: attemptId, // You can use the attempt ID or timestamp here
        });
      } catch (error) {
        console.error("Error updating leaderboard:", error);
      }
    }
  };

  const restartQuiz = () => {
    setCurrentCardIndex(0);
    setScore(0);
    setIsQuizFinished(false);
    setIncorrectAnswers(0);
    setIncorrectQuestions([]);
    setTimeLeft(quizTime || 0);
  };

  if (isQuizFinished) {
    return (
      <div className='quiz-summary'>
        <h2>Quiz Complete!</h2>
        <p>
          Your Score: {score} / {cards.length}
        </p>
        <p>Incorrect Answers: {cards.length - score}</p>
        <button className='btn btn-primary' onClick={restartQuiz}>
          Restart Quiz
        </button>
        <div className='incorrect-questions'>
          <h3>Questions You Got Wrong:</h3>
          {incorrectQuestions.length > 0 ? (
            <ul>
              {incorrectQuestions.map((question, index) => (
                <li key={index}>
                  <p>
                    <strong>Question:</strong> {question.question}
                  </p>
                  <p>
                    <strong>Your Answer:</strong> {question.userAnswer}
                  </p>
                  <p>
                    <strong>Correct Answer:</strong> {question.correctAnswer}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p>Great job! You got all questions correct!</p>
          )}
        </div>
      </div>
    );
  }

  if (quizTime === null) {
    return (
      <div className='quiz-time-setup'>
        <h2>Set Quiz Time</h2>
        <input
          type='number'
          placeholder='Enter time in minutes (0 for Timer Not Required)'
          value={inputTime}
          onChange={(e) => setInputTime(e.target.value)} // Update `inputTime` only
        />
        <button onClick={startQuiz} className='btn btn-primary'>
          Start Quiz
        </button>
      </div>
    );
  }

  return (
    <div className='quiz-container'>
      <h2>{currentCard.front}</h2>
      <div className='options'>
        {shuffledOptions.map((option, index) => (
          <button
            key={index}
            className={`option-btn ${
              selectedOption
                ? option === currentCard.back
                  ? "highlight-correct"
                  : selectedOption === option
                  ? "highlight-incorrect"
                  : ""
                : ""
            }`}
            onClick={() => handleOptionClick(option)}
            disabled={!!selectedOption}
          >
            {option}
          </button>
        ))}
      </div>
      <p>Score: {score}</p>
      <p>
        Question {currentCardIndex + 1} / {cards.length}
      </p>
      <p>Time Left: {timeLeft} seconds</p>
    </div>
  );
}
