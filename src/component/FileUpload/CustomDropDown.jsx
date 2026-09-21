import React, { useState } from "react";
import { IoIosArrowDown, IoIosArrowUp } from "react-icons/io";

const CustomDropdown = ({ handleSelect, selectGeneric }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState(null);
  const [options, setOptions] = useState([
    { value: "sdxl", label: "Imagine Create v2" },
    { value: "gcp", label: "Imagine Create v1" },
  ]);

  const handleChange = (option) => {
    setSelectedOption(option.label);
    handleSelect(option.label); // pass selected option back to the parent
    // Update options based on selected option
    if (option.value === "sdxl") {
      setOptions([{ value: "gcp", label: "Imagine Create v1" }]);
    } else if (option.value === "gcp") {
      setOptions([{ value: "sdxl", label: "Imagine Create v2" }]);
    }
  };

  return (
    <div className="firstdropdown">
      <ul className="firstdropdown-menu">
        {options.map((option) =>
          option.label === selectGeneric ? (
            <></>
          ) : (
            <>
              {" "}
              <li key={option.value} onClick={() => handleChange(option)}>
                {option.label}
              </li>
            </>
          )
        )}
      </ul>
    </div>
  );
};

export default CustomDropdown;
