/*
MIT License

Copyright (c) 2022 John Damilola, Leo Hsiang, Swarangi Gaurkar, Kritika Javali, Aaron Dias Barreto

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

import { Card, Modal, Button, Table, Popconfirm } from "antd";
import Flashcard from "components/PracticeDeck";
import Quiz from "components/QuizDeck"; // Importing the new Quiz component
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { PropagateLoader } from "react-spinners";
import EmptyImg from "assets/images/empty.svg";
import http from "utils/api";
import "./styles.scss";
import Swal from "sweetalert2";

interface Deck {
  id: string;
  userId: string;
  title: string;
  description: string;
  visibility: string;
}

interface FlashCard {
  front: string;
  back: string;
  hint: string;
}

interface LeaderboardEntry {
  userEmail: string;
  correct: number;
  incorrect: number;
  attempts: number;
  lastAttempt: string;
}

const PracticeDeck = () => {
  const navigate = useNavigate();
  const [deck, setDeck] = useState<Deck | null>(null);
  const [cards, setCards] = useState<FlashCard[]>([]);
  const [fetchingDeck, setFetchingDeck] = useState(false);
  const [fetchingCards, setFetchingCards] = useState(false);
  const [quizMode, setQuizMode] = useState(false);
  const [leaderboardVisible, setLeaderboardVisible] = useState(false);
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
  const [sharedWithUser, setSharedWithUser] = useState(false)

  const flashCardUser = window.localStorage.getItem("flashCardUser");
  const { localId } = (flashCardUser && JSON.parse(flashCardUser)) || {};
  const { id } = useParams();

  useEffect(() => {
    fetchDeck();
    fetchCards();
    fetchSharedDecks();
  }, []);

  const fetchDeck = async () => {
    setFetchingDeck(true);
    try {
      const res = await http.get(`/deck/${id}`);
      setDeck(res.data?.deck);
    } finally {
      setFetchingDeck(false);
    }
  };

  const fetchCards = async () => {
    setFetchingCards(true);
    try {
      const res = await http.get(`/deck/${id}/card/all`);
      setCards(res.data?.cards || []);
    } finally {
      setFetchingCards(false);
    }
  };

  const fetchLeaderboard = async () => {
    try {
      const res = await http.get(`/deck/${id}/leaderboard`);
      // Format lastAttempt before setting leaderboard data
      const formattedLeaderboard = (res.data?.leaderboard || []).map((entry: { lastAttempt: string | number | Date; }) => ({
        ...entry,
        lastAttempt: new Date(entry.lastAttempt).toLocaleString(), // Convert to human-readable format
      }));
      setLeaderboardData(formattedLeaderboard);
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
    }
  };

  const showLeaderboard = () => {
    fetchLeaderboard();
    setLeaderboardVisible(true);
  };

  const closeLeaderboard = () => {
    setLeaderboardVisible(false);
  };

  const fetchSharedDecks =  async () => {
    try {
      const res = await http.get(`/deck/share`, { params: { localId: localId } })
      setSharedWithUser(false)
      for(const d of res.data.shared_decks) {
        if(d.id == id) {
          setSharedWithUser(true)
          break
        }
      }
    } catch (error) {
      console.error("Error fetching shared decks:", error);
    }
  }

  const shareDeck = async () => {
    try {
      await http.post(`deck/share`, {userId: localId, deckId: id})
      Swal.fire("Deck Saved Successfully!", "", "success").then(() => fetchSharedDecks());
    } catch (error) {
      Swal.fire("Error Saving Deck", "", "error")
    }
  }

  const unshareDeck = async () => {
    try {
      await http.patch(`deck/share/remove`, {userId: localId, deckId: id})
      Swal.fire("Deck Removed Successfully!", "", "success").then(() => fetchSharedDecks());
    } catch (error) {
      Swal.fire("Error Removing Deck", "", "error")
    }
  }

  const leaderboardColumns = [
    {
      title: "Rank", // New column for rank
      render: (_: any, __: any, index: number) => index + 1, // Automatically generates the row number
      key: "rank"
    },
    { title: "Email", dataIndex: "userEmail", key: "userEmail" },
    { title: "Correct Answers", dataIndex: "correct", key: "correct" },
    { title: "Incorrect Answers", dataIndex: "incorrect", key: "incorrect" }
  ];

  const { title, description, userId } = deck || {};

  return (
    <div className="dashboard-page dashboard-commons">
      <section>
        <div className="container">
          <div className="row">
            <div className="col-md-12">
              <Card className="welcome-card practice-deck">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <h3>
                      <i
                        className="lni lni-arrow-left back-icon"
                        onClick={() => navigate(-1)}
                      ></i>
                    </h3>
                    <h3><b>{title}</b></h3>
                    <p>{description}</p>
                  </div>
                  <div className="d-flex gap-2">
                    {localId === userId && (
                      <Link to={`/deck/${id}/update`}>
                        <button className="btn btn-white">Update Deck</button>
                      </Link>
                    )}
                    {localId !== userId && !sharedWithUser && (
                      <button className="btn btn-white" onClick={() => shareDeck()}> Save to Dashboard</button>
                    )}
                    {localId !== userId && sharedWithUser && (
                      <Popconfirm
                        title="Are you sure to remove this deck?"
                        onConfirm={() => unshareDeck()}
                        okText="Yes"
                        cancelText="No"
                      >
                        <button className="btn btn-danger"> Remove from shared decks </button>
                      </Popconfirm>
                    )}
                    <button
                      className="btn btn-white"
                      onClick={() => setQuizMode(!quizMode)}
                    >
                      {quizMode ? "Exit Quiz" : "Take Quiz"}
                    </button>
                    <button
                      className="btn btn-white"
                      onClick={showLeaderboard}
                    >
                      View Leaderboard
                    </button>
                  </div>
                </div>
              </Card>
            </div>
          </div>

          <div className="flash-card__list row justify-content-center mt-4">
            <div className="col-md-8">
              {fetchingCards ? (
                <div
                  className="col-md-12 text-center d-flex justify-content-center align-items-center"
                  style={{ height: "300px" }}
                >
                  <PropagateLoader color="#221daf" />
                </div>
              ) : cards.length === 0 ? (
                <div className="row justify-content-center empty-pane">
                  <div className="text-center">
                    <img className="img-fluid" src={EmptyImg} />
                    <p>No Cards Added Yet</p>
                  </div>
                </div>
              ) : quizMode ? (
                <Quiz cards={cards} /> // Render quiz mode
              ) : (
                <Flashcard cards={cards} />
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Leaderboard Modal */}
      <Modal
        title="Leaderboard"
        open={leaderboardVisible}
        onCancel={closeLeaderboard}
        footer={[
          <Button key="close" onClick={closeLeaderboard}>
            Close
          </Button>,
        ]}
        width="80%" // Set a width for the modal
        style={{ maxHeight: '80vh', overflowY: 'auto' }} // Allow for scroll if content is too tall
        bodyStyle={{ padding: '0' }} // Optionally adjust padding
      >
        <Table
          columns={leaderboardColumns}
          dataSource={leaderboardData}
          pagination={false}
          rowKey="userEmail"  // Ensure a unique key for each row
        />
      </Modal>
    </div>
  );
};

export default PracticeDeck;
