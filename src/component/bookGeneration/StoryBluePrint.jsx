import React, { useState } from "react";
import {
  Button,
  Card,
  Form,
  InputGroup,
  OverlayTrigger,
  Tooltip,
} from "react-bootstrap";
import { updateBook } from "../../api/bookGeneration";
import { toast } from "react-toastify";
import { IoIosArrowBack } from "react-icons/io";
import { FaArrowRight } from "react-icons/fa6";
import { MdInfoOutline } from "react-icons/md";
const StoryBluePrint = ({
  bookData,
  setBookData,
  onNext,
  onPrevious,
  subStep,
  setSubStep,
  setActiveTab,
}) => {
  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "compTitles1") {
      setBookData({ ...bookData, compTitles: [value, bookData.compTitles[1]] });
    } else if (name === "compTitles2") {
      setBookData({ ...bookData, compTitles: [bookData.compTitles[0], value] });
    } else {
      setBookData({ ...bookData, [name]: value });
    }
  };

  const handlePreviousSubStep = () => {
    if (subStep > 1) {
      setSubStep(subStep - 1);
    }
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // setLoading(true);
      const response = await updateBook(bookData);
      if (response.status === 200) {
        if (subStep === 1) {
          setSubStep(subStep + 1);
        }
        if (subStep === 2) {
          setSubStep(subStep + 1);
        }
        if (subStep === 3) {
          setSubStep(subStep + 1);
        }
        if (subStep === 4) {
          setActiveTab("development");
          localStorage.setItem("activeTab", "development");
        }
      }
    } catch (err) {
      toast.error(err.response.data.error);
      console.error(err.response.data.error);
    } finally {
      // setLoading(false);
    }
  };

  const FormContainer = () => {
    return (
      <div className="mb-4">
        <div className="d-flex justify-content-between align-items-center mb-2 flex-wrap">
          <Card.Title className="title-text-h3 mb-0">
            Your Story Blueprint
          </Card.Title>
          {/* Sub-step Indicator */}
          <SubStepFunction />
        </div>
        <p className="text-muted body-text-small lh-md">
          This is your Story Bible—built around your original idea. It teaches
          craft, organizes your outline, backstories, and story structure. Fill
          it out—and watch your story leap from your head to the page and come
          to life in 3D.
        </p>
      </div>
    );
  };

  const SubStepFunction = () => {
    return (
      <div className="d-flex gap-2 substep">
        {/* {subStep > 1 && <IoIosArrowBack onClick={handlePreviousSubStep} />} */}
        <div className="d-flex align-items-center sub-step-container">
          {[1, 2, 3, 4].map((step) => (
            <React.Fragment key={step}>
              <div
                className={`sub-step-circle ${
                  subStep === step ? "active" : subStep > step ? "selected" : ""
                }`}
              ></div>
              {step < 4 && (
                <div
                  className={`sub-step-connector ${
                    subStep === step
                      ? "connected"
                      : subStep > step
                      ? "not-connected"
                      : ""
                  }`}
                ></div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    );
  };
  const [supportingArrayNumber, setSupportingArrayNumber] = useState(() => {
    const existingCharacters = bookData.supportingCharacters || [];
    const count = Math.max(existingCharacters.length, 3); // At least 3 characters
    return Array.from({ length: count }, (_, i) => i + 1);
  });
  const handleAddCharacter = () => {
    const lastNumber = supportingArrayNumber[supportingArrayNumber.length - 1];
    const newCharacterIndex = lastNumber + 1;

    // Add the new character number to the array
    setSupportingArrayNumber((prev) => [...prev, newCharacterIndex]);

    // Initialize empty character data for the new character
    const updatedCharacters = [...(bookData.supportingCharacters || [])];
    updatedCharacters[newCharacterIndex - 1] = {
      name: "",
      role: "",
      _id: undefined, // or you can generate a temporary ID if needed
    };

    setBookData({
      ...bookData,
      supportingCharacters: updatedCharacters,
    });
  };

  return (
    <Card className="p-4 generate-book-card-container form-control-icon">
      <Card.Body>
        {subStep === 1 && (
          <Form onSubmit={handleSubmit}>
            <FormContainer />
            <div className="form generate-book-form-container mt-4">
              <div className="row">
                <div className="col-md-6">
                  {" "}
                  <Form.Group className="mb-3" controlId="genre">
                    <Form.Label>Genre</Form.Label>
                    <InputGroup>
                      <Form.Control
                        required
                        type="text"
                        name="genre"
                        value={bookData.genre}
                        onChange={handleChange}
                      />
                      <InputGroup.Text>
                        <OverlayTrigger
                          placement="top"
                          overlay={
                            <Tooltip id="genre-tooltip">
                              Enter your book’s genre—YA, fantasy, romance,
                              horror, sci-fi, commercial, upmarket, literary, or
                              any blend that fits your story (ie, Romantasy).
                            </Tooltip>
                          }
                        >
                          <span>
                            <MdInfoOutline />
                          </span>
                        </OverlayTrigger>
                      </InputGroup.Text>
                    </InputGroup>
                  </Form.Group>
                </div>
                <div className="col-md-6">
                  {" "}
                  <Form.Group className="mb-3" controlId="wordCount">
                    <Form.Label>Target Word Count</Form.Label>
                    <InputGroup>
                      <Form.Control
                        required
                        type="number"
                        name="wordCount"
                        value={bookData.wordCount}
                        onChange={handleChange}
                      />
                      <InputGroup.Text>
                        <OverlayTrigger
                          placement="top"
                          overlay={
                            <Tooltip id="wordCount-tooltip">
                              Use the average word count closest to your genre:
                              <br />
                              <br />
                              <span className="fw-bold">
                                Commercial fiction
                              </span>{" "}
                              (YA, romcoms, thrillers, mysteries): 60,000-80,000
                              words ≈ 240-320 pages
                              <br />
                              <br />
                              <span className="fw-bold">
                                Upmarket & literary fiction
                              </span>{" "}
                              (emotional depth, strong voice): 80,000-100,000
                              words ≈ 320-400 pages
                              <br />
                              <br />
                              <span className="fw-bold">
                                Science fiction & high fantasy 
                              </span> (world building, layered plots): 90,000-110,000
                              words ≈ 360-440 pages
                              <br />
                              <br /> ProTip: New authors under 110,000 words to
                              improve your chances of publishing.
                            </Tooltip>
                          }
                        >
                          <span>
                            <MdInfoOutline />
                          </span>
                        </OverlayTrigger>
                      </InputGroup.Text>
                    </InputGroup>
                  </Form.Group>
                </div>
              </div>

              <div className="row">
                <div className="col-md-6">
                  {" "}
                  <Form.Group className="mb-3" controlId="setting">
                    <Form.Label>Setting</Form.Label>
                    <InputGroup>
                      <Form.Control
                        required
                        as="textarea"
                        rows={3}
                        type="text"
                        style={{ minHeight: "96px" }}
                        name="setting"
                        value={bookData.setting}
                        onChange={handleChange}
                      />
                      <InputGroup.Text>
                        <OverlayTrigger
                          placement="top"
                          overlay={
                            <Tooltip id="setting-tooltip">
                              Where and when does your story take place? Give us
                              all the juicy details—location, time period,
                              atmosphere, even weird weather. The more you
                              share, the better. Think: a quiet Midwestern town,
                              neon-lit Mars colony, 1987 fog-drenched Victorian
                              London, suburbia 2002, or a dystopian underwater
                              city with glowing jellyfish mailmen.You get the
                              picture :)
                            </Tooltip>
                          }
                        >
                          <span>
                            <MdInfoOutline />
                          </span>
                        </OverlayTrigger>
                      </InputGroup.Text>
                    </InputGroup>
                  </Form.Group>
                </div>
                <div className="col-md-6">
                  {" "}
                  <Form.Group className="mb-3" controlId="narrativeStyle">
                    <Form.Label>POV</Form.Label>
                    <Form.Control
                      required
                      as="textarea"
                      rows={3}
                      type="text"
                      name="narrativeStyle"
                      value={bookData.narrativeStyle}
                      onChange={handleChange}
                    />
                  </Form.Group>
                </div>
              </div>
            </div>
            <div className="d-flex justify-content-end mt-4 gap-2">
              {subStep > 1 && (
                <Button
                  variant="primary"
                  className="button-medium"
                  onClick={handlePreviousSubStep}
                >
                  <IoIosArrowBack /> Back
                </Button>
              )}
              <Button type="submit" variant="primary" className="button-medium">
                Save & Continue <FaArrowRight />
              </Button>
            </div>
          </Form>
        )}

        {subStep === 2 && (
          <Form onSubmit={handleSubmit}>
            <FormContainer />
            <div className="row">
              <div className="col-md-6">
                <div className="generate-book-form-container w-100">
                  <p>Protagoist</p>
                  <Form.Group className="mb-3" controlId="protagonist">
                    <Form.Label>Name</Form.Label>
                    <InputGroup>
                      <Form.Control
                        required
                        type="text"
                        name="protagonist"
                        value={bookData.protagonist || ""}
                        onChange={handleChange}
                      />
                      <InputGroup.Text>
                        <OverlayTrigger
                          placement="top"
                          overlay={
                            <Tooltip id="protagonist-tooltip">
                              Start with a name that sparks something.
                            </Tooltip>
                          }
                        >
                          <span>
                            <MdInfoOutline />
                          </span>
                        </OverlayTrigger>
                      </InputGroup.Text>
                    </InputGroup>
                  </Form.Group>
                  <Form.Group
                    className="mb-3"
                    controlId="protagonistDescription"
                  >
                    <Form.Label>Role, Goals & Stakes</Form.Label>
                    <InputGroup>
                      <Form.Control
                        as="textarea"
                        rows={3}
                        required
                        type="text"
                        style={{ minHeight: "96px" }}
                        name="protagonistDescription"
                        value={bookData.protagonistDescription || ""}
                        onChange={handleChange}
                      />
                      <InputGroup.Text>
                        <OverlayTrigger
                          placement="top"
                          overlay={
                            <Tooltip id="protagonistDescription-tooltip">
                              Hit these three key beats:
                              <ul>
                                <li>
                                  <b>Role in the story:</b> e.g., A rebellious
                                  teen uncovering her family's hidden legacy
                                </li>
                                <li>
                                  <b>Main goal or desire:</b> e.g., She wants to
                                  escape her small town and find her missing
                                  mother
                                </li>
                                <li>
                                  <b>What’s at stake: </b> e.g., If she fails,
                                  she’ll lose the only chance to learn the
                                  truth—and herself in the process
                                </li>
                              </ul>
                            </Tooltip>
                          }
                        >
                          <span>
                            <MdInfoOutline />
                          </span>
                        </OverlayTrigger>
                      </InputGroup.Text>
                    </InputGroup>
                  </Form.Group>
                </div>
              </div>
              <div className="col-md-6">
                <div className="col-md-6 generate-book-form-container w-100">
                  <p>Antagoist</p>
                  <Form.Group className="mb-3" controlId="antagonist">
                    <Form.Label>Name</Form.Label>
                    <InputGroup>
                      <Form.Control
                        required
                        type="text"
                        name="antagonist"
                        value={bookData.antagonist || ""}
                        onChange={handleChange}
                      />
                      <InputGroup.Text>
                        <OverlayTrigger
                          placement="top"
                          overlay={
                            <Tooltip id="antagonist-tooltip">
                              Start with a name that sparks something.
                            </Tooltip>
                          }
                        >
                          <span>
                            <MdInfoOutline />
                          </span>
                        </OverlayTrigger>
                      </InputGroup.Text>
                    </InputGroup>
                  </Form.Group>
                  <Form.Group className="mb-3" controlId="antagonistMotivation">
                    <Form.Label>Motivation</Form.Label>
                    <InputGroup>
                      <Form.Control
                        as={"textarea"}
                        rows="3"
                        required
                        type="text"
                        style={{ minHeight: "96px" }}
                        name="antagonistMotivation"
                        value={bookData.antagonistMotivation || ""}
                        onChange={handleChange}
                      />
                      <InputGroup.Text>
                        <OverlayTrigger
                          placement="top"
                          overlay={
                            <Tooltip id="antagonistMotivation-tooltip">
                              Hit these three key beats:
                              <ul>
                                <li>
                                  <b>Who or what they are:</b> e.g., A
                                  controlling aunt or powerful institution
                                </li>
                                <li>
                                  <b>What drives them:</b> e.g., Fear of losing
                                  control, a desire to protect family reputation
                                </li>
                                <li>
                                  <b>How they oppose the protagonist: </b> e.g.,
                                  Their actions block the protagonist’s goals &
                                  desires. For example, tries to keep the
                                  protagonist in the dark by hiding letters,
                                  gaslighting her, or threatening anyone who
                                  speaks out <br />
                                  Pro-tip: Some of the best antagonists think
                                  they’re doing the right thing—even if it
                                  destroys everything your protagonist needs.
                                  Your antagonist doesn’t have to be a person—it
                                  can be the weather, a corporation, or even a
                                  fear that keeps your protagonist stuck.
                                </li>
                              </ul>
                            </Tooltip>
                          }
                        >
                          <span>
                            <MdInfoOutline />
                          </span>
                        </OverlayTrigger>
                      </InputGroup.Text>
                    </InputGroup>
                  </Form.Group>
                </div>
              </div>
            </div>
            <div className="d-flex justify-content-end mt-4 gap-2">
              {subStep > 1 && (
                <Button
                  variant="primary"
                  className="button-medium"
                  onClick={handlePreviousSubStep}
                >
                  <IoIosArrowBack /> Back
                </Button>
              )}
              <Button type="submit" variant="primary" className="button-medium">
                Save & Continue <FaArrowRight />
              </Button>
            </div>
          </Form>
        )}

        {subStep === 3 && (
          <Form onSubmit={handleSubmit}>
            <FormContainer />
            <div className="d-flex justify-content-center mb-4 flex-column align-items-start flex-wrap mt-4">
              <Card.Title className="title-text-h4 mb-0">
                Assemble the Supporting Cast:
              </Card.Title>
              <p className="body-text-small text-muted lh-md mt-2">
                These are the people who’ll challenge, support, or stir up
                trouble for your protagonist.
              </p>
            </div>
            {(() => {
              const handleSupportingCharacterChange = (index, field, value) => {
                const updatedCharacters = [...bookData.supportingCharacters];
                // Retain the existing _id while updating other fields
                const currentId = updatedCharacters[index]?._id;
                updatedCharacters[index] = {
                  ...updatedCharacters[index],
                  [field]: value,
                  _id: currentId,
                };
                setBookData({
                  ...bookData,
                  supportingCharacters: updatedCharacters,
                });
              };

              return (
                <div className="row row-cols-md-2">
                  {supportingArrayNumber.map((charIndex) => (
                    <div className="col-md-6 ">
                      <div className="generate-book-form-container w-100">
                        <p>Supporting Character {charIndex}</p>
                        <Form.Group
                          className="mb-3"
                          controlId={`supportingCharacter${charIndex}Name`}
                        >
                          <Form.Label>Name</Form.Label>
                          <InputGroup>
                            <Form.Control
                              required
                              type="text"
                              name={`supportingCharacter${charIndex}_name`}
                              value={
                                bookData?.supportingCharacters[charIndex - 1]
                                  ?.name || ""
                              }
                              onChange={(e) =>
                                handleSupportingCharacterChange(
                                  charIndex - 1,
                                  "name",
                                  e.target.value
                                )
                              }
                            />
                            <InputGroup.Text>
                              <OverlayTrigger
                                placement="top"
                                overlay={
                                  <Tooltip
                                    id={`supportingCharacter${charIndex}_name`}
                                  >
                                    Start with a name that sparks something.
                                  </Tooltip>
                                }
                              >
                                <span>
                                  <MdInfoOutline />
                                </span>
                              </OverlayTrigger>
                            </InputGroup.Text>
                          </InputGroup>
                        </Form.Group>
                        <Form.Group
                          className="mb-3"
                          controlId={`supportingCharacter${charIndex}Role`}
                        >
                          <Form.Label>
                            Relationship, Role & Why They Matter?
                          </Form.Label>
                          <InputGroup>
                            <Form.Control
                              required
                              type="text"
                              name={`supportingCharacter${charIndex}_role`}
                              value={
                                bookData?.supportingCharacters[charIndex - 1]
                                  ?.role || ""
                              }
                              onChange={(e) =>
                                handleSupportingCharacterChange(
                                  charIndex - 1,
                                  "role",
                                  e.target.value
                                )
                              }
                            />
                            <InputGroup.Text>
                              <OverlayTrigger
                                placement="top"
                                overlay={
                                  <Tooltip
                                    id={`supportingCharacter${charIndex}Role`}
                                  >
                                    Include these key beats:
                                    <ul>
                                      <li>
                                        Their relationship to the protagonist
                                      </li>
                                      <li>Their role in the story</li>
                                      <li>
                                        Why they matter to the plot or theme
                                      </li>
                                      <b>Examples:</b>
                                      <li>
                                        A loyal best friend who challenges the
                                        protagonist’s choices and helps uncover
                                        the family secret.
                                      </li>
                                      <li>
                                        An ex-boyfriend who resurfaces at the
                                        worst time, forcing the protagonist to
                                        confront old wounds—and the lie she’s
                                        been telling herself.
                                      </li>
                                      <li>
                                        A blunt coworker who brings comic relief
                                        but accidentally sparks the idea that
                                        changes everything.
                                      </li>
                                    </ul>
                                    Keep it short—1–3 sentences is perfect.
                                    These characters bring color, conflict, and
                                    connection to your story’s core.
                                  </Tooltip>
                                }
                              >
                                <span>
                                  <MdInfoOutline />
                                </span>
                              </OverlayTrigger>
                            </InputGroup.Text>
                          </InputGroup>
                        </Form.Group>
                      </div>
                    </div>
                  ))}
                  <div className="col-md-6 ">
                    <div className="generate-book-form-container add-btn min-h-100">
                      <Button
                        onClick={handleAddCharacter}
                        className="add-character-btn "
                      >
                        Add a new character +
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })()}
            <div className="d-flex justify-content-end mt-4 gap-2">
              {subStep > 1 && (
                <Button
                  variant="primary"
                  className="button-medium"
                  onClick={handlePreviousSubStep}
                >
                  <IoIosArrowBack /> Back
                </Button>
              )}
              <Button type="submit" variant="primary" className="button-medium">
                Save & Continue <FaArrowRight />
              </Button>
            </div>
          </Form>
        )}

        {subStep === 4 && (
          <Form onSubmit={handleSubmit}>
            <FormContainer />
            <div className="row">
              <div className="col-md-6">
                <div className="generate-book-form-container w-100">
                  <p>Theme</p>
                  <Form.Group className="mb-3" controlId="themeExploration">
                    <Form.Label>Theme</Form.Label>
                    <InputGroup>
                      <Form.Control
                        required
                        type="text"
                        name="theme"
                        value={bookData.theme || ""}
                        onChange={handleChange}
                      />
                      <InputGroup.Text>
                        <OverlayTrigger
                          placement="top"
                          overlay={
                            <Tooltip id="themeExploration-tooltip">
                              What's the emotional heartbeat of your novel?
                              Examples: Grief, redemption, coming of age,
                              betrayal, identity, freedom, ambition, etc.
                            </Tooltip>
                          }
                        >
                          <span>
                            <MdInfoOutline />
                          </span>
                        </OverlayTrigger>
                      </InputGroup.Text>
                    </InputGroup>
                  </Form.Group>
                  <Form.Group className="mb-3" controlId="themeExploration">
                    <Form.Label>Theme Exploration</Form.Label>
                    <InputGroup>
                      <Form.Control
                        required
                        type="text"
                        name="themeExploration"
                        value={bookData.themeExploration || ""}
                        onChange={handleChange}
                      />
                      <InputGroup.Text>
                        <OverlayTrigger
                          placement="top"
                          overlay={
                            <Tooltip id="themeExploration-tooltip">
                              How does your story explore this theme? Think of
                              it like a question your story is trying to answer.
                              <br />
                              <b>Examples:</b>
                              <ul>
                                <li>
                                  What happens when you build your identity on a
                                  lie?
                                </li>
                                <li>Can love survive betrayal?</li>
                                <li>Is success worth losing yourself for?</li>
                              </ul>
                            </Tooltip>
                          }
                        >
                          <span>
                            <MdInfoOutline />
                          </span>
                        </OverlayTrigger>
                      </InputGroup.Text>
                    </InputGroup>
                  </Form.Group>
                  {/* <Form.Group className="mb-3" controlId="emotionalFlow">
                    <Form.Label>Emotional Flow & Tone</Form.Label>
                    <InputGroup>
                      <Form.Control
                        as="textarea"
                        rows={3}
                        style={{ minHeight: "96px" }}
                        name="emotionalFlow"
                        value={bookData.emotionalFlow || ""}
                        onChange={handleChange}
                      />
                      <InputGroup.Text>
                        <OverlayTrigger
                          placement="top"
                          overlay={
                            <Tooltip id="emotionalFlow-tooltip">
                              Describe the emotional journey and tone of your
                              story. Is it dark, hopeful, humorous, tense, etc.?
                            </Tooltip>
                          }
                        >
                          <span>
                            <MdInfoOutline />
                          </span>
                        </OverlayTrigger>
                      </InputGroup.Text>
                    </InputGroup>
                  </Form.Group> */}
                  {/* <Form.Group className="mb-3" controlId="structuralApproach">
                    <Form.Label>Structural Approach</Form.Label>
                    <InputGroup>
                      <Form.Control
                        type="text"
                        name="structuralApproach"
                        value={bookData.structuralApproach || ""}
                        onChange={handleChange}
                      />
                      <InputGroup.Text>
                        <OverlayTrigger
                          placement="top"
                          overlay={
                            <Tooltip id="structuralApproach-tooltip">
                              How will you structure your story? (e.g.,
                              three-act, nonlinear, dual timeline, etc.)
                            </Tooltip>
                          }
                        >
                          <span>
                            <MdInfoOutline />
                          </span>
                        </OverlayTrigger>
                      </InputGroup.Text>
                    </InputGroup>
                  </Form.Group> */}
                  <Form.Group className="mb-3" controlId="subplot">
                    <Form.Label>Sub Plot</Form.Label>
                    <InputGroup>
                      <Form.Control
                        as="textarea"
                        rows={3}
                        style={{ minHeight: "96px" }}
                        name="subplot"
                        value={bookData.subplot || ""}
                        onChange={handleChange}
                      />
                      <InputGroup.Text>
                        <OverlayTrigger
                          placement="top"
                          overlay={
                            <Tooltip id="subplot-tooltip">
                              What’s the secondary story arc that adds pressure,
                              contrast, or emotional weight to the main story?
                              These should echo the theme or complicate the
                              protagonist’s growth.
                              <br />
                              <b>Examples:</b>
                              <ul>
                                <li>
                                  A childhood friend starts dating the
                                  protagonist’s crush, forcing her to choose
                                  between loyalty and desire
                                </li>
                                <li>
                                  A favorite teacher is quietly fired after
                                  trying to help her uncover the truth about her
                                  mother <br />
                                  ProTip: A great subplot doesn’t steal the
                                  spotlight—it sharpens the edges of your
                                  protagonist’s world and emotional journey. It
                                  can mirror the theme, challenge the main
                                  character, or reveal something they’re not
                                  ready to face.
                                </li>
                              </ul>
                            </Tooltip>
                          }
                        >
                          <span>
                            <MdInfoOutline />
                          </span>
                        </OverlayTrigger>
                      </InputGroup.Text>
                    </InputGroup>
                  </Form.Group>
                </div>
              </div>
              <div className="col-md-6">
                <div className="generate-book-form-container w-100">
                  <p>Market Position</p>
                  <Form.Group className="mb-3" controlId="summary">
                    <Form.Label>Your Story’s Summary</Form.Label>
                    <InputGroup>
                      <Form.Control
                        as="textarea"
                        rows={3}
                        style={{ minHeight: "96px" }}
                        required
                        name="summary"
                        value={bookData.summary || ""}
                        onChange={handleChange}
                      />
                      <InputGroup.Text>
                        <OverlayTrigger
                          placement="top"
                          overlay={
                            <Tooltip id="summary-tooltip">
                              <div style={{ fontSize: 12 }}>
                                One to three sentences that capture the heart of
                                your story: Who it’s about, what they want, and
                                what’s in their way. Keep it punchy—this is your
                                north star.
                                <br />
                                <b>Examples:</b>
                                <ul>
                                  <li>
                                    A rebellious teen uncovers a decades-old
                                    family secret—and the more she digs, the
                                    more dangerous the truth becomes.
                                  </li>
                                  <li>
                                    A perfectionist single mom starts receiving
                                    anonymous notes exposing her past—and
                                    realizes someone close to her knows
                                    everything.
                                  </li>
                                  <li>
                                    An aspiring chef enters a secret underground
                                    cooking competition to save her family’s
                                    restaurant—only to discover the judges play
                                    by deadly rules.
                                    <br />
                                    Pro-tip: This isn’t your final blurb. It’s a
                                    working snapshot of your core premise.
                                  </li>
                                </ul>
                              </div>
                            </Tooltip>
                          }
                        >
                          <span>
                            <MdInfoOutline />
                          </span>
                        </OverlayTrigger>
                      </InputGroup.Text>
                    </InputGroup>
                  </Form.Group>
                  <Form.Group className="mb-3" controlId="compTitles">
                    <Form.Label>First Comparable Title</Form.Label>
                    <InputGroup>
                      <Form.Control
                        required
                        type="text"
                        name="compTitles1"
                        value={bookData.compTitles[0] || []}
                        onChange={handleChange}
                      />
                      <InputGroup.Text>
                        <OverlayTrigger
                          placement="top"
                          overlay={
                            <Tooltip id="compTitles-tooltip">
                              Drop in one or two books, shows, or films your
                              story aligns with in vibe, genre, or audience.
                              <br />
                              <b>Examples:</b>
                              <ul>
                                <li>
                                  If you liked Big Little Lies meets
                                  Yellowjackets
                                </li>
                                <li>
                                  Think: The Midnight Library x The Seven
                                  Husbands of Evelyn Hugo
                                </li>
                                <li>
                                  For fans of Sharp Objects and The Paper Palace
                                </li>
                              </ul>
                            </Tooltip>
                          }
                        >
                          <span>
                            <MdInfoOutline />
                          </span>
                        </OverlayTrigger>
                      </InputGroup.Text>
                    </InputGroup>
                  </Form.Group>
                  <Form.Group className="mb-3" controlId="compTitles">
                    <Form.Label>Second Comparable Title</Form.Label>
                    <InputGroup>
                      <Form.Control
                        required
                        type="text"
                        name="compTitles2"
                        value={bookData.compTitles[1] || []}
                        onChange={handleChange}
                      />
                      <InputGroup.Text>
                        <OverlayTrigger
                          placement="top"
                          overlay={
                            <Tooltip id="compTitles-tooltip">
                              Drop in one or two books, shows, or films your
                              story aligns with in vibe, genre, or audience.
                              <br />
                              <b>Examples:</b>
                              <ul>
                                <li>
                                  If you liked Big Little Lies meets
                                  Yellowjackets
                                </li>
                                <li>
                                  Think: The Midnight Library x The Seven
                                  Husbands of Evelyn Hugo
                                </li>
                                <li>
                                  For fans of Sharp Objects and The Paper Palace
                                </li>
                              </ul>
                            </Tooltip>
                          }
                        >
                          <span>
                            <MdInfoOutline />
                          </span>
                        </OverlayTrigger>
                      </InputGroup.Text>
                    </InputGroup>
                  </Form.Group>
                </div>
              </div>
            </div>
            <div className="d-flex justify-content-end mt-4 gap-2">
              {subStep > 1 && (
                <Button
                  variant="primary"
                  className="button-medium"
                  onClick={handlePreviousSubStep}
                >
                  <IoIosArrowBack /> Back
                </Button>
              )}
              <Button type="submit" variant="primary" className="button-medium">
                Save & Continue <FaArrowRight />
              </Button>
            </div>
          </Form>
        )}
      </Card.Body>
    </Card>
  );
};

export default StoryBluePrint;
