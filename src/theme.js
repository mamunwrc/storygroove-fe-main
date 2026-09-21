import { createTheme } from "@mui/material/styles";
import { red } from "@mui/material/colors";

// Create a theme instance.
const theme = createTheme({
  breakpoints: {
    values: {
      xs: 0,
      sm: 600,
      md: 900,
      lg: 1320,
      xl: 1500,
    },
  },
  palette: {
    common: {
      black: "#1B1B1B",
      white: "#FFFFFF",
    },
    primary: {
      main: "#C1DAFF",
      light: "#C1DAFF",
    },
    secondary: {
      main: "#7FC9C7",
      light: "#fDD6cB",
    },
    error: {
      main: red.A400,
    },
    text: {
      primary: "#1B1B1B",
      secondary: "#808080",
    },
  },
  typography: {
    fontFamily: "'Domine', serif",
    fontSize: 14,
    fontWeightLight: 300,
    fontWeightRegular: 400,
    fontWeightMedium: 500,
    fontWeightBold: 700,
    h1: {
      fontFamily: "'Domine', serif",
      fontWeight: 700,
      fontSize: "64px",
      lineHeight: 1.167,
      color: "#1b1b1b",
    },
    h2: {
      fontFamily: "'Domine', serif",
      fontWeight: 700,
      fontSize: "48px",
      lineHeight: 1.167,
      color: "#1b1b1b",
    },
    h3: {
      fontFamily: "'Domine', serif",
      fontWeight: 500,
      fontSize: "36px",
      lineHeight: 1.167,
    },
    h4: {
      fontFamily: "'Domine', serif",
      fontWeight: 400,
      fontSize: "30px",
      lineHeight: 1.167,
    },
    h5: {
      fontFamily: "'Domine', serif",
      fontWeight: 600,
      fontSize: "24px",
      lineHeight: 1.167,
      color: "#1b1b1b",
    },
    h6: {
      fontFamily: "'Domine', serif",
      fontWeight: 400,
      fontSize: "20px",
      lineHeight: 1.167,
      color: "#808080",
    },
    body1: {
      fontWeight: 400,
      fontSize: "16px",
      lineHeight: "18.77px",
    },
    body2: {
      fontWeight: 400,
      fontSize: "14px",
      lineHeight: 1.167,
    },
    caption: {
      fontWeight: 400,
      fontSize: "18px",
      lineHeight: 1.167,
    },
    subtitle1: {
      fontWeight: 400,
      fontSize: "12px",
      lineHeight: 1.167,
    },
  },
  components: {
    MuiButton: {
      defaultProps: {
        disableRipple: true,
      },
      styleOverrides: {
        root: {
          fontWeight: "400",
          textTransform: "capitalize",
          paddingLeft: 16,
          paddingRight: 16,
          borderRadius: "8px",
          paddingTop: 5,
          fontSize: 18,

          ".MuiSvgIcon-root": {
            transition: "all .2s",
            ":hover": {
              color: "#1b1b1b",
            },
          },
        },
        endIcon: {
          marginRight: -8,
        },
        sizeSmall: {
          fontSize: 14,
          padding: "8px 31px",
        },
        sizeMedium: {
          fontSize: 18,
          padding: "8px 31px",
        },
        sizeLarge: {
          padding: "11px 24px",
        },
        textSizeSmall: {
          padding: "7px 12px",
        },
        textSizeMedium: {
          padding: "9px 16px",
        },
        textSizeLarge: {
          padding: "12px 22px",
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          // Add your styles here for the AppBar
          position: "relative",
        },
      },
    },
    MuiToolbar: {
      styleOverrides: {
        root: {
          // Add your styles here for the Toolbar
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: 8,

          "& .MuiTouchRipple-root": {
            borderRadius: 8,
          },
        },
        sizeSmall: {
          padding: 4,
        },
      },
    },
    MuiListItemText: {
      styleOverrides: {
        root: {
          color: "#808080",
          textAlign: { sm: "left", xs: "center" },
        },
      },
    },
    // Add more component styles as needed
  },
});

export default theme;
