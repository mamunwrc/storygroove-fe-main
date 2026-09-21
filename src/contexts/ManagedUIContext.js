import React from "react";

const initialState = {
  modal: {
    view: undefined,
    isOpen: false,
    data: null,
  },
  shopifyProducts: [],
  productList: [],
  currentPage: 1,
  searchInput: "",
  filterOptions: [],
};

export const UIContext = React.createContext(initialState);

UIContext.displayName = "UIContext";

function uiReducer(state, action) {
  switch (action.type) {
    case "OPEN_MODAL": {
      return {
        ...state,
        modal: {
          ...state.modal,
          view: action.payload.view,
          isOpen: action.payload.isOpen,
          data: action.payload.data,
        },
      };
    }
    case "CLOSE_MODAL": {
      return {
        ...state,
        modal: {
          ...state.modal,
          view: undefined,
          isOpen: false,
          data: null,
        },
      };
    }
    case "SET_PRODUCTS": {
      return {
        ...state,
        shopifyProducts: action.payload,
      };
    }
    case "SET_PRODUCTS_LIST": {
      return {
        ...state,
        productList: action.payload,
      };
    }
    case "SET_PAGE_INFO": {
      return {
        ...state,
        currentPage: action.payload,
      };
    }
    case "SET_SEARCH_INPUT": {
      return {
        ...state,
        searchInput: action.payload,
      };
    }
    case "SET_PRODUCT_FILTERING": {
      return {
        ...state,
        filterOptions: action.payload,
      };
    }
    default:
      return state;
  }
}

export const UIProvider = (props) => {
  const [state, dispatch] = React.useReducer(uiReducer, initialState);

  const setOpenModal = (payload) => dispatch({ type: "OPEN_MODAL", payload });

  const setCloseModal = () => dispatch({ type: "CLOSE_MODAL" });

  const setShopifyProducts = (payload) =>
    dispatch({ type: "SET_PRODUCTS", payload });

  const setCurrentPage = (payload) =>
    dispatch({ type: "SET_PAGE_INFO", payload });

  const setSearchInput = (payload) =>
    dispatch({ type: "SET_SEARCH_INPUT", payload });

  const setProductList = (payload) =>
    dispatch({ type: "SET_PRODUCTS_LIST", payload });

  const setProductFiltering = (payload) =>
    dispatch({ type: "SET_PRODUCT_FILTERING", payload });

  const value = React.useMemo(
    () => ({
      ...state,
      setOpenModal,
      setCloseModal,
      setShopifyProducts,
      setCurrentPage,
      setSearchInput,
      setProductList,
      setProductFiltering,
    }),
    [state]
  );
  return <UIContext.Provider value={value} {...props} />;
};

export const useUI = () => {
  const context = React.useContext(UIContext);
  if (context === undefined) {
    throw new Error(`useUI must be used within a UIProvider`);
  }
  return context;
};

export const ManagedUIContext = ({ children }) => (
  <UIProvider>{children}</UIProvider>
);
