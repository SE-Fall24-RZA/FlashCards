import { Card, Popconfirm, Button, Modal } from "antd";
import { useEffect, useState, useRef } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import EmptyImg from "assets/images/empty.svg";
import { PropagateLoader } from "react-spinners";
import http from "utils/api";
import Swal from "sweetalert2";
import { LeftOutlined, RightOutlined } from "@ant-design/icons";
import Navbar from "../../components/Navbar";

interface Group {
    group_name: string;
    description: string;
    members: User[];
    join_key: string;
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
}


const GroupDashboard = () => {
    const [group, setGroup] = useState<Group | null>(null)
    const [selectedDeck, setSelectedDeck] = useState<Deck | null>(null)
    const [fetchingGroup, setFetchingGroup] = useState(false);
    const [canScrollLeftLib, setCanScrollLeftLib] = useState(false);
    const [canScrollRightLib, setCanScrollRightLib] = useState(false);
    const [modalOpen, setModalOpen] = useState(false)
    const [urlModalOpen, setURLModalOpen] = useState(false)
    const [userDecks, setUserDecks] = useState<Deck[]>([])
    const [fetchingDecks, setFetchingDecks] = useState(true)

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

    return (
        <div className="group-page">
            {group && (<section>
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
                                        {group.decks.map(({ id, title, description, visibility, cards_count }) => (
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
                                                    <Link to={`/deck/${id}/practice`}><button className="btn text-left"><i className="lni lni-book"></i> Practice</button></Link>
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
                            <h4>Group Members:</h4>
                            {group.members.map((m) => {
                                return <p>{m.email}</p>
                            })}
                        </Card>
                    </div>
                </div>
            </section>)}
        

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
                                "group-add-deck-card mx-1 my-4 selected-card" : 
                                "group-add-deck-card mx-1 my-4"} 
                            key={deck.id}
                            onClick={() => setSelectedDeck(deck)}
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
        
            <Modal open={urlModalOpen} width="60vw" footer={<button onClick={() => setURLModalOpen(false)}>Close</button>}>
                <h4>{window.location.href + "/" + group?.join_key}</h4>
                <p>Share this link to invite other users to this group.</p>
            </Modal>
        </div>
    )
}
export default GroupDashboard