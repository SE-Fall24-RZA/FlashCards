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
    members: string[];
    decks: Deck[];
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
    const [fetchingGroup, setFetchingGroup] = useState(false);
    const [canScrollLeftLib, setCanScrollLeftLib] = useState(false);
    const [canScrollRightLib, setCanScrollRightLib] = useState(false);
    const sliderRefLibrary = useRef<HTMLDivElement>(null);
    const flashCardUser = window.localStorage.getItem("flashCardUser");
    const { localId } = (flashCardUser && JSON.parse(flashCardUser)) || {};
    const { id } = useParams();

    useEffect(() => {
        fetchGroup()
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
                                <div className="col-md-4">
                                    <button className="btn btn-white mx-4">Add Deck</button>
                                    <button className="btn btn-white">Generate Group Invite Link</button>
                                </div>
                            </div>
                        </Card>
                        </div>
                    </div>
                </div>
                <div className="container d-flex flex-row">
                    <div className="col-md-8">
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
                    <div className="col-md-4">
                        <Card>
                            <h4>Group Members:</h4>
                            {group.members.map((m) => {
                                return <p>{m}</p>
                            })}
                        </Card>
                    </div>
                </div>
            </section>)}
        </div>
    )
}

export default GroupDashboard