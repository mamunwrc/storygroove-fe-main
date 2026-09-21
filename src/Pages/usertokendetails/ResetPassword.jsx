import React, { useState, useEffect } from "react";
import { Button, Form } from "react-bootstrap";
import { getUserID } from "../../service";
import { resetPassword } from "../../api/user";
import toast, { Toaster } from 'react-hot-toast';

const ResetPassword = ({
  setError,
  setSuccess
}) => {
  const userID = getUserID();
  const [currPassword, setCurrPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [reTypePassword, setReTypePassword] = useState();

  const updatePassword = async () => {
    try {
      if (currPassword && newPassword && reTypePassword) {
        if (newPassword == reTypePassword) {
          const body = {
            userId: userID,
            currentPassword: currPassword,
            newPassword: newPassword,
          };
          const response = await resetPassword(body);
          if (response.success) {
      
            setSuccess(response.response.data.message);
            setCurrPassword("");
            setNewPassword("");
            setReTypePassword("");
          } else {
            if(response?.message?.response?.data?.message){
              setError(response.message.response.data.message);
            }else{
              setError(response.response.data.message);
            }
            setCurrPassword("");
            setNewPassword("");
            setReTypePassword("");
          }
        } else {
          setError("Passwords doesn't match");
        }
      } else {
        setError("Fields cannot be empty");
      }
    } catch (err) {
      //setError(err.response.data.message);
      console.log(err);
    }
  };



  return (
    <>
      <div className="outerprofilediv">
        <div className="innerpassworddiv">
          <div className="mb-3">
            <Form.Label htmlFor="current">Current Password</Form.Label>
            <Form.Control
              value={currPassword}
              onChange={(e) => setCurrPassword(e.target.value)}
              placeholder=""
              className="passwordfield"
              type="password"
              id="current"
            />
          </div>
          <div className="mb-3">
            <Form.Label htmlFor="new">New Password</Form.Label>
            <Form.Control
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder=""
              className="passwordfield"
              type="password"
              id="new"
            />
          </div>
          <div className="mb-3">
            <Form.Label htmlFor="retypr">Re-Type Password</Form.Label>
            <Form.Control
              value={reTypePassword}
              onChange={(e) => setReTypePassword(e.target.value)}
              placeholder=""
              className="passwordfield"
              type="password"
              id="retypr"
            />
          </div>
          <Button onClick={updatePassword} className="passwordbtn">
            Update
          </Button>
        </div>
        <Toaster position="top-right" />
      </div>
    </>
  );
};

export default ResetPassword;
