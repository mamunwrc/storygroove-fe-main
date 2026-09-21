import { useState, createContext } from 'react';

export const SidebarContext = createContext();

function SidebarContextProvider(props) {
  const [activeMenu, setActiveMenu] = useState(false);
  const [triggerNavContent, setTriggerNavContent] = useState(0);
  const [showMenu, setShowMenu] = useState(false);
  const [editorOptions, setEditorOptions] = useState(false);
  const [editorOptionType, setEditorOptionType] = useState(null);

  return (
    <SidebarContext.Provider
      value={{
        activeMenu,
        setActiveMenu,
        triggerNavContent,
        setTriggerNavContent,
        showMenu,
        setShowMenu,
        editorOptions,
        setEditorOptions,
        editorOptionType,
        setEditorOptionType,
      }}
    >
      {props.children}
    </SidebarContext.Provider>
  );
}

export default SidebarContextProvider;
