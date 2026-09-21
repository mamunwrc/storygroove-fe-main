import React, { useEffect, useState } from "react";

function RangeSlider({ variation, selectedValue }) {
  const [value, setValue] = useState(variation);
  let prefs = ["webkit-slider-runnable-track", "moz-range-track", "ms-track"];

  const getTrackStyle = () => {
    let val = ((value - 4) / (8 - 4)) * 100; // calculate the percentage
    let style = "";

    for (var i = 0; i < prefs.length; i++) {
      style +=
        ".range input::-" +
        prefs[i] +
        "{background: linear-gradient(to right, black 0%, black " +
        val +
        "%, #b2b2b2 " +
        val +
        "%, #b2b2b2 100%)}";
    }
    return style;
  };

  const handleChange = (event) => {
    setValue(parseInt(event.target.value));
    selectedValue(parseInt(event.target.value));
  };

  const labels = [1, 2];
  const style = getTrackStyle();

  return (
    <div className="upperRange">
      <style>{style}</style>
      <div className="range">
        <input
          className="range"
          type="range"
          min={4}
          max={8}
          step={4}
          value={value}
          onChange={handleChange}
        />
      </div>

      <ul className="range-labels">
        {labels.map((label, index) => (
          <li
            key={index}
            className={label <= value ? "active selected" : ""}
            onClick={() => setValue(label)}
          ></li>
        ))}
      </ul>
    </div>
  );
}

export default RangeSlider;
