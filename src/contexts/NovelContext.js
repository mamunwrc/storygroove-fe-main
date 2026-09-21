import { useState, createContext } from 'react';

export const NovelContext = createContext();

function NovelContextProvider(props) {
  const savedActiveTab = localStorage.getItem('activeTab');
  const [activeTab, setActiveTab] = useState(savedActiveTab || 'blueprint');

  return (
    <NovelContext.Provider
      value={{
        activeTab,
        setActiveTab,
      }}
    >
      {props.children}
    </NovelContext.Provider>
  );
}

export default NovelContextProvider;
