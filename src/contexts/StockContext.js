import { useState, createContext } from "react";

export const StockContext = createContext();

function StockProvider({ children }) {
  const [deviceCategory, setDeviceCategory] = useState("System");

  return <StockContext.Provider value={{ deviceCategory, setDeviceCategory }}>{children}</StockContext.Provider>;
}

export default StockProvider;
