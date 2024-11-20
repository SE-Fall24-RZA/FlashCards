import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import Swal from "sweetalert2";
import http from "utils/api";
import "./styles.scss";

const EditGroup = () => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOwner, setIsOwner] = useState(false)
  const [fetchingGroup, setFetchingGroup] = useState(false);

  const flashCardUser = window.localStorage.getItem('flashCardUser');
  const { localId, email } = flashCardUser && JSON.parse(flashCardUser) || {};
  const { id } = useParams();

  useEffect(() => {
    fetchGroup()
}, [])

  const fetchGroup = async () => {
    try {
        const res = await http.get(`/group/${id}`);
        const group = res.data?.group;
        if(group.owner == localId) {
            setIsOwner(true)
        }
        setName(group.group_name)
        setDescription(group.description)
      } finally {
        setFetchingGroup(false);
      }
}

  const handleEditGroup = async(e: any) => {
    e.preventDefault();
    const payload = {
      group_name: name,
      description: description,
      localId: localId,
      email: email
    };
    setIsSubmitting(true);

    await http
      .patch(`/group/${id}/update`, payload)
      .then((res) => {
        Swal.fire({
          icon: 'success',
          title: 'Group Updated Successfully!',
          text: 'You have successfully updated a group',
          confirmButtonColor: '#221daf',
        }).then(() => {
          setIsSubmitting(false);
          window.location.replace(`/group/${id}/`);
        })
      })
      .catch((err) => {
        Swal.fire({
          icon: 'error',
          title: 'Group edit Failed!',
          text: 'An error occurred, please try again',
          confirmButtonColor: '#221daf',
        })
        setIsSubmitting(false);
      });
  };

  return (<>
    {!fetchingGroup && isOwner ? (<div className="create-deck-page dashboard-commons">
      <section>
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-md-6">
              <div className="header-card">
                <div className="row justify-content-center">
                  <div className="col-md-12">
                    <div className="page-header">
                      <div className="row justify-content-between align-items-center">
                        <h3>Edit study group</h3>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flash-card__list row justify-content-center mt-2">
                  <form className="col-md-12" onSubmit={handleEditGroup}>
                    <div className="form-group">
                      <label>Group Name</label>
                      <input
                        type="text"
                        className="form-control"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Title"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Description</label>
                      <textarea
                        className="form-control"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Description"
                        required
                      />
                    </div>
                    <div className="form-group mt-4 text-right mb-0">
                      <button className="btn" type='submit'>
                        <i className="lni lni-circle-plus mr-2"></i>
                        <span className="">{isSubmitting ? 'Updating Group...' : 'Update Group Information'}</span>
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>) : 
    <div className="d-flex flex-column align-items-center my-5">
        <h4>This group does not exist or you do not have permission to edit it</h4>
        <Link to={`/`}>
            <button className="btn mx-2 group-deck-button my-5" >Return to Homepage</button>
        </Link>
    </div>}
  </>);
};

export default EditGroup;
