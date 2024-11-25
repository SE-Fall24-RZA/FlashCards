import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router";
import { Link } from "react-router-dom";
import http from "utils/api";

const JoinGroup = () => {
    const [loading, setLoading] = useState(true)
    const [joinedGroup, setJoinedGroup] = useState(false)
    const [joining, setJoining] = useState(false)
    const {id, key} = useParams()
    const flashCardUser = window.localStorage.getItem("flashCardUser");
    const { localId, email } = (flashCardUser && JSON.parse(flashCardUser)) || {};

    useEffect(() => {
        joinGroup()
    }, [])

    const joinGroup = async () => {
        try {
            if(!joining) {
                setJoining(true)
                const response = await http.patch(`/group/${id}/addMember`, {
                    localId: localId,
                    email: email,
                    key: key
                })
                if(response.status === 200) {
                    await http.post(`/group/${id}/messages`, {
                        email: "SYSTEM",
                        message: `User '${email}' has joined the group.  Welcome!`
                    })
                    setJoinedGroup(true)
                }
                else {
                    setJoinedGroup(false)
                }
            }
            
        } finally {
            setLoading(false)
        }
    }

    return (<div className="group-page">
        {loading ? 
        (<div className="container">
            <div className="d-flex flex-column align-items-center my-5">
                <h4>Joining Group...</h4>
                <h6>Please wait</h6>
            </div>
        </div>) : 
        joinedGroup ? 
        (<div className="container">
            <div className="d-flex flex-column align-items-center my-5">
                <h4>Successfully joined group!</h4>
                <Link to={`/group/${id}`}>
                    <button className="btn mx-2 group-deck-button">Go to group homepage</button>
                </Link>
            </div>
        </div>) : 
        (<div className="container">
            <div className="d-flex flex-column align-items-center my-5">
                <h4>Error Joining Group</h4>
                <h6>Please contact a member of this group to ensure you have the correct join link</h6>
                <Link to={`/`}>
                    <button className="btn mx-2 group-deck-button my-5" >Return to Homepage</button>
                </Link>
            </div>
        </div>)}
    </div>)
}

export default JoinGroup