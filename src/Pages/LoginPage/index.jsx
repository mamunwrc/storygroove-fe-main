import Cookies from "js-cookie";
import React, { useEffect, useState, useContext } from "react";
import { Form, Button } from "react-bootstrap";
import { BiHide, BiShow } from "react-icons/bi";
import { BiArrowBack } from "react-icons/bi";
import { useNavigate } from "react-router-dom";
import { axiosOpen } from "../../api/axios";
import ResendVerificationPanel from "../../component/ResendVerification/ResendVerificationPanel";
import { getUserSubscriptionDetailsAPI } from "../../api/subscriptions";
import { GoogleSignInButton } from "../../component";
import { ImageContext } from "../../contexts/imageContext";
import useAuth from "../../hooks/useAuth";
import { handleRedirect } from "../../utils/";
import { toast } from "react-toastify";
import NewAuthContext from "../../contexts/NewAuthProvider";

const LoginForm = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const rememberLength = 7; // days
  const [forgotPassword, setForgotPassword] = useState(false);
  const [twoFactorState, setTwoFactorState] = useState({
    required: false,
    challengeToken: null,
    code: "",
  });
  const [twoFactorSubmitting, setTwoFactorSubmitting] = useState(false);
  const [showUnverifiedHelp, setShowUnverifiedHelp] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState("");
  const { setUserTrack } = useContext(ImageContext);
  const { setAuth } = useAuth();

  const applyLoginSuccess = (data) => {
    localStorage.userToken = data?.token;
    localStorage.userEmail = data?.user_email;
    localStorage.userID = data?.userid;
    localStorage.role = data?.role;
    localStorage.userName = data?.userName;
    localStorage.fname = data?.fname;
    localStorage.lname = data?.lname;
    setUserTrack((prevState) => ({
      ...prevState,
      user: data?.userid,
    }));
    const userRole = data?.role === "superadmin" ? "2010" : "2015";
    localStorage.userStatus = userRole;
    setAuth({ role: userRole, loggedIn: true });

    if (data?.openaikeyExist) {
      localStorage.setItem("keyExist", data?.openaikeyExist);
    }

    navigate("/dashboard");
  };

  const handlePostSignIn = async () => {
    const resp = await getUserSubscriptionDetailsAPI();
    if (resp?.nextDueDate) {
      const expDate = new Date(resp?.nextDueDate).getTime();
      const curDate = new Date().getTime();
      if (expDate >= curDate) {
        handleRedirect(navigate);
      } else {
        navigate("/dashboard/userprofile?tab=subscription");
      }
    } else {
      navigate("/dashboard/userprofile?tab=subscription");
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    (async () => {
      try {
        const response = await axiosOpen.post("/api/user/login", {
          email,
          password,
        });

        if (response?.data?.twoFactorRequired) {
          setTwoFactorState({
            required: true,
            challengeToken: response.data.challengeToken,
            code: "",
          });
          toast.success("We've sent a verification code to your email.");
          return;
        }

        applyLoginSuccess(response?.data);
      } catch (err) {
        const status = err.response?.status;
        const data = err.response?.data || {};
        if (data.code === "ACCOUNT_UNVERIFIED") {
          const accountEmail = data.email || email;
          setUnverifiedEmail(accountEmail);
          setShowUnverifiedHelp(true);
          toast.error(data.message);
        } else if (status === 401) {
          setShowUnverifiedHelp(false);
          toast.error(data.message || "Invalid credentials");
        } else {
          setShowUnverifiedHelp(false);
          toast.error("Something went wrong. Please reload and try again");
        }
      }
    })();
  };

  const handleVerify2fa = async (e) => {
    e.preventDefault();
    if (!twoFactorState.challengeToken || !twoFactorState.code) return;
    setTwoFactorSubmitting(true);
    try {
      const response = await axiosOpen.post("/api/user/login/verify-2fa", {
        challengeToken: twoFactorState.challengeToken,
        code: twoFactorState.code,
      });
      applyLoginSuccess(response?.data);
    } catch (err) {
      const status = err.response?.status;
      if (status === 401) {
        toast.error(
          err.response?.data?.message || "Invalid or expired code"
        );
      } else {
        toast.error("Something went wrong. Please try again");
      }
    } finally {
      setTwoFactorSubmitting(false);
    }
  };

  const handleResend2fa = async () => {
    if (!twoFactorState.challengeToken) return;
    try {
      await axiosOpen.post("/api/user/login/resend-2fa", {
        challengeToken: twoFactorState.challengeToken,
      });
      toast.success("If your code expired, a new one has been sent.");
    } catch (_err) {
      toast.success("If your code expired, a new one has been sent.");
    }
  };

  const handleBackFromTwoFactor = () => {
    setTwoFactorState({ required: false, challengeToken: null, code: "" });
    setPassword("");
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    try {
      await axiosOpen.post("/api/user/forgotpassword", { email });
      toast.success(
        "We have received your password reset request. Please check your email for further instructions."
      );
    } catch (error) {
      toast.error(
        "Sorry, we could not find your email address on our system. Please check if you have entered the correct email or create a new account if necessary"
      );
    }
  };

  const handleForgotPasswordSwitch = () => {
    setForgotPassword((currentValue) => !currentValue);
    setEmail("");
    setPassword("");
  };

  useEffect(() => {
    const storedEmail = Cookies.get("rememberedEmail");
    if (storedEmail) {
      setEmail(storedEmail);
      setRememberMe(true);
    }
  }, []);

  useEffect(() => {
    if (rememberMe) {
      Cookies.set("rememberedEmail", email, { expires: rememberLength });
    } else {
      Cookies.remove("rememberedEmail");
    }
  }, [rememberMe, email]);

  return (
    <div className="auth-page">
      {/* Changed: Removed left-section/right-section split, added background overlay */}
      <div className="auth-background">
        <div className="page-half">
          <div className="form-fields-container">
            {/* Changed: Updated logo source to match the new design */}
            <img
              className="logo-img"
              alt="StoryGrove AI"
              src="/assets/images/story-grove-ai-logo.png"
            />
            {/* Changed: Updated title text to match new design */}
            <h2 className="form-heading text-black">
              {twoFactorState.required
                ? "Verify your login"
                : forgotPassword
                ? "Forgot Password"
                : "Login"}
            </h2>

            {twoFactorState.required ? (
              <Form
                onSubmit={handleVerify2fa}
                className="form custom-form"
              >
                <div className="d-flex w-100 mb-3">
                  <BiArrowBack
                    className="forget-password-switch"
                    onClick={handleBackFromTwoFactor}
                  />
                </div>
                <p className="password-text mb-3">
                  We emailed a 6-digit verification code to your superadmin
                  email address. Enter it below to finish signing in.
                </p>
                <Form.Group className="mb-3">
                  <Form.Label className="form-label">
                    Verification Code
                  </Form.Label>
                  <Form.Control
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    placeholder="Enter 6-digit code"
                    autoComplete="one-time-code"
                    onChange={(e) =>
                      setTwoFactorState((s) => ({
                        ...s,
                        code: e.target.value.replace(/\D/g, "").slice(0, 6),
                      }))
                    }
                    value={twoFactorState.code}
                    required
                  />
                </Form.Group>
                <Button
                  variant="primary"
                  type="submit"
                  className="login-btn w-100"
                  disabled={
                    twoFactorSubmitting || twoFactorState.code.length !== 6
                  }
                >
                  {twoFactorSubmitting ? "Verifying..." : "Verify & Sign In"}
                </Button>
                <div className="signup-text mt-3">
                  Didn't receive a code?{" "}
                  <Button
                    variant="link"
                    className="forgot-link"
                    onClick={handleResend2fa}
                    type="button"
                  >
                    Resend code
                  </Button>
                </div>
              </Form>
            ) : forgotPassword ? (
              <Form
                onSubmit={handleForgotPassword}
                className="form custom-form"
              >
                {/* Changed: Adjusted layout for forgot password form */}
                <div className="d-flex w-100 mb-3">
                  <BiArrowBack
                    className="forget-password-switch"
                    onClick={handleForgotPasswordSwitch}
                  />
                </div>
                <Form.Group className="mb-3">
                  <Form.Label className="form-label">Email Address</Form.Label>
                  <Form.Control
                    type="email"
                    placeholder="Enter your email"
                    autoComplete="off"
                    onChange={(e) => setEmail(e.target.value)}
                    value={email}
                    required
                  />
                </Form.Group>
                <Button
                  variant="primary"
                  type="submit"
                  className="login-btn w-100"
                >
                  Send Reset Link
                </Button>
              </Form>
            ) : (
              <Form onSubmit={handleSubmit} className="form custom-form">
                <Form.Group className="mb-3">
                  <Form.Label className="form-label">Email Address</Form.Label>
                  <Form.Control
                    type="email"
                    placeholder="Enter your email"
                    autoComplete="off"
                    onChange={(e) => setEmail(e.target.value)}
                    value={email}
                    required
                  />
                </Form.Group>
                <Form.Group className="position-relative">
                  <Form.Label className="form-label">Password</Form.Label>
                  <Form.Control
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
                    autoComplete="off"
                    onChange={(e) => setPassword(e.target.value)}
                    value={password}
                    required
                  />
                  <span
                    className="input-group-text password-toggle-icon form-toggle-password"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <BiShow /> : <BiHide />}
                  </span>
                </Form.Group>
                {/* Changed: Added password hint text to match the new design */}
                <span className="password-text mt-1">
                  It must be a combination of minimum 8 letters, numbers, and
                  symbols.
                </span>
                <br />
                <br />
                <Button
                  variant="primary"
                  type="submit"
                  className="login-btn w-100"
                >
                  Log In
                </Button>
                {/* Changed: Updated signup text to match new design */}
                <div className="signup-text mt-4">
                  Forgot your password?
                  <Button
                    variant="link"
                    className="forgot-link"
                    onClick={handleForgotPasswordSwitch}
                  >
                    Click Here
                  </Button>
                </div>
                <div className="signup-text mt-3">
                  Don&apos;t have an account?{" "}
                  <a
                    href="https://storygroove.ai/#pricing"
                    className="signup-text-a btn btn-link"
                  >
                    Buy Your Plan
                  </a>
                </div>
                <div className="signup-text mt-2">
                  Need to verify your email?{" "}
                  <Button
                    variant="link"
                    className="forgot-link"
                    type="button"
                    onClick={() => navigate("/resend-verification")}
                  >
                    Resend verification
                  </Button>
                </div>
                {showUnverifiedHelp && (
                  <div className="mt-3 p-3 border rounded bg-light text-dark">
                    <p className="mb-2 small">
                      Your account exists but is not verified yet. Resend the
                      verification link below.
                    </p>
                    <ResendVerificationPanel
                      initialEmail={unverifiedEmail}
                      compact
                    />
                  </div>
                )}
              </Form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;
