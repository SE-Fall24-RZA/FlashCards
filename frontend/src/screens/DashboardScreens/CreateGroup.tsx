import { Radio } from "antd";
import { useState } from "react";
import Swal from "sweetalert2";
import http from "utils/api";
import "./styles.scss";

const CreateGroup = () => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const flashCardUser = window.localStorage.getItem('flashCardUser');
  const { localId, email } = flashCardUser && JSON.parse(flashCardUser) || {};

  const handleCreateGroup = async(e: any) => {
    e.preventDefault();
    const payload = {
      group_name: name,
      description: description,
      localId: localId,
      email: email
    };
    setIsSubmitting(true);

    await http
      .post("/group/create", payload)
      .then((res) => {
        const { id } = res.data;
        Swal.fire({
          icon: 'success',
          title: 'Group Created Successfully!',
          text: 'You have successfully created a group',
          confirmButtonColor: '#221daf',
        }).then(() => {
          setIsSubmitting(false);
          window.location.replace(`/dashboard`);
        })
      })
      .catch((err) => {
        Swal.fire({
          icon: 'error',
          title: 'Group Creation Failed!',
          text: 'An error occurred, please try again',
          confirmButtonColor: '#221daf',
        })
        setIsSubmitting(false);
      });
  };

  return (
    <div className="create-deck-page dashboard-commons">
      <section>
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-md-6">
              <div className="header-card">
                <div className="row justify-content-center">
                  <div className="col-md-12">
                    <div className="page-header">
                      <div className="row justify-content-between align-items-center">
                        <h3>Create a new study group</h3>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flash-card__list row justify-content-center mt-2">
                  <form className="col-md-12" onSubmit={handleCreateGroup}>
                    <div className="form-group">
                      <label>Group Name</label>
                      <input
                        type="text"
                        className="form-control"
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Title"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Description</label>
                      <textarea
                        className="form-control"
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Description"
                        required
                      />
                    </div>
                    <div className="form-group mt-4 text-right mb-0">
                      <button className="btn" type='submit'>
                        <i className="lni lni-circle-plus mr-2"></i>
                        <span className="">{isSubmitting ? 'Creating Group...' : 'Create Group'}</span>
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default CreateGroup;
