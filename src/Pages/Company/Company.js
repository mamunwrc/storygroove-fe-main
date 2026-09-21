import { useForm } from "react-hook-form";
import React, { useEffect, useState, useContext } from "react";
import { Col, Row, Form, Button, Toast } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { toast, Toaster } from "react-hot-toast";
// import Sidebar from "../Home/Sidebar";
import Loader from "../Loader/Loader";
// import './Company.css';
import { AuthContext } from "../../contexts/AuthProvider";
import axios from "axios";
import { axiosOpen } from "../../api/axios";

const Company = () => {
  const [data, setData] = useState();
  const [loader, setLoader] = useState(true);
  const [descriptionValue, setDescriptionValue] = useState("");
  const [comapnayValue, setComapnayValue] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [role, setRole] = useState("");

  const [isLoading, setIsLoading] = useState(true);

  const { register } = useForm();

  //   const { user } = useContext(AuthContext);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axiosOpen.get(
          "/api/company/getdata/" + localStorage.getItem("userID")
        );

        // const responsedata = await response.json();

        if (response != null) {
          setLoader(false);
        }
        const userid = {
          userId: localStorage.getItem("userID"),
        };
        axiosOpen
          .get("api/user/getuser", {
            headers: {
              authorization: "Bearer " + localStorage.userToken,
            },
          })
          .then((response) => {
            setRole(response?.data?.user?.role);
          })
          .catch((error) => {
            console.log(error);
          });
        if (response != null) {
          setData(response.data.data);
          setCompanyId(response.data._id);
          setDescriptionValue(response.data.data);
          setComapnayValue(response.data.name);
          setIsLoading(false);
          if (response != null && response.data.data == undefined) {
            toast.error("Please fill your company profile");
          }
        } else {
          setCompanyId(null);
          setDescriptionValue(null);
          setComapnayValue(null);
        }
      } catch (error) {
        console.error(error);
      }
    };
    fetchData();
  }, []);

  let id = companyId;
  let companydata = descriptionValue;
  let name = comapnayValue;
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    // let emailid = user.email;
    let userid = localStorage.getItem("userID");
    const payload = JSON.stringify({
      userid,
      companydata,
      name,
    });
    try {
      const response = await axiosOpen.post("api/company/adddata/", payload);

      //toast.success(response?.data?.msg);
      // const data = await response.json();
      toast.success("Your company profile has been created successfully");
    } catch (error) {
      console.error("Error:", error);
    }
    //navigate("/home");
  };
  return (
    <>
      {loader ? (
        <div className="d-flex justify-content-center align-items-center h-100">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      ) : (
        <>
          <div>
            <Toaster />
          </div>
          <div className="row" style={{ padding: "40px" }}>
            <div className="col-3">{/* <Sidebar /> */}</div>
            <div className="col-9">
              <div className="article-title form-update">
                <Row className="">
                  <div className="mb-3">
                    <h3 className="title">Company Details</h3>
                  </div>
                  <Col md="9">
                    <Form onSubmit={handleSubmit}>
                      <Row>
                        <Col>
                          <Form.Group className="mb-4">
                            {/* <Form.Label className="description-header">Description</Form.Label> */}

                            {data ? (
                              <>
                                <Form.Label className="bold-label">
                                  Company Name
                                </Form.Label>
                                <Form.Control
                                  key={data._id}
                                  type="text"
                                  placeholder="Company Name"
                                  rows={10}
                                  value={comapnayValue}
                                  disabled={true}
                                  onChange={(e) =>
                                    setComapnayValue(e.target.value)
                                  }
                                />
                                <Form.Label
                                  style={{ marginTop: "20px" }}
                                  className="bold-label"
                                >
                                  About Your Company
                                </Form.Label>
                                <Form.Control
                                  key={data._id}
                                  as="textarea"
                                  placeholder="Description"
                                  rows={10}
                                  value={descriptionValue}
                                  onChange={(e) =>
                                    setDescriptionValue(e.target.value)
                                  }
                                />
                              </>
                            ) : (
                              <>
                                <Form.Label className="bold-label">
                                  Company Name
                                </Form.Label>
                                <Form.Control
                                  type="text"
                                  placeholder="Company Name"
                                  rows={10}
                                  value={comapnayValue}
                                  onChange={(e) =>
                                    setComapnayValue(e.target.value)
                                  }
                                />
                                <Form.Label
                                  style={{ marginTop: "20px" }}
                                  className="bold-label"
                                >
                                  About Your Company
                                </Form.Label>
                                <Form.Control
                                  as="textarea"
                                  placeholder="Description of the Company"
                                  rows={10}
                                  value={descriptionValue}
                                  onChange={(e) =>
                                    setDescriptionValue(e.target.value)
                                  }
                                />
                              </>
                            )}

                            <br />
                            <div className="btn-wrapper">
                              {data ? (
                                <Button type="submit" className="save-btn">
                                  Update
                                </Button>
                              ) : (
                                <Button type="submit" className="save-btn">
                                  Save
                                </Button>
                              )}
                            </div>
                          </Form.Group>
                        </Col>
                      </Row>
                    </Form>
                  </Col>
                </Row>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default Company;
