import React, { useContext, useEffect, useState, useRef } from "react";
import { Button, Form, Image } from "react-bootstrap";
import {
  getUser,
  removeProfilePic,
  updateProfile,
  uploadProfilePic,
} from "../../api/user";
import { getSharedOpenAIKey, setSharedOpenAIKey } from "../../api/assistant";
import Loading from "../../component/Prompt/Loading";
import { AiOutlineUpload } from "react-icons/ai";
import { MdModeEditOutline, MdSave } from "react-icons/md";
import { FiEye, FiEyeOff } from "react-icons/fi";
import { toast } from "react-toastify";
import { RiDeleteBin6Line } from "react-icons/ri";
import { ImageContext } from "../../contexts/imageContext";
import "./profile.css";

const Profile = ({ setError, setSuccess }) => {
  const { userImages, setUserImages } = useContext(ImageContext);

  const [user, setUser] = useState();
  const [isEditingName, setIsEditingName] = useState(false);
  const [isImageLoading, setIsImageLoading] = useState(false);
  const [sharedOpenaiKey, setSharedOpenaiKey] = useState("");
  const [existingKey, setExistingKey] = useState(null);
  const [showKey, setShowKey] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSavingKey, setIsSavingKey] = useState(false);

  const isSuperAdmin = typeof localStorage !== "undefined" && localStorage.getItem("role") === "superadmin";

  const fileInputRef = useRef(null);

  const getUserDetails = async () => {
    try {
      const res = await getUser();
      if (!res.success || !res.user) {
        return;
      }
      const u = res.user;
      u.name = `${u.fname || ""} ${u.lname || ""}`.trim();
      if (u.image && typeof u.image !== "object") {
        setUserImages(`${process.env.REACT_APP_BASE_URL}/${u.image}`);
      }
      setUser(u);
    } catch (e) {
      console.error("Failed to fetch user:", e);
    }
  };

  const fetchSharedKey = async () => {
    try {
      const res = await getSharedOpenAIKey();
      if (res.exists && res.apiKey) {
        setExistingKey(res.apiKey);
      }
    } catch (e) {
      console.error("Failed to fetch shared key:", e);
    }
  };

  useEffect(() => {
    getUserDetails();
    if (isSuperAdmin) fetchSharedKey();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const updateField = async (field) => {
    try {
      const body = { userId: user._id, [field]: user[field] };
      const response = await updateProfile(body);
      setSuccess(response?.response?.data?.message || "Profile updated");
    } catch (e) {
      setError(e?.response?.data?.message || "Update failed");
    }
  };

  const upload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsImageLoading(true);
    const formData = new FormData();
    formData.append("image", file);

    try {
      await uploadProfilePic(formData);
      getUserDetails();
    } catch (e) {
      toast.error("Upload failed");
    } finally {
      setIsImageLoading(false);
    }
  };

  const remove = async () => {
    if (!userImages) {
      setError("No Profile Picture Found");
      return;
    }

    setIsImageLoading(true);
    try {
      const response = await removeProfilePic({});
      setSuccess(response?.response?.data?.message || "Profile image removed");
      getUserDetails();
      setUserImages(null);
    } catch (e) {
      setError(
        e?.response?.data?.message ||
          "Error deleting profile picture. Please try again later."
      );
    } finally {
      setIsImageLoading(false);
    }
  };

  const handleEditSave = () => {
    updateField("fname");
    updateField("lname");
    setIsEditingName(false);
  };

  const handleSaveSharedOpenAIKey = async () => {
    if (!sharedOpenaiKey.trim()) {
      toast.error("Please enter an OpenAI API key");
      return;
    }
    setIsSavingKey(true);
    try {
      await setSharedOpenAIKey(sharedOpenaiKey.trim());
      toast.success("Shared OpenAI API key saved successfully");
      setExistingKey(sharedOpenaiKey.trim());
      setSharedOpenaiKey("");
      setShowKey(false);
      setIsEditing(false);
    } catch (e) {
      const msg =
        e?.response?.data?.message || e?.response?.data?.error || "Failed to save shared OpenAI key";
      toast.error(msg);
    } finally {
      setIsSavingKey(false);
    }
  };

  if (!user) return <Loading />;

  return (
    <>
      <div className="user-image-div user-image-card d-flex flex-column align-items-center justify-content-center p-4 mb-4">
        <div className="position-relative d-flex align-items-center justify-content-center">
          <Image
            className="profileimg shadow mb-3"
            src={userImages || "/assets/images/dummy-user.png"}
            roundedCircle
            alt="User profile"
            style={{ opacity: isImageLoading ? 0.3 : 1 }}
          />
          {isImageLoading && (
            <div className="position-absolute">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          )}
        </div>
        <div className="d-flex gap-2 mt-2">
          <Button
            onClick={remove}
            className="imgremovebtn btn-outline-danger"
            disabled={isImageLoading}
          >
            <RiDeleteBin6Line className="imgbuttonicon" size="20px" />
            Remove
          </Button>
          <input
            accept="image/*"
            onChange={upload}
            ref={fileInputRef}
            type="file"
            style={{ display: "none" }}
          />
          <Button
            onClick={() => fileInputRef.current.click()}
            className="btn-dark"
            disabled={isImageLoading}
          >
            <AiOutlineUpload size="20px" className="imgbuttonicon" />
            Update
          </Button>
        </div>
      </div>

      <div id="profile">
        <div className="row mb-3 align-items-end">
          <div className="col-md-6 mb-2">
            <Form.Label htmlFor="fname">First Name</Form.Label>
            <Form.Control
              disabled={!isEditingName}
              value={user.fname || ""}
              onChange={(e) => setUser({ ...user, fname: e.target.value })}
              type="text"
              id="fname"
              className="formcontrol"
            />
          </div>
          <div className="col-md-6 mb-2">
            <Form.Label htmlFor="lname">Last Name</Form.Label>
            <Form.Control
              disabled={!isEditingName}
              value={user.lname || ""}
              onChange={(e) => setUser({ ...user, lname: e.target.value })}
              type="text"
              id="lname"
              className="formcontrol"
            />
          </div>
          <div className="col-12 justify-content-end d-flex">
            {!isEditingName ? (
              <Button
                className="btn btn-outline-primary"
                onClick={() => setIsEditingName(true)}
              >
                <MdModeEditOutline className="editicon" /> Edit
              </Button>
            ) : (
              <Button className="btn btn-success" onClick={handleEditSave}>
                <MdSave className="editicon" /> Save
              </Button>
            )}
          </div>
        </div>

        <Form.Label htmlFor="email">
          {user?.signupType === "shopify" ? "Shopify Store URL" : "Email :"}
        </Form.Label>
        <div className="formcontroldiv">
          <Form.Control
            disabled
            value={user.email}
            className="formcontrol mb-2"
            type="email"
            id="email"
          />
        </div>

        {isSuperAdmin && (
          <>
            <hr className="my-4" />
            <h6 className="mb-3">Shared OpenAI API Key</h6>
            <p className="text-muted mb-2" style={{ fontSize: "0.85rem" }}>
              This key is used by all users for AI features. Only superadmin can update it.
            </p>

            {existingKey && !isEditing ? (
              <div className="d-flex gap-2 align-items-start">
                <div className="position-relative flex-grow-1">
                  <Form.Control
                    value={existingKey}
                    readOnly
                    type={showKey ? "text" : "password"}
                    className="formcontrol pe-5"
                  />
                  <span
                    onClick={() => setShowKey(!showKey)}
                    className="position-absolute"
                    style={{
                      right: "12px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      cursor: "pointer",
                      color: "#888",
                    }}
                  >
                    {showKey ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                  </span>
                </div>
                <Button
                  className="btn btn-outline-primary"
                  onClick={() => {
                    setIsEditing(true);
                    setShowKey(false);
                  }}
                >
                  <MdModeEditOutline className="editicon" /> Update
                </Button>
              </div>
            ) : (
              <div className="d-flex gap-2 align-items-start">
                <div className="position-relative flex-grow-1">
                  <Form.Control
                    value={sharedOpenaiKey}
                    onChange={(e) => setSharedOpenaiKey(e.target.value)}
                    type={showKey ? "text" : "password"}
                    placeholder="sk-..."
                    className="formcontrol pe-5"
                    id="sharedOpenaiKey"
                  />
                  <span
                    onClick={() => setShowKey(!showKey)}
                    className="position-absolute"
                    style={{
                      right: "12px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      cursor: "pointer",
                      color: "#888",
                    }}
                  >
                    {showKey ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                  </span>
                </div>
                <Button
                  className="btn btn-dark"
                  onClick={handleSaveSharedOpenAIKey}
                  disabled={isSavingKey || !sharedOpenaiKey.trim()}
                >
                  {isSavingKey ? "Saving..." : "Save Key"}
                </Button>
                {existingKey && (
                  <Button
                    className="btn btn-outline-secondary"
                    onClick={() => {
                      setIsEditing(false);
                      setSharedOpenaiKey("");
                      setShowKey(false);
                    }}
                  >
                    Cancel
                  </Button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
};

export default Profile;
