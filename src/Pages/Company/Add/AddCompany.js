import React, { useEffect, useReducer, useState } from "react";
import { Form, Toast, ToastContainer, Button } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { axiosOpen } from "../../../api/axios";
import axios from "axios";
import "../Company.css";
import { toast } from "react-hot-toast";
import { BiInfoCircle, BiHide, BiShapeCircle, BiShow } from "react-icons/bi";

const reducer = (state, action) => {
  switch (action.type) {
    case "name":
      return { ...state, name: action.payload };
    case "firstname":
      return { ...state, firstname: action.payload };
    case "lastname":
      return { ...state, lastname: action.payload };
    case "number":
      return { ...state, number: action.payload };
    case "email":
      return { ...state, email: action.payload };
    case "employeeCount":
      return { ...state, employeeCount: action.payload };
    case "password":
      return { ...state, password: action.payload };
  }
};

const AddCompany = (props) => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState({
    isValid: true,
    name: "",
    number: "",
    email: "",
    employeeCount: "",
    password: "",
    firstname: "",
    lastname: "",
  });
  const [state, dispatch] = useReducer(reducer, {
    name: "",
    number: "",
    email: "",
    employeeCount: "",
    password: "",
    firstname: "",
    lastname: "",
  });

  const fieldsValidation = (state) => {
    let invalidForm = false;
    // if (!state.name) {
    //   setError((err) => ({ ...err, name: "Field Required" }));
    //   invalidForm = true;
    // } else {
    //   setError((err) => ({ ...err, name: "" }));
    //   invalidForm = false;
    // }
    // if (!state.number) {
    //   setError((err) => ({ ...err, number: "Field Required", isValid: false }));
    //   invalidForm = true;
    // } else {
    //   setError((err) => ({ ...err, number: "" }));
    //   invalidForm = false;
    // }
    if (!state.email) {
      setError((err) => ({ ...err, email: "Field Required", isValid: false }));
      invalidForm = true;
    } else {
      setError((err) => ({ ...err, email: "" }));
      invalidForm = false;
    }
    // if (!state.employeeCount) {
    //   setError((err) => ({ ...err, employeeCount: "Field Required", isValid: false }));
    //   invalidForm = true;
    // } else {
    //   setError((err) => ({ ...err, employeeCount: "" }));
    //   invalidForm = false;
    // }
    if (!state.password) {
      setError((err) => ({
        ...err,
        password: "Field Required",
        isValid: false,
      }));
      invalidForm = true;
    } else {
      setError((err) => ({ ...err, password: "" }));
      invalidForm = false;
    }
    if (!state.firstname) {
      setError((err) => ({
        ...err,
        firstname: "Field Required",
        isValid: false,
      }));
      invalidForm = true;
    } else {
      setError((err) => ({ ...err, firstname: "" }));
      invalidForm = false;
    }
    if (!state.lastname) {
      setError((err) => ({
        ...err,
        lastname: "Field Required",
        isValid: false,
      }));
      invalidForm = true;
    } else {
      setError((err) => ({ ...err, lastname: "" }));
      invalidForm = false;
    }
    return invalidForm;
  };

  const handleResetForm = () => {
    // dispatch({ type: "name", payload: "" });
    dispatch({ type: "number", payload: "" });
    dispatch({ type: "email", payload: "" });
    // dispatch({ type: "employeeCount", payload: "" });
    dispatch({ type: "password", payload: "" });
    dispatch({ type: "firstname", payload: "" });
    dispatch({ type: "lastname", payload: "" });
  };

  const validatePassword = (password) => {
    const passwordPattern = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{6,}$/;
    return passwordPattern.test(password);
  };
  const validateFirstname = (firstname) => {
    return firstname.length >= 3;
  };
  const validateLastname = (lastname) => {
    return lastname.length >= 3;
  };

  const handleAddComp = (e) => {
    e.preventDefault();
    if (fieldsValidation(state)) {
      return;
    } else {
      const isValidPassword = validatePassword(state.password);
      const isValidFirstname = validateFirstname(state.firstname);
      const isValidLastname = validateLastname(state.lastname);
      if (!isValidPassword) {
        setError((err) => ({
          ...err,
          password:
            "Password must have at least 6 characters, including at least one uppercase letter, one lowercase letter, one digit.",
        }));
        return;
      }
      if (!isValidFirstname) {
        setError((err) => ({
          ...err,
          firstname: "First name must be at least 3 characters long.",
        }));
        return;
      }
      if (!isValidLastname) {
        setError((err) => ({
          ...err,
          lastname: "Last name must be at least 3 characters long.",
        }));
        return;
      }

      const requestBody = {
        name: "SJ Innovation LLC",
        number: state.number,
        email: state.email,
        employeeCount: 150,
        password: state.password,
        username: state.email,
        fname: state.firstname,
        lname: state.lastname,
        signupType: "register",
      };
      (async () => {
        try {
          const resp = await axiosOpen.post("api/user/register", {
            ...requestBody,
          });
          //   await axiosOpen.post(process.env.REACT_APP_BASE_URL+"api/add/admin",{...requestBody})
          //  toast.success("Company Added Successfully");

          props.handleOk(resp.data.message);

          // navigate('/login');
        } catch (err) {
          console.log(err);
        }
      })();
    }
  };

  return (
    <div className="add-user-container">
      <Form onSubmit={handleAddComp} className="add-user-form add-company">
        <Form.Group className="mb-3" controlId="formBasicName">
          <Form.Label hidden>Company Name</Form.Label>
          <Form.Control
            type="text"
            placeholder="Company Name"
            onChange={(e) =>
              dispatch({ type: "name", payload: e.target.value })
            }
            isInvalid={error.name}
            value="SJ Innovation LLC"
            hidden
          />
        </Form.Group>
        {/* <Form.Group className="mb-3" controlId="formBasicAmount">
          <Form.Label>Contact Number</Form.Label>
          <Form.Control
            type="number"
            placeholder="Contact Number"
            onChange={(e) => dispatch({ type: "number", payload: e.target.value })}
            isInvalid={!!error.number}
            value={state.number}
          />
        </Form.Group> */}
        <Form.Group className="mb-3" controlId="formBasicFirstname">
          <Form.Label>First Name</Form.Label>
          <Form.Control
            type="text"
            placeholder="First Name"
            onChange={(e) =>
              dispatch({ type: "firstname", payload: e.target.value })
            }
            value={state.firstname}
            isInvalid={!!error.firstname}
          />
          <Form.Control.Feedback type="invalid">
            {error.firstname}
          </Form.Control.Feedback>
        </Form.Group>
        <Form.Group className="mb-3" controlId="formBasicLastname">
          <Form.Label>Last Name</Form.Label>
          <Form.Control
            type="text"
            placeholder="Last Name"
            onChange={(e) =>
              dispatch({ type: "lastname", payload: e.target.value })
            }
            isInvalid={!!error.lastname}
            value={state.lastname}
          />
          <Form.Control.Feedback type="invalid">
            {error.lastname}
          </Form.Control.Feedback>
        </Form.Group>
        <Form.Group className="mb-3" controlId="formBasicEmail">
          <Form.Label>Email Address</Form.Label>
          <Form.Control
            type="email"
            placeholder="Email Address"
            onChange={(e) =>
              dispatch({ type: "email", payload: e.target.value })
            }
            isInvalid={!!error.email}
            value={state.email}
          />
          <Form.Control.Feedback type="invalid">
            {error.email}
          </Form.Control.Feedback>
        </Form.Group>

        <Form.Group className="mb-3" controlId="formBasicCurrency">
          <Form.Label>Password</Form.Label>
          <Form.Control
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            onChange={(e) =>
              dispatch({ type: "password", payload: e.target.value })
            }
            isInvalid={!!error.password}
            value={state.password}
            style={{ position: "relative" }}
          />
          <span
            className="input-group-text password-toggle-icon"
            onClick={() => setShowPassword(!showPassword)}
            style={{
              width: "40px",
              position: "absolute",
              top: "79%",
              right: "21px",
              transform: "translateY(-50%)",
              backgroundColor: "#FFFFFF",
              border: "0",
            }}
          >
            {showPassword ? <BiShow /> : <BiHide />}
          </span>
          <Form.Control.Feedback type="invalid">
            {error.password}
          </Form.Control.Feedback>
        </Form.Group>
        <Form.Group className="mb-3" controlId="formBasicInterval">
          <Form.Label hidden>Employee Strength</Form.Label>
          <Form.Control
            type="number"
            placeholder="Strength"
            onChange={(e) =>
              dispatch({ type: "employeeCount", payload: e.target.value })
            }
            isInvalid={!!error.employeeCount}
            value="150"
            hidden
          />
        </Form.Group>

        <Button variant="primary" type="submit">
          Submit
        </Button>

        <Button className="ms-1" variant="secondary" onClick={handleResetForm}>
          Reset
        </Button>
      </Form>
    </div>
  );
};

export default AddCompany;
