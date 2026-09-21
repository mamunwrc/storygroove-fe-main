import React, { useContext, useState } from "react";
import "./CustomProgressBar.scss"; // Import the CSS file for styling
import { ProgressBarContext } from "../../contexts/ProgressBarContext";
import clsx from "clsx";

const CustomProgressBar = () => {
  const { currentStep } = useContext(ProgressBarContext);

  const steps = 4;
  const stepLabels = [
    "Upload Image",
    "Remove-Background",
    "Generate-Image",
    "Share",
  ];

  const getStepStyle = (stepIndex) => {
    if (stepIndex < currentStep) {
      return "custom-step completed";
    } else if (stepIndex === currentStep) {
      return "custom-step current";
    } else {
      return "custom-step";
    }
  };

  return (
    <div className="custom-progress-bar">
      <div
        className={clsx(
          "custom-progress-line",
          currentStep === 0
            ? "step-0"
            : currentStep === 1
            ? "step-1"
            : currentStep === 2
            ? "step-2"
            : "step-3"
        )}
        style={{
          "--progress-width": `calc(${currentStep * 25}%`,
        }}
      >
        {Array.from({ length: steps }).map((_, index) => (
          <div key={index} className={getStepStyle(index)}>
            <span className="step-label">{stepLabels[index]}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CustomProgressBar;
