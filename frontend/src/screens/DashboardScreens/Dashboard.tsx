import { Card, Popconfirm, Button, Modal } from "antd";
import { useEffect, useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import EmptyImg from "assets/images/empty.svg";
import { PropagateLoader } from "react-spinners";
import http from "utils/api";
import Swal from "sweetalert2";
import { LeftOutlined, RightOutlined } from "@ant-design/icons";
import Navbar from "../../components/Navbar";

interface Deck {
  id: string;
  userId: string;
  title: string;
  description: string;
  visibility: string;
  cards_count: number;
  lastOpened?: string; // Optional for recent decks
  folderId?: string; // Optional to track folder assignment
}

interface Folder {
  id: string;
  name: string;
  decks: Deck[];
}

interface Group {
  id: string;
  group_name: string;
  description: string;
  members: { userId: string; email: string }[];
  join_key: string;
  owner: string;
  decks: Deck[];
}

const Dashboard = () => {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [recentDecks, setRecentDecks] = useState<Deck[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [fetchingDecks, setFetchingDecks] = useState(false);
  const [isFolderPopupVisible, setIsFolderPopupVisible] = useState(false);
  const [selectedFolderDecks, setSelectedFolderDecks] = useState<Deck[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [streak, setStreak] = useState({
    current: 0,
    lastPracticeDate: null,
  });
  const [sharedDecks, setSharedDecks] = useState<Deck[]>([]);

  // Refs for sliders
  const sliderRefLibrary = useRef<HTMLDivElement>(null);
  const sliderRefRecent = useRef<HTMLDivElement>(null);
  const sliderRefGroup = useRef<HTMLDivElement>(null);
  const sliderRefShared = useRef<HTMLDivElement>(null);
  const [canScrollLeftLib, setCanScrollLeftLib] = useState(false);
  const [canScrollRightLib, setCanScrollRightLib] = useState(false);
  const [canScrollLeftRec, setCanScrollLeftRec] = useState(false);
  const [canScrollRightRec, setCanScrollRightRec] = useState(false);
  const [canScrollLeftGroup, setCanScrollLeftGroup] = useState(false);
  const [canScrollRightGroup, setCanScrollRightGroup] = useState(false);

  const [canScrollLeftShare, setCanScrollLeftShare] = useState(false);
  const [canScrollRightShare, setCanScrollRightShare] = useState(false);

  const flashCardUser = window.localStorage.getItem("flashCardUser");
  const { localId } = (flashCardUser && JSON.parse(flashCardUser)) || {};

  const navigate = useNavigate();

  useEffect(() => {
    fetchDecks();
    fetchFolders();
    fetchGroups();
    fetchSharedDecks();
  }, []);

  useEffect(() => {
    updateArrowsVisibilityLibrary();
    updateArrowsVisibilityRecent();
    updateArrowsVisibilityGroups();
    updateArrowsVisibilityShared();
    const sliderLib = sliderRefLibrary.current;
    const sliderRec = sliderRefRecent.current;
    const sliderGroup = sliderRefGroup.current;
    const sliderShared = sliderRefShared.current;

    if (sliderLib) {
      sliderLib.addEventListener("scroll", updateArrowsVisibilityLibrary);
      //return () => sliderLib.removeEventListener("scroll", updateArrowsVisibilityLibrary);
    }
    if (sliderRec) {
      sliderRec.addEventListener("scroll", updateArrowsVisibilityRecent);
      //return () => sliderRec.removeEventListener("scroll", updateArrowsVisibilityRecent);
    }
    if (sliderGroup) {
      sliderGroup.addEventListener("scroll", updateArrowsVisibilityGroups);
      //return () => sliderGroup.removeEventListener("scroll", updateArrowsVisibilityGroups);
    }
    if (sliderShared) {
      sliderShared.addEventListener("scroll", updateArrowsVisibilityShared);
      //return () => sliderGroup.removeEventListener("scroll", updateArrowsVisibilityGroups);
    }
  }, [decks, groups, sharedDecks]);

  const fetchDecks = async () => {
    setFetchingDecks(true);
    try {
      const res = await http.get("/deck/all", { params: { localId } });
      const _decks = res.data?.decks || [];
      setDecks(_decks);

      // Filter recent decks opened in the last 5 days
      const fiveDaysAgo = new Date();
      fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
      const recent = _decks
        .filter(
          (deck: { lastOpened: string | number | Date }) =>
            deck.lastOpened && new Date(deck.lastOpened) >= fiveDaysAgo
        )
        .sort(
          (
            a: { lastOpened: string | number | Date },
            b: { lastOpened: string | number | Date }
          ) =>
            new Date(b.lastOpened!).getTime() -
            new Date(a.lastOpened!).getTime()
        );

      setRecentDecks(recent);
    } catch (err) {
      console.error("Error fetching decks:", err);
      setDecks([]);
      setRecentDecks([]);
    } finally {
      setFetchingDecks(false);
    }
  };

  const fetchFolders = async () => {
    try {
      const res = await http.get("/folders/all", {
        params: { userId: localId },
      });
      setFolders(res.data?.folders || []);
    } catch (err) {
      console.error("Error fetching folders:", err);
    }
  };
  const fetchGroups = async () => {
    try {
      const res = await http.get("/group/all", {
        params: { localId: localId },
      });
      setGroups(res.data?.groups || []);
    } catch (err) {
      console.error("Error fetching folders:", err);
    }
  };

  const fetchSharedDecks = async () => {
    try {
      const res = await http.get("/deck/share", {
        params: { localId: localId },
      });
      setSharedDecks(res.data?.shared_decks || []);
    } catch (err) {
      console.error("Error fetching folders:", err);
    }
  };

  const updateLastOpened = async (deckId: string) => {
    const timestamp = new Date().toISOString(); // Get the current timestamp
    await http.patch(`/deck/updateLastOpened/${deckId}`, {
      lastOpened: timestamp,
    });
    fetchDecks(); // Refetch the decks to update both 'decks' and 'recentDecks'
  };

  const logPractice = async (deckId: string) => {
    try {
      await http.post(`/deck/practice`, {
        userId: localId,
        deckId,
        date: new Date().toISOString(),
      });
    } catch (err) {
      console.error("Error logging practice:", err);
    }
  };

  const handleFolderClick = async (folder: Folder) => {
    try {
      // Fetch decks by folder ID
      const res = await http.get(`/decks/${folder.id}`);

      // Ensure the response data has decks and add the folderId to each deck
      const decksWithFolderId: Deck[] =
        res.data?.decks?.map((deck: Deck) => ({
          ...deck,
          folderId: folder.id, // Add the folderId to each deck
        })) || [];

      // Set the decks for the selected folder
      setSelectedFolderDecks(decksWithFolderId);
      setIsFolderPopupVisible(true); // Show the folder modal
    } catch (err) {
      console.error("Error fetching decks for folder:", err);
    }
  };

  const navigateToDeck = (deckId: string, deckTitle: string) => {
    navigate(`/deck/${deckId}/practice?title=${encodeURIComponent(deckTitle)}`);
  };

  const handleDeleteDeck = async (id: string) => {
    try {
      await http.delete(`/deck/delete/${id}`);
      Swal.fire("Deck Deleted Successfully!", "", "success").then(() =>
        fetchDecks()
      );
    } catch (err) {
      Swal.fire("Deck Deletion Failed!", "", "error");
    }
  };

  const handleAddDeckToFolder = async (deckId: string, folderId: string) => {
    try {
      await http.post("/deck/add-deck", { deckId, folderId });
      fetchDecks();
      fetchFolders();
      Swal.fire("Deck added to folder!", "", "success");
    } catch (err) {
      Swal.fire("Failed to add deck to folder!", "", "error");
    }
  };

  const handleRemoveDeck = async (deckId: string) => {
    const result = await Swal.fire({
      title: "Are you sure?",
      text: "This deck will be removed from the folder.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, remove it!",
    });

    if (result.isConfirmed) {
      try {
        // Get the folderId from the selected folder deck's folderId (assuming it is consistent)
        const folderId = selectedFolderDecks[0]?.folderId; // Use folderId, which is now part of the deck
        console.log(
          `Removing deck with id: ${deckId} from folderId: ${folderId}`
        );

        // Make sure folderId exists before proceeding
        if (!folderId) {
          Swal.fire(
            "Error!",
            "No folderId found. Could not remove deck.",
            "error"
          );
          return;
        }

        // Log the action before making the API call
        console.log(
          "Requesting removal of deck with id:",
          deckId,
          "from folderId:",
          folderId
        );

        // Make the DELETE request to the backend API to remove the deck from the folder
        const response = await http.delete("/folder/remove-deck", {
          data: { folderId, deckId },
        });

        // Check the backend response before updating the UI
        if (response.status === 200) {
          // Update the state to remove the deck from selectedFolderDecks
          const updatedDecks = selectedFolderDecks.filter(
            (deck) => deck.id !== deckId
          );
          setSelectedFolderDecks(updatedDecks);

          // Show success alert after deck removal
          Swal.fire(
            "Deleted!",
            "The deck has been removed from the folder.",
            "success"
          );
        } else {
          throw new Error("Failed to remove deck from folder.");
        }
      } catch (error) {
        console.error("Error removing deck:", error);
        Swal.fire("Error!", "Failed to remove deck from folder.", "error");
      }
    }
  };

  const handleRemoveSharedDeck = async (deckId: string) => {
    try {
      await http.patch(`/deck/share/remove`, {
        userId: localId,
        deckId: deckId,
      });
      fetchSharedDecks();
      Swal.fire("You have removed the shared deck", "", "success");
    } catch (err) {
      Swal.fire("Failed to remove shared deck", "", "error");
    }
  };

  // Update arrows visibility based on scroll position
  const updateArrowsVisibilityLibrary = () => {
    if (sliderRefLibrary.current) {
      const { scrollLeft, scrollWidth, clientWidth } = sliderRefLibrary.current;
      setCanScrollLeftLib(scrollLeft > 0);
      setCanScrollRightLib(scrollLeft + clientWidth < scrollWidth - 1);
    }
  };

  const updateArrowsVisibilityRecent = () => {
    if (sliderRefRecent.current) {
      const { scrollLeft, scrollWidth, clientWidth } = sliderRefRecent.current;
      setCanScrollLeftRec(scrollLeft > 0);
      setCanScrollRightRec(scrollLeft + clientWidth < scrollWidth - 1);
    }
  };

  const updateArrowsVisibilityGroups = () => {
    if (sliderRefGroup.current) {
      const { scrollLeft, scrollWidth, clientWidth } = sliderRefGroup.current;
      setCanScrollLeftGroup(scrollLeft > 0);
      setCanScrollRightGroup(scrollLeft + clientWidth < scrollWidth - 1);
    }
  };

  const updateArrowsVisibilityShared = () => {
    if (sliderRefShared.current) {
      const { scrollLeft, scrollWidth, clientWidth } = sliderRefShared.current;
      setCanScrollLeftShare(scrollLeft > 0);
      setCanScrollRightShare(scrollLeft + clientWidth < scrollWidth - 1);
    }
  };

  const scrollLibrary = (direction: "left" | "right") => {
    if (sliderRefLibrary.current) {
      const scrollAmount = direction === "left" ? -300 : 300;
      sliderRefLibrary.current.scrollBy({
        left: scrollAmount,
        behavior: "smooth",
      });
    }
  };

  const scrollRecent = (direction: "left" | "right") => {
    if (sliderRefRecent.current) {
      const scrollAmount = direction === "left" ? -300 : 300;
      sliderRefRecent.current.scrollBy({
        left: scrollAmount,
        behavior: "smooth",
      });
    }
  };

  const scrollGroups = (direction: "left" | "right") => {
    if (sliderRefGroup.current) {
      const scrollAmount = direction === "left" ? -300 : 300;
      sliderRefGroup.current.scrollBy({
        left: scrollAmount,
        behavior: "smooth",
      });
    }
  };

  const scrollShared = (direction: "left" | "right") => {
    if (sliderRefShared.current) {
      const scrollAmount = direction === "left" ? -300 : 300;
      sliderRefShared.current.scrollBy({
        left: scrollAmount,
        behavior: "smooth",
      });
    }
  };

  const handleLeaveGroup = async (id: string) => {
    try {
      await http.patch(`/group/${id}/removeMember`, { userId: localId });
      fetchGroups();
      Swal.fire("You have left the group", "", "success");
    } catch (err) {
      Swal.fire("Failed to leave group", "", "error");
    }
  };

  return (
    <div className='dashboard-page dashboard-commons'>
      <Navbar isDashboard={true} onFolderCreated={fetchFolders} />

      <section>
        <div className='container'>
          <div className='row'>
            <div className='col-md-12'>
              <Card className='welcome-card border-[#E7EAED]'>
                <div className='flex justify-between items-center'>
                  <div>
                    <h3>
                      <b>Hey, Welcome Back!</b> 👋
                    </h3>
                    <p>
                      Let's start creating, memorizing, and sharing your
                      flashcards.
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          </div>

          {/* Folders Section */}
          <div className='folder-list row mt-4'>
            <div className='col-md-12'>
              <p className='title'>My Folders</p>
            </div>
            {folders.length === 0 ? (
              <div className='col-md-12 text-center'>
                <p>No folders created yet.</p>
              </div>
            ) : (
              folders.map((folder) => (
                <div key={folder.id} className='col-md-4'>
                  <div
                    className='folder-container'
                    onClick={() => handleFolderClick(folder)}
                  >
                    <h5>{folder.name}</h5>
                    <p>
                      {folder.decks.length > 0
                        ? `${folder.decks.length} deck(s)`
                        : null}
                    </p>
                    <p>
                      {folder.decks.length === 0
                        ? `${folder.decks.length} deck(s)`
                        : null}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
          {/* Decks Section */}
          <div className='row mt-4'>
            <div className='col-md-12'>
              <p className='title'>Your Library</p>
            </div>
            {fetchingDecks ? (
              <div
                className='col-md-12 text-center'
                style={{ height: "300px" }}
              >
                <PropagateLoader color='#221daf' />
              </div>
            ) : decks.length === 0 ? (
              <div className='row justify-content-center empty-pane'>
                <div className='text-center'>
                  <img className='img-fluid' src={EmptyImg} alt='No Decks' />
                  <p>No Study Deck Created Yet</p>
                </div>
              </div>
            ) : (
              <div className='slider-container'>
                {canScrollLeftLib && (
                  <button
                    className='arrow left'
                    onClick={() => scrollLibrary("left")}
                  >
                    <LeftOutlined />
                  </button>
                )}
                <div className='deck-slider' ref={sliderRefLibrary}>
                  {decks.map(
                    ({ id, title, description, visibility, cards_count }) => (
                      <div className='deck-card' key={id}>
                        <div className='d-flex justify-content-between align-items-center'>
                          <Link
                            to={`/deck/${id}/practice`}
                            onClick={() => updateLastOpened(id)}
                          >
                            <h5>{title}</h5>
                          </Link>
                          <div className='d-flex gap-2 visibility-status align-items-center'>
                            {visibility === "public" ? (
                              <i className='lni lni-world'></i>
                            ) : (
                              <i className='lni lni-lock-alt'></i>
                            )}
                            {visibility}
                          </div>
                        </div>
                        <p className='description'>{description}</p>
                        <p className='items-count'>{cards_count} item(s)</p>
                        <div className='menu'>
                          <Link to={`/deck/${id}/practice`}>
                            <button className='btn text-left'>
                              <i className='lni lni-book'></i> Practice
                            </button>
                          </Link>
                          <Link to={`/deck/${id}/update`}>
                            <button className='btn text-edit'>
                              <i className='lni lni-pencil-alt'></i> Update
                            </button>
                          </Link>
                          <Popconfirm
                            title='Are you sure to delete this deck?'
                            onConfirm={() => handleDeleteDeck(id)}
                            okText='Yes'
                            cancelText='No'
                          >
                            <button className='btn text-danger'>
                              <i className='lni lni-trash-can'></i> Delete
                            </button>
                          </Popconfirm>
                          <select
                            onChange={(e) =>
                              handleAddDeckToFolder(id, e.target.value)
                            }
                            defaultValue=''
                            style={{
                              color: "#007bff",
                              border: "1px solid #007bff",
                              padding: "5px",
                              borderRadius: "4px",
                            }}
                          >
                            <option value='' disabled style={{ color: "#999" }}>
                              Add to Folder
                            </option>
                            {folders.map((folder) => (
                              <option key={folder.id} value={folder.id}>
                                {folder.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )
                  )}
                </div>
                {canScrollRightLib && (
                  <button
                    className='arrow right'
                    onClick={() => scrollLibrary("right")}
                  >
                    <RightOutlined />
                  </button>
                )}
              </div>
            )}
          </div>
          {/* Recent Decks Section */}
          <div className='row mt-4'>
            <div className='col-md-12'>
              <p className='title'>Recent Decks</p>
            </div>
            {recentDecks.length === 0 ? (
              <div className='row justify-content-center'>
                <p>No Recent Decks Opened</p>
              </div>
            ) : (
              <div className='slider-container'>
                {canScrollLeftRec && (
                  <button
                    className='arrow left'
                    onClick={() => scrollRecent("left")}
                  >
                    <LeftOutlined />
                  </button>
                )}
                <div className='deck-slider' ref={sliderRefRecent}>
                  {recentDecks.map(
                    ({ id, title, description, visibility, cards_count }) => (
                      <div className='deck-card' key={id}>
                        <div className='d-flex justify-content-between align-items-center'>
                          <Link
                            to={`/deck/${id}/practice`}
                            onClick={() => updateLastOpened(id)}
                          >
                            <h5>{title}</h5>
                          </Link>
                          <div className='d-flex gap-2 visibility-status align-items-center'>
                            {visibility === "public" ? (
                              <i className='lni lni-world'></i>
                            ) : (
                              <i className='lni lni-lock-alt'></i>
                            )}
                            {visibility}
                          </div>
                        </div>
                        <p className='description'>{description}</p>
                        <p className='items-count'>{cards_count} item(s)</p>
                      </div>
                    )
                  )}
                </div>
                {canScrollRightRec && (
                  <button
                    className='arrow right'
                    onClick={() => scrollRecent("right")}
                  >
                    <RightOutlined />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Shared Decks Section */}
          {sharedDecks.length > 0 && (
            <div className='row mt-4'>
              <div className='col-md-12'>
                <p className='title'>Shared With You</p>
              </div>
              {sharedDecks.length === 0 ? (
                <div className='row justify-content-center'>
                  <p>No Shared Decks</p>
                </div>
              ) : (
                <div className='slider-container'>
                  {canScrollLeftShare && (
                    <button
                      className='arrow left'
                      onClick={() => scrollShared("left")}
                    >
                      <LeftOutlined />
                    </button>
                  )}
                  <div className='deck-slider' ref={sliderRefShared}>
                    {sharedDecks.map((deck) => (
                      <div className='deck-card' key={deck.id}>
                        <div className='d-flex justify-content-between align-items-center'>
                          <Link to={`/deck/${deck.id}/practice`}>
                            <h5>{deck.title}</h5>
                          </Link>
                        </div>
                        <p className='description'>{deck.description}</p>
                        <p className='items-count'>
                          {deck.cards_count} item(s)
                        </p>
                        <div className='menu'>
                          <Link to={`/deck/${deck.id}/practice`}>
                            <button className='btn text-left'>
                              <i className='lni lni-book'></i>Practice
                            </button>
                          </Link>
                          <Popconfirm
                            title={`Are you sure you want to remove this deck "${deck.title}"?`}
                            onConfirm={() => handleRemoveSharedDeck(deck.id)}
                            okText='Yes'
                            cancelText='No'
                          >
                            <button className='btn text-danger'>
                              <i className='lni lni-trash-can'></i> Remove
                            </button>
                          </Popconfirm>
                        </div>
                      </div>
                    ))}
                  </div>
                  {canScrollRightShare && (
                    <button
                      className='arrow right'
                      onClick={() => scrollShared("right")}
                    >
                      <RightOutlined />
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Groups Section */}
          <div className='row mt-4'>
            <div className='col-md-12'>
              <p className='title'>Groups</p>
            </div>
            {groups.length === 0 ? (
              <div className='row justify-content-center'>
                <p>No Groups</p>
              </div>
            ) : (
              <div className='slider-container'>
                {canScrollLeftGroup && (
                  <button
                    className='arrow left'
                    onClick={() => scrollGroups("left")}
                  >
                    <LeftOutlined />
                  </button>
                )}
                <div className='deck-slider' ref={sliderRefGroup}>
                  {groups.map((grp) => (
                    <div className='deck-card' key={grp.id}>
                      <div className='d-flex justify-content-between align-items-center'>
                        <Link to={`/group/${grp.id}/`}>
                          <h5>{grp.group_name}</h5>
                        </Link>
                      </div>
                      <p className='description'>{grp.description}</p>
                      <p className='items-count'>
                        {grp.members.length} member(s)
                      </p>
                      <div className='menu'>
                        <Link to={`/group/${grp.id}`}>
                          <button className='btn text-left'>
                            <i className='lni lni-users'></i> Group Dashboard
                          </button>
                        </Link>
                        <Popconfirm
                          title={`Are you sure you want to leave group "${grp.group_name}"?`}
                          onConfirm={() => handleLeaveGroup(grp.id)}
                          okText='Yes'
                          cancelText='No'
                        >
                          <button className='btn text-danger'>
                            <i className='lni lni-exit'></i> Leave
                          </button>
                        </Popconfirm>
                      </div>
                    </div>
                  ))}
                </div>
                {canScrollRightGroup && (
                  <button
                    className='arrow right'
                    onClick={() => scrollGroups("right")}
                  >
                    <RightOutlined />
                  </button>
                )}
              </div>
            )}
          </div>
          {/* Folder Decks Modal */}
          <Modal
            title='Folder Decks'
            open={isFolderPopupVisible}
            onCancel={() => setIsFolderPopupVisible(false)}
            footer={null}
            width={600} // Adjust the width of the modal
          >
            {selectedFolderDecks.length === 0 ? (
              <p>No decks in this folder.</p>
            ) : (
              selectedFolderDecks.map(({ id, title }, index) => (
                <div
                  key={index}
                  className='deck-item'
                  style={{
                    display: "flex",
                    alignItems: "center",
                    marginBottom: "12px",
                  }}
                >
                  {/* Button to navigate to deck */}
                  <button
                    className='btn text-left folder-deck-button'
                    onClick={async () => {
                      await updateLastOpened(id);
                      navigateToDeck(id, title);
                    }}
                    style={{
                      flexGrow: 1,
                      textAlign: "left",
                      padding: "8px 16px",
                      backgroundColor: "#f0f2f5",
                      borderRadius: "4px",
                      border: "1px solid #d9d9d9",
                      fontSize: "16px",
                    }}
                  >
                    <i
                      className='lni lni-folder'
                      style={{ marginRight: "8px" }}
                    ></i>
                    {title}
                  </button>

                  {/* Remove button */}
                  <button
                    className='btn'
                    onClick={() => handleRemoveDeck(id)}
                    style={{
                      marginLeft: "12px",
                      backgroundColor: "#ff4d4f",
                      borderColor: "#ff4d4f",
                      color: "#fff",
                      borderRadius: "4px",
                      padding: "8px 16px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "16px",
                      boxShadow: "none",
                    }}
                  >
                    <i
                      className='lni lni-trash'
                      style={{ marginRight: "8px" }}
                    ></i>
                    Remove
                  </button>
                </div>
              ))
            )}
          </Modal>
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
