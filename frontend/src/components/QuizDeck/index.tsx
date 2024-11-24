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
  const { id } = useParams();
  const currentCard = cards[currentCardIndex];

  useEffect(() => {
    if (currentCard) {
      setShuffledOptions(shuffleOptions(cards, currentCard.back));
    }
  }, [currentCard, cards]);

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

    // Update the score and incorrectAnswers based on the user's selection
    if (isCorrect) {
      setScore((prevScore) => prevScore + 1);
    } else {
      setIncorrectAnswers((prevIncorrect) => prevIncorrect + 1);
    }

    setTimeout(() => {
      setSelectedOption(null);
      if (currentCardIndex + 1 < cards.length) {
        setCurrentCardIndex((prevIndex) => prevIndex + 1);
      } else {
        // Quiz is finished; call updateLeaderboard here
        setIsQuizFinished(true);
        updateLeaderboard(
          score + (isCorrect ? 1 : 0),
          incorrectAnswers + (isCorrect ? 0 : 1)
        );
      }
    }, 1000);
  };

  // Update leaderboard function
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
        // Fetch the user's current score for this deck
        const response = await http.get(`/deck/${id}/user-score/${localId}`);
        const existingScore = response.data?.score["correct"]; // Assuming the score is returned here
        // Only update if the new score is higher than the existing score
        if (
          finalScore > existingScore ||
          (response.data.score["correct"] === 0 &&
            response.data.score["incorrect"] === 0)
        ) {
          console.log("inside");
          await http.post(`/deck/${id}/update-leaderboard`, {
            userId: localId,
            userEmail: email,
            correct: finalScore, // Pass the calculated final score
            incorrect: finalIncorrectAnswers, // Pass the calculated final incorrect answers
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
  };

  if (isQuizFinished) {
    return (
      <div className='quiz-summary'>
        <h2>Quiz Complete!</h2>
        <p>
          Your Score: {score} / {cards.length}
        </p>
        <button className='btn btn-primary' onClick={restartQuiz}>
          Restart Quiz
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
    </div>
  );
}
