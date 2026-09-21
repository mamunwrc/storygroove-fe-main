import React, { useState } from "react";
import { IoIosArrowDown, IoIosArrowUp } from "react-icons/io";
import {
  LuInfo,
  LuRectangleHorizontal,
  LuRectangleVertical,
} from "react-icons/lu";
import { MdOutlineRectangle } from "react-icons/md";
import { PiRectangle } from "react-icons/pi";
const CustomFlexDropdown = ({ selectedValue }) => {
  const [selectedValue1, setSelectedValue1] = useState("16:9");

  const handleClick = (newValue) => {
    setSelectedValue1(newValue);
    selectedValue(newValue); // Pass the value to the parent component
  };

  return (
    <div className="firstdropdown">
      <div className="dropdown-content">
        <div className="inner">
          <a href="#" onClick={() => handleClick("16:9")}>
            <div className="innerMost">
              <LuRectangleVertical />
              <p>16:9</p>
              <LuInfo />
            </div>
          </a>

          <a href="#" onClick={() => handleClick("9:16")}>
            <div className="innerMost">
              <LuRectangleHorizontal />
              <p>9:16</p>
              <LuInfo />
            </div>
          </a>
        </div>
        <div className="inner">
          <a href="#" onClick={() => handleClick("1:1")}>
            <div className="innerMost">
              <MdOutlineRectangle />
              <p>1:1</p>
              <LuInfo />
            </div>
          </a>
          <a href="#" onClick={() => handleClick("5:2")}>
            <div className="innerMost">
              <LuRectangleHorizontal />
              <p>5:2</p>
              <LuInfo />
            </div>
          </a>
        </div>

        <div className="inner">
          <a href="#" onClick={() => handleClick("4:5")}>
            <div className="innerMost">
              <PiRectangle />
              <p>4:5</p>
              <LuInfo />
            </div>
          </a>
          <a href="#" onClick={() => handleClick("4:3")}>
            <div className="innerMost">
              <PiRectangle />
              <p>4:3</p>
              <LuInfo />
            </div>
          </a>
        </div>
      </div>
    </div>
  );
};

export default CustomFlexDropdown;
