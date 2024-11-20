import { Card, Popconfirm, Button, Modal, Table } from "antd";
import { useEffect, useState, useRef } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import EmptyImg from "assets/images/empty.svg";
import { PropagateLoader } from "react-spinners";
import http from "utils/api";
import Swal from "sweetalert2";
import { LeftOutlined, RightOutlined } from "@ant-design/icons";
import Navbar from "../../components/Navbar";
import { setIn } from "formik";

interface Group {
    group_name: string;
    description: string;
    members: User[];
    join_key: string;
    owner: string;
    decks: Deck[];
}

interface User {
    userId: string;
    email: string;
}

interface Deck {
    id: string;
    title: string;
    description: string;
    visibility: string;
    cards_count: number;
    owner: string;
}

interface LeaderboardEntry {
    userEmail: string;
    correct: number;
    incorrect: number;
    attempts: number;
    lastAttempt: string | Date;
}


const GroupDashboard = () => {
    const [group, setGroup] = useState<Group | null>(null)
    const [selectedDeck, setSelectedDeck] = useState<Deck | null>(null)
    const [fetchingGroup, setFetchingGroup] = useState(false);
    const [canScrollLeftLib, setCanScrollLeftLib] = useState(false);
    const [canScrollRightLib, setCanScrollRightLib] = useState(false);
    const [modalOpen, setModalOpen] = useState(false)
    const [urlModalOpen, setURLModalOpen] = useState(false)
    const [removeModalOpen, setRemoveModalOpen] = useState(false)
    const [removeDeckModalOpen, setRemoveDeckModalOpen] = useState(false)
    const [leaderboardModalOpen, setLeaderboardModalOpen] = useState(false)
    const [userDecks, setUserDecks] = useState<Deck[]>([])
    const [fetchingDecks, setFetchingDecks] = useState(true)
    const [inGroup, setInGroup] = useState(false)
    const [userToRemove, setUserToRemove] = useState<User | null>(null)
    const [deckToRemove, setDeckToRemove] = useState<Deck | null>(null)
    const [removeConfirm, setRemoveConfirm] = useState(false)
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])

    const sliderRefLibrary = useRef<HTMLDivElement>(null);
    const flashCardUser = window.localStorage.getItem("flashCardUser");
    const { localId } = (flashCardUser && JSON.parse(flashCardUser)) || {};
    const { id } = useParams();

    useEffect(() => {
        fetchGroup()
        fetchDecks()
    }, [])

    useEffect(() => {
        updateArrowsVisibilityLibrary();
        const sliderLib = sliderRefLibrary.current;
    
        if (sliderLib) {
          sliderLib.addEventListener("scroll", updateArrowsVisibilityLibrary);
          return () => sliderLib.removeEventListener("scroll", updateArrowsVisibilityLibrary);
        }
      }, [group]);

    const fetchGroup = async () => {
        try {
            const res = await http.get(`/group/${id}`);
            setGroup(res.data?.group);
            for(const usr of res.data?.group.members) {
                if(usr.userId === localId) {
                    setInGroup(true)
                }
            }
          } finally {
            setFetchingGroup(false);
          }
    }
    const fetchDecks = async () => {
        try {
            const res = await http.get("/deck/all", { params: { localId } })
            const decks = res.data?.decks || []
            setUserDecks(decks)
        } finally {
            setFetchingDecks(false)
        }
    }
    const updateArrowsVisibilityLibrary = () => {
        if (sliderRefLibrary.current) {
          const { scrollLeft, scrollWidth, clientWidth } = sliderRefLibrary.current;
          setCanScrollLeftLib(scrollLeft > 0);
          setCanScrollRightLib(scrollLeft + clientWidth < scrollWidth);
        }
    };
    const scrollLibrary = (direction: "left" | "right") => {
        if (sliderRefLibrary.current) {
          const scrollAmount = direction === "left" ? -300 : 300;
          sliderRefLibrary.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
        }
    };
    const addDeckToGroup = async (deck: Deck) => {
        try {
            const res = await http.patch(`/group/${id}/addDeck`, {
                id: deck.id,
                title: deck.title,
                description: deck.description,
                visibility: deck.visibility,
                cards_count: deck.cards_count,
                owner: localId
            })
            Swal.fire("Deck Added Successfully!", "", "success").then(() => fetchGroup());
        } catch (e) {
            Swal.fire("Error Adding Deck", "", "error")
        } finally {
            setSelectedDeck(null)
        }
    }
    const removeFromGroup = async(user: User | null) => {
        try {
            const res = await http.patch(`/group/${id}/removeMember`, {
                userId: user
            })
            Swal.fire("Member removed Successfully!", "", "success").then(() => fetchGroup());
        } catch (e) {
            Swal.fire("Error removing member", "", "error")
        } finally {
            setUserToRemove(null)
            setRemoveConfirm(false)
            setRemoveModalOpen(false)
        }
    }
    const removeDeck = async(deck: Deck | null) => {
        try {
            const res = await http.patch(`/group/${id}/removeDeck`, {
                id: deck?.id
            })
            Swal.fire("Deck removed Successfully!", "", "success").then(() => fetchGroup());
        } catch (e) {
            Swal.fire("Error removing deck", "", "error")
        } finally {
            setDeckToRemove(null)
            setRemoveDeckModalOpen(false)
        }
    }
    const fetchLeaderboard = async (deckId: string) => {
        try {
            const res = await http.get(`/deck/${deckId}/leaderboard`);
            // Format lastAttempt before setting leaderboard data
            const memberEmails = group?.members.map((usr) => {return usr.email})
            const formattedLeaderboard: LeaderboardEntry[] = []
            for(const entry of res.data.leaderboard) {
                if(memberEmails && (memberEmails.includes(entry.userEmail))) {
                    formattedLeaderboard.push({...entry, lastAttempt: new Date(entry.lastAttempt).toLocaleString()})
                }
            }
            setLeaderboard(formattedLeaderboard);
        } catch (error) {
            console.error("Error fetching leaderboard:", error);
        }
    };
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

    return (
        <div className="group-page">
            {group && (<>
                {inGroup ? (<section>
                    <div className="container">
                        <div className="row">
                            <div className="col-md-12">
                            <Card className="welcome-card border-[#E7EAED]">
                                <div className="d-flex flex-row justify-content-between">
                                    <div className="col-md-7">
                                        <h3><b>{group.group_name}</b></h3>
                                        <p>{group.description}</p>
                                    </div>
                                    <div className="col-md-5">
                                        <button className="btn btn-white mx-4" disabled={fetchingDecks} onClick={() => setModalOpen(true)}>Add Deck</button>
                                        <button className="btn btn-white" onClick={() => {setURLModalOpen(true)}}>Generate Group Invite Link</button>
                                    </div>
                                </div>
                            </Card>
                            </div>
                        </div>
                    </div>
                    <div className="container d-flex flex-row justify-content-between">
                        <div className="col-md-8">
                            <div>
                                <h4>Group Decks:</h4>
                                {!(group.decks) || group.decks.length === 0 ? (
                                    <div className="row justify-content-center empty-pane">
                                        <div className="text-center">
                                            <img className="img-fluid" src={EmptyImg} alt="No Decks" />
                                            <p>This group has no study decks</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="slider-container">
                                        {canScrollLeftLib && (
                                            <button className="arrow left" onClick={() => scrollLibrary("left")}>
                                                <LeftOutlined />
                                            </button>
                                        )}
                                        <div className="deck-slider" ref={sliderRefLibrary}>
                                            {group.decks.map(({ id, title, description, visibility, cards_count, owner }) => (
                                                <div className="deck-card" key={id}>
                                                    <div className="d-flex justify-content-between align-items-center">
                                                        <Link to={`/deck/${id}/practice`}>
                                                            <h5>{title}</h5>
                                                        </Link>
                                                        <div className="d-flex gap-2 visibility-status align-items-center">
                                                            {visibility === "public" ? <i className="lni lni-world"></i> : <i className="lni lni-lock-alt"></i>}
                                                            {visibility}
                                                        </div>
                                                    </div>
                                                    <p className="description">{description}</p>
                                                    <p className="items-count">{cards_count} item(s)</p>
                                                    <div className="menu">
                                                        {/* <Link to={`/deck/${id}/practice`}><button className="btn text-left"><i className="lni lni-book"></i> Practice</button></Link> */}
                                                        <button className="btn text-left" 
                                                            onClick={() => {
                                                                fetchLeaderboard(id)
                                                                setLeaderboardModalOpen(true)
                                                            }}>
                                                                <i className="lni lni-cup"></i> Group Leaderboard
                                                        </button>
                                                        {(owner == localId || group.owner == localId) && (<button className="btn text-left text-danger" 
                                                            onClick={() => {
                                                                setDeckToRemove({ id, title, description, visibility, cards_count, owner })
                                                                setRemoveDeckModalOpen(true)
                                                            }}>
                                                                <i className="lni lni-trash-can"></i> Remove
                                                        </button>)}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        {canScrollRightLib && (
                                        <button className="arrow right" onClick={() => scrollLibrary("right")}>
                                            <RightOutlined />
                                        </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="col-md-3">
                            <Card>
                                <div className="d-flex flex-row align-items-center justify-content-between">
                                    <h5>Group Members:</h5>
                                    {group && group.owner == localId && (<button className="btn" onClick={() => {setRemoveModalOpen(true)}}><i className="lni lni-pencil py-0" ></i></button>)}
                                </div>
                                {group.members.map((m) => {
                                    return (<p>{m.email}</p>)
                                })}
                            </Card>
                        </div>
                    </div>
                </section>) : 
                (<div className="d-flex flex-column align-items-center my-5">
                    <h4>You do not have perission to view this group's page</h4>
                    <h6>Please contact a member of this group to receive a join link</h6>
                    <Link to={`/`}>
                        <button className="btn mx-2 group-deck-button my-5" >Return to Homepage</button>
                    </Link>
                </div>)}
            </>)}
        

            <Modal title="User Decks" open={modalOpen} onCancel={() => setModalOpen(false)} width="75vw"
                footer={
                    <>
                        <Link to="/create-deck" target="_blank" rel="noopener noreferrer">
                            <button className="btn mx-2 group-deck-button">Create New Deck</button>
                        </Link>
                        <button className="btn group-deck-button mx-2" disabled={!selectedDeck} 
                            onClick={() => {if(selectedDeck) {addDeckToGroup(selectedDeck)}}}>
                                Add Deck to Group
                        </button>
                    </>
                }>
                <div className="d-flex flex-row flex-wrap deck-modal justify-content-around" >
                    {userDecks.map((deck) => (
                        <div 
                            className={selectedDeck && deck.id === selectedDeck.id ? 
                                "group-add-card mx-1 my-4 selected-card" : 
                                "group-add-card mx-1 my-4"} 
                            key={deck.id}
                            onClick={() => setSelectedDeck(deck)}
                            style={{width: "23vw"}}
                        >
                            <div className="d-flex justify-content-between align-items-center">
                                <h5>{deck.title}</h5>
                            </div>
                            <p className="description">{deck.description}</p>
                            <p className="items-count">{deck.cards_count} item(s)</p>
                        </div>
                    ))}
                </div>
            </Modal>
        
            <Modal open={urlModalOpen} width="60vw" onCancel={() => setURLModalOpen(false)} footer={<button onClick={() => setURLModalOpen(false)}>Close</button>}>
                <h4>{window.location.href + "/" + group?.join_key}</h4>
                <p>Share this link to invite other users to this group.</p>
            </Modal>

            <Modal title="Manage Group Members" open={removeModalOpen} onCancel={() => setRemoveModalOpen(false)} width="50vw" 
            footer={<>
                {!removeConfirm && (<>
                    <button onClick={() => setRemoveConfirm(true)} className="btn btn-danger mx-3" disabled={!userToRemove}>Remove from Group</button>
                    <button onClick={() => {
                        setRemoveModalOpen(false)
                        setUserToRemove(null)
                    }} className="btn mx-2">Cancel</button>
                </>)}
                {removeConfirm && (<>
                    <button onClick={() => removeFromGroup(userToRemove)} className="btn btn-danger mx-3">Yes</button>
                    <button onClick={() => setRemoveConfirm(false)} className="btn mx-2">No</button>
                </>)}
            </>}>
                <>
                    {!removeConfirm && group?.members.map((m: User) => {
                        if(m.userId == userToRemove?.userId) {
                            return (<div className="my-2 group-add-card selected-card">
                                <p className="mb-0">{m.email}</p>
                            </div>)
                        }
                        else {
                            return (<div className="my-2 group-add-card" onClick={() => setUserToRemove(m)}>
                            <p className="mb-0">{m.email}</p>
                        </div>)
                        }
                    })}
                    {removeConfirm && (<>
                        <h4>Are you sure you want to remove user {userToRemove?.email} from the group?</h4>
                        <p>This action cannot be undone</p>
                    </>)}
                </>
            </Modal>

            <Modal title="Confirm Deck Removal" open={removeDeckModalOpen} width="50vw" onCancel={() => setRemoveDeckModalOpen(false)}
            footer={<>
                <button onClick={() => removeDeck(deckToRemove)} className="btn btn-danger mx-3">Yes</button>
                <button onClick={() => setRemoveDeckModalOpen(false)} className="btn mx-2">No</button>
            </>}>
                <>
                    <h4>Are you sure you want to remove deck "{deckToRemove?.title}" from the group?</h4>
                </>
            </Modal>

            <Modal title="Group Leaderboard" open={leaderboardModalOpen} width="75vw" onCancel={() => setLeaderboardModalOpen(false)}
            footer={<>
                <button onClick={() => setLeaderboardModalOpen(false)} className="btn mx-2">Close</button>
            </>}>
                <Table
                    columns={leaderboardColumns}
                    dataSource={leaderboard}
                    pagination={false}
                    rowKey="userEmail"  // Ensure a unique key for each row
                />
            </Modal>
        </div>
    )
}
export default GroupDashboard