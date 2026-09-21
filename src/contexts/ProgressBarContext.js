import { useState, createContext } from "react";

export const ProgressBarContext = createContext();

function ProgressBarProvider({ children }) {
  const [currentStep, setCurrentStep] = useState(0);

  return (
    <ProgressBarContext.Provider value={{ currentStep, setCurrentStep }}>
      {children}
    </ProgressBarContext.Provider>
  );
}

export default ProgressBarProvider;
