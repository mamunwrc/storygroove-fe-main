import { Modal } from "antd";
import React, { useState } from "react";
import { Form, Toast, ToastContainer, Button } from "react-bootstrap";
import { toast, Toaster } from "react-hot-toast";
import { BiErrorCircle, BiHide, BiShow } from "react-icons/bi";
import { useNavigate } from "react-router-dom";
import { axiosOpen } from "../../api/axios";
import ResendVerificationPanel from "../../component/ResendVerification/ResendVerificationPanel";

const SignUpForm = () => {
  const navigate = useNavigate();

  const [showToster, setShowToster] = useState(false);
  const [errorToastMessage, setErrorToastMessage] = useState(
    "Invalid Credentials"
  );
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [registerOpen, setRegisterOpen] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [registrationFailedOpen, setRegistrationFailedOpen] = useState(false);
  const [registrationErrorMessage, setRegistrationErrorMessage] = useState("");

  const handleRegister = (e) => {
    e.preventDefault();

    // Validate password: min 8 chars, letters, numbers, symbols
    const passwordRegex =
      /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]).{8,}$/;

    if (!passwordRegex.test(newPassword)) {
      toast.error(
        "Password must be at least 8 characters with letters, numbers, and symbols"
      );
      return;
    }

    (async () => {
      try {
        const data = {
          fname: firstName,
          lname: lastName,
          email: newEmail,
          username: newEmail,
          password: newPassword,
        };

        const response = await axiosOpen.post(
          "/api/user/register",
          data
        );

        if (response.status === 201) {
          const emailUsed =
            response.data?.email || String(newEmail).trim().toLowerCase();
          setRegisteredEmail(emailUsed);
          setFirstName("");
          setLastName("");
          setNewEmail("");
          setNewPassword("");
          setRegisterOpen(true);
        } else {
          toast.error(response.message);
        }
      } catch (err) {
        const data = err?.response?.data || {};
        const errorMessage = data.message || "Registration failed";
        if (data.code === "EMAIL_DELIVERY_FAILED") {
          setRegistrationErrorMessage(errorMessage);
          setRegistrationFailedOpen(true);
        } else {
          toast.error(errorMessage);
        }
      }
    })();
  };

  return (
    <>
      <Toaster position="top-right" />
      <div className="auth-page">
        {showToster && (
          <ToastContainer position="top-end" className="width-toast ">
            <Toast
              onClose={() => setShowToster(false)}
              show={showToster}
              delay={3000}
              min-width="50px"
              autohide
            >
              <Toast.Header className="toaster-header">
                <BiErrorCircle className="toaster-icon" />
                <div className="toaster-body">
                  {/* <strong className="me-auto">Oops!</strong> */}
                  <br />
                  {/* <strong className="me-auto">Invalid Credential</strong> */}
                  <strong className="me-auto">{errorToastMessage}</strong>
                </div>
              </Toast.Header>
            </Toast>
          </ToastContainer>
        )}

        <div className="auth-background">
          <div className="page-half">
            <div className="form-fields-container">
              <img
                className="logo-img"
                alt="storygrove ai"
                src="/assets/images/story-grove-ai-logo.png"
              ></img>
              <h2 className="form-heading">Sign Up</h2>
              <Form className="form custom-form" onSubmit={handleRegister}>
                <div className="row ">
                  <div className="col-md-6">
                    <label
                      htmlFor="formGroupExampleInput"
                      className="form-label"
                    >
                      First Name
                    </label>
                    <Form.Group className="mb-3 ">
                      <Form.Control
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder=""
                        autoComplete="off"
                        // pattern="[A-Za-z]{1,20}"
                        // title='First name should be only alphabets'
                        required
                      />
                    </Form.Group>
                  </div>
                  <div className="col-md-6">
                    <label
                      htmlFor="formGroupExampleInput"
                      className="form-label"
                    >
                      Last Name
                    </label>
                    <Form.Group className="mb-3 ">
                      <Form.Control
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder=""
                        // title='First name should be only alphabets'
                        autoComplete="off"
                        // pattern="[A-Za-z]{1,20}"
                        required
                      />
                    </Form.Group>
                  </div>
                </div>
                <label htmlFor="formGroupExampleInput" className="form-label">
                  Email
                </label>
                <Form.Group className="mb-3 ">
                  <Form.Control
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    type="email"
                    placeholder=""
                    autoComplete="off"
                    required
                  />
                </Form.Group>
                <Form.Group className="position-relative">
                  <label htmlFor="formGroupExampleInput" className="form-label">
                    Password
                  </label>
                  <Form.Control
                    type={showPassword ? "text" : "password"}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder=""
                    value={newPassword}
                    autoComplete="off"
                    required
                  />
                  <span
                    className="input-group-text password-toggle-icon form-toggle-password"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <BiShow /> : <BiHide />}
                  </span>
                </Form.Group>
                <span className="password-text mt-1">
                  It must be a combination of minimum 8 letters, numbers, and
                  symbols.
                </span>
                <Form.Group
                  controlId="formBasicCheckbox"
                  className=" mt-4 w-100"
                >
                  <Button
                    variant="primary"
                    className="login-btn w-100"
                    type="submit"
                  >
                    Register
                  </Button>
                </Form.Group>
              </Form>
              {/* <div className="w-100">
                <GoogleSignInButton
                  onSuccess={() => navigate("/dashboard")}
                  onError={handleGoogleError}
                  buttonText="Sign up through Google"
                />
              </div> */}
              <Modal
                closable
                open={registerOpen}
                onCancel={() => setRegisterOpen(false)}
                footer={null}
                title="Check your email"
              >
                <p>
                  Your account was created. We sent a verification link to{" "}
                  <strong>{registeredEmail}</strong>. Open it to activate your
                  account before logging in.
                </p>
                <ResendVerificationPanel
                  initialEmail={registeredEmail}
                  compact
                />
              </Modal>
              <Modal
                closable
                open={registrationFailedOpen}
                onCancel={() => setRegistrationFailedOpen(false)}
                footer={null}
                title="Verification email not sent"
              >
                <p>{registrationErrorMessage}</p>
                <p className="mb-0">
                  Please try registering again in a few minutes. If the problem
                  continues, contact{" "}
                  <a href="mailto:support@storygroove.ai">support@storygroove.ai</a>.
                </p>
              </Modal>
              <div className="d-flex justify-content-center text-white mt-4 signup-text">
                Already have an account?&nbsp;{" "}
                <a className="text-white" onClick={() => navigate("/login")}>
                  Login
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default SignUpForm;
