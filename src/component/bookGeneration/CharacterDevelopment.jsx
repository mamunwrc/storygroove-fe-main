import React, { useEffect, useState } from "react";
import {
  Accordion,
  Button,
  Card,
  Form,
  InputGroup,
  OverlayTrigger,
  Spinner,
  Tooltip,
} from "react-bootstrap";
import {
  createCharacter,
  getAllCharactersOfaBook,
} from "../../api/bookGeneration";
import { toast } from "react-toastify";
import { MdInfoOutline } from "react-icons/md";
import { MdCheckCircle } from "react-icons/md";
const CharacterDevelopment = ({
  novelId,
  characterData,
  setCharacterData,
  bookData,
  onNext,
  activeTab,
}) => {
  const [loading, setLoading] = useState({});

  // State to track active accordion
  const [activeKey, setActiveKey] = useState(null);

  // State to hold edited character data for each character
  const [editedCharacters, setEditedCharacters] = useState({});

  // get character details
  const [characterListData, setCharacterListData] = useState([]);

  // Initialize edited character state when characterListData changes
  useEffect(() => {
    const initialEditedCharacters = characterListData.reduce(
      (acc, character) => {
        acc[character._id] = { ...character, novelId };
        return acc;
      },
      {}
    );
    setEditedCharacters(initialEditedCharacters);
    // Set the first tab open by default
    if (characterListData.length > 0) {
      setActiveKey(characterListData[0]._id);
    }
  }, [characterListData, novelId]);

  // Fetch characters when the tab is active
  useEffect(() => {
    if (activeTab !== "development") return;
    const fetchCharacterList = async () => {
      try {
        // setLoading(true);
        const response = await getAllCharactersOfaBook(novelId);
        setCharacterListData(response.data.characters);
      } catch (err) {
        // toast.error('No characters found for this novel');
        console.error(err);
      } finally {
        // setLoading(false);
      }
    };
    fetchCharacterList();
  }, [activeTab, novelId]);

  // Handle input changes for a specific character
  const handleChange = (characterId, e) => {
    const { name, value } = e.target;
    setEditedCharacters((prev) => ({
      ...prev,
      [characterId]: {
        ...prev[characterId],
        [name]: value,
      },
    }));
  };

  // Handle character create or update
  const handleCreateOrUpdateCharacter = async (characterId) => {
    setLoading((prev) => ({ ...prev, [characterId]: true }));
    setActiveKey(null);
    const characterData = {
      ...editedCharacters[characterId],
      characterId: characterId, // Include characterId for update
    };
    try {
      // setLoading(true);
      const response = await createCharacter(characterData);
      if (response.status === 200) {
        toast.success("Character saved successfully");
        // Refresh character list to reflect changes
        const updatedList = await getAllCharactersOfaBook(novelId);
        setCharacterListData(updatedList.data.characters);
      }
    } catch (err) {
      toast.error("Failed to save character");
      console.error(err);
    } finally {
      setLoading((prev) => ({ ...prev, [characterId]: false }));
    }
  };

  return (
    <Card className="p-4 h-100 character-development-card form-control-icon">
      <Card.Body>
        <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap">
          <Card.Title className="title-text-h3">
            Character Development
          </Card.Title>
          <Button onClick={onNext} className="button-medium">Continue</Button>
        </div>

        <div className=" mt-4 ">
          {characterListData.length !== 0 ? (
            characterListData?.map((character, index) => {
              // Find matching character from characterData array

              return (
                <Accordion
                  key={character._id}
                  className="mt-3"
                  activeKey={activeKey}
                  onSelect={(key) => setActiveKey(key)}
                >
                  {/* Archetype and Role Section */}
                  <Accordion.Item eventKey={character._id}>
                    <Accordion.Header className="">
                      {character.name}
                      <span>
                        {" "}
                        {character.responseText ? (
                          <MdCheckCircle
                            style={{
                              color: "#25A249",
                              height: "20px",
                              width: "20px",
                            }}
                          />
                        ) : loading[character._id] ? (
                          <Spinner
                            animation="border"
                            size="sm"
                            className="ms-2"
                          />
                        ) : (
                          ""
                        )}
                      </span>
                    </Accordion.Header>
                    <Accordion.Body className="w-100">
                      <Form
                        onSubmit={(e) => {
                          e.preventDefault();
                          handleCreateOrUpdateCharacter(character._id);
                        }}
                      >
                        <div className="border-bottom border-1 w-100 rounded-0 bg-transparent mb-4">
                          <p className="menu-medium">Basic Information </p>

                          <Form.Group className="mb-3" controlId="name">
                            <Form.Label className="body-text-small">
                              Name
                            </Form.Label>
                            <Form.Control
                              readOnly
                              name="name"
                              value={character.name}
                              onChange={handleChange}
                              required
                              type="text"
                              placeholder="Placeholder"
                            />
                          </Form.Group>

                          <div className="row">
                            <div className="col-md-6">
                              <Form.Group className="mb-3" controlId="age">
                                <Form.Label className="body-text-small">
                                  Age
                                </Form.Label>
                                <Form.Control
                                  name="age"
                                  value={
                                    editedCharacters[character._id]?.age ||
                                    character.age ||
                                    ""
                                  }
                                  onChange={(e) =>
                                    handleChange(character._id, e)
                                  }
                                  required
                                  type="number"
                                  placeholder="Placeholder"
                                />
                              </Form.Group>
                            </div>
                            <div className="col-md-6">
                              <Form.Group className="mb-3" controlId="gender">
                                <Form.Label className="body-text-small">
                                  Gender
                                </Form.Label>
                                <Form.Control
                                  name="gender"
                                  value={
                                    editedCharacters[character._id]?.gender ||
                                    character.gender ||
                                    ""
                                  }
                                  onChange={(e) =>
                                    handleChange(character._id, e)
                                  }
                                  required
                                  type="text"
                                  placeholder="Placeholder"
                                />
                              </Form.Group>
                            </div>
                          </div>
                          <div className="row">
                            <div className="col-md-6">
                              {" "}
                              <Form.Group
                                className="mb-3"
                                controlId="occupation"
                              >
                                <Form.Label className="body-text-small">
                                  Occupation
                                </Form.Label>
                                <InputGroup>
                                  <Form.Control
                                    name="occupation"
                                    value={
                                      editedCharacters[character._id]
                                        ?.occupation ||
                                      character.occupation ||
                                      ""
                                    }
                                    onChange={(e) =>
                                      handleChange(character._id, e)
                                    }
                                    required
                                    type="text"
                                    placeholder="Placeholder"
                                  />
                                  <InputGroup.Text>
                                    <OverlayTrigger
                                      placement="top"
                                      overlay={
                                        <Tooltip id="occupation-tooltip">
                                          Character’s Job or Role in Life
                                          (teacher, student, accountant, stay at
                                          home parent, etc)
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
                              <Form.Group
                                className="mb-3"
                                controlId="ethnicity"
                              >
                                <Form.Label className="body-text-small">
                                   Cultural Identity & Background
                                </Form.Label>
                                <InputGroup>
                                  <Form.Control
                                    name="ethnicity"
                                    value={
                                      editedCharacters[character._id]
                                        ?.ethnicity ||
                                      character.ethnicity ||
                                      ""
                                    }
                                    onChange={(e) =>
                                      handleChange(character._id, e)
                                    }
                                    required
                                    placeholder="Placeholder"
                                  />
                                  <InputGroup.Text>
                                    <OverlayTrigger
                                      placement="top"
                                      overlay={
                                        <Tooltip id="ethnicity-tooltip">
                                          What cultural or geographic background
                                          shapes this character? Think heritage,
                                          country of origin, or community
                                          identity.
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
                        <div className="border-bottom border-1 w-100 rounded-0 bg-transparent mb-4">
                          <p className="menu-medium">Archetype and Role </p>
                          <Form.Group className="mb-3" controlId="archetype">
                            <Form.Label className="body-text-small">
                              Archetype
                            </Form.Label>
                            <InputGroup>
                              <Form.Control
                                name="archetype"
                                value={
                                  editedCharacters[character._id]?.archetype ||
                                  character.archetype ||
                                  ""
                                }
                                onChange={(e) => handleChange(character._id, e)}
                                required
                                as="textarea"
                                rows={3}
                                placeholder="Placeholder"
                              />
                              <InputGroup.Text>
                                <OverlayTrigger
                                  placement="top"
                                  overlay={
                                    <Tooltip id="archetype-tooltip">
                                      What core energy or pattern does this
                                      character embody? This is their inner
                                      compass—not their role in the plot, but
                                      the archetypal energy that drives their
                                      decisions.
                                      <br />
                                      <b>Archetype Examples:</b>
                                      <ul>
                                        <li>
                                          The Rebel – questions authority,
                                          pushes against systems
                                        </li>
                                        <li>
                                          The Caregiver – nurtures others, often
                                          at a personal cost
                                        </li>
                                        <li>
                                          The Trickster – disrupts, reveals
                                          hidden truths through chaos
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
                          <Form.Group className="mb-3" controlId="role">
                            <Form.Label className="body-text-small">
                              Role
                            </Form.Label>
                            <InputGroup>
                              <Form.Control
                                name="role"
                                value={
                                  editedCharacters[character._id]?.role ||
                                  character.role ||
                                  ""
                                }
                                onChange={(e) => handleChange(character._id, e)}
                                required
                                type="text"
                                placeholder="Placeholder"
                              />
                              <InputGroup.Text>
                                <OverlayTrigger
                                  placement="top"
                                  overlay={
                                    <Tooltip id="role-tooltip">
                                      What’s this character’s role in the story?
                                      Are they the protagonist? Antagonist? Love
                                      interest? Sidekick? Mentor? etc.
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

                        <div className="w-100 rounded-0 bg-transparent mb-4">
                          <p className="menu-medium mt-4">
                            Physical Description{" "}
                          </p>

                          <div className="row">
                            <div className="col-md-12">
                              <Form.Group
                                className="mb-3"
                                controlId="appearance"
                              >
                                <Form.Label className="body-text-small">
                                  Appearance
                                </Form.Label>
                                <InputGroup>
                                  <Form.Control
                                    name="appearance"
                                    value={
                                      editedCharacters[character._id]
                                        ?.appearance ||
                                      character.appearance ||
                                      ""
                                    }
                                    onChange={(e) =>
                                      handleChange(character._id, e)
                                    }
                                    required
                                    as="textarea"
                                    rows={3}
                                    placeholder="Placeholder"
                                    style={{ minHeight: "96px" }}
                                  />
                                  <InputGroup.Text>
                                    <OverlayTrigger
                                      placement="top"
                                      overlay={
                                        <Tooltip id="appearance-tooltip">
                                          What do they look like at a glance?
                                          Include height, build, and any
                                          distinctive features—scars, tattoos,
                                          hair, posture, etc.
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
                            <div className="col-md-12">
                              <Form.Group className="mb-3" controlId="style">
                                <Form.Label className="body-text-small">
                                  Style
                                </Form.Label>
                                <InputGroup>
                                  <Form.Control
                                    name="style"
                                    value={
                                      editedCharacters[character._id]?.style ||
                                      character.style ||
                                      ""
                                    }
                                    onChange={(e) =>
                                      handleChange(character._id, e)
                                    }
                                    required
                                    as="textarea"
                                    rows={3}
                                    style={{ minHeight: "96px" }}
                                    placeholder="Placeholder"
                                  />
                                  <InputGroup.Text>
                                    <OverlayTrigger
                                      placement="top"
                                      overlay={
                                        <Tooltip id="style-tooltip">
                                          What’s their go-to look? Uniforms,
                                          vintage jackets, ripped jeans,
                                          designer heels—what they wear tells us
                                          how they move through the world.
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

                          <Form.Group className="mb-3" controlId="traits">
                            <Form.Label className="body-text-small">
                              Notable Traits
                            </Form.Label>
                            <InputGroup>
                              <Form.Control
                                name="traits"
                                value={
                                  editedCharacters[character._id]?.traits ||
                                  character.traits ||
                                  ""
                                }
                                onChange={(e) => handleChange(character._id, e)}
                                required
                                as="textarea"
                                rows={3}
                                style={{ minHeight: "96px" }}
                                placeholder="Placeholder"
                              />
                              <InputGroup.Text>
                                <OverlayTrigger
                                  placement="top"
                                  overlay={
                                    <Tooltip id="traits-tooltip">
                                      Zoom in on physical details like eye
                                      color, hair texture, or memorable quirks.
                                      Examples: brown eyes, curly auburn hair, a
                                      limp, chipped black nail polish, or the
                                      habit of cracking knuckles before lying.
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

                          <div className="d-flex justify-content-end w-100">
                            <Button
                              type="submit"
                              disabled={loading[character._id]}
                              className="button-medium"
                              variant="primary"
                            >
                              {loading[character._id]
                                ? "Creating Character..."
                                : "Create Character"}
                            </Button>
                          </div>
                        </div>
                      </Form>
                    </Accordion.Body>
                  </Accordion.Item>
                </Accordion>
              );
            })
          ) : (
            <p>no character created yet</p>
          )}
        </div>
      </Card.Body>
    </Card>
  );
};

export default CharacterDevelopment;
